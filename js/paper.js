/* Paper — 2D 图纸模型
 * 所有模板统一产出 paper 元素（单位 mm，y 轴向上）
 * 元素类型：line / poly / circle / arc / dot / text / arrow
 */
const Paper = (() => {
  const ST = {
    solid:  { w: 0.6,  dash: [] },              // 粗实线：可见轮廓
    thick:  { w: 0.9,  dash: [] },              // 加粗：图形答案
    thin:   { w: 0.15, dash: [] },              // 细实线：作图线/投影线
    hidden: { w: 0.3,  dash: [2.6, 1.3] },      // 细虚线
    center: { w: 0.15, dash: [9, 1.4, 1.4, 1.4] }, // 点划线
  }
  const C = {
    ink:  '#1a1a1a',
    con:  '#9aa3ad',   // 作图辅助线
    pick: '#c0392b',   // 求解结果/强调
    aux:  '#2c6fbb',   // 给定条件
    dim:  '#33404d',
  }
  let _id = 0

  const P = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1]],
    sub: (a, b) => [a[0] - b[0], a[1] - b[1]],
    mul: (a, k) => [a[0] * k, a[1] * k],
    len: a => Math.hypot(a[0], a[1]),
    unit: a => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l] },
    rot: (a, ang) => [a[0] * Math.cos(ang) - a[1] * Math.sin(ang), a[0] * Math.sin(ang) + a[1] * Math.cos(ang)],
    mid: (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
  }

  // ---------- 基础图元 ----------
  function line(a, b, st = 'solid', o = {}) {
    return { t: 'line', a, b, st, id: ++_id, ...o }
  }
  function poly(pts, st = 'solid', closed = false, o = {}) {
    return { t: 'poly', pts, closed, st, id: ++_id, ...o }
  }
  function circle(c, r, st = 'solid', o = {}) {
    return { t: 'circle', c, r, st, id: ++_id, ...o }
  }
  function arc(c, r, a0, a1, st = 'solid', o = {}) {
    return { t: 'arc', c, r, a0, a1, st, id: ++_id, ...o }
  }
  function dot(p, o = {}) {
    return { t: 'dot', p, r: 0.55, id: ++_id, ...o }
  }
  function text(p, s, o = {}) {
    return { t: 'text', p, s, size: 3.0, anchor: 'middle', id: ++_id, ...o }
  }
  function arrow(tip, from, o = {}) {
    return { t: 'arrow', tip, from, id: ++_id, ...o }
  }

  // 圆弧采样（用于导出/预览）
  function arcPts(c, r, a0, a1, step = 0.06) {
    let d = a1 - a0
    if (d < 0) d += Math.PI * 2
    const n = Math.max(6, Math.ceil(d / step))
    const out = []
    for (let i = 0; i <= n; i++) {
      const a = a0 + (d * i) / n
      out.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)])
    }
    return out
  }

  // ---------- 尺寸标注 ----------
  // 箭头长度（mm）
  const AH = 2.4, AW = 0.8

  function _arrowAt(tip, dir) { // dir 指向箭头尖端方向
    const d = P.unit(dir), n = [-d[1], d[0]]
    return poly([
      tip,
      [tip[0] - d[0] * AH + n[0] * AW, tip[1] - d[1] * AH + n[1] * AW],
      [tip[0] - d[0] * AH - n[0] * AW, tip[1] - d[1] * AH - n[1] * AW],
    ], 'dim', true, { fill: true, color: C.dim, noAnim: true, w: 0.15 })
  }

  // 水平尺寸：x1→x2，标注线在 y
  function dimH(x1, x2, y, txt, o = {}) {
    const els = [], s = o.size || 3.0, dir = x2 >= x1 ? 1 : -1
    const y0 = o.from ?? y
    els.push(line([x1, y0 + (o.gap ?? 1.2) * Math.sign(y - y0 || 1)], [x1, y + (y > y0 ? 1.5 : -1.5) * 0 + (y > y0 ? 1.5 : -1.5) * 0 + (y > y0 ? 1.5 : -1.5)], 'thin', { color: C.dim, noAnim: true }))
    els.push(line([x2, y0 + (o.gap ?? 1.2) * Math.sign(y - y0 || 1)], [x2, y + (y > y0 ? 1.5 : -1.5)], 'thin', { color: C.dim, noAnim: true }))
    els.push(line([x1, y], [x2, y], 'dim', { color: C.dim, noAnim: true }))
    els.push(_arrowAt([x2, y], [dir, 0]), _arrowAt([x1, y], [-dir, 0]))
    els.push(text([(x1 + x2) / 2, y + 1.9], txt, { size: s, color: C.dim, noAnim: true }))
    return els
  }

  // 竖直尺寸
  function dimV(y1, y2, x, txt, o = {}) {
    const els = [], s = o.size || 3.0, dir = y2 >= y1 ? 1 : -1
    const x0 = o.from ?? x
    els.push(line([x0 + (o.gap ?? 1.2) * Math.sign(x - x0 || 1), y1], [x + (x > x0 ? 1.5 : -1.5), y1], 'thin', { color: C.dim, noAnim: true }))
    els.push(line([x0 + (o.gap ?? 1.2) * Math.sign(x - x0 || 1), y2], [x + (x > x0 ? 1.5 : -1.5), y2], 'thin', { color: C.dim, noAnim: true }))
    els.push(line([x, y1], [x, y2], 'dim', { color: C.dim, noAnim: true }))
    els.push(_arrowAt([x, y2], [0, dir]), _arrowAt([x, y1], [0, -dir]))
    els.push(text([x - 1.4, (y1 + y2) / 2], txt, { size: s, color: C.dim, rot: -Math.PI / 2, noAnim: true }))
    return els
  }

  // 斜向尺寸（对齐标注）
  function dimAligned(a, b, off, txt, o = {}) {
    const els = [], s = o.size || 3.0
    const d = P.unit(P.sub(b, a)), n = [-d[1], d[0]]
    const pa = P.add(a, P.mul(n, off)), pb = P.add(b, P.mul(n, off))
    els.push(line(a, P.add(pa, P.mul(n, off > 0 ? 1.4 : -1.4)), 'thin', { color: C.dim, noAnim: true }))
    els.push(line(b, P.add(pb, P.mul(n, off > 0 ? 1.4 : -1.4)), 'thin', { color: C.dim, noAnim: true }))
    els.push(line(pa, pb, 'dim', { color: C.dim, noAnim: true }))
    els.push(_arrowAt(pb, d), _arrowAt(pa, P.mul(d, -1)))
    els.push(text(P.add(P.mid(pa, pb), P.mul(n, off > 0 ? 1.9 : -1.9)), txt,
      { size: s, color: C.dim, rot: Math.atan2(d[1], d[0]), noAnim: true }))
    return els
  }

  // 半径标注：从圆心指向圆周
  function dimR(c, r, ang, txt, o = {}) {
    const els = [], s = o.size || 3.0
    const p = [c[0] + r * Math.cos(ang), c[1] + r * Math.sin(ang)]
    const inner = [c[0] + r * 0.45 * Math.cos(ang), c[1] + r * 0.45 * Math.sin(ang)]
    const out = [c[0] + (r + 9) * Math.cos(ang), c[1] + (r + 9) * Math.sin(ang)]
    els.push(line(p, inner, 'dim', { color: C.dim, noAnim: true }))
    els.push(_arrowAt(p, [Math.cos(ang), Math.sin(ang)]))
    els.push(line([c[0] + r * 0.18 * Math.cos(ang), c[1] + r * 0.18 * Math.sin(ang)], out, 'thin',
      { color: C.dim, dash: [2, 1], noAnim: true }))
    const tp = [c[0] + (r + 10.5) * Math.cos(ang), c[1] + (r + 10.5) * Math.sin(ang)]
    els.push(text(tp, txt, { size: s, color: C.dim, anchor: Math.cos(ang) > 0.2 ? 'start' : Math.cos(ang) < -0.2 ? 'end' : 'middle', noAnim: true }))
    return els
  }

  // 直径标注
  function dimD(c, r, ang, txt, o = {}) {
    const els = [], s = o.size || 3.0
    const a = [c[0] - r * Math.cos(ang), c[1] - r * Math.sin(ang)]
    const b = [c[0] + r * Math.cos(ang), c[1] + r * Math.sin(ang)]
    els.push(line(a, b, 'dim', { color: C.dim, noAnim: true }))
    els.push(_arrowAt(b, [Math.cos(ang), Math.sin(ang)]), _arrowAt(a, [-Math.cos(ang), -Math.sin(ang)]))
    const tp = [c[0] + (r + 3) * Math.cos(ang), c[1] + (r + 3) * Math.sin(ang)]
    els.push(text(tp, txt, { size: s, color: C.dim, anchor: 'middle', noAnim: true }))
    return els
  }

  // 引出标注（文字带折线）
  function leader(p, dir, txt, o = {}) {
    const els = [], s = o.size || 3.0, L = o.len || 10
    const d = P.unit(dir), knee = P.add(p, P.mul(d, L)), end = P.add(knee, [d[0] > 0 ? 6 : -6, 0])
    els.push(poly([p, knee, end], 'thin', false, { color: C.dim, noAnim: true }))
    els.push(arrow(p, knee, { color: C.dim, noAnim: true }))
    els.push(text([end[0] + (d[0] > 0 ? 0.8 : -0.8), end[1] + 1.1], txt,
      { size: s, anchor: d[0] > 0 ? 'start' : 'end', color: C.dim, noAnim: true }))
    return els
  }

  // 点标记 + 投影连线
  function pointMark(p, label, o = {}) {
    const els = []
    const col = o.color || (o.hidden ? C.aux : C.pick)
    els.push(dot(p, { color: col, hollow: !!o.hidden, r: o.r || 0.62, noAnim: true }))
    if (label) {
      const off = o.off || [1.6, 1.6]
      els.push(text([p[0] + off[0], p[1] + off[1]], o.hidden ? `(${label})` : label,
        { size: o.size || 3.2, color: col, anchor: o.anchor || 'start', noAnim: true, italic: true }))
    }
    return els
  }

  // ---------- 包围盒 ----------
  function elPts(e) {
    if (e.t === 'line') return [e.a, e.b]
    if (e.t === 'arrow') return [e.tip, e.from]
    if (e.t === 'poly') return e.pts
    if (e.t === 'circle') return [[e.c[0] - e.r, e.c[1] - e.r], [e.c[0] + e.r, e.c[1] + e.r]]
    if (e.t === 'arc') return arcPts(e.c, e.r, e.a0, e.a1)
    if (e.t === 'dot') return [e.p]
    if (e.t === 'text') {
      const n = (e.s || '').length * (e.size || 3) * 0.72
      const w = e.anchor === 'start' ? [0, n] : e.anchor === 'end' ? [-n, 0] : [-n / 2, n / 2]
      return [[e.p[0] + w[0], e.p[1] - 1], [e.p[0] + w[1], e.p[1] + 1]]
    }
    return []
  }
  function bbox(els) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9
    els.forEach(e => elPts(e).forEach(p => {
      x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1])
      x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1])
    }))
    return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 }
  }

  /* ---------- 通用尺寸标注（对齐 / 水平 / 竖直，对应 DrawingDoc.dimension） ----------
   * 规则参考 GB/T 4457.4 / GB/T 16675.2：
   * 尺寸界线从轮廓外留 gap 起，超出尺寸线 extend；箭头为实心三角形；数字写在尺寸线上方且字头朝上。
   */
  function dimPrim(spec) {
    const {
      from, to, offset = 12, orientation = 'aligned', text: txt,
      arrow = 'both', gap = 1.6, extend = 2.4, arrowLen = 3.2, arrowW = 1.1, textGap = 3.2,
      size = 3.0, k = 1,
    } = spec
    const G = gap * k, EX = extend * k, AL = arrowLen * k, AW = arrowW * k, TG = textGap * k
    let dir
    if (orientation === 'horizontal') dir = [1, 0]
    else if (orientation === 'vertical') dir = [0, 1]
    else {
      const dx = to[0] - from[0], dy = to[1] - from[1], L = Math.hypot(dx, dy) || 1
      dir = [dx / L, dy / L]
    }
    const sign = offset >= 0 ? 1 : -1
    const dist = Math.abs(offset)
    const n = [-dir[1] * sign, dir[0] * sign]          // 左法向
    let d1, d2
    if (orientation === 'horizontal') {
      const y = from[1] + n[1] * dist
      d1 = [from[0], y]; d2 = [to[0], y]
    } else if (orientation === 'vertical') {
      const x = from[0] + n[0] * dist
      d1 = [x, from[1]]; d2 = [x, to[1]]
    } else {
      d1 = [from[0] + n[0] * dist, from[1] + n[1] * dist]
      d2 = [to[0] + n[0] * dist, to[1] + n[1] * dist]
    }
    if ((d2[0] - d1[0]) * dir[0] + (d2[1] - d1[1]) * dir[1] < 0) { const t = d1; d1 = d2; d2 = t }

    const els = []
    if (dist > 0.4) {
      ;[from, to].forEach(p => {
        els.push(line([p[0] + n[0] * G, p[1] + n[1] * G],
          [p[0] + n[0] * (dist + EX), p[1] + n[1] * (dist + EX)],
          'thin', { color: C.dim, noAnim: true }))
      })
    }
    els.push(line(d1, d2, 'dim', { color: C.dim, noAnim: true }))
    const tri = (tip, toward) => {
      const vx = toward[0] - tip[0], vy = toward[1] - tip[1], L = Math.hypot(vx, vy) || 1
      const ux = vx / L, uy = vy / L, bx = tip[0] + ux * AL, by = tip[1] + uy * AL
      return poly([tip, [bx - uy * AW / 2, by + ux * AW / 2], [bx + uy * AW / 2, by - ux * AW / 2]],
        'dim', true, { fill: true, color: C.dim, noAnim: true, w: 0.12 })
    }
    if (arrow === 'both' || arrow === 'start') els.push(tri(d1, d2))
    if (arrow === 'both' || arrow === 'end') els.push(tri(d2, d1))

    const mid = [(d1[0] + d2[0]) / 2, (d1[1] + d2[1]) / 2]
    let a = Math.atan2(d2[1] - d1[1], d2[0] - d1[0])
    while (a > Math.PI / 2) a -= Math.PI
    while (a < -Math.PI / 2) a += Math.PI
    if (Math.abs(a - Math.PI / 2) < 1e-6) a = -Math.PI / 2
    const val = txt != null && txt !== '' ? txt : String(Math.round(Math.hypot(d2[0] - d1[0], d2[1] - d1[1]) * 10) / 10)
    els.push(text([mid[0] + n[0] * TG, mid[1] + n[1] * TG], val,
      { size, color: C.dim, rot: a, noAnim: true }))
    return { els, measured: Math.hypot(d2[0] - d1[0], d2[1] - d1[1]) }
  }

  // 平移整组图元
  function translate(els, dx, dy) {
    const mv = p => p ? [p[0] + dx, p[1] + dy] : p
    return els.map(e => {
      const c = Object.assign({}, e)
      if (c.a) c.a = mv(c.a)
      if (c.b) c.b = mv(c.b)
      if (c.c) c.c = mv(c.c)
      if (c.p) c.p = mv(c.p)
      if (c.tip) c.tip = mv(c.tip)
      if (c.from) c.from = mv(c.from)
      if (c.pts) c.pts = c.pts.map(mv)
      return c
    })
  }

  return {
    ST, C, P, line, poly, circle, arc, dot, text, arrow, arcPts, bbox, dimPrim, translate,
    dimH, dimV, dimAligned, dimR, dimD, leader, pointMark, eps: 1e-9,
  }
})()
