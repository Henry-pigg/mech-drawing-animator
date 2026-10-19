/* Player — 步骤播放器 */
class Player {
  constructor(engine, ui) {
    this.engine = engine
    this.ui = ui
    this.steps = []
    this.current = 0
    this.t = 0
    this.playing = false
    this.speed = 1
    this.last = 0
    this._raf = null
    this._loop = this._loop.bind(this)
    this.ui.btnPrev.onclick = () => this.prev()
    this.ui.btnNext.onclick = () => this.next()
    this.ui.btnPlay.onclick = () => this.toggle()
    this.ui.speedSelect.onchange = e => { this.speed = parseFloat(e.target.value) }
  }

  load(drawing) {
    this.drawing = drawing
    this.steps = drawing.steps
    this.current = 0
    this.t = 1
    this.playing = false
    this.engine.setDrawing(drawing)
    this.renderStepList()
    this.update()
    this.engine.setState({ step: 0, t: 1 })
  }

  renderStepList() {
    const box = this.ui.stepList
    box.innerHTML = ''
    this.steps.forEach((s, i) => {
      const d = document.createElement('div')
      d.className = 'step-item'
      d.innerHTML = `<span class="idx">${i + 1}</span><span class="tt">${s.title.replace(/^\d+[.、]\s*/, '')}</span>`
      d.onclick = () => this.jump(i)
      box.appendChild(d)
    })
  }

  update() {
    const s = this.steps[this.current]
    this.ui.stepCurrent.textContent = this.current + 1
    this.ui.stepTotal.textContent = this.steps.length
    this.ui.stepDesc.textContent = s ? s.desc : '—'
    this.ui.stepTitle.textContent = s ? s.title : ''
    this.ui.partName.textContent = this.drawing.title || ''
    this.ui.btnPrev.disabled = this.current <= 0
    this.ui.btnNext.disabled = this.current >= this.steps.length - 1
    this.ui.btnPlay.disabled = this.steps.length === 0
    this.ui.btnPlay.textContent = this.playing ? '⏸ 暂停' : (this.current >= this.steps.length - 1 ? '↻ 重播' : '▶ 播放')
    ;[...this.ui.stepList.children].forEach((el, i) => {
      el.classList.toggle('current', i === this.current)
      el.classList.toggle('done', i < this.current)
    })
    const cur = this.ui.stepList.children[this.current]
    if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' })
  }

  jump(i) {
    this.playing = false
    this.current = Math.max(0, Math.min(this.steps.length - 1, i))
    this.t = 1
    this.engine.setState({ step: this.current, t: 1 })
    this.update()
  }

  next() {
    if (this.current < this.steps.length - 1) {
      this.current++
      this.t = 1
      this.engine.setState({ step: this.current, t: 1 })
      this.update()
    }
  }

  prev() {
    this.playing = false
    if (this.current > 0) this.current--
    this.t = 1
    this.engine.setState({ step: this.current, t: 1 })
    this.update()
  }

  toggle() {
    if (this.playing) { this.playing = false; this.update(); return }
    if (this.current >= this.steps.length - 1) {
      this.current = 0
      this.t = 0
      this.engine.setState({ step: 0, t: 0 })
    }
    this.playing = true
    this.last = performance.now()
    this.update()
    if (!this._raf) this._raf = requestAnimationFrame(this._loop)
  }

  _loop(now) {
    this._raf = null
    if (!this.playing) return
    const dt = Math.min(80, now - this.last)
    this.last = now
    const dur = 1600 / this.speed
    this.t += dt / dur
    if (this.t >= 1) {
      this.t = 1
      this.engine.setState({ step: this.current, t: 1 })
      if (this.current < this.steps.length - 1) {
        this.current++
        this.t = 0
        this.update()
        this.engine.setState({ step: this.current, t: 0 })
        this.last = performance.now()
      } else {
        this.playing = false
        this.update()
        return
      }
    } else {
      this.engine.setState({ step: this.current, t: this.t })
    }
    this._raf = requestAnimationFrame(this._loop)
  }
}
