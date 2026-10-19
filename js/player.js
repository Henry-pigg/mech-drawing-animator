class Player {
  constructor(engine) {
    this.engine = engine
    this.steps = []
    this.currentStep = -1
    this.playing = false
    this.speed = 1
    this.btnPrev = document.getElementById('btn-prev')
    this.btnPlay = document.getElementById('btn-play')
    this.btnNext = document.getElementById('btn-next')
    this.speedSelect = document.getElementById('speed-select')
    this.stepCurrent = document.getElementById('step-current')
    this.stepTotal = document.getElementById('step-total')
    this.stepList = document.getElementById('step-list')
    this.stepDesc = document.getElementById('step-desc')
    this.btnPrev.onclick = () => this.prev()
    this.btnNext.onclick = () => this.next()
    this.btnPlay.onclick = () => this.togglePlay()
    this.speedSelect.onchange = (e) => { this.speed = parseFloat(e.target.value) }
  }
  loadSteps(steps) {
    this.steps = steps
    this.currentStep = -1
    this.engine.clear()
    this._renderStepList()
    this._updateUI()
    this.stepTotal.textContent = steps.length
  }
  _renderStepList() {
    this.stepList.innerHTML = ''
    this.steps.forEach((step, i) => {
      const div = document.createElement('div')
      div.className = 'step-item'
      div.textContent = `${i+1}. ${step.desc.slice(0,30)}...`
      div.onclick = () => this.jumpTo(i)
      this.stepList.appendChild(div)
    })
  }
  _highlightStep() {
    const items = this.stepList.querySelectorAll('.step-item')
    items.forEach((el, i) => {
      el.classList.remove('current','done')
      if (i < this.currentStep) el.classList.add('done')
      if (i === this.currentStep) el.classList.add('current')
    })
  }
  _updateUI() {
    this.stepCurrent.textContent = this.currentStep + 1
    this.btnPrev.disabled = this.currentStep <= 0
    this.btnNext.disabled = this.currentStep >= this.steps.length - 1
    this.btnPlay.disabled = this.steps.length === 0
    if (this.currentStep >= 0 && this.steps[this.currentStep]) {
      this.stepDesc.textContent = this.steps[this.currentStep].desc
    }
    this._highlightStep()
  }
  async next() {
    if (this.currentStep >= this.steps.length - 1) return
    this.currentStep++
    this._updateUI()
    await this._animateStep(this.currentStep)
    if (this.playing && this.currentStep < this.steps.length - 1) {
      setTimeout(() => this.next(), 800 / this.speed)
    } else if (this.currentStep >= this.steps.length - 1) {
      this.playing = false
      this.btnPlay.textContent = '▶ 播放'
    }
  }
  prev() {
    if (this.currentStep <= 0) return
    this.playing = false
    this.btnPlay.textContent = '▶ 播放'
    this.currentStep--
    this.engine.clear()
    for (let i = 0; i <= this.currentStep; i++) this.engine.drawStepComplete(this.steps[i])
    this._updateUI()
  }
  jumpTo(i) {
    this.playing = false
    this.btnPlay.textContent = '▶ 播放'
    this.currentStep = i
    this.engine.clear()
    for (let j = 0; j <= i; j++) this.engine.drawStepComplete(this.steps[j])
    this._updateUI()
  }
  togglePlay() {
    if (this.playing) {
      this.playing = false
      this.btnPlay.textContent = '▶ 播放'
    } else {
      this.playing = true
      this.btnPlay.textContent = '⏸ 暂停'
      if (this.currentStep >= this.steps.length - 1) {
        this.currentStep = -1
        this.engine.clear()
      }
      this.next()
    }
  }
  _animateStep(stepIdx) {
    return new Promise(resolve => {
      const step = this.steps[stepIdx]
      const elements = step.elements
      let elIdx = 0, progress = 0
      const animate = () => {
        if (elIdx >= elements.length) { resolve(); return }
        progress += 0.08
        if (progress >= 1) progress = 1
        this.engine.clear()
        for (let i = 0; i < stepIdx; i++) this.engine.drawStepComplete(this.steps[i])
        for (let i = 0; i < elIdx; i++) this.engine.drawElement(elements[i], 1)
        this.engine.drawElement(elements[elIdx], progress)
        if (progress >= 1) { elIdx++; progress = 0 }
        requestAnimationFrame(animate)
      }
      animate()
    })
  }
}
