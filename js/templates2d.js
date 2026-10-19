/* Templates2D — 几何作图 / 零件 题库 */
const Templates2D = (() => {
  const P = Paper.P, TAU = Math.PI * 2, C = Paper.C, D2R = Math.PI / 180
  const T = {}
  const def = (id, cat, name, build, tip = '') => { T[id] = { id, cat, name, build, tip } }
  const step = (title, desc, els) => ({ title, desc, els: (els || []).filter(Boolean) })
  const polar = (c, r, a) => [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]
  const ang = (c, p) => Math.atan2(p[1] - c[1], p[0] - c[0])

  // 圆心在 O、半径 r：与另一圆 (c2,r2) 的交点（求连接弧圆心用）
  function circleX(c1, r1, c2, r2) {
    const d = Math.hypot(c2[0] - c1[0], c2[1] - c1[1])
    if (d > r1 + r2 || d < Math.abs(r1 - r2) || d === 0) return []
    const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d)
    const h = Math.sqrt(Math.max(0, r1 * r1 - a * a))
    const mx = c1[0] + a * (c2[0] - c1[0]) / d, my = c1[1] + a * (c2[1] - c1[1]) / d
    const ux = -(c2[1] - c1[1]) / d, uy = (c2[0] - c1[0]) / d
    return [[mx + h * ux, my + h * uy], [mx - h * ux, my - h * uy]]
  }
  // 弧（角度制，逆时针从 a0 到 a1）
  const arc = (c, r, a0, a1, st = 'solid', o = {}) => Paper.arc(c, r, a0 * D2R, a1 * D2R, st, o)

  /* =========================================================
   * 吊钩平面图形（对应教材 1-8 图）
   * ========================================================= */
  def('hook', 'draw', '吊钩平面图形（圆弧连接）', () => {
    const O = [0, 0], R40 = 40, R20 = 20
    const SX = 10, PY = 8, TOP = 85, SHOULDER = 70
    const TIP = [-Math.sqrt(34 * 34 - 13 * 13), -13]      // 钩尖圆心：距 O 34、向下 13
    // 右 R15：与 x=SX 相切、与 R40 外切
    const cr = [SX + 15, Math.sqrt(55 * 55 - (SX + 15) ** 2)]
    // 左 R15：与 x=-SX 相切、与 R20 外切
    const cl = [-(SX + 15), Math.sqrt(35 * 35 - (SX + 15) ** 2)]
    // R34：与 R40 内切、与 R4 外切
    const angTip = Math.atan2(TIP[1], TIP[0])
    const c34 = (() => {
      const rO = R40 - 34, d = 38
      const cos = (d * d - rO * rO - 34 * 34) / (-2 * rO * 34)
      const t = Math.acos(Math.max(-1, Math.min(1, cos)))
      return [rO * Math.cos(angTip + t), rO * Math.sin(angTip + t)]
    })()
    // R32：与 R20 内切、与 R4 外切
    const c32 = (() => {
      const rO = 32 - 20, d = 36
      const cos = (d * d - rO * rO - 34 * 34) / (-2 * rO * 34)
      const t = Math.acos(Math.max(-1, Math.min(1, cos)))
      return [rO * Math.cos(angTip + t), rO * Math.sin(angTip + t)]
    })()
    const T = {
      pR40: polar(O, R40, Math.atan2(cr[1], cr[0])),
      pTip34: polar(TIP, 4, Math.atan2(c34[1] - TIP[1], c34[0] - TIP[0])),
      pR34: polar(O, R40, Math.atan2(c34[1], c34[0])),
      pR20L: polar(O, R20, Math.atan2(cl[1], cl[0])),
      pTip32: polar(TIP, 4, Math.atan2(c32[1] - TIP[1], c32[0] - TIP[0])),
      pR20_32: polar(O, R20, Math.atan2(c32[1], c32[0])),
    }
    const deg = p => Math.atan2(p[1], p[0]) * 180 / Math.PI
    // 从 p1 到 p2 的弧，dir=+1 逆时针 / -1 顺时针
    function arcDir(c, r, p1, p2, dir, st = 'thick', o = {}) {
      let a0 = ang(c, p1) / D2R, a1 = ang(c, p2) / D2R
      if (dir > 0) { while (a1 < a0) a1 += 360 } else { while (a1 > a0) a1 -= 360 }
      const lo = Math.min(a0, a1), hi = Math.max(a0, a1)
      return arc(c, r, lo, hi, st, { color: C.pick, ...o })
    }
    const L = (a, b, st = 'thick', o = {}) => Paper.line(a, b, st, { color: C.pick, ...o })
    const CON = { color: '#c8ced6', dash: [1.8, 1.4], noAnim: true, w: 0.1 }
    const cpt = (p, txt, off) => [Paper.dot(p, { color: C.aux, r: 0.45, noAnim: true }),
      Paper.text([p[0] + off[0], p[1] + off[1]], txt, { size: 2.6, color: C.aux, anchor: 'middle', noAnim: true })]

    // 1 基准线
    const s1 = [
      Paper.line([-48, 0], [48, 0], 'center'),
      Paper.line([0, -48], [0, 98], 'center'),
      Paper.line([-46, -13], [TIP[0] + 10, -13], 'center'),
      Paper.line([TIP[0], -22], [TIP[0], -4], 'center'),
    ]
    // 2 已知线段
    const s2 = [
      L([-5, TOP], [5, TOP]), L([5, TOP], [PY, TOP - 3]), L([PY, TOP - 3], [PY, SHOULDER]),
      L([-PY, SHOULDER], [-PY, TOP - 3]), L([-PY, TOP - 3], [-5, TOP]),
      L([PY, SHOULDER], [SX, SHOULDER]), L([-SX, SHOULDER], [-PY, SHOULDER]),
      L([SX, SHOULDER], [SX, cr[1]]), L([-SX, SHOULDER], [-SX, cl[1]]),
      arcDir(O, R40, T.pR40, T.pR34, -1),
      arcDir(O, R20, T.pR20L, T.pR20_32, +1),
      Paper.circle(TIP, 4, 'thick', { color: C.pick }),
    ]
    // 3 右 R15
    const s3 = [
      Paper.circle(cr, 15, 'thin', CON),
      Paper.line(cr, [SX, cr[1]], 'thin', CON),
      ...cpt(cr, 'O1', [4, 3]),
      arcDir(cr, 15, [SX, cr[1]], T.pR40, +1),
    ]
    // 4 左 R15
    const s4 = [
      Paper.circle(cl, 15, 'thin', CON),
      Paper.line(cl, [-SX, cl[1]], 'thin', CON),
      ...cpt(cl, 'O2', [-4, 3]),
      arcDir(cl, 15, [-SX, cl[1]], T.pR20L, -1),
    ]
    // 5 钩尖
    const s5 = [
      Paper.circle(c34, 34, 'thin', CON),
      Paper.circle(c32, 32, 'thin', CON),
      ...cpt(c34, 'O3', [0, -4]),
      ...cpt(c32, 'O4', [4, -3]),
      arcDir(c34, 34, T.pR34, T.pTip34, -1),
      arcDir(c32, 32, T.pR20_32, T.pTip32, -1),
      arcDir(TIP, 4, T.pTip34, T.pTip32, +1),
    ]
    // 6 尺寸
    const s6 = [
      ...Paper.dimV(0, TOP, -30, '85', { from: -46 }),
      ...Paper.dimV(-13, 0, -44, '13', { from: -46 }),
      ...Paper.dimH(-PY, PY, TOP + 9, 'Ø16', { from: TOP }),
      ...Paper.dimH(-SX, SX, SHOULDER - 14, 'Ø20', { from: SHOULDER - 10 }),
      ...Paper.dimV(SHOULDER, TOP, 18, '16', { from: PY }),
      ...Paper.leader([PY + 0.8, TOP - 2], [1, 1.2], 'C3', { len: 9 }),
      ...Paper.leader(polar(cr, 15, -52 * D2R), [1, 0.3], 'R15', { len: 8 }),
      ...Paper.leader(polar(cl, 15, -38 * D2R), [-1, 0.25], 'R15', { len: 8 }),
      ...Paper.leader(polar(c34, 34, 214 * D2R), [0.5, -0.85], 'R34', { len: 9 }),
      ...Paper.leader(polar(c32, 32, 236 * D2R), [-0.45, -0.9], 'R32', { len: 9 }),
      ...Paper.leader(polar(TIP, 4, 168 * D2R), [-1, 0.15], 'R4', { len: 7 }),
      ...Paper.leader(polar(O, 40, 24 * D2R), [0.75, -0.66], 'R40', { len: 11 }),
      ...Paper.leader(polar(O, 20, -38 * D2R), [0.65, -0.76], 'R20', { len: 11 }),
    ]
    return {
      title: '吊钩平面图形',
      steps: [
        step('1. 画基准线', '定出圆心 O（R40、R20 的公共圆心）、竖直中心线，以及钩尖中心线——它距 O 向下 13。', s1),
        step('2. 画已知线段', '已知线段可直接按尺寸画出：R40 外圆、R20 内圆、Ø20 两条竖线、Ø16 顶圆及 C3 倒角，总高 85。', s2),
        step('3. 右 R15 连接弧', 'R15 同时与 Ø20 右侧竖线、R40 外圆相切：圆心距竖线 15、距 O 为 55，两条件交点即 O₁。', s3),
        step('4. 左 R15 连接弧', '左 R15 与 Ø20 左侧竖线、R20 内圆相切：圆心距竖线 15、距 O 为 20+15=35，得 O₂。', s4),
        step('5. 求钩尖连接弧', 'R34 与 R40 内切（圆心距 O 为 6）、与 R4 外切（距钩尖 38）；R32 与 R20 内切（距 O 12）、与 R4 外切（距钩尖 36）。作两段辅助圆弧求交点 O₃、O₄。', s5),
        step('6. 标注尺寸', '定形尺寸：Ø16、Ø20、R40、R20、R34、R32、R15、R4、C3；定位尺寸：85、13、16。', s6),
        step('7. 作图要领', '先画已知线段 → 再画中间线段 → 最后画连接线段。每一步都是"求圆心、定切点、画弧"三件事。', []),
      ],
    }
  })

  /* =========================================================
   * 圆弧连接四例
   * ========================================================= */
  def('arcConn', 'draw', '圆弧连接（四种基本形式）', () => {
    const panels = []
    const L = (a, b, st = 'thick', o = {}) => Paper.line(a, b, st, { color: C.pick, ...o })
    // ① 两直线间
    {
      const V = [10, 8], R = 9, half = 30 * D2R
      const bis = 30 * D2R
      const d = R / Math.sin(half)
      const c = [V[0] + d * Math.cos(bis), V[1] + d * Math.sin(bis)]
      const t1 = [c[0], V[1]]
      const t2 = [V[0] + (c[0] - V[0]) * Math.cos(2 * bis), V[1] + (c[0] - V[0]) * Math.sin(2 * bis)]
      const els = [
        L(V, [V[0] + 30, V[1]], 'solid'), L(V, [V[0] + 24 * Math.cos(60 * D2R), V[1] + 24 * Math.sin(60 * D2R)], 'solid'),
        arc(c, R, ang(c, t1) / D2R, ang(c, t2) / D2R, 'thick', { color: C.pick }),
        Paper.dot(c, { color: C.aux, r: 0.45, noAnim: true }),
        ...Paper.leader(polar(c, R, 40 * D2R), [1, 0.2], 'R', { len: 5 }),
      ]
      panels.push({ o: [0, 0], els, label: '① 两直线间' })
    }
    // ② 直线与圆弧
    {
      const lineY = 10, c1 = [34, 26], r1 = 8, R = 12
      const c = [c1[0], lineY + R]
      // 与圆外切：|c-c1| = r1+R
      const dx = Math.sqrt((r1 + R) ** 2 - (c[1] - c1[1]) ** 2)
      c[0] = c1[0] - dx
      const t1 = [c[0], lineY], t2 = polar(c1, r1, ang(c1, c) / 1)
      const a2 = ang(c1, c)
      const els = [
        L([6, lineY], [46, lineY], 'solid'),
        Paper.arc(c1, r1, 0, TAU, 'solid', { color: C.pick }),
        arc(c, R, ang(c, t1) / D2R, ang(c, t2) / D2R, 'thick', { color: C.pick }),
        Paper.dot(c, { color: C.aux, r: 0.45, noAnim: true }),
        ...Paper.leader(polar(c, R, 75 * D2R), [1, 0.3], 'R', { len: 5 }),
      ]
      panels.push({ o: [0, -36], els, label: '② 直线与圆弧' })
    }
    // ③ 两圆弧外切
    {
      const c1 = [14, 14], r1 = 7, c2 = [36, 22], r2 = 5, R = 10
      const cs = circleX(c1, r1 + R, c2, r2 + R)
      const c = cs[0] || cs[1]
      const els = [
        Paper.arc(c1, r1, 0, TAU, 'solid', { color: C.pick }),
        Paper.arc(c2, r2, 0, TAU, 'solid', { color: C.pick }),
        arc(c, R, ang(c, polar(c1, r1, ang(c1, c))) / D2R, ang(c, polar(c2, r2, ang(c2, c))) / D2R, 'thick', { color: C.pick }),
        Paper.dot(c, { color: C.aux, r: 0.45, noAnim: true }),
        ...Paper.leader(polar(c, R, 200 * D2R), [-1, -0.3], 'R', { len: 5 }),
      ]
      panels.push({ o: [58, 0], els, label: '③ 两圆弧外切' })
    }
    // ④ 两圆弧内切
    {
      const c1 = [72, 14], r1 = 7, c2 = [94, 22], r2 = 5, R = 24
      const cs = circleX(c1, Math.abs(R - r1), c2, Math.abs(R - r2))
      const c = cs[0] || cs[1]
      const els = [
        Paper.arc(c1, r1, 0, TAU, 'solid', { color: C.pick }),
        Paper.arc(c2, r2, 0, TAU, 'solid', { color: C.pick }),
        arc(c, R, ang(c, polar(c1, r1, ang(c1, c))) / D2R, ang(c, polar(c2, r2, ang(c2, c))) / D2R, 'thick', { color: C.pick }),
        Paper.dot(c, { color: C.aux, r: 0.45, noAnim: true }),
        ...Paper.leader(polar(c, R, 150 * D2R), [-1, 0.2], 'R', { len: 5 }),
      ]
      panels.push({ o: [58, -36], els, label: '④ 两圆弧内切' })
    }
    const els1 = [], els2 = [], els3 = [], els4 = []
    const groups = [els1, els2, els3, els4]
    panels.forEach((p, i) => {
      const moved = p.els.map(e => {
        const copy = { ...e }
        if (copy.a) copy.a = [copy.a[0] + p.o[0], copy.a[1] + p.o[1]]
        if (copy.b) copy.b = [copy.b[0] + p.o[0], copy.b[1] + p.o[1]]
        if (copy.p) copy.p = [copy.p[0] + p.o[0], copy.p[1] + p.o[1]]
        if (copy.c) copy.c = [copy.c[0] + p.o[0], copy.c[1] + p.o[1]]
        if (copy.pts) copy.pts = copy.pts.map(q => [q[0] + p.o[0], q[1] + p.o[1]])
        if (copy.tip) copy.tip = [copy.tip[0] + p.o[0], copy.tip[1] + p.o[1]]
        if (copy.from) copy.from = [copy.from[0] + p.o[0], copy.from[1] + p.o[1]]
        return copy
      })
      groups[i].push(...moved)
      groups[i].push(Paper.text([p.o[0] + 26, p.o[1] - 6], p.label, { size: 3.2, color: '#333', noAnim: true }))
    })
    return {
      title: '圆弧连接（四种基本形式）',
      steps: [
        step('① 两直线间圆弧连接', '作与两直线距离均为 R 的平行线，交点即连接弧圆心；过圆心作两直线的垂线得切点。', els1),
        step('② 直线与圆弧连接', '作与直线相距 R 的平行线；以已知圆心为圆心、r+R 为半径画弧，与平行线的交点即圆心。', els2),
        step('③ 两圆弧外切', '分别以两已知圆心为圆心，以 r₁+R、r₂+R 为半径画弧，交点即连接弧圆心（外切相加）。', els3),
        step('④ 两圆弧内切', '以 |R-r₁|、|R-r₂| 为半径画弧求交点（内切相减）。', els4),
        step('⑤ 总结', '求连接弧圆心：外切用 r+R，内切用 |R-r|；切点在两圆心连线上。', []),
      ],
    }
  })

  /* =========================================================
   * 零件图
   * ========================================================= */
  def('shaft', 'part', '阶梯轴零件图', () => {
    const segs = [{ d: 20, l: 55 }, { d: 30, l: 70 }, { d: 25, l: 45 }]
    const total = segs.reduce((s, x) => s + x.l, 0)
    const x0 = -total / 2, zc = 0
    const els = [Paper.line([x0 - 6, 0], [x0 + total + 6, 0], 'center')]
    let x = x0
    const steps = [step('1. 画中心线', '回转体零件先画轴线。', els.slice())]
    const body = []
    segs.forEach((s, i) => {
      const h = s.d / 2
      body.push(Paper.line([x, -h], [x + s.l, -h], 'thick', { color: C.pick }))
      body.push(Paper.line([x, h], [x + s.l, h], 'thick', { color: C.pick }))
      if (i > 0) body.push(Paper.line([x, -h], [x, -segs[i - 1].d / 2], 'thick', { color: C.pick }))
      if (i > 0) body.push(Paper.line([x, h], [x, segs[i - 1].d / 2], 'thick', { color: C.pick }))
      x += s.l
    })
    body.push(Paper.line([x, -segs[2].d / 2], [x, segs[2].d / 2], 'thick', { color: C.pick }))
    body.push(Paper.line([x0, -segs[0].d / 2], [x0, segs[0].d / 2], 'thick', { color: C.pick }))
    steps.push(step('2. 画轮廓', '按各段直径和长度，上下对称画出阶梯轮廓。', body))
    const dims = []
    let dx = x0
    segs.forEach(s => {
      dims.push(...Paper.dimH(dx, dx + s.l, -30, String(s.l)))
      dims.push(...Paper.leader([dx + s.l / 2, s.d / 2], [0, 1], 'Ø' + s.d, { len: 9 }))
      dx += s.l
    })
    dims.push(...Paper.dimH(x0, x0 + total, -44, String(total)))
    steps.push(step('3. 标注尺寸', '径向尺寸用 Ø，轴向尺寸按分段标注，最后标总长。', dims))
    return { title: '阶梯轴', steps }
  })

  def('flange', 'part', '法兰盘零件图', () => {
    const od = 90, id = 45, bc = 70, n = 6, bd = 10, th = 18
    const c = [0, 0]
    const s1 = [Paper.line([-od / 2 - 8, 0], [od / 2 + 8, 0], 'center'), Paper.line([0, -od / 2 - 8], [0, od / 2 + 8], 'center')]
    const s2 = [
      Paper.circle(c, od / 2, 'thick', { color: C.pick }),
      Paper.circle(c, id / 2, 'thick', { color: C.pick }),
      Paper.circle(c, bc / 2, 'center'),
    ]
    const holes = []
    for (let i = 0; i < n; i++) {
      const a = TAU * i / n + Math.PI / 2
      holes.push(Paper.circle([bc / 2 * Math.cos(a), bc / 2 * Math.sin(a)], bd / 2, 'thick', { color: C.pick }))
      holes.push(Paper.line([0, 0], [bc / 2 * Math.cos(a), bc / 2 * Math.sin(a)], 'center'))
    }
    const dims = [
      ...Paper.dimD(c, od / 2, -35 * D2R, 'Ø' + od),
      ...Paper.dimD(c, id / 2, 145 * D2R, 'Ø' + id),
      ...Paper.leader([bc / 2 * Math.cos(30 * D2R), bc / 2 * Math.sin(30 * D2R)], [0.8, -0.6], 'Ø' + bc, { len: 12 }),
      ...Paper.leader([bc / 2 + bd / 2, 0], [1, 0.2], '6×Ø' + bd, { len: 10 }),
    ]
    return {
      title: '法兰盘',
      steps: [
        step('1. 画中心线', '十字中心线定圆心，螺栓孔分布圆用点划线。', s1),
        step('2. 画外圆与内孔', `外径 Ø${od}，内孔 Ø${id}。`, s2),
        step('3. 画螺栓孔', `${n} 个 Ø${bd} 螺栓孔均匀分布在 Ø${bc} 的分布圆上。`, holes),
        step('4. 标注尺寸', '直径尺寸尽量标注在非圆视图上，此处用引出标注。', dims),
      ],
    }
  })

  def('bracket', 'part', 'L 形支架零件图', () => {
    const bl = 70, bw = 40, h = 55, t = 14, hd = 14
    const s1 = [Paper.line([-8, 0], [bl + 12, 0], 'center'), Paper.line([0, -8], [0, h + 10], 'center')]
    const s2 = [
      Paper.poly([[-bl / 2, 0], [bl / 2, 0], [bl / 2, t], [-bl / 2 + t, t], [-bl / 2 + t, h], [-bl / 2, h]], 'thick', true, { color: C.pick }),
    ]
    const s3 = [
      Paper.circle([-bl / 2 + t / 2, h - t - 8], hd / 2, 'thick', { color: C.pick }),
      Paper.line([-bl / 2 + t / 2 - 12, h - t - 8], [-bl / 2 + t / 2 + 12, h - t - 8], 'center'),
      Paper.line([-bl / 2 + t / 2, h - t - 8 - 12], [-bl / 2 + t / 2, h - t - 8 + 12], 'center'),
    ]
    const s4 = [
      ...Paper.dimH(-bl / 2, bl / 2, -14, String(bl)),
      ...Paper.dimV(0, h, bl / 2 + 10, String(h)),
      ...Paper.dimV(0, t, -bl / 2 - 10, String(t)),
      ...Paper.leader([-bl / 2 + t / 2 + hd / 2, h - t - 8], [1, 0.3], 'Ø' + hd, { len: 10 }),
    ]
    return {
      title: 'L 形支架',
      steps: [
        step('1. 画基准线', '以底面和左侧面为基准。', s1),
        step('2. 画 L 形轮廓', `底板长 ${bl}、厚 ${t}，立板高 ${h}。`, s2),
        step('3. 画安装孔', `立板上 Ø${hd} 安装孔，中心距底面 ${h - t - 8}。`, s3),
        step('4. 标注尺寸', '先标定形尺寸（长、高、厚、孔径），再标定位尺寸。', s4),
      ],
    }
  })

  return { T, list: () => Object.values(T), get: id => T[id], def }
})()
