/* App — 界面与调度 */
const CATS = [
  ['point', '点 · 线 · 面投影'],
  ['solid', '基本体三视图'],
  ['cut', '截交 · 相贯'],
  ['combo', '组合体'],
  ['axo', '轴测图'],
  ['draw', '几何作图'],
  ['part', '零件图'],
]

const VARIANTS = {
  prism3: [{ label: '三棱柱', params: { sides: 3 } }, { label: '四棱柱', params: { sides: 4 } }, { label: '五棱柱', params: { sides: 5 } }, { label: '六棱柱', params: { sides: 6 } }],
  pyramid3: [{ label: '三棱锥', params: { sides: 3 } }, { label: '四棱锥', params: { sides: 4 } }, { label: '五棱锥', params: { sides: 5 } }],
  line3: [{ label: '一般位置', params: { kind: 'general' } }, { label: '水平线', params: { kind: 'horizontal' } }],
  coneCut: [{ label: '椭圆', params: { kind: 'ellipse' } }, { label: '抛物线', params: { kind: 'parabola' } }, { label: '双曲线', params: { kind: 'hyperbola' } }, { label: '圆', params: { kind: 'circle' } }, { label: '三角形', params: { kind: 'triangle' } }],
  prismCut: [{ label: '30°', params: { angle: 30 } }, { label: '45°', params: { angle: 45 } }, { label: '60°', params: { angle: 60 } }],
  cylCut: [{ label: '25°', params: { angle: 25 } }, { label: '35°', params: { angle: 35 } }, { label: '50°', params: { angle: 50 } }],
}

