/* LLM — 图纸识别：照片 → DrawingDoc JSON */
class Recognizer {
  constructor(cfg) { this.cfg = cfg }

  async recognize(file, onIssue) {
    if (!AppConfig.hasApiKey) throw new Error('请先在设置中填入 API Key')
    const dataUrl = await this._prepare(file)
    let lastErr = null
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const raw = await this._call(dataUrl, attempt > 0)
        const { doc, issues } = DrawingDoc.normalize(raw, { width: 920, height: 660 })
        if (onIssue) onIssue(issues)
        if (!doc) throw new Error(issues.find(i => i.level === 'error')?.msg || '模型输出无法解析')
        return { doc, issues, raw }
      } catch (e) {
        lastErr = e
        if (!/无法解析|不是合法 JSON|格式/.test(e.message)) throw e
      }
    }
    throw lastErr
  }

  /* 手机照片动辄 4000px、好几 MB，直接塞给接口容易超时或被拒（413/400）。
     先等比压到长边 1600px、JPEG 0.85 —— 识图够用，体积能小一个数量级。 */
  async _prepare(file) {
    const raw = await this._toDataUrl(file)
    try {
      const shrunk = await this._shrink(raw, 1600, 0.85)
      /* 压完反而更大（小图重编码会变大）就退回原图 */
      return shrunk.length < raw.length ? shrunk : raw
    } catch {
      return raw
    }
  }

  _shrink(dataUrl, maxSide, quality) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const { naturalWidth: w, naturalHeight: h } = img
        if (!w || !h) { reject(new Error('图片尺寸异常')); return }
        const k = Math.min(1, maxSide / Math.max(w, h))
        if (k >= 1 && dataUrl.length < 900 * 1024) { resolve(dataUrl); return }
        const cw = Math.round(w * k), ch = Math.round(h * k)
        const cv = document.createElement('canvas')
        cv.width = cw; cv.height = ch
        const ctx = cv.getContext('2d')
        // JPEG 没有透明通道，先铺白底，免得透明 PNG 压出来是黑底
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, cw, ch)
        ctx.drawImage(img, 0, 0, cw, ch)
        resolve(cv.toDataURL('image/jpeg', quality))
      }
      img.onerror = () => reject(new Error('图片解码失败'))
      img.src = dataUrl
    })
  }

  async _call(dataUrl, repair) {
    const body = {
      model: this.cfg.model,
      temperature: 0.1,
      max_tokens: 4000,
      messages: [
        { role: 'system', content: Recognizer.PROMPT },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: dataUrl } },
            { type: 'text', text: repair ? '上一次输出不是合法 JSON。请只输出一个 JSON 对象，不要围栏、不要解释。' : '识别这张工程制图题目，拆成可回放的绘图步骤，只输出 JSON。' },
          ],
        },
      ],
    }
    const res = await fetch(`${this.cfg.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.cfg.apiKey}` },
      body: JSON.stringify(body),
      signal: this._sig ? this._sig() : undefined,
    })
    if (res.status === 413) throw new Error('413 图片太大，接口拒绝接收')
    if (!res.ok) throw new Error(`接口返回 ${res.status}：${(await res.text()).slice(0, 200)}`)
    const json = await res.json()
    const content = json.choices?.[0]?.message?.content
    if (!content) throw new Error('接口未返回内容')
    return typeof content === 'string' ? content : JSON.stringify(content)
  }

  /* 120 秒硬超时：不设的话，网络卡住时界面会永远停在"正在识图…" */
  _sig() {
    if (this._ac) this._ac.abort()
    this._ac = new AbortController()
    this._timer = setTimeout(() => this._ac && this._ac.abort(), 120000)
    return this._ac.signal
  }

  _toDataUrl(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader()
      fr.onload = () => resolve(fr.result)
      fr.onerror = () => reject(new Error('图片读取失败'))
      fr.readAsDataURL(file)
    })
  }
}

