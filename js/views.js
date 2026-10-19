/* Views — 三视图场面调度
 * 输入实体网格，输出符合制图规范的三视图（长对正/高平齐/宽相等），
 * 支持表面取点的三面投影、45° 辅助线、中心线
 */
const Views = (() => {
  const P = Paper.P

  function scene(meshes, opts = {}) {
    const gap = opts.gap ?? 14
    const step = opts.step ?? 0.4
    const names = ['front', 'top', 'left']
    const V = {}, C = {}, B = {}, H = {}
    names.forEach(n => {
      V[n] = GEO.view(n)
      C[n] = GEO.makeCtx(meshes, V[n])
      B[n] = { u0: C[n].umin, u1: C[n].umax, v0: C[n].vmin, v1: C[n].vmax }
      H[n] = GEO.hlr(meshes, V[n], step)
      if (opts.extraPolys && opts.extraPolys.length) {
        const ex = GEO.hlrPolys(meshes, opts.extraPolys, V[n], step)
        H[n].vis.push(...ex.vis)
        H[n].hid.push(...ex.hid)
      }
    })
    const W = B.front.u1 - B.front.u0
    const HT = B.front.v1 - B.front.v0
    const D = B.top.v1 - B.top.v0
    const off = { front: [0, 0], top: [0, -gap - D], left: [W + gap, 0] }
    const map = (n, u, v) => [u - B[n].u0 + off[n][0], v - B[n].v0 + off[n][1]]
    const sheet = { x0: 0, x1: W + gap + D, y0: -gap - D, y1: HT }
    const p45a = [W + gap, -gap], p45b = [W + gap + D, -gap - D]

    function outline(n) {
      const els = []
      H[n].vis.forEach(pl => els.push(Paper.poly(pl.map(q => map(n, q[0], q[1])), 'solid', false, { grp: n })))
      H[n].hid.forEach(pl => els.push(Paper.poly(pl.map(q => map(n, q[0], q[1])), 'hidden', false, { grp: n })))
      return els
    }

    // 视图中心线（回转轴 / 对称面）
    function centerLines(axis) {
      const els = []
      const L = 4
      if (!axis) return els
      const { cx = 0, cy = 0 } = axis
      // 主视图：竖直线 x=cx
      els.push(Paper.line([map('front', cx, 0)[0], map('front', 0, B.front.v0 - L)[1]],
        [map('front', cx, 0)[0], map('front', 0, B.front.v1 + L)[1]], 'center'))
      // 俯视图：十字
      const fTop = map('top', cx, B.top.v1)
      const fBot = map('top', cx, B.top.v0)
      els.push(Paper.line([fTop[0], fTop[1] + L], [fBot[0], fBot[1] - L], 'center'))
      const tL = map('top', B.top.u0 - L, cy)
      const tR = map('top', B.top.u1 + L, cy)
      els.push(Paper.line(tL, tR, 'center'))
      // 左视图：竖直线 y=cy
      const lTop = map('left', cy, B.left.v1)
      const lBot = map('left', cy, B.left.v0)
      els.push(Paper.line([lTop[0], lTop[1] + L], [lBot[0], lBot[1] - L], 'center'))
      return els
    }

    function line45() {
      return [Paper.line(p45a, p45b, 'thin', { color: Paper.C.con, dash: [2, 1.5], noAnim: true })]
    }

    // 一个空间点在三个视图中的投影（含可见性、标注、投影连线）
    function point(p, name, o = {}) {
      const labels = { front: name + '′', top: name, left: name + '″' }
      const metas = {}, parts = {}
      names.forEach(n => {
        const q = C[n].proj(p)
        const vis = (o.vis && o.vis[n] !== undefined) ? o.vis[n] : !C[n].occluded(q, C[n].eps)
        metas[n] = { pos: map(n, q.u, q.v), vis, label: labels[n], q }
      })
      names.forEach(n => {
        const m = metas[n]
        const off = { front: [1.6, 1.5], top: [1.6, 1.5], left: [1.6, 1.5] }[n]
        parts[n] = Paper.pointMark(m.pos, m.label, {
          color: o.color || Paper.C.pick, hidden: !m.vis, off, size: 3.2,
        })
      })
      const f = metas.front.pos, t = metas.top.pos, l = metas.left.pos
      const links = {
        ft: o.links === false ? [] : [Paper.line([f[0], f[1] - 2], [t[0], t[1] + 2], 'thin', { color: Paper.C.con, dash: [2.2, 1.4], noAnim: true })],
        fl: o.links === false ? [] : [Paper.line([f[0] + 2, f[1]], [l[0] - 2, l[1]], 'thin', { color: Paper.C.con, dash: [2.2, 1.4], noAnim: true })],
        tl: o.links === false ? [] : (() => {
          const x45 = W - t[1]
          return [Paper.line([t[0] + 2, t[1]], [x45, t[1]], 'thin', { color: Paper.C.con, dash: [2.2, 1.4], noAnim: true }),
            Paper.line([x45, t[1]], [x45, l[1]], 'thin', { color: Paper.C.con, dash: [2.2, 1.4], noAnim: true })]
        })(),
      }
      return { parts, links, metas, els: [...parts.front, ...parts.top, ...parts.left, ...links.ft, ...links.fl, ...links.tl] }
    }

    return { meshes, V, C, B, H, W, HT, D, gap, off, map, sheet, outline, centerLines, line45, point, p45a, p45b }
  }

  // 轴测图
  function axonometric(meshes, kind = 'iso', opts = {}) {
    const V = GEO.view(kind)
    const H = GEO.hlr(meshes, V, opts.step ?? 0.35)
    const els = []
    H.vis.forEach(pl => els.push(Paper.poly(pl, 'solid')))
    H.hid.forEach(pl => els.push(Paper.poly(pl, 'hidden')))
    return { els, H, V }
  }

  return { scene, axonometric }
})()
