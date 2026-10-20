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

  drop.onclick = () => fileInput.click()
  ;['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over') }))
  ;['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over') }))
  drop.addEventListener('drop', e => {
    const f = e.dataTransfer.files && e.dataTransfer.files[0]
    if (f) handleFile(f)
  })
  fileInput.onchange = e => { const f = e.target.files[0]; if (f) handleFile(f) }
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
    if (!file.type.startsWith('image/')) { toast('请上传图片文件', 'err'); return }
    if (!AppConfig.hasApiKey) { openSettings(); toast('先填 API Key，再上传题目', 'err'); return }
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
      showAiError(err.message)
    } finally {
      fileInput.value = ''
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

  function showAiError(msg) {
    const card = $('ai-result')
    card.classList.remove('hide')
    card.innerHTML = `<div class="ai-error">${escapeHtml(msg)}</div>
      <p class="hint">可以换一张更清晰的图，或在设置里换一个支持图片输入的模型。</p>`
  }

  /* ---------- 设置 ---------- */
  const modal = $('settings-modal')
  function openSettings() {
    const cfg = AppConfig.get()
    $('cfg-baseurl').value = cfg.baseUrl || 'https://api.openai.com/v1'
    $('cfg-apikey').value = cfg.apiKey || ''
    $('cfg-model').value = cfg.model || 'gpt-4o'
    modal.classList.remove('hide')
  }
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
  if (!AppConfig.hasApiKey) {
    status.textContent = '未配置识别接口 · 可先用下方题库'
    status.className = 'ai-status'
  }
})