Recognizer.PROMPT = `你是《机械制图 / 画法几何》助教。把用户上传的题目图片，转成一份"可逐步播放的绘图指令"JSON。

你不是在画一幅图，而是在拆解画图的过程：先定基准，再画已知线段，最后画连接线并标注尺寸。

【输出铁律】
1. 只输出一个 JSON 对象，不要 markdown 围栏，不要任何解释文字。
2. 严格用下方字段，不增字段名、不加层级。
3. 看不清的宁可不画，并写进 warnings。
4. 不要输出 SVG、path 字符串、箭头或尺寸界线的坐标——这些由前端算。

【坐标系】
- 画布 920 × 660，原点在左上角，x 向右，y 向下。
- 所有图形落在安全区 x∈[70,850]，y∈[70,590] 内。
- 单位是画布像素，1 位小数即可。不必按 1:1，真实尺寸只体现在 dimension.text 里。
- arc 角度：0° 指向 +x，逆时针为正；但 y 轴向下，取点公式是 (cx + r·cosθ, cy − r·sinθ)。
  即 θ=90° 在正上方，θ=180° 在正左方。endAngle > startAngle 表示逆时针。

【图元白名单】
- line: {kind:"line", id, lineType, x1,y1,x2,y2}
- circle: {kind:"circle", id, lineType, cx,cy,r}
- arc: {kind:"arc", id, lineType, cx,cy,r,startAngle,endAngle}
- dimension: {kind:"dimension", id, from:{x,y}, to:{x,y}, offset, orientation:"aligned"|"horizontal"|"vertical", text}
- text: {kind:"text", id, x, y, text, size(默认18), anchor:"start"|"middle"|"end"}
- point: {kind:"point", id, x, y}   // 小圆点，用于 A、B 等被求的点

lineType：thick 可见轮廓 / dashed 不可见轮廓 / center 轴线·中心线·对称线 / thin 细实线（少用）。
尺寸标注自动按细实线画，不要给 dimension 加 lineType。

【画法几何专项规则】
1. 三视图：主视图左上，俯视图正下方，左视图正右侧。
   - 主视图与俯视图"长对正"：同一特征的 x 完全一致。
   - 主视图与左视图"高平齐"：同一特征的 y 完全一致。
   - 俯视图与左视图"宽相等"：俯视图竖直跨度 = 左视图水平跨度。
   - 每个视图先画中心线（center），再画轮廓（thick），不可见轮廓用 dashed。
   - 建议布局：主视图 x∈[140,420] y∈[110,340]；俯视图 y∈[400,570]；左视图 x∈[500,780]。
2. 表面取点：已知投影用 point + text 标出（如 a′），求出的投影同样标出。
   - 主视图用 a′、俯视图用 a、左视图用 a″；不可见时文字加括号，如 (b″)。
   - 文字放在点右上方 10~14px。
3. 轴测图：X 轴向右下 30°，Y 轴向左下 30°，Z 轴竖直向上。
4. 圆弧连接：先画已知圆弧（circle/arc），再画连接弧；切点按"外切 r+R、内切 |R−r|"定圆心。
5. 尺寸只标题目给出的或关键的 3~6 个，不要凑数。

【步骤拆分方法论】
按真实作图顺序，每步只做一件事：
1) 基准（中心线、轴线）→ 2) 已知线段 → 3) 中间线段 → 4) 连接线段 → 5) 尺寸（集中最后一步）
- 步骤数 3~10，每步 1~6 个图元。
- title ≤ 12 字，动宾结构，如"画俯视图五边形""求 a″ 的投影"。
- narration ≤ 60 字，讲清依据或易错点，不要复述 title。

【输出格式】
{"version":"1.0","meta":{"title":"零件/题目名称","standard":"GB/T 4457.4","unit":"mm","width":920,"height":660,"summary":"一句话说明你看懂了什么，≤40字","confidence":0.9},"warnings":[],"steps":[{"id":"s1","title":"画中心线","narration":"先定圆心与轴线，后面所有尺寸都从这里量起。","primitives":[{"id":"s1-e1","kind":"line","lineType":"center","x1":180,"y1":300,"x2":620,"y2":300}]}]}

【自检】
- 只有一个 JSON？id 全局唯一？坐标都在安全区？
- arc 的角度换算是否遵守 y 轴向下？
- 尺寸是否都在最后一步、都带 text？
- 三视图是否满足长对正、高平齐？

现在开始，只输出 JSON。`
