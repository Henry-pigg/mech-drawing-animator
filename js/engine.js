class DrawEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext('2d')
    this.clear()
  }
  clear() {
    this.ctx.fillStyle = '#fff'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
  }
  drawElement(el, progress = 1) {
    const ctx = this.ctx
    ctx.save()
    switch (el.type) {
      case 'centerline':
        this._drawLine(el.x1, el.y1, el.x2, el.y2, progress, '#333', 0.8, [12,4,2,4])
        break
      case 'line':
        this._drawLine(el.x1, el.y1, el.x2, el.y2, progress, '#000', 2)
        break
      case 'rect':
        this._drawRect(el.x, el.y, el.w, el.h, progress)
        break
      case 'circle':
        this._drawCircle(el.cx, el.cy, el.r, progress, el.dashed)
        break
      case 'arc':
        this._drawArc(el.cx, el.cy, el.r, el.startAngle, el.endAngle, progress)
        break
      case 'dim':
        this._drawDim(el, progress)
        break
    }
    ctx.restore()
  }
  _drawLine(x1, y1, x2, y2, progress, color, width, dash = []) {
    const ctx = this.ctx
    ctx.strokeStyle = color
    ctx.lineWidth = width
    ctx.setLineDash(dash)
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x1 + (x2-x1)*progress, y1 + (y2-y1)*progress)
    ctx.stroke()
  }
  _drawRect(x, y, w, h, progress) {
    const ctx = this.ctx
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2.5
    ctx.setLineDash([])
    ctx.beginPath()
    const dist = 2*(w+h) * progress
    ctx.moveTo(x, y)
    if (dist > 0) {
      const d1 = Math.min(dist, w)
      ctx.lineTo(x+d1, y)
      if (dist > w) {
        const d2 = Math.min(dist-w, h)
        ctx.lineTo(x+w, y+d2)
        if (dist > w+h) {
          const d3 = Math.min(dist-w-h, w)
          ctx.lineTo(x+w-d3, y+h)
          if (dist > w+h+w) {
            ctx.lineTo(x, y+h-(dist-w-h-w))
          }
        }
      }
    }
    ctx.stroke()
  }
  _drawCircle(cx, cy, r, progress, dashed = false) {
    const ctx = this.ctx
    ctx.strokeStyle = '#000'
    ctx.lineWidth = dashed ? 0.8 : 2
    ctx.setLineDash(dashed ? [12,4,2,4] : [])
    ctx.beginPath()
    ctx.arc(cx, cy, r, -Math.PI/2, -Math.PI/2 + Math.PI*2*progress)
    ctx.stroke()
  }
  _drawArc(cx, cy, r, startAngle, endAngle, progress) {
    const ctx = this.ctx
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(cx, cy, r, startAngle, startAngle + (endAngle-startAngle)*progress)
    ctx.stroke()
  }
  _drawDim(el, progress) {
    const ctx = this.ctx
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(el.x1, el.y1)
    ctx.lineTo(el.x1 + (el.x2-el.x1)*progress, el.y1 + (el.y2-el.y1)*progress)
    ctx.stroke()
    if (el.text && progress > 0.5) {
      ctx.fillStyle = '#000'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(el.text, (el.x1+el.x2)/2, el.y1 - 5)
    }
  }
  drawStepComplete(step) {
    step.elements.forEach(el => this.drawElement(el, 1))
  }
}
