/* Templates — 画法几何 / 三视图 题库
 * 每个模板 build(prm) 返回 { title, steps:[{title,desc,els}] }
 */
const Templates = (() => {
  const P = Paper.P, TAU = Math.PI * 2, C = Paper.C
  const T = {}
  function def(id, cat, name, build, tip = '') { T[id] = { id, cat, name, build, tip } }
  const step = (title, desc, els) => ({ title, desc, els: (els || []).filter(Boolean) })

  /* ---------- 抽象三视图布局（点线面投影） ---------- */
  function planeScene(W, H, D, gap = 13) {
    const map = {
      front: (u, v) => [u, v],
      top: (u, v) => [u, -gap - v],          // v: 0=后, D=前
      left: (u, v) => [W + gap + u, v],      // u: 0=后, D=前
    }
    return { W, H, D, gap, map, sheet: { x0: -10, x1: W + gap + D + 10, y0: -gap - D - 12, y1: H + 12 } }
  }

  function axes(ps) {
    const els = [], { W, H, D, gap, map } = ps
    const ln = (a, b) => els.push(Paper.line(a, b, 'center', { color: '#5a6570' }))
    const tx = (p, s, an = 'start') => els.push(Paper.text(p, s, { size: 2.8, color: '#5a6570', anchor: an }))
    ln(map.front(-6, 0), map.front(W + 5, 0)); tx(map.front(W + 6, 0), 'X')
    ln(map.front(0, -6), map.front(0, H + 5)); tx(map.front(0, H + 7), 'Z', 'middle')
    tx(map.front(-2.5, -2.6), 'O')
    ln(map.top(-6, 0), map.top(W + 5, 0)); tx(map.top(W + 6, 0), 'X')
    ln(map.top(0, 0), map.top(0, D + 5)); tx(map.top(0, D + 7), 'Y', 'middle')
    tx(map.top(-2.5, -2.6), 'O')
    ln(map.left(0, 0), map.left(D + 5, 0)); tx(map.left(D + 6, 0), 'Y')
    ln(map.left(0, -5), map.left(0, H + 5)); tx(map.left(0, H + 7), 'Z', 'middle')
    tx(map.left(-2.5, -2.6), 'O')
    const p0 = [W + gap, -gap]
    els.push(Paper.line(p0, [p0[0] + D + 4, p0[1] - D - 4], 'thin', { color: C.con, dash: [2, 1.4], noAnim: true }))
    return els
  }

  /* =========================================================
   * 一、点线面投影
   * ========================================================= */
  def('point3', 'point', '点的三面投影', (prm = {}) => {
    const x = prm.x ?? 34, y = prm.y ?? 20, z = prm.z ?? 26
    const W = 48, H = 38, D = 30
    const ps = planeScene(W, H, D), M = ps.map
    const aF = M.front(x, z), aT = M.top(x, y), aL = M.left(y, z)
    const x45 = W - aT[1]
    return {
      title: `点的三面投影 A(${x}, ${y}, ${z})`,
      steps: [
        step('1. 建立三投影面体系', '画出 OX、OZ、OY 三条投影轴，并在右下方作 45° 辅助线——它是俯视图与左视图之间"宽相等"的桥梁。', axes(ps)),
        step('2. 作正面投影 a′', `在 V 面内：自 O 点向右量取 x=${x}，向上量取 z=${z}，得 a′。`, [Paper.pointMark(aF, 'a′', { color: C.aux, off: [-1.6, 1.6], anchor: 'end' })]),
        step('3. 作水平投影 a', `由 a′ 向下作投影连线（长对正）；在 H 面内量取 y=${y}，得 a。`, [
          Paper.line([aF[0], aF[1] - 1.5], [aT[0], aT[1] + 1.5], 'thin', { color: C.con, dash: [2.2, 1.4], noAnim: true }),
          ...Paper.pointMark(aT, 'a', { color: C.pick, off: [1.6, -1.8] }),
        ]),
        step('4. 作侧面投影 a″', '由 a 向右引水平线交 45° 线，再竖直向上（宽相等）；与 a′ 引出的水平线相交，得 a″。', [
          Paper.line([aT[0] + 1.5, aT[1]], [x45, aT[1]], 'thin', { color: C.con, dash: [2.2, 1.4], noAnim: true }),
          Paper.line([x45, aT[1]], [x45, aL[1]], 'thin', { color: C.con, dash: [2.2, 1.4], noAnim: true }),
          Paper.line([aF[0] + 1.5, aF[1]], [aL[0] + 3, aL[1]], 'thin', { color: C.con, dash: [2.2, 1.4], noAnim: true }),
          ...Paper.pointMark(aL, 'a″', { color: C.pick, off: [1.6, 1.6] }),
        ]),
        step('5. 归纳', 'a′a ⊥ OX（长对正）；a′a″ ⊥ OZ（高平齐）；aa″ 由 45° 线保证（宽相等）。这就是三视图的三条基本规律。', []),
      ],
    }
  })

  def('line3', 'point', '直线的三面投影', (prm = {}) => {
    const kind = prm.kind || 'general'
    const W = 50, H = 42, D = 34
    const ps = planeScene(W, H, D), M = ps.map
    let A, B
    if (kind === 'horizontal') { A = [12, 18, 24]; B = [40, 18, 24] }
    else { A = [10, 10, 10]; B = [40, 28, 30] }
    const pr = (p, k) => k === 'front' ? [p[0], p[2]] : k === 'top' ? [p[0], p[1]] : [p[1], p[2]]
    const seg = k => Paper.line(M[k](...pr(A, k)), M[k](...pr(B, k)), 'thick', { color: C.pick })
    const labs = k => [
      ...Paper.pointMark(M[k](...pr(A, k)), k === 'front' ? 'a′' : k === 'top' ? 'a' : 'a″', { color: C.aux, off: [-1.6, -1.8], anchor: 'end' }),
      ...Paper.pointMark(M[k](...pr(B, k)), k === 'front' ? 'b′' : k === 'top' ? 'b' : 'b″', { color: C.aux, off: [1.6, 1.6] }),
    ]
    return {
      title: kind === 'horizontal' ? '水平线的三面投影' : '一般位置直线的三面投影',
      steps: [
        step('1. 定出两端点', '先按坐标在三个投影面内定出 A、B 两点的各面投影。', [...axes(ps), ...labs('front'), ...labs('top'), ...labs('left')]),
        step('2. 连正面投影', '同面投影相连：a′b′ 即直线 AB 的正面投影。', [seg('front')]),
        step('3. 连水平投影', 'ab 为水平投影，与 a′b′ 长对正。', [seg('top')]),
        step('4. 连侧面投影', 'a″b″ 为侧面投影，由 45° 线保证宽相等。', [seg('left')]),
        step('5. 投影特性', kind === 'horizontal'
          ? '水平线平行于 H 面：水平投影反映实长，与 OX 轴的夹角反映真实倾角；正面、侧面投影分别平行于 OX、OY 轴且长度缩短。'
          : '一般位置直线与三个投影面都倾斜：三面投影均短于实长，也不反映真实倾角。求实长需用直角三角形法。', []),
      ],
    }
  })

  def('plane3', 'point', '平面的三面投影（正垂面）', () => {
    const W = 54, H = 44, D = 36
    const ps = planeScene(W, H, D), M = ps.map
    const A = [12, 10, 16], B = [46, 34, 33], Cc = [26, 30, 23]
    const pr = (p, k) => k === 'front' ? [p[0], p[2]] : k === 'top' ? [p[0], p[1]] : [p[1], p[2]]
    const tri = k => Paper.poly([M[k](...pr(A, k)), M[k](...pr(B, k)), M[k](...pr(Cc, k))], 'thick', true, { color: C.pick })
    const labs = k => [A, B, Cc].map((p, i) =>
      Paper.text(M[k](...pr(p, k)), ['a', 'b', 'c'][i] + (k === 'front' ? '′' : k === 'left' ? '″' : ''), { size: 3, color: C.aux }))
    return {
      title: '正垂面的三面投影',
      steps: [
        step('1. 建立投影体系', '仍用三投影面体系与 45° 辅助线。', axes(ps)),
        step('2. 定出三顶点', 'A、B、C 三点的 z 坐标满足 z = 0.5x + 10：三点共面，且该面垂直于 V 面。', [...labs('front'), ...labs('top'), ...labs('left')]),
        step('3. 正面投影', '正垂面垂直于 V 面，正面投影积聚成一条斜线 a′b′c′——这是投影面垂直面最重要的特性。', [tri('front')]),
        step('4. 水平投影', '水平投影 abc 是三角形，但不反映实形。', [tri('top')]),
        step('5. 侧面投影', '侧面投影同样是三角形，也不反映实形。', [tri('left')]),
        step('6. 结论', '投影面垂直面的投影特性：一个投影积聚成线，另外两个投影为类似形。', []),
      ],
    }
  })

  /* =========================================================
   * 二、基本体三视图 + 表面取点
   * ========================================================= */
  const SOLID_STEPS = (S, axis, tips) => [
    step('1. 画基准线', '先画中心线和基准线，确定三个视图的位置。', S.centerLines(axis)),
    step('2. 画俯视图', tips.top, S.outline('top')),
    step('3. 画主视图', tips.front, S.outline('front')),
    step('4. 画左视图', tips.left, [...S.line45(), ...S.outline('left')]),
  ]

  def('prism3', 'solid', '棱柱三视图与表面取点', (prm = {}) => {
    const n = prm.sides ?? 5, R = prm.R ?? 30, h = prm.h ?? 45
    const m = GEO.prism({ n, R, h, rot: Math.PI / 2 })
    const S = Views.scene([m], { gap: 14 })
    const faceP = (i, t, zf) => {
      const a0 = Math.PI / 2 + i * TAU / n, a1 = a0 + TAU / n
      const a = a0 + (a1 - a0) * t
      return [R * Math.cos(a), R * Math.sin(a), zf * h]
    }
    const A = faceP(0, 0.45, 0.58)
    const B = faceP(3, 0.40, 0.62)
    const pa = S.point(A, 'a', { vis: { top: true } })
    const pb = S.point(B, 'b', { vis: { top: true } })
    return {
      title: `${n} 棱柱三视图与表面取点`,
      steps: [
        ...SOLID_STEPS(S, { cx: 0, cy: 0 }, {
          top: `${n} 棱柱的俯视图反映底面实形（正 ${n} 边形），主、左视图为矩形。`,
          front: '按"长对正"由俯视图向上投影，高度取 h，得主视图。前棱线把主视图分成两块可见棱面。',
          left: '按"高平齐、宽相等"由 45° 线求得左视图，后面的棱线不可见，画虚线。',
        }),
        step('5. 已知条件', 'a′ 在前左棱面上，可见；(b′) 在右后棱面上，正面投影被前面遮挡，加括号表示不可见。',
          [...pa.parts.front, ...pb.parts.front]),
        step('6. 求 A 的另外两投影', '由 a′ 向下作投影连线，交俯视图前左棱边得 a（可见）；再由 a 经 45° 线求得 a″。',
          [...pa.links.ft, ...pa.parts.top, ...pa.links.tl, ...pa.parts.left]),
        step('7. 求 B 的另外两投影', '由 (b′) 向下作投影连线，交俯视图右后棱边得 b；B 在右侧棱面上，左视图投影不可见，记作 (b″)。',
          [...pb.links.ft, ...pb.parts.top, ...pb.links.tl, ...pb.parts.left]),
        step('8. 检查', '长对正：a′、a 在同一竖直线上；高平齐：a′、a″ 在同一水平线上；宽相等：由 45° 线保证。', []),
      ],
    }
  })

  def('pyramid3', 'solid', '棱锥三视图与表面取点', (prm = {}) => {
    const n = prm.sides ?? 4, R = prm.R ?? 28, h = prm.h ?? 46
    const m = GEO.pyramid({ n, R, h, rot: Math.PI / 4 })
    const S = Views.scene([m], { gap: 14 })
    const fp = (fi, s, t) => {
      const f = m.faces[fi]
      const A0 = m.verts[f[0]], B0 = m.verts[f[1]], C0 = m.verts[f[2]]
      return GEO.lerp3(GEO.lerp3(A0, B0, s), C0, t)
    }
    const A = fp(0, 0.45, 0.5)
    const B = fp(2, 0.55, 0.35)
    const pa = S.point(A, 'a', { vis: { top: true } })
    const pb = S.point(B, 'b', { vis: { top: false } })
    const fB = m.faces[2]
    const baseB = GEO.lerp3(m.verts[fB[0]], m.verts[fB[1]], 0.55)
    const apex = m.verts[m.verts.length - 1]
    const aux = ['front', 'top', 'left'].map(k => {
      const Vv = GEO.view(k)
      return Paper.line(S.map(k, GEO.dot(baseB, Vv.u), GEO.dot(baseB, Vv.v)),
        S.map(k, GEO.dot(apex, Vv.u), GEO.dot(apex, Vv.v)),
        'thin', { color: C.aux, dash: [2.4, 1.4], noAnim: true })
    })
    return {
      title: `${n} 棱锥三视图与表面取点`,
      steps: [
        ...SOLID_STEPS(S, { cx: 0, cy: 0 }, {
          top: '底面为正多边形，俯视图反映实形；锥顶的投影在中心。',
          front: '主视图为三角形，底边为底面投影，顶点为锥顶。',
          left: '左视图同样是三角形，按高平齐、宽相等作出。',
        }),
        step('5. 已知条件', 'a′、b′ 分别在左前、右后棱面上。', [...pa.parts.front, ...pb.parts.front]),
        step('6. 求 A 的另外两投影', 'A 在左前棱面上：由 a′ 向下作投影连线，落在该棱面的水平投影内得 a；再由 45° 线求 a″。',
          [...pa.links.ft, ...pa.parts.top, ...pa.links.tl, ...pa.parts.left]),
        step('7. 用辅助素线求 B', '过锥顶 S 与 B 作辅助素线并延长到基边：先求基边点的三面投影，再在素线上定出 B。这是棱锥表面取点的基本方法。',
          [...aux, ...pb.links.ft, ...pb.parts.top, ...pb.links.tl, ...pb.parts.left]),
        step('8. 注意', '棱锥表面取点：点所在棱面在某个视图中不可见时，该投影也应加括号。', []),
      ],
    }
  })

  def('cylinder3', 'solid', '圆柱三视图与表面取点', (prm = {}) => {
    const r = prm.r ?? 22, h = prm.h ?? 46
    const m = GEO.cylinder({ r, h, seg: 72 })
    const S = Views.scene([m], { gap: 14 })
    const P3 = (th, zf) => [r * Math.cos(th), r * Math.sin(th), zf * h]
    const A = P3(Math.PI * 0.66, 0.62)
    const B = P3(-Math.PI * 0.33, 0.4)
    const pa = S.point(A, 'a', { vis: { top: true } })
    const pb = S.point(B, 'b', { vis: { top: true } })
    const aux = ['front', 'top', 'left'].map(k => {
      const Vv = GEO.view(k)
      return Paper.line(S.map(k, GEO.dot([B[0], B[1], 0], Vv.u), GEO.dot([B[0], B[1], 0], Vv.v)),
        S.map(k, GEO.dot([B[0], B[1], h], Vv.u), GEO.dot([B[0], B[1], h], Vv.v)),
        'thin', { color: C.aux, dash: [2.4, 1.4], noAnim: true })
    })
    return {
      title: '圆柱三视图与表面取点',
      steps: [
        ...SOLID_STEPS(S, { cx: 0, cy: 0 }, {
          top: '俯视图为圆，反映底面实形；圆心处画十字中心线。',
          front: '主视图为矩形，左右两条竖线是圆柱的最左、最右素线（转向轮廓线）。',
          left: '左视图与主视图完全相同，也是矩形。',
        }),
        step('5. 已知条件', 'a′ 在前半圆柱面上（可见），(b′) 在后半圆柱面上（不可见，加括号）。', [...pa.parts.front, ...pb.parts.front]),
        step('6. 求 A 的另外两投影', '由 a′ 向下作投影连线，交俯视图前半圆得 a；再由 45° 线求 a″，A 在左侧，a″ 可见。',
          [...pa.links.ft, ...pa.parts.top, ...pa.links.tl, ...pa.parts.left]),
        step('7. 用辅助素线求 B', 'B 在圆柱面上，过 B 作竖直辅助素线（俯视图为一根径向线），先求素线的各面投影，再在素线上定 B。',
          [...aux, ...pb.links.ft, ...pb.parts.top, ...pb.links.tl, ...pb.parts.left]),
        step('8. 要点', '圆柱面取点：水平投影一定落在圆周上——这是"积聚性"带来的便利。', []),
      ],
    }
  })

  def('cone3', 'solid', '圆锥三视图与表面取点', (prm = {}) => {
    const r = prm.r ?? 25, h = prm.h ?? 48
    const m = GEO.cone({ r, h, seg: 72 })
    const S = Views.scene([m], { gap: 14 })
    const P3 = (th, zf) => [r * (1 - zf) * Math.cos(th), r * (1 - zf) * Math.sin(th), zf * h]
    const A = P3(Math.PI * 0.62, 0.55)
    const B = P3(Math.PI * 0.18, 0.35)
    const pa = S.point(A, 'a', { vis: { top: true } })
    const pb = S.point(B, 'b', { vis: { top: true } })
    const rr = r * (1 - 0.35), zb = 0.35 * h
    const aux = [
      Paper.circle(S.map('top', 0, 0), rr, 'thin', { color: C.aux, dash: [2.4, 1.4], noAnim: true }),
      Paper.line(S.map('front', -rr, zb), S.map('front', rr, zb), 'thin', { color: C.aux, dash: [2.4, 1.4], noAnim: true }),
      Paper.line(S.map('left', -rr, zb), S.map('left', rr, zb), 'thin', { color: C.aux, dash: [2.4, 1.4], noAnim: true }),
    ]
    return {
      title: '圆锥三视图与表面取点',
      steps: [
        ...SOLID_STEPS(S, { cx: 0, cy: 0 }, {
          top: '俯视图为圆，圆心即锥顶的投影。',
          front: '主视图为等腰三角形，两腰是最左、最右素线。',
          left: '左视图与主视图相同。',
        }),
        step('5. 已知条件', 'a′、b′ 均在圆锥面上。', [...pa.parts.front, ...pb.parts.front]),
        step('6. 求 A 的另外两投影', '由 a′ 向下作投影连线，交俯视图相应半径圆得 a；再求 a″。',
          [...pa.links.ft, ...pa.parts.top, ...pa.links.tl, ...pa.parts.left]),
        step('7. 用辅助纬圆求 B', '过 B 作水平辅助平面，与圆锥面交出一个纬圆：俯视图为圆，主、左视图为水平线。B 的各投影必在该纬圆的同面投影上。',
          [...aux, ...pb.links.ft, ...pb.parts.top, ...pb.links.tl, ...pb.parts.left]),
        step('8. 两种方法', '圆锥表面取点有两种方法：辅助素线法、辅助纬圆法。纬圆法对回转体通用，更稳妥。', []),
      ],
    }
  })

  def('sphere3', 'solid', '圆球三视图与表面取点', (prm = {}) => {
    const r = prm.r ?? 28
    const m = GEO.sphere({ r, seg: 48, rings: 26, c: [0, 0, r] })
    const S = Views.scene([m], { gap: 14 })
    const LL = (lon, lat) => [r * Math.cos(lat) * Math.cos(lon), r * Math.cos(lat) * Math.sin(lon), r + r * Math.sin(lat)]
    const A = LL(Math.PI * 0.7, Math.PI * 0.12)
    const B = LL(Math.PI * 1.35, -Math.PI * 0.3)
    const pa = S.point(A, 'a', { vis: { top: true } })
    const pb = S.point(B, 'b', { vis: { top: false } })
    const rr = r * Math.cos(Math.PI * 0.12), zb = r + r * Math.sin(Math.PI * 0.12)
    const aux = [
      Paper.circle(S.map('top', 0, 0), rr, 'thin', { color: C.aux, dash: [2.4, 1.4], noAnim: true }),
      Paper.line(S.map('front', -rr, zb), S.map('front', rr, zb), 'thin', { color: C.aux, dash: [2.4, 1.4], noAnim: true }),
      Paper.line(S.map('left', -rr, zb), S.map('left', rr, zb), 'thin', { color: C.aux, dash: [2.4, 1.4], noAnim: true }),
    ]
    return {
      title: '圆球三视图与表面取点',
      steps: [
        step('1. 画中心线', '球的三视图都是等径圆，先画十字中心线。', S.centerLines({ cx: 0, cy: 0 })),
        step('2. 三个视图', `以球心为圆心、R=${r} 画圆，三个视图完全相同。三个圆分别是球面对三个投影面的转向轮廓线。`,
          [...S.outline('top'), ...S.outline('front'), ...S.line45(), ...S.outline('left')]),
        step('3. 已知条件', 'a′、b′ 在球面上。', [...pa.parts.front, ...pb.parts.front]),
        step('4. 用辅助纬圆求 A', '过 A 作水平纬圆：俯视图为圆（半径由 a′ 的高度决定），主视图为一条水平线。A 的 a 必在该圆上。',
          [...aux, ...pa.links.ft, ...pa.parts.top, ...pa.links.tl, ...pa.parts.left]),
        step('5. 求 B', 'B 在球的左后下方：由 b′ 与辅助纬圆求得 b，再由 45° 线求 b″。注意判断各投影的可见性。',
          [...pb.links.ft, ...pb.parts.top, ...pb.links.tl, ...pb.parts.left]),
        step('6. 要点', '球面取点只能用辅助纬圆法；三个投影都没有积聚性，必须借助纬圆。', []),
      ],
    }
  })

  /* =========================================================
   * 三、截交与相贯
   * ========================================================= */
  def('prismCut', 'cut', '四棱柱截交（正垂面）', (prm = {}) => {
    const a = 34, h = 52, ang = (prm.angle ?? 32) * Math.PI / 180
    const m = GEO.prism({ n: 4, R: a / Math.SQRT2, h, rot: Math.PI / 4 })
    const nrm = [Math.sin(ang), 0, Math.cos(ang)]
    const d = nrm[2] * h * 0.72
    const cut = GEO.cut(m, { n: nrm, d }, false)
    const S = Views.scene([cut], { gap: 14 })
    const zAt = x => (d - nrm[0] * x) / nrm[2]
    const trace = [Paper.line(S.map('front', -a, zAt(-a)), S.map('front', a, zAt(a)), 'thin', { color: C.aux, dash: [3, 1.6], noAnim: true })]
    return {
      title: '四棱柱被正垂面截切',
      steps: [
        step('1. 分析', '正垂面垂直于 V 面，正面投影积聚为一条斜线；截交线的正面投影就落在这条斜线上。', [...S.line45(), ...trace]),
        step('2. 画俯视图', '棱柱的四条棱线与截平面相交，俯视图中截交线与棱柱轮廓重合（棱柱截交的特点）。', S.outline('top')),
        step('3. 画主视图', '正面投影中截交线积聚成一条斜线，斜线以上部分被切去。', S.outline('front')),
        step('4. 画左视图', '截交线的侧面投影是一个四边形，按宽相等由俯视图量取。', S.outline('left')),
        step('5. 结论', '棱柱截交线一定是多边形：顶点是棱线与截平面的交点，边数等于截平面切到的棱面数。', []),
      ],
    }
  })

  def('cylCut', 'cut', '圆柱截交（斜切得椭圆）', (prm = {}) => {
    const r = 24, h = 56, ang = (prm.angle ?? 35) * Math.PI / 180
    const m = GEO.cylinder({ r, h, seg: 72 })
    const nrm = [Math.sin(ang), 0, Math.cos(ang)]
    const d = nrm[2] * h * 0.66
    const cut = GEO.cut(m, { n: nrm, d }, false)
    const S = Views.scene([cut], { gap: 14 })
    const zAt = x => (d - nrm[0] * x) / nrm[2]
    const trace = [Paper.line(S.map('front', -r - 8, zAt(-r - 8)), S.map('front', r + 8, zAt(r + 8)), 'thin', { color: C.aux, dash: [3, 1.6], noAnim: true })]
    return {
      title: '圆柱被正垂面斜切',
      steps: [
        step('1. 分析', '截平面与圆柱轴线斜交，截交线是椭圆。正面投影积聚成斜线，水平投影与圆重合（积聚性）。', [...trace, ...S.centerLines({ cx: 0, cy: 0 })]),
        step('2. 俯视图', '圆柱的水平投影是圆，截交线的水平投影就是这个圆本身。', S.outline('top')),
        step('3. 主视图', '截交线的正面投影是斜线；斜线以上部分被切去。', S.outline('front')),
        step('4. 左视图', '截交线的侧面投影是椭圆：逐点求出各点的侧面投影后光滑连接。', [...S.line45(), ...S.outline('left')]),
        step('5. 结论', '圆柱截交线取决于截平面与轴线的位置：垂直→圆，平行→矩形，斜交→椭圆。', []),
      ],
    }
  })

  def('coneCut', 'cut', '圆锥截交（五种情形）', (prm = {}) => {
    const kind = prm.kind || 'ellipse'
    const r = 26, h = 52
    const m = GEO.cone({ r, h, seg: 72 })
    const alpha = Math.atan2(r, h)
    const crit = Math.PI / 2 - alpha
    let ang = crit - 0.42
    if (kind === 'parabola') ang = crit
    if (kind === 'hyperbola') ang = crit + 0.22
    if (kind === 'circle') ang = 0
    if (kind === 'triangle') ang = crit + 0.3
    const nrm = [Math.sin(ang), 0, Math.cos(ang)]
    const d = kind === 'triangle' ? nrm[2] * h : nrm[2] * h * 0.62
    const cut = GEO.cut(m, { n: nrm, d }, false)
    const S = Views.scene([cut], { gap: 14 })
    const zAt = x => (d - nrm[0] * x) / nrm[2]
    const trace = [Paper.line(S.map('front', -r - 8, zAt(-r - 8)), S.map('front', r + 8, zAt(r + 8)), 'thin', { color: C.aux, dash: [3, 1.6], noAnim: true })]
    const names = { ellipse: '椭圆', parabola: '抛物线', hyperbola: '双曲线', circle: '圆', triangle: '三角形' }
    return {
      title: `圆锥截交——${names[kind]}`,
      steps: [
        step('1. 分析', `截平面与圆锥轴线的夹角同半锥角比较，决定截交线形状。当前情形为：${names[kind]}。`, [...trace, ...S.centerLines({ cx: 0, cy: 0 })]),
        step('2. 俯视图', '截交线的水平投影由若干个点的水平投影光滑连接而成。', S.outline('top')),
        step('3. 主视图', '正面投影中截平面积聚成斜线，交点是转向轮廓线上的点。', S.outline('front')),
        step('4. 左视图', '按高平齐、宽相等求出各点的侧面投影并连线。', [...S.line45(), ...S.outline('left')]),
        step('5. 五种情形', 'θ>半锥角→椭圆；θ=半锥角→抛物线；θ<半锥角→双曲线；θ=90°→圆；过锥顶→三角形。', []),
      ],
    }
  })

  def('interCyl', 'cut', '两圆柱正交相贯', () => {
    // 小圆柱立在大圆柱上（T 形），按解析式直接绘制三视图
    const r1 = 15, r2 = 24, z0 = 30, hTop = 74, gap = 14, D = 88, W = 48, H = hTop
    const M = {
      front: (u, v) => [u, v],
      top: (u, y) => [u, -gap - (y + D / 2)],
      left: (y, v) => [W + gap + (y + D / 2), v],
    }
    const zSeam = x => z0 + Math.sqrt(r2 * r2 - x * x)
    // 相贯线采样
    const seamF = [], seamL = []
    for (let i = 0; i <= 80; i++) {
      const th = Math.PI * i / 80                    // 前半圈：x 由 +r1 到 -r1
      const x = r1 * Math.cos(th)
      seamF.push([x, z0 + Math.sqrt(r2 * r2 - x * x)])
    }
    for (let i = 0; i <= 80; i++) {
      const th = -Math.PI / 2 + Math.PI * i / 80     // y 由 -r1 到 +r1
      const y = r1 * Math.sin(th)
      const x = r1 * Math.cos(th)
      seamL.push([y, z0 + Math.sqrt(r2 * r2 - x * x)])
    }
    const P = (k, pts, st = 'solid', o = {}) => Paper.poly(pts.map(p => k === 'front' ? M.front(p[0], p[1]) : k === 'top' ? M.top(p[0], p[1]) : M.left(p[0], p[1])), st, false, o)
    const s1 = [
      Paper.line(M.front(0, -4), M.front(0, H + 8), 'center'),
      Paper.line(M.front(-34, z0), M.front(34, z0), 'center'),
      Paper.line(M.top(0, -52), M.top(0, 52), 'center'),
      Paper.line(M.top(-34, 0), M.top(34, 0), 'center'),
      Paper.line(M.left(-52, z0), M.left(52, z0), 'center'),
      Paper.line(M.left(0, -4), M.left(0, H + 8), 'center'),
      Paper.line([W + gap, -gap], [W + gap + D, -gap - D], 'thin', { color: C.con, dash: [2, 1.5], noAnim: true }),
    ]
    // 水平圆柱（黑色粗实线）
    const s2 = []
    s2.push(P('front', [[-r2, 6], [r2, 6]], 'solid'))
    s2.push(P('front', [[-r2, 6], [-r2, 54], [-r1, 54]], 'solid'))
    s2.push(P('front', [[r2, 6], [r2, 54], [r1, 54]], 'solid'))
    s2.push(P('top', [[-r2, -D / 2], [r2, -D / 2], [r2, D / 2], [-r2, D / 2], [-r2, -D / 2]], 'solid'))
    s2.push(P('left', [[-D / 2, 6], [D / 2, 6], [D / 2, 54], [r1, 54]], 'solid'))
    s2.push(P('left', [[-D / 2, 6], [-D / 2, 54], [-r1, 54]], 'solid'))
    // 竖直圆柱
    const s3 = []
    s3.push(P('front', [[-r1, 74], [-r1, zSeam(-r1)]], 'solid'))
    s3.push(P('front', [[r1, 74], [r1, zSeam(r1)]], 'solid'))
    s3.push(P('front', [[-r1, 74], [r1, 74]], 'solid'))
    s3.push(Paper.circle(M.top(0, 0), r1, 'solid'))
    s3.push(P('left', [[-r1, 74], [-r1, 54]], 'solid'))
    s3.push(P('left', [[r1, 74], [r1, 54]], 'solid'))
    s3.push(P('left', [[-r1, 74], [r1, 74]], 'solid'))
    // 相贯线
    const s4 = [
      Paper.poly(seamF.map(p => M.front(p[0], p[1])), 'solid', false, { color: C.pick, w: 0.85 }),
      Paper.poly(seamL.map(p => M.left(p[0], p[1])), 'solid', false, { color: C.pick, w: 0.85 }),
    ]
    return {
      title: '两圆柱正交相贯',
      steps: [
        step('1. 画中心线', '先定三个视图的位置和两圆柱轴线的交点。', s1),
        step('2. 画水平大圆柱', '大圆柱轴线水平，主视图为矩形，俯视图为矩形（长度 88），左视图为矩形（高度 48）。', s2),
        step('3. 画竖直小圆柱', '小圆柱轴线竖直，主、左视图为矩形，俯视图为圆——这个圆就是相贯线水平投影的"积聚"位置。', s3),
        step('4. 求相贯线', '相贯线上每点同时满足两个圆柱面方程：x²+(z−30)²=24²，x²+y²=15²。逐点求出后光滑连接，即得主视图的拱形与左视图的 U 形。', s4),
        step('5. 结论', '相贯线总是向大圆柱一侧弯曲；若两圆柱等径，相贯线退化为两条相交直线。', []),
      ],
    }
  })

  /* =========================================================
   * 四、组合体 / 轴测图
   * ========================================================= */
  def('comboStack', 'combo', '叠加式组合体三视图', () => {
    const base = GEO.box({ x0: -32, y0: -20, z0: 0, L: 64, W: 40, H: 12 })
    const wall = GEO.box({ x0: -32, y0: -20, z0: 12, L: 14, W: 40, H: 36 })
    const boss = GEO.cylinder({ r: 11, h: 14, seg: 64, cx: 14, cy: 0, z0: 12 })
    const parts = [base, wall, boss]
    const S = Views.scene(parts, { gap: 14 })
    return {
      title: '叠加式组合体三视图',
      steps: [
        step('1. 形体分析', '组合体由三部分组成：底板（长方体）、立板（长方体）、圆柱凸台。先分析各部分的形状和相对位置。', S.centerLines({ cx: 14, cy: 0 })),
        step('2. 俯视图', '按各部分的水平投影画俯视图：底板矩形、立板矩形、凸台圆。', S.outline('top')),
        step('3. 主视图', '主视图反映"长"与"高"：底板、立板、凸台依次向上叠加。', S.outline('front')),
        step('4. 左视图', '左视图反映"高"与"宽"：注意立板与凸台的前后位置。', [...S.line45(), ...S.outline('left')]),
        step('5. 检查', '画图口诀：先形体分析，后选主视图；先画主要轮廓，后画细节；最后检查长对正、高平齐、宽相等。', []),
      ],
    }
  })

  def('comboCut', 'combo', '切割式组合体三视图', () => {
    const prof = [[-30, 0], [30, 0], [30, 26], [10, 26], [10, 10], [-10, 10], [-10, 26], [-30, 26]]
    const m = GEO.extrude({ profile: prof, axis: 'y', from: -18, depth: 36 })
    const S = Views.scene([m], { gap: 14 })
    return {
      title: '切割式组合体三视图',
      steps: [
        step('1. 形体分析', '该组合体可看作长方体被切去一个 U 形槽：先有整体，再逐步切割。', S.centerLines({ cx: 0, cy: 0 })),
        step('2. 俯视图', '俯视图是一个矩形，槽口在中间，槽的两条边为可见轮廓。', S.outline('top')),
        step('3. 主视图', '主视图反映 U 形槽的实际形状：中间凹下 16，槽宽 20。', S.outline('front')),
        step('4. 左视图', '左视图为矩形；槽底在左视图中不可见，画虚线。', [...S.line45(), ...S.outline('left')]),
        step('5. 要点', '切割式组合体画图顺序：先画完整基本体，再逐块切去；每切一刀都要把新增轮廓和消失轮廓处理干净。', []),
      ],
    }
  })

  def('axoIso', 'axo', '正等轴测图', () => {
    const base = GEO.box({ x0: -30, y0: -18, z0: 0, L: 60, W: 36, H: 12 })
    const wall = GEO.box({ x0: -30, y0: -18, z0: 12, L: 14, W: 36, H: 34 })
    const parts = [base, wall]
    const V = GEO.view('iso')
    const Hh = GEO.hlr(parts, V, 0.35)
    const body = []
    Hh.vis.forEach(pl => body.push(Paper.poly(pl, 'solid')))
    Hh.hid.forEach(pl => body.push(Paper.poly(pl, 'hidden')))
    const O = [0, 0, 0]
    const axesEls = []
    const mk = (p, t) => {
      const a = [GEO.dot(O, V.u), GEO.dot(O, V.v)], b = [GEO.dot(p, V.u), GEO.dot(p, V.v)]
      return [Paper.line(a, b, 'thin', { color: C.aux, noAnim: true }),
        Paper.text([b[0] + 1.2 * Math.sign(b[0] || 1), b[1] + 1.2], t, { size: 3, color: C.aux, anchor: 'start' })]
    }
    axesEls.push(...mk([62, 0, 0], 'X'), ...mk([0, 62, 0], 'Y'), ...mk([0, 0, 58], 'Z'))
    const k1 = Math.ceil(body.length * 0.45), k2 = Math.ceil(body.length * 0.75)
    return {
      title: '正等轴测图',
      steps: [
        step('1. 建立轴测轴', '正等测：OZ 竖直，OX、OY 与水平线成 30°，三轴轴向伸缩系数均取 1（简化系数）。', axesEls),
        step('2. 画底板', '沿轴测轴方向量取长、宽，画出底板底面和高度方向的棱线。', body.slice(0, k1)),
        step('3. 画立板', '在底板上表面定位立板，沿 OZ 方向量取高度，完成立板轮廓。', body.slice(k1, k2)),
        step('4. 完成', '连接各棱线，检查不可见轮廓是否遗漏。', body.slice(k2)),
        step('5. 要点', '轴测图不是三视图：一个图就能表现立体形状，但只有沿三个轴测轴方向才能直接量取尺寸。', []),
      ],
    }
  })

  def('axoCab', 'axo', '斜二轴测图', () => {
    const prof = [[-26, 0], [26, 0], [26, 18], [6, 18], [6, 30], [-26, 30]]
    const m = GEO.extrude({ profile: prof, axis: 'y', from: -14, depth: 28 })
    const V = GEO.view('cabinet')
    const Hh = GEO.hlr([m], V, 0.35)
    const body = []
    Hh.vis.forEach(pl => body.push(Paper.poly(pl, 'solid')))
    Hh.hid.forEach(pl => body.push(Paper.poly(pl, 'hidden')))
    const k1 = Math.ceil(body.length * 0.55)
    return {
      title: '斜二轴测图',
      steps: [
        step('1. 建立轴测轴', '斜二测：OX 水平、OZ 竖直，OY 与水平线成 45°，OY 方向取 0.5 倍。', body.slice(0, k1)),
        step('2. 沿 Y 方向拉伸', '斜二测的正面反映实形；从正面各顶点沿 45° 方向量取 0.5×厚度，连接后端面。', body.slice(k1)),
        step('3. 要点', '斜二测适合单方向形状复杂的零件：一个端面反映实形，画图最方便。', []),
      ],
    }
  })

  return { T, list: () => Object.values(T), get: id => T[id], def }
})()