document.addEventListener('DOMContentLoaded', () => {
  const ALL = Object.assign({}, Templates.T, Templates2D.T)
  const render = new SvgRender(document.getElementById('paper'))
  const $ = id => document.getElementById(id)
  const ui = {
    btnPrev: $('btn-prev'), btnPlay: $('btn-play'), btnNext: $('btn-next'), btnReset: $('btn-reset'),
    speedSelect: $('speed-select'),
    stepCurrent: $('step-current'), stepTotal: $('step-total'),
    stepList: $('step-list'), stepTitle: $('step-title'), stepDesc: $('step-desc'),
  }
  const player = new Player(render, ui)
  let currentId = null, currentParams = {}, currentScene = null

  /* ---------- 题库 ---------- */
  const libBox = $('lib-cats')
  CATS.forEach(([cat, name]) => {
    const items = Object.values(ALL).filter(t => t.cat === cat)
    if (!items.length) return
    const g = document.createElement('div')
    g.className = 'cat'
    g.dataset.cat = cat
    g.innerHTML = `<div class="cat-h">${name}</div>`
    items.forEach(t => {
      const b = document.createElement('button')
      b.className = 'item'
      b.dataset.id = t.id
      b.dataset.name = t.name
      b.textContent = t.name
      b.onclick = () => loadTemplate(t.id)
      g.appendChild(b)
    })
    libBox.appendChild(g)
  })

  $('lib-search').addEventListener('input', e => {
    const q = e.target.value.trim()
    libBox.querySelectorAll('.cat').forEach(g => {
      let hit = 0
      g.querySelectorAll('.item').forEach(b => {
        const ok = !q || b.dataset.name.includes(q)
        b.style.display = ok ? '' : 'none'
        if (ok) hit++
      })
      g.style.display = hit ? '' : 'none'
    })
  })

  function loadTemplate(id, params) {
    const t = ALL[id]
    if (!t) return
    currentId = id
    const base = (VARIANTS[id] && VARIANTS[id][0].params) || {}
    currentParams = Object.assign({}, base, params || {})
    let draw
    try { draw = t.build(currentParams) } catch (err) { toast('生成失败：' + err.message, 'err'); return }
    currentScene = DrawingDoc.fromDraw(draw)
    player.load(currentScene)
    setMode('template')
    $('doc-title').textContent = draw.title
    renderVariants(id)
    document.querySelectorAll('.item').forEach(b => b.classList.toggle('on', b.dataset.id === id))
    clearAiCard()
  }

  function renderVariants(id) {
    const bar = $('variant-bar')
    const vs = VARIANTS[id]
    bar.innerHTML = ''
    if (!vs) { bar.classList.add('hide'); return }
    bar.classList.remove('hide')
    vs.forEach(v => {
      const b = document.createElement('button')
      b.className = 'chip'
      b.textContent = v.label
      if (Object.keys(v.params).every(k => currentParams[k] === v.params[k])) b.classList.add('on')
      b.onclick = () => { const p = Object.assign({}, currentParams, v.params); loadTemplate(id, p) }
      bar.appendChild(b)
    })
  }

  function renderVariantsKeep() {}
  void renderVariantsKeep

  /* ---------- 识图 ---------- */
  const status = $('ai-status')
  const drop = $('drop')
  const fileInput = $('file-input')

  function setMode(mode) {
    document.body.dataset.mode = mode
    $('mode-tag').textContent = mode === 'doc' ? 'AI 识图' : '内置题库'
    $('mode-tag').className = 'tag ' + (mode === 'doc' ? 'is-doc' : '')
  }

  function clearAiCard() {
    $('ai-result').classList.add('hide')
  }

  /* 点整块上传区都能触发；用 keydown 支持回车/空格，
     并且这里只在"确实是键盘操作"时才 click，避免部分浏览器里 click 事件冒泡导致弹两次 */
  drop.onclick = e => { e.preventDefault(); fileInput.click() }
  drop.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click() }
  })

  ;['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => {
    e.preventDefault(); e.stopPropagation(); drop.classList.add('over')
  }))
  ;['dragleave', 'dragend'].forEach(ev => drop.addEventListener(ev, e => {
    e.preventDefault(); drop.classList.remove('over')
  }))
  drop.addEventListener('drop', e => {
    e.preventDefault(); e.stopPropagation()
    drop.classList.remove('over')
    const dt = e.dataTransfer
    if (!dt) return
    const f = (dt.files && dt.files[0]) || null
    if (f) { handleFile(f); return }
    // 有些浏览器拖图片过来时 files 为空，得从 items 取
    const it = [...(dt.items || [])].find(i => i.kind === 'file' && i.type.startsWith('image/'))
    const g = it && it.getAsFile()
    if (g) handleFile(g)
    else toast('没读到图片，换个方式：点这里选图，或直接粘贴', 'err')
  })

  /* 整个窗口都接受拖放，避免拖到边上时浏览器直接打开图片、把页面顶掉 */
  ;['dragover', 'drop'].forEach(ev => window.addEventListener(ev, e => {
    if (e.target.closest && e.target.closest('#drop')) return
    e.preventDefault()
  }))

  fileInput.onchange = e => {
    const f = e.target.files && e.target.files[0]
    handleFile(f)
  }

  // 支持直接粘贴截图
  window.addEventListener('paste', e => {
    const items = e.clipboardData && e.clipboardData.items
    if (!items) return
    for (const it of items) {
      if (it.type && it.type.startsWith('image/')) {
        const f = it.getAsFile()
        if (f) { handleFile(f); e.preventDefault(); return }
      }
    }
  })

  async function handleFile(file) {
    /* 选文件的 input 有个坑：不清空 value 的话，再次选同一张图不会触发 change，
       表现就是"点了没反应"。所以无论成功失败，第一时间就清空。 */
    const reset = () => { try { fileInput.value = '' } catch { } }
    if (!file) { reset(); return }

    if (!file.type || !file.type.startsWith('image/')) {
      reset(); toast('请上传图片文件', 'err'); return
    }
    if (!AppConfig.hasApiKey) {
      reset()
      openSettings()
      toast('先填 API Key，再上传题目', 'err')
      return
    }

    status.className = 'ai-status loading'
    status.textContent = '正在识图…'
    $('ai-result').classList.add('hide')
    const t0 = performance.now()
    try {
      const rec = new Recognizer({ baseUrl: AppConfig.baseUrl, apiKey: AppConfig.apiKey, model: AppConfig.model })
      const { doc, issues } = await rec.recognize(file)
      const scene = DrawingDoc.toScene(doc)
      currentScene = scene
      player.load(scene)
      setMode('doc')
      $('doc-title').textContent = doc.meta.title
      renderVariants(null)
      document.querySelectorAll('.item').forEach(b => b.classList.remove('on'))
      showAiResult(doc, issues, Math.round(performance.now() - t0))
      status.className = 'ai-status ok'
      status.textContent = `识别完成 · ${doc.steps.length} 步`
    } catch (err) {
      status.className = 'ai-status err'
      status.textContent = '识别失败'
      showAiError(err)
    } finally {
      reset()
    }
  }

  function showAiResult(doc, issues, ms) {
    const card = $('ai-result')
    card.classList.remove('hide')
    const conf = doc.meta.confidence
    const level = conf == null ? '' : conf >= 0.85 ? 'high' : conf >= 0.65 ? 'mid' : 'low'
    card.innerHTML = `
      <div class="ai-summary">${escapeHtml(doc.meta.summary || '（模型未给出摘要）')}</div>
      <div class="ai-meta">
        ${conf == null ? '' : `<span class="conf ${level}">置信度 ${(conf * 100).toFixed(0)}%</span>`}
        <span class="muted">${ms} ms</span>
      </div>
      ${doc.warnings.length ? `<ul class="warns">${doc.warnings.map(w => `<li>${escapeHtml(w)}</li>`).join('')}</ul>` : ''}
      ${issues && issues.length ? `<details class="issues"><summary>${issues.length} 条自动修复</summary><ul>${issues.map(i => `<li>${escapeHtml(i.msg)}</li>`).join('')}</ul></details>` : ''}
    `
  }

  /* 把各种失败翻译成用户能照着做的提示 */
  function explainError(err) {
    const msg = String((err && err.message) || err || '未知错误')
    const name = (err && err.name) || ''
    const isFile = location.protocol === 'file:'
    if (name === 'AbortError' || /aborted|timeout|timed out|超时/i.test(msg)) {
      return {
        title: '请求超时（等了 2 分钟）',
        hints: ['图片可能太大或网络太慢 —— 现在已经会自动压缩到长边 1600px，若仍超时就换张清晰但小一点的图。', '也可能是接口地址填错、或该服务此刻不通。'],
        raw: msg,
      }
    }
    if (/413|图片太大/i.test(msg)) {
      return { title: '图片太大被接口拒绝（413）', hints: ['把照片裁到只保留题目部分，或降低分辨率再上传。'], raw: msg }
    }
    if (/Failed to fetch|NetworkError|ERR_FAILED|Load failed/i.test(msg)) {
      return {
        title: '网络请求被拦住',
        hints: [
          isFile
            ? '你现在是直接双击打开 HTML（file:// 协议）。部分浏览器会拦掉这种页面的跨域请求 —— 这是最常见的原因。'
            : '请求没能到达接口，可能是网络不通、接口地址写错，或对方不允许浏览器直接调用。',
          isFile ? '解决办法：用本地服务器打开，或改用下方"单文件版 + 支持 CORS 的接口"。' : '先确认 API Base URL 是否正确（OpenAI 官方是 https://api.openai.com/v1）。',
          '很多中转/代理接口默认不允许浏览器跨域调用，需要服务端放行 CORS，或改走本地代理。',
        ],
        raw: msg,
      }
    }
    if (/401|403|Unauthorized|invalid.*key|Incorrect API key/i.test(msg)) {
      return { title: 'API Key 无效或没有权限', hints: ['到设置里重新粘贴 Key，注意不要带空格或换行。'], raw: msg }
    }
    if (/404/.test(msg)) {
      return { title: '接口地址或模型名不对（404）', hints: ['检查 Base URL 末尾是否多了 /v1/v1，以及模型名是否被该服务支持。'], raw: msg }
    }
    if (/429|quota|rate limit/i.test(msg)) {
      return { title: '额度不足或被限流（429）', hints: ['稍后再试，或换一个 Key / 模型。'], raw: msg }
    }
    if (/timeout|timed out|ETIMEDOUT/i.test(msg)) {
      return { title: '请求超时', hints: ['图片可能太大，或网络太慢。可以换一张小一点的图再试。'], raw: msg }
    }
    if (/无法解析|无法从返回|解析出 JSON|不是合法 JSON|steps 缺失|没有任何可渲染|output|看不清/i.test(msg)) {
      return {
        title: '模型返回的内容没法当成图纸',
        hints: [
          '它可能没看懂图，或没按要求输出 JSON。换一个指令跟随更强的视觉模型（gpt-4o / qwen-vl-max / glm-4v）通常能解决。',
          '也可以把题目裁得更清楚一点再传。',
        ],
        raw: msg,
      }
    }
    return { title: '识别失败', hints: ['可以换一张更清晰的图，或在设置里换一个支持图片输入的模型。'], raw: msg }
  }

  function showAiError(err) {
    const card = $('ai-result')
    const info = explainError(err)
    card.classList.remove('hide')
    card.innerHTML = `<div class="ai-error"><b>${escapeHtml(info.title)}</b></div>
      <ul class="err-hints">${info.hints.map(h => `<li>${escapeHtml(h)}</li>`).join('')}</ul>
      <details class="issues"><summary>原始错误</summary><div class="raw">${escapeHtml(info.raw)}</div></details>`
  }

  /* ---------- 设置 ---------- */
  const modal = $('settings-modal')

  /* 直接双击 HTML 打开（file://）时，部分浏览器会把跨域请求拦成 "Failed to fetch"，
     这是"能选图但永远识别失败"最常见的原因，所以在设置里直接说清楚。 */
  function refreshNetWarn() {
    const box = $('net-warn')
    if (location.protocol !== 'file:') { box.classList.add('hide'); return }
    box.classList.remove('hide')
    box.innerHTML = `<b>当前是以 file:// 打开的</b><br>
      浏览器可能拦截对本接口的请求，症状就是选图后一直"识别失败 / Failed to fetch"。
      在项目目录下起一个本地服务器再访问即可：<br>
      <code>python -m http.server 8000</code><br>
      然后打开 <code>http://localhost:8000/index.html</code>`
  }

  function openSettings() {
    const cfg = AppConfig.get()
    $('cfg-baseurl').value = cfg.baseUrl || 'https://api.openai.com/v1'
    $('cfg-apikey').value = cfg.apiKey || ''
    $('cfg-model').value = cfg.model || 'gpt-4o'
    refreshNetWarn()
    modal.classList.remove('hide')
  }

  /* 连通性测试：先打 /models（不耗额度），失败再解释原因 */
  async function testConn() {
    const out = $('test-out')
    const cfg = {
      baseUrl: $('cfg-baseurl').value.trim() || 'https://api.openai.com/v1',
      apiKey: $('cfg-apikey').value.trim(),
      model: $('cfg-model').value.trim() || 'gpt-4o',
    }
    if (!cfg.apiKey) { out.className = 'test-out err'; out.textContent = '先填 API Key'; return }
    out.className = 'test-out wait'
    out.textContent = '正在连接…'
    const t0 = performance.now()
    try {
      const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/models`, {
        headers: { Authorization: `Bearer ${cfg.apiKey}` },
      })
      const ms = Math.round(performance.now() - t0)
      if (res.ok) {
        let names = []
        try { const j = await res.json(); names = (j.data || []).map(m => m.id).slice(0, 40) } catch { }
        const hit = names.length && !names.includes(cfg.model)
        out.className = 'test-out ok'
        out.textContent = `通了（${ms} ms）` + (hit ? `，但列表里没有 ${cfg.model}，确认下模型名` : '')
      } else {
        out.className = 'test-out err'
        out.textContent = `接口返回 ${res.status}：${(await res.text()).slice(0, 120)}`
      }
    } catch (e) {
      out.className = 'test-out err'
      out.textContent = explainError(e).title + '（详见识别失败时的提示）'
    }
  }

  $('btn-test').onclick = testConn
  $('btn-settings').onclick = openSettings
  $('btn-cancel-settings').onclick = () => modal.classList.add('hide')
  $('btn-save-settings').onclick = () => {
    AppConfig.save({
      baseUrl: $('cfg-baseurl').value.trim(),
      apiKey: $('cfg-apikey').value.trim(),
      model: $('cfg-model').value.trim(),
    })
    modal.classList.add('hide')
    toast('已保存', 'ok')
  }

  /* ---------- 导出 ---------- */
  $('btn-svg').onclick = () => render.exportSvg(currentScene ? currentScene.title : 'drawing')
  $('btn-png').onclick = () => render.exportPng(currentScene ? currentScene.title : 'drawing', 2)

  /* ---------- 键盘 ---------- */
  document.addEventListener('keydown', e => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return
    if (e.key === 'ArrowRight') { e.preventDefault(); player.next() }
    if (e.key === 'ArrowLeft') { e.preventDefault(); player.prev() }
    if (e.key === ' ') { e.preventDefault(); player.toggle() }
  })

  function toast(msg, kind) {
    const t = $('toast')
    t.textContent = msg
    t.className = 'toast show ' + (kind || '')
    clearTimeout(t._t)
    t._t = setTimeout(() => { t.className = 'toast' }, 2400)
  }

  // 默认示例
  loadTemplate('prism3', { sides: 5 })
  $('build-tag').textContent = AppConfig.BUILD
  if (!AppConfig.hasApiKey) {
    status.textContent = '未配置识别接口 · 可先用下方题库'
    status.className = 'ai-status'
  }
})
