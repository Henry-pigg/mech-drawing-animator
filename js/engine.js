/* Engine — Canvas 渲染器
 * 把 Paper 元素按图幅自适应缩放画出，支持逐步绘制动画
 */
class DrawEngine {
  constructor(canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.scale = 1
    this.ox = 0
    this.oy = 0
    this.resize()
    window.addEventListener('resize', () => { this.resize(); this._redraw() })
  }

  resize() {
    const r = this.canvas.getBoundingClientRect()
    this.W = Math.max(320, r.width || 900)
    this.H = Math.max(240, r.height || 560)
    this.canvas.width = this.W * this.dpr
    this.canvas.height = this.H * this.dpr
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    this._redraw()
  }

  setDrawing(drawing) {
    this.drawing = drawing
    const all = []
    drawing.steps.forEach(s => all.push(...s.els))
    const bb = Paper.bbox(all)
    const M = 24
    const sw = Math.max(10, bb.w), sh = Math.max(10, bb.h)
    this.scale = Math.min((this.W - 2 * M) / sw, (this.H - 2 * M) / sh, 9.5)
    this.ox = (this.W - bb.w * this.scale) / 2 - bb.x0 * this.scale
    this.oy = (this.H + bb.h * this.scale) / 2 + bb.y0 * this.scale
    this._redraw()
  }

  setState(state) { this.state = state; this._redraw() }

  _redraw() {
    if (this.drawing) this.draw(this.state || { step: 0, t: 1 })
    else {
      const ctx = this.ctx
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, this.W, this.H)
    }
  }

  tx(p) { return [this.ox + p[0] * this.scale, this.oy - p[1] * this.scale] }

  draw(state) {
    const ctx = this.ctx
    ctx.save()
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, this.W, this.H)
    ctx.strokeStyle = '#e2e6ea'
    ctx.lineWidth = 1
    ctx.strokeRect(10.5, 10.5, this.W - 21, this.H - 21)

    const steps = this.drawing.steps
    const si = Math.min(state.step, steps.length - 1)
    for (let k = 0; k <= si; k++) {
      const st = steps[k]
      const n = st.els.length
      const isCurrent = k === si
      const prog = isCurrent ? state.t : 1
      st.els.forEach((el, i) => {
        let local = 1
        if (isCurrent && n > 1) {
          const start = (i / n) * 0.62
          local = Math.max(0, Math.min(1, (prog - start) / 0.38))
        }
        if (local <= 0) return
        this.drawEl(el, local)
      })
    }
    ctx.restore()
  }

  styleOf(el) {
    const st = Paper.ST[el.st || 'solid'] || Paper.ST.solid
    return { w: (el.w != null ? el.w : st.w) * this.scale, dash: (el.dash || st.dash).map(d => d * this.scale) }
  }

  drawEl(el, p) {
    const ctx = this.ctx
    const { w, dash } = this.styleOf(el)
    ctx.save()
    ctx.lineWidth = Math.max(0.7, w)
    ctx.setLineDash(dash)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = el.color || (el.st === 'hidden' ? '#4a4a4a' : '#1a1a1a')
    ctx.fillStyle = el.color || '#1a1a1a'
    if (el.st === 'center') ctx.strokeStyle = el.color || '#5a6570'

    if (el.t === 'line') {
      const a = this.tx(el.a), b = this.tx(el.b)
      ctx.beginPath(); ctx.moveTo(a[0], a[1])
      ctx.lineTo(a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p)
      ctx.stroke()
    } else if (el.t === 'poly') {
      const pts = el.pts.map(q => this.tx(q))
      if (pts.length < 2) { ctx.restore(); return }
      const total = polyLen(pts)
      let target = total * p, acc = 0
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1])
      for (let i = 1; i < pts.length; i++) {
        const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
        if (acc + seg <= target) { ctx.lineTo(pts[i][0], pts[i][1]); acc += seg }
        else {
          const r = seg > 0 ? (target - acc) / seg : 1
          ctx.lineTo(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * r, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * r)
          break
        }
      }
      if (el.closed && p >= 1) ctx.closePath()
      if (el.fill) ctx.fill(); else ctx.stroke()
    } else if (el.t === 'circle') {
      const c = this.tx(el.c)
      ctx.beginPath()
      ctx.arc(c[0], c[1], Math.max(1, el.r * this.scale), -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p)
      ctx.stroke()
    } else if (el.t === 'arc') {
      const c = this.tx(el.c)
      let a0 = el.a0, a1 = el.a1
      while (a1 < a0) a1 += Math.PI * 2
      ctx.beginPath()
      ctx.arc(c[0], c[1], Math.max(1, el.r * this.scale), -a0, -(a0 + (a1 - a0) * p), true)
      ctx.stroke()
    } else if (el.t === 'dot') {
      if (p < 0.5) { ctx.restore(); return }
      const c = this.tx(el.p), r = Math.max(2, el.r * this.scale)
      ctx.beginPath(); ctx.arc(c[0], c[1], r, 0, Math.PI * 2)
      if (el.hollow) { ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke() }
      else ctx.fill()
    } else if (el.t === 'arrow') {
      if (p < 0.4) { ctx.restore(); return }
      const tip = this.tx(el.tip), from = this.tx(el.from)
      const d = [tip[0] - from[0], tip[1] - from[1]], L = Math.hypot(d[0], d[1]) || 1
      const u = [d[0] / L, d[1] / L], nn = [-u[1], u[0]]
      const len = Math.min(L, 9), wid = 3.2
      ctx.beginPath()
      ctx.moveTo(tip[0], tip[1])
      ctx.lineTo(tip[0] - u[0] * len + nn[0] * wid, tip[1] - u[1] * len + nn[1] * wid)
      ctx.lineTo(tip[0] - u[0] * len - nn[0] * wid, tip[1] - u[1] * len - nn[1] * wid)
      ctx.closePath(); ctx.fill()
    } else if (el.t === 'text') {
      if (p < 0.55) { ctx.restore(); return }
      const c = this.tx(el.p)
      let fs = el.size * this.scale
      fs = Math.max(10.5, Math.min(30, fs))
      ctx.font = `${el.italic ? 'italic ' : ''}${fs}px ${el.italic ? '"Times New Roman", "Songti SC", serif' : '"Segoe UI", "Microsoft YaHei", sans-serif'}`
      ctx.textAlign = el.anchor === 'start' ? 'left' : el.anchor === 'end' ? 'right' : 'center'
      ctx.textBaseline = 'middle'
      if (el.rot) {
        ctx.translate(c[0], c[1]); ctx.rotate(-el.rot)
        ctx.fillText(el.s, 0, 0)
      } else ctx.fillText(el.s, c[0], c[1])
    }
    ctx.restore()
  }
}

function polyLen(pts) {
  let s = 0
  for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
  return s
}
