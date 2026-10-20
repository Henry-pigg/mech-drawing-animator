/* Player — 按步回放（动画由 SVG/CSS 驱动，这里只管节奏与状态） */
class Player {
  constructor(render, ui) {
    this.render = render
    this.ui = ui
    this.scene = null
    this.steps = []
    this.index = 0
    this.playing = false
    this.speed = 1
    this._timer = null
    this.ui.btnPrev.onclick = () => this.prev()
    this.ui.btnNext.onclick = () => this.next()
    this.ui.btnPlay.onclick = () => this.toggle()
    this.ui.btnReset.onclick = () => this.goTo(0)
    this.ui.speedSelect.onchange = e => { this.speed = parseFloat(e.target.value) }
  }

  load(scene) {
    this.scene = scene
    this.steps = scene.steps
    this.index = 0
    this.playing = false
    clearTimeout(this._timer)
    this.render.setScene(scene)
    this.render.showStep(0)
    this.renderSteps()
    this.update()
  }

  renderSteps() {
    const box = this.ui.stepList
    box.innerHTML = ''
    this.steps.forEach((s, i) => {
      const b = document.createElement('button')
      b.className = 'step'
      b.innerHTML = `<span class="n">${i + 1}</span><span class="t">${escapeHtml(s.title)}</span>`
      b.onclick = () => this.goTo(i)
      box.appendChild(b)
    })
  }

  update() {
    const s = this.steps[this.index]
    this.ui.stepCurrent.textContent = this.index + 1
    this.ui.stepTotal.textContent = this.steps.length
    this.ui.stepTitle.textContent = s ? s.title : ''
    this.ui.stepDesc.innerHTML = s ? richText(s.desc || '') : ''
    this.ui.btnPrev.disabled = this.index <= 0
    this.ui.btnNext.disabled = this.index >= this.steps.length - 1
    this.ui.btnPlay.disabled = !this.steps.length
    this.ui.btnPlay.textContent = this.playing ? '⏸ 暂停' : (this.index >= this.steps.length - 1 ? '↻ 重播' : '▶ 播放')
    ;[...this.ui.stepList.children].forEach((el, i) => {
      el.classList.toggle('cur', i === this.index)
      el.classList.toggle('done', i < this.index)
    })
    const cur = this.ui.stepList.children[this.index]
    if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' })
  }

  goTo(i) {
    this.playing = false
    clearTimeout(this._timer)
    this.index = Math.max(0, Math.min(this.steps.length - 1, i))
    this.render.showStep(this.index)
    this.update()
  }

  next() {
    if (this.index < this.steps.length - 1) {
      this.playing = false
      clearTimeout(this._timer)
      this.index++
      this.render.showStep(this.index)
      this.update()
    }
  }

  prev() {
    if (this.index > 0) {
      this.playing = false
      clearTimeout(this._timer)
      this.index--
      this.render.showStep(this.index)
      this.update()
    }
  }

  toggle() {
    if (this.playing) { this.playing = false; clearTimeout(this._timer); this.update(); return }
    if (this.index >= this.steps.length - 1) {
      this.index = 0
      this.render.showStep(0)
    }
    this.playing = true
    this.update()
    this._advance()
  }

  _advance() {
    const dur = 900 / this.speed + 520
    this._timer = setTimeout(() => {
      if (!this.playing) return
      if (this.index < this.steps.length - 1) {
        this.index++
        this.render.showStep(this.index)
        this.update()
        this._advance()
      } else {
        this.playing = false
        this.update()
      }
    }, dur)
  }
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function richText(t) {
  return escapeHtml(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
}
