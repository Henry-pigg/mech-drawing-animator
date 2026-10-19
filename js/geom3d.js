/* GEO — 三维几何内核
 * 网格 → 三视图/轴测图投影 → 隐藏线消除（HLR）
 * 所有实体统一为 {verts:[[x,y,z]...], faces:[[i,j,k...]...], name}
 */
const GEO = (() => {
  const EPS = 1e-9
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k]
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
  const vlen = a => Math.hypot(a[0], a[1], a[2])
  const unit = a => { const l = vlen(a) || 1; return [a[0] / l, a[1] / l, a[2] / l] }
  const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
  const TAU = Math.PI * 2

  const mesh = (verts, faces, o = {}) => ({ verts, faces, ...o })

  // 面法向（Newell）
  function faceNormal(verts, f) {
    let n = [0, 0, 0]
    for (let i = 0; i < f.length; i++) {
      const a = verts[f[i]], b = verts[f[(i + 1) % f.length]]
      n[0] += (a[1] - b[1]) * (a[2] + b[2])
      n[1] += (a[2] - b[2]) * (a[0] + b[0])
      n[2] += (a[0] - b[0]) * (a[1] + b[1])
    }
    const l = vlen(n) || 1
    return [n[0] / l, n[1] / l, n[2] / l]
  }
  function faceCenter(verts, f) {
    let c = [0, 0, 0]
    f.forEach(i => { c = add(c, verts[i]) })
    return mul(c, 1 / f.length)
  }
  // 凸实体：统一法向朝外
  function orientOut(m) {
    let c = [0, 0, 0]
    m.verts.forEach(v => { c = add(c, v) })
    c = mul(c, 1 / m.verts.length)
    m.faces.forEach((f, i) => {
      const n = faceNormal(m.verts, f)
      if (dot(n, sub(faceCenter(m.verts, f), c)) < 0) m.faces[i] = f.slice().reverse()
    })
    return m
  }

  // ---------------- 基本体 ----------------
  function prism({ n = 6, R = 30, h = 50, rot = Math.PI / 2, cx = 0, cy = 0, z0 = 0 }) {
    const verts = [], faces = []
    for (let i = 0; i < n; i++) verts.push([cx + R * Math.cos(rot + i * TAU / n), cy + R * Math.sin(rot + i * TAU / n), z0])
    for (let i = 0; i < n; i++) verts.push([cx + R * Math.cos(rot + i * TAU / n), cy + R * Math.sin(rot + i * TAU / n), z0 + h])
    faces.push([...Array(n).keys()].reverse())
    faces.push([...Array(n).keys()].map(i => i + n))
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; faces.push([i, j, j + n, i + n]) }
    return orientOut(mesh(verts, faces))
  }

  function pyramid({ n = 4, R = 30, h = 50, rot = Math.PI / 4, z0 = 0, cx = 0, cy = 0 }) {
    const verts = [], faces = []
    for (let i = 0; i < n; i++) verts.push([cx + R * Math.cos(rot + i * TAU / n), cy + R * Math.sin(rot + i * TAU / n), z0])
    const apex = verts.length
    verts.push([cx, cy, z0 + h])
    faces.push([...Array(n).keys()].reverse())
    for (let i = 0; i < n; i++) faces.push([i, (i + 1) % n, apex])
    return orientOut(mesh(verts, faces))
  }

  function frustum({ n = 4, R1 = 30, R2 = 16, h = 40, rot = Math.PI / 4, z0 = 0 }) {
    const verts = [], faces = []
    for (let i = 0; i < n; i++) verts.push([R1 * Math.cos(rot + i * TAU / n), R1 * Math.sin(rot + i * TAU / n), z0])
    for (let i = 0; i < n; i++) verts.push([R2 * Math.cos(rot + i * TAU / n), R2 * Math.sin(rot + i * TAU / n), z0 + h])
    faces.push([...Array(n).keys()].reverse())
    faces.push([...Array(n).keys()].map(i => i + n))
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; faces.push([i, j, j + n, i + n]) }
    return orientOut(mesh(verts, faces))
  }

  function cylinder({ r = 20, h = 40, seg = 72, z0 = 0, cx = 0, cy = 0 }) {
    return prism({ n: seg, R: r, h, rot: 0, cx, cy, z0 })
  }

  function cone({ r = 20, h = 40, seg = 72, z0 = 0 }) {
    const verts = [], faces = []
    for (let i = 0; i < seg; i++) verts.push([r * Math.cos(i * TAU / seg), r * Math.sin(i * TAU / seg), z0])
    const apex = verts.length
    verts.push([0, 0, z0 + h])
    faces.push([...Array(seg).keys()].reverse())
    for (let i = 0; i < seg; i++) faces.push([i, (i + 1) % seg, apex])
    return orientOut(mesh(verts, faces))
  }

  function sphere({ r = 20, seg = 48, rings = 26, c = [0, 0, 0] }) {
    const verts = [], faces = []
    for (let j = 0; j <= rings; j++) {
      const phi = Math.PI * j / rings
      for (let i = 0; i < seg; i++) {
        const th = TAU * i / seg
        verts.push([c[0] + r * Math.sin(phi) * Math.cos(th), c[1] + r * Math.sin(phi) * Math.sin(th), c[2] + r * Math.cos(phi)])
      }
    }
    const idx = (i, j) => j * seg + ((i + seg) % seg)
    for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) {
      if (j === 0) faces.push([idx(i, 0), idx(i + 1, 0), idx(i, 1)])
      else if (j === rings - 1) faces.push([idx(i, j), idx(i + 1, j), idx(i + 1, j + 1)])
      else faces.push([idx(i, j), idx(i + 1, j), idx(i + 1, j + 1), idx(i, j + 1)])
    }
    return orientOut(mesh(verts, faces))
  }

  function box({ x0 = 0, y0 = 0, z0 = 0, L = 10, W = 10, H = 10 }) {
    const v = [
      [x0, y0, z0], [x0 + L, y0, z0], [x0 + L, y0 + W, z0], [x0, y0 + W, z0],
      [x0, y0, z0 + H], [x0 + L, y0, z0 + H], [x0 + L, y0 + W, z0 + H], [x0, y0 + W, z0 + H],
    ]
    const f = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]]
    return mesh(v, f)
  }

  /* 拉伸：profile 为平面多边形点列
   * axis='y' → profile 在 (x,z) 平面，沿 y 拉伸 [from,from+depth]
   * axis='z' → profile 在 (x,y) 平面，沿 z 拉伸
   */
  function extrude({ profile, axis = 'y', from = 0, depth = 20 }) {
    const pts = profile.slice()
    // 保证逆时针
    let area = 0
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length]
      area += a[0] * b[1] - b[0] * a[1]
    }
    if (area < 0) pts.reverse()
    const n = pts.length, verts = [], faces = []
    const to3 = (p, t) => axis === 'y' ? [p[0], t, p[1]] : [p[0], p[1], t]
    pts.forEach(p => verts.push(to3(p, from)))
    pts.forEach(p => verts.push(to3(p, from + depth)))
    faces.push([...Array(n).keys()].reverse())          // 起始端面
    faces.push([...Array(n).keys()].map(i => i + n))    // 终止端面
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; faces.push([i, j, j + n, i + n]) }
    const m = mesh(verts, faces)
    // 端面法向校正
    const want0 = axis === 'y' ? [0, -1, 0] : [0, 0, -1]
    const want1 = mul(want0, -1)
    if (dot(faceNormal(verts, m.faces[0]), want0) < 0) m.faces[0].reverse()
    if (dot(faceNormal(verts, m.faces[1]), want1) < 0) m.faces[1].reverse()
    // 侧面法向校正
    let c = [0, 0, 0]; verts.forEach(v => c = add(c, v)); c = mul(c, 1 / verts.length)
    for (let i = 2; i < m.faces.length; i++) {
      if (dot(faceNormal(verts, m.faces[i]), sub(faceCenter(verts, m.faces[i]), c)) < 0) m.faces[i].reverse()
    }
    return m
  }

  // ---------------- 边 ----------------
  function buildEdges(m, creaseDeg = 14) {
    const map = new Map(), out = []
    for (let fi = 0; fi < m.faces.length; fi++) {
      const f = m.faces[fi], n = faceNormal(m.verts, f)
      for (let k = 0; k < f.length; k++) {
        const a = f[k], b = f[(k + 1) % f.length]
        const key = a < b ? `${a}_${b}` : `${b}_${a}`
        let e = map.get(key)
        if (!e) { e = { a: Math.min(a, b), b: Math.max(a, b), n: [] }; map.set(key, e) }
        e.n.push(n)
      }
    }
    const cosT = Math.cos(creaseDeg * Math.PI / 180)
    map.forEach(e => {
      e.feature = e.n.length === 1 || (e.n.length >= 2 && dot(e.n[0], e.n[1]) < cosT)
      out.push(e)
    })
    return out
  }

  // ---------------- 视图基 ----------------
  function view(name) {
    if (name === 'front') return { u: [1, 0, 0], v: [0, 0, 1], d: [0, 1, 0], name }
    if (name === 'top') return { u: [1, 0, 0], v: [0, -1, 0], d: [0, 0, 1], name }
    if (name === 'left') return { u: [0, 1, 0], v: [0, 0, 1], d: [-1, 0, 0], name }
    if (name === 'iso') {
      const s = 1 / Math.sqrt(3)
      return { u: [1 / Math.SQRT2, -1 / Math.SQRT2, 0], v: [-1 / Math.sqrt(6), -1 / Math.sqrt(6), 2 / Math.sqrt(6)], d: [s, s, s], name }
    }
    if (name === 'cabinet') {
      const k = 0.5 * Math.SQRT1_2
      return { u: [1, k, 0], v: [0, k, 1], d: [0, 1, 0], name }
    }
    throw new Error('unknown view ' + name)
  }

  // ---------------- 投影 + 遮挡 ----------------
  function makeCtx(meshes, V, opts = {}) {
    const tris = []
    let umin = 1e18, umax = -1e18, vmin = 1e18, vmax = -1e18
    const proj = p => ({ u: dot(p, V.u), v: dot(p, V.v), d: dot(p, unit(V.d)) })
    meshes.forEach(m => {
      const P = m.verts.map(proj)
      m._P = P
      P.forEach(q => {
        umin = Math.min(umin, q.u); umax = Math.max(umax, q.u)
        vmin = Math.min(vmin, q.v); vmax = Math.max(vmax, q.v)
      })
      m.faces.forEach(f => {
        for (let i = 1; i < f.length - 1; i++) {
          const A = P[f[0]], B = P[f[i]], C = P[f[i + 1]]
          const den = (B.u - A.u) * (C.v - A.v) - (C.u - A.u) * (B.v - A.v)
          if (Math.abs(den) < 1e-12) continue
          tris.push({
            a: A, b: B, c: C, den, mi: meshes.indexOf(m),
            bbox: [Math.min(A.u, B.u, C.u), Math.min(A.v, B.v, C.v), Math.max(A.u, B.u, C.u), Math.max(A.v, B.v, C.v)],
            cells: [],
          })
        }
      })
    })
    const size = Math.max(umax - umin, vmax - vmin, 1)
    const cell = Math.max(size / 90, 0.05)
    const cx0 = umin, cy0 = vmin
    const grid = new Map()
    const key = (i, j) => i * 100003 + j
    tris.forEach((t, ti) => {
      const [x0, y0, x1, y1] = t.bbox
      const i0 = Math.floor((x0 - cx0) / cell), i1 = Math.floor((x1 - cx0) / cell)
      const j0 = Math.floor((y0 - cy0) / cell), j1 = Math.floor((y1 - cy0) / cell)
      if ((i1 - i0 + 1) * (j1 - j0 + 1) > 900) { (grid.get('big') || grid.set('big', []).get('big')).push(ti); return }
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
        const k = key(i, j)
        let arr = grid.get(k)
        if (!arr) { arr = []; grid.set(k, arr) }
        arr.push(ti)
      }
    })
    const big = grid.get('big') || []
    const modelSize = size
    function occluded(q, eps, skipMesh = -99) {
      const i = Math.floor((q.u - cx0) / cell), j = Math.floor((q.v - cy0) / cell)
      const lists = [grid.get(key(i, j)) || [], big]
      for (const list of lists) {
        for (let li = 0; li < list.length; li++) {
          const t = tris[list[li]]
          if (t.mi === skipMesh) continue
          const A = t.a, B = t.b, C = t.c
          const x = q.u, y = q.v
          const w1 = ((x - A.u) * (C.v - A.v) - (C.u - A.u) * (y - A.v)) / t.den
          const w2 = ((B.u - A.u) * (y - A.v) - (x - A.u) * (B.v - A.v)) / t.den
          if (w1 < -1e-6 || w2 < -1e-6 || w1 + w2 > 1 + 1e-6) continue
          const dep = A.d + w1 * (B.d - A.d) + w2 * (C.d - A.d)
          if (dep > q.d + eps) return true
        }
      }
      return false
    }
    return { proj, occluded, tris, umin, umax, vmin, vmax, eps: modelSize * 1e-4 + 1e-4, cell }
  }

  /* 隐藏线消除：返回 {vis:[[[u,v]...]], hid:[...]} */
  function hlr(meshes, V, stepMM = 1) {
    const ctx = makeCtx(meshes, V)
    const vis = [], hid = []
    const eps = ctx.eps
    const D = unit(V.d)
    meshes.forEach((m, mi) => {
      const edges = buildEdges(m)
      edges.forEach(e => {
        const a = m.verts[e.a], b = m.verts[e.b]
        let sil = false
        if (e.n.length === 2) {
          const s1 = dot(e.n[0], D), s2 = dot(e.n[1], D)
          sil = (s1 > 0 && s2 < 0) || (s1 < 0 && s2 > 0)
        }
        if (!sil && !e.feature) return
        // 局部可见性：至少有一个相邻面朝向观察者
        const localVis = e.n.length === 1
          ? dot(e.n[0], D) > 0
          : (dot(e.n[0], D) > 1e-6 || dot(e.n[1], D) > 1e-6)
        const pa = ctx.proj(a), pb = ctx.proj(b)
        const L = Math.hypot(pb.u - pa.u, pb.v - pa.v)
        if (L < 1e-6) return
        const n = Math.max(2, Math.min(260, Math.ceil(L / stepMM)))
        const flags = new Array(n + 1)
        for (let k = 0; k <= n; k++) {
          const t = k / n
          const q = { u: pa.u + (pb.u - pa.u) * t, v: pa.v + (pb.v - pa.v) * t, d: pa.d + (pb.d - pa.d) * t }
          flags[k] = localVis && !ctx.occluded(q, eps, mi)
        }
        let start = 0
        for (let k = 1; k <= n; k++) {
          if (flags[k] !== flags[start]) {
            pushRun([flags[start], start, k])
            start = k
          }
        }
        pushRun([flags[start], start, n])
        function pushRun([f, k0, k1]) {
          const pts = []
          for (let k = k0; k <= k1; k++) {
            const t = k / n
            pts.push([+(pa.u + (pb.u - pa.u) * t).toFixed(3), +(pa.v + (pb.v - pa.v) * t).toFixed(3)])
          }
          if (pts.length < 2) return
          // 组合体：落在其他实体内部的线段不画
          if (meshes.length > 1) {
            const t0 = k0 / n
            const p3 = lerp3(a, b, t0 + 0.001)
            for (let j = 0; j < meshes.length; j++) {
              if (j !== mi && inside(meshes[j], p3)) return
            }
          }
          ;(f ? vis : hid).push(pts)
        }
      })
    })
    return { vis, hid, ctx }
  }

  // 点是否被遮挡
  function pointVisible(meshes, V, p) {
    const ctx = makeCtx(meshes, V)
    const q = ctx.proj(p)
    return !ctx.occluded(q, ctx.eps)
  }

  /* 对给定三维折线做隐藏线消除（用于并集/相贯线等自定义边）
   * runs: [[p,p,...]] 或 [{pts, e, mi}]
   */
  function hlrPolys(meshes, runs, V, stepMM = 0.5) {
    const ctx = makeCtx(meshes, V)
    const vis = [], hid = []
    const D = unit(V.d)
    runs.forEach(run => {
      const pts = Array.isArray(run) ? run : run.pts
      const mi = Array.isArray(run) ? -99 : (run.mi ?? -99)
      const force = !Array.isArray(run) && !!run.force
      let localVis = true
      if (!Array.isArray(run) && run.e && run.e.n) {
        const ns = run.e.n
        localVis = ns.length === 1 ? dot(ns[0], D) > 0 : ns.some(n => dot(n, D) > 1e-6)
      }
      for (let s = 0; s < pts.length - 1; s++) {
        const a = pts[s], b = pts[s + 1]
        const pa = ctx.proj(a), pb = ctx.proj(b)
        const L = Math.hypot(pb.u - pa.u, pb.v - pa.v)
        if (L < 1e-6) continue
        const n = Math.max(1, Math.min(200, Math.ceil(L / stepMM)))
        let cur = null
        for (let k = 0; k <= n; k++) {
          const t = k / n
          const q = { u: pa.u + (pb.u - pa.u) * t, v: pa.v + (pb.v - pa.v) * t, d: pa.d + (pb.d - pa.d) * t }
          const ok = force || (localVis && !ctx.occluded(q, ctx.eps, mi))
          if (!cur || cur.ok !== ok) {
            if (cur && cur.pts.length > 1) (cur.ok ? vis : hid).push(cur.pts)
            cur = { ok, pts: [] }
          }
          cur.pts.push([+q.u.toFixed(3), +q.v.toFixed(3)])
        }
        if (cur && cur.pts.length > 1) (cur.ok ? vis : hid).push(cur.pts)
      }
    })
    return { vis, hid, ctx }
  }

  // 点是否在实体内部
  function inside(m, p) {
    const dir = unit([0.37213, 0.54771, 0.74873])
    let cnt = 0
    m.faces.forEach(f => {
      for (let i = 1; i < f.length - 1; i++) {
        const a = m.verts[f[0]], b = m.verts[f[i]], c = m.verts[f[i + 1]]
        const e1 = sub(b, a), e2 = sub(c, a)
        const h = cross(dir, e2)
        const det = dot(e1, h)
        if (Math.abs(det) < 1e-12) continue
        const s = sub(p, a)
        const uu = dot(s, h) / det
        if (uu < 0 || uu > 1) continue
        const qq = cross(s, e1)
        const vv = dot(dir, qq) / det
        if (vv < 0 || uu + vv > 1) continue
        const t = dot(e2, qq) / det
        if (t > 1e-7) cnt++
      }
    })
    return cnt % 2 === 1
  }

  /* 组合体：去掉落在其他实体内部的边段（并集显示）
   * 传入 V 时只保留特征边与轮廓边
   */
  function unionEdges(meshes, stepMM = 1, V = null) {
    const out = []
    const D = V ? unit(V.d) : null
    meshes.forEach((m, mi) => {
      const others = meshes.filter((_, i) => i !== mi)
      buildEdges(m).forEach(e => {
        if (D) {
          const sil = e.n.length === 2 && ((dot(e.n[0], D) > 0) !== (dot(e.n[1], D) > 0))
          if (!e.feature && !sil) return
        } else if (!e.feature) return
        const a = m.verts[e.a], b = m.verts[e.b]
        const L = vlen(sub(b, a))
        const n = Math.max(2, Math.min(120, Math.ceil(L / stepMM)))
        let run = null
        for (let k = 0; k <= n; k++) {
          const p = lerp3(a, b, k / n)
          const inOther = others.some(o => inside(o, p))
          if (!inOther) {
            if (!run) run = { e, mi, pts: [p] }
            else run.pts.push(p)
          } else if (run) { out.push(run); run = null }
        }
        if (run) out.push(run)
      })
    })
    return out
  }

  // 平面切割（凸实体）
  function cut(m, plane, keepPlus = true) {
    const n = plane.n, d = plane.d
    const side = p => (dot(n, p) - d) * (keepPlus ? 1 : -1)
    const verts = [], faces = [], cutPts = []
    const vmap = new Map()
    const addV = (p, key) => {
      if (key && vmap.has(key)) return vmap.get(key)
      const id = verts.length
      verts.push(p)
      if (key) vmap.set(key, id)
      return id
    }
    m.faces.forEach(f => {
      const poly = f.map(i => m.verts[i])
      const inside = poly.map(p => side(p) >= -1e-9)
      if (inside.every(x => !x)) return
      const out = []
      for (let i = 0; i < poly.length; i++) {
        const A = poly[i], B = poly[(i + 1) % poly.length]
        const ia = inside[i], ib = inside[(i + 1) % poly.length]
        if (ia) out.push(A)
        if (ia !== ib) {
          const da = side(A), db = side(B)
          const t = da / (da - db)
          const P = lerp3(A, B, t)
          out.push(P)
          cutPts.push(P)
        }
      }
      if (out.length >= 3) {
        const key = out.map(p => p.map(x => x.toFixed(4)).join(',')).join('|')
        faces.push(out.map(p => addV(p, p.map(x => x.toFixed(4)).join(','))))
      }
    })
    // 切口端面
    if (cutPts.length >= 3) {
      // 去重
      const uniq = []
      cutPts.forEach(p => {
        if (!uniq.some(q => vlen(sub(p, q)) < 1e-6)) uniq.push(p)
      })
      const c = mul(uniq.reduce((s, p) => add(s, p), [0, 0, 0]), 1 / uniq.length)
      // 平面基
      const e1 = unit(Math.abs(n[0]) < 0.9 ? cross(n, [1, 0, 0]) : cross(n, [0, 1, 0]))
      const e2 = cross(n, e1)
      const sorted = uniq.slice().sort((p, q) =>
        Math.atan2(dot(sub(p, c), e2), dot(sub(p, c), e1)) - Math.atan2(dot(sub(q, c), e2), dot(sub(q, c), e1)))
      const ids = sorted.map(p => addV(p, p.map(x => x.toFixed(4)).join(',')))
      const fa = ids.slice()
      const nrm = faceNormal(verts, fa)
      if (dot(nrm, mul(n, keepPlus ? -1 : 1)) < 0) fa.reverse()
      faces.push(fa)
    }
    return { verts, faces, name: m.name }
  }

  return {
    mesh, prism, pyramid, frustum, cylinder, cone, sphere, box, extrude,
    faceNormal, faceCenter, orientOut, buildEdges, view, makeCtx, hlr, hlrPolys, pointVisible, inside, unionEdges, cut,
    sub, add, mul, dot, cross, vlen, unit, lerp3, TAU,
  }
})()
