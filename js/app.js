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
  prism3: [
    { label: '三棱柱', params: { sides: 3 } },
    { label: '四棱柱', params: { sides: 4 } },
    { label: '五棱柱', params: { sides: 5 } },
    { label: '六棱柱', params: { sides: 6 } },
  ],
  pyramid3: [
    { label: '三棱锥', params: { sides: 3 } },
    { label: '四棱锥', params: { sides: 4 } },
    { label: '五棱锥', params: { sides: 5 } },
  ],
  line3: [
    { label: '一般位置直线', params: { kind: 'general' } },
    { label: '水平线', params: { kind: 'horizontal' } },
  ],
  coneCut: [
    { label: '椭圆', params: { kind: 'ellipse' } },
    { label: '抛物线', params: { kind: 'parabola' } },
    { label: '双曲线', params: { kind: 'hyperbola' } },
    { label: '圆', params: { kind: 'circle' } },
    { label: '三角形', params: { kind: 'triangle' } },
  ],
  prismCut: [
    { label: '30°', params: { angle: 30 } },
    { label: '45°', params: { angle: 45 } },
    { label: '60°', params: { angle: 60 } },
  ],
  cylCut: [
    { label: '25°', params: { angle: 25 } },
    { label: '35°', params: { angle: 35 } },
    { label: '50°', params: { angle: 50 } },
  ],
}

document.addEventListener('DOMContentLoaded', () => {
  const ALL = Object.assign({}, Templates.T, Templates2D.T)
  const canvas = document.getElementById('canvas')
  const engine = new DrawEngine(canvas)
  const ui = {
    btnPrev: document.getElementById('btn-prev'),
    btnPlay: document.getElementById('btn-play'),
    btnNext: document.getElementById('btn-next'),
    speedSelect: document.getElementById('speed-select'),
    stepCurrent: document.getElementById('step-current'),
    stepTotal: document.getElementById('step-total'),
    stepList: document.getElementById('step-list'),
    stepDesc: document.getElementById('step-desc'),
    stepTitle: document.getElementById('step-title'),
    partName: document.getElementById('current-part-name'),
  }
  const player = new Player(engine, ui)
  const variantBar = document.getElementById('variant-bar')
  let currentId = null, currentParams = {}

  // ---------- 题库列表 ----------
  const listBox = document.getElementById('template-list')
  CATS.forEach(([cat, name]) => {
    const items = Object.values(ALL).filter(t => t.cat === cat)
    if (!items.length) return
    const g = document.createElement('div')
    g.className = 'cat'
    const h = document.createElement('div')
    h.className = 'cat-h'
    h.textContent = name
    g.appendChild(h)
    items.forEach(t => {
      const b = document.createElement('button')
      b.className = 'template-item'
      b.textContent = t.name
      b.dataset.id = t.id
      b.onclick = () => load(t.id)
      g.appendChild(b)
    })
    listBox.appendChild(g)
  })

  function load(id, params) {
    const t = ALL[id]
    if (!t) return
    currentId = id
    const base = (VARIANTS[id] && VARIANTS[id][0].params) || {}
    currentParams = Object.assign({}, base, params || {})
    let d
    try {
      d = t.build(currentParams)
    } catch (err) {
      console.error(err)
      alert('生成失败：' + err.message)
      return
    }
    player.load(d)
    document.querySelectorAll('.template-item').forEach(b => b.classList.toggle('active', b.dataset.id === id))
    renderVariants(id)
    ui.partName.textContent = d.title
  }

  function renderVariants(id) {
    const vs = VARIANTS[id]
    variantBar.innerHTML = ''
    if (!vs) { variantBar.classList.add('hidden'); return }
    variantBar.classList.remove('hidden')
    vs.forEach(v => {
      const b = document.createElement('button')
      b.className = 'chip'
      b.textContent = v.label
      const same = Object.keys(v.params).every(k => currentParams[k] === v.params[k])
      if (same) b.classList.add('on')
      b.onclick = () => { currentParams = Object.assign({}, currentParams, v.params); load(id, currentParams) }
      variantBar.appendChild(b)
    })
  }

  // ---------- 交互 ----------
  const fileInput = document.getElementById('file-input')
  const overlay = document.getElementById('overlay-loading')
  const settingsModal = document.getElementById('settings-modal')
  document.getElementById('btn-upload').onclick = () => fileInput.click()
  fileInput.onchange = async e => {
    const file = e.target.files[0]
    if (!file) return
    if (!AppConfig.hasApiKey) {
      alert('请先点右上角 ⚙ 设置，填入 API Key')
      openSettings()
      return
    }
    overlay.classList.remove('hidden')
    try {
      const r = await new LLMRecognizer().recognize(file)
      if (!ALL[r.type]) throw new Error(`AI 判断的题型 "${r.type}" 不在题库中，请换一张更清晰的图`)
      load(r.type, r.params)
      const chip = document.createElement('div')
      chip.className = 'ai-note'
      chip.textContent = `AI 识别：${r.name || r.type}`
      variantBar.prepend(chip)
    } catch (err) {
      alert('识别失败：' + err.message)
    } finally {
      overlay.classList.add('hidden')
      fileInput.value = ''
    }
  }

  function openSettings() {
    const cfg = AppConfig.get()
    document.getElementById('cfg-baseurl').value = cfg.baseUrl || 'https://api.openai.com/v1'
    document.getElementById('cfg-apikey').value = cfg.apiKey || ''
    document.getElementById('cfg-model').value = cfg.model || 'gpt-4o'
    settingsModal.classList.remove('hidden')
  }
  document.getElementById('btn-settings').onclick = openSettings
  document.getElementById('btn-cancel-settings').onclick = () => settingsModal.classList.add('hidden')
  document.getElementById('btn-save-settings').onclick = () => {
    AppConfig.save({
      baseUrl: document.getElementById('cfg-baseurl').value,
      apiKey: document.getElementById('cfg-apikey').value,
      model: document.getElementById('cfg-model').value,
    })
    settingsModal.classList.add('hidden')
  }

  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return
    if (e.key === 'ArrowRight') player.next()
    if (e.key === 'ArrowLeft') player.prev()
    if (e.key === ' ') { e.preventDefault(); player.toggle() }
  })

  // 默认载入：五棱柱（对应最常见的棱柱取点题）
  load('prism3', { sides: 5 })
})
