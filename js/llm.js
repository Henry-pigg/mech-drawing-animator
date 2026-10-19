/* LLM 识图：把题目照片映射到题型 + 参数 */
class LLMRecognizer {
  async recognize(imageFile) {
    if (!AppConfig.hasApiKey) throw new Error('请先在右上角设置中填入 API Key')
    const base64 = await this._fileToBase64(imageFile)
    const prompt = `你是《机械制图》课程助教。看这张题目照片，判断题型，并从下面的题库中选一个 type，提取图中的尺寸参数（单位 mm，读不到的用默认值）。

题库（type: 说明 / 参数）：
- point3: 点的三面投影 / {x,y,z}
- line3: 直线三面投影 / {kind:"general"|"horizontal"}
- plane3: 平面的三面投影 / {}
- prism3: 棱柱三视图并求表面点 / {sides:3~8, R:外接圆半径, h:高}
- pyramid3: 棱锥三视图并求表面点 / {sides, R, h}
- cylinder3: 圆柱三视图并求表面点 / {r, h}
- cone3: 圆锥三视图并求表面点 / {r, h}
- sphere3: 圆球三视图并求表面点 / {r}
- prismCut: 棱柱被正垂面截切 / {angle:截平面倾角}
- cylCut: 圆柱被正垂面斜切 / {angle}
- coneCut: 圆锥截交 / {kind:"ellipse"|"parabola"|"hyperbola"|"circle"|"triangle"}
- interCyl: 两圆柱正交相贯 / {}
- comboStack: 叠加式组合体三视图 / {}
- comboCut: 切割式组合体三视图 / {}
- axoIso: 正等轴测图 / {}
- axoCab: 斜二轴测图 / {}
- hook: 吊钩平面图形（圆弧连接） / {}
- arcConn: 圆弧连接基本形式 / {}
- shaft: 阶梯轴零件图 / {}
- flange: 法兰盘零件图 / {}
- bracket: L 形支架零件图 / {}

判断要点：
1. 出现"三视图""投影""表面取点""求另外两面投影"→ 归入 point3/line3/prism3/pyramid3/cylinder3/cone3/sphere3
2. 出现"截交线""相贯线"→ prismCut/cylCut/coneCut/interCyl
3. 只有平面图形 + 一堆 R 和 Ø 尺寸（圆弧相切）→ hook 或 arcConn
4. 出现"轴测图"→ axoIso/axoCab
5. 标注齐全的零件图 → shaft/flange/bracket

只输出 JSON，不要解释，不要 markdown 代码块：
{"type":"...","name":"题目名称（中文）","params":{...}}`
    const res = await fetch(`${AppConfig.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AppConfig.apiKey}` },
      body: JSON.stringify({
        model: AppConfig.model,
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: base64 } },
            { type: 'text', text: prompt },
          ],
        }],
        max_tokens: 800,
      }),
    })
    if (!res.ok) throw new Error(`API 错误 ${res.status}: ${await res.text()}`)
    const data = await res.json()
    let content = (data.choices?.[0]?.message?.content || '').trim()
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const m = content.match(/\{[\s\S]*\}/)
    if (!m) throw new Error('AI 返回格式错误，请重试')
    return JSON.parse(m[0])
  }

  _fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }
}
