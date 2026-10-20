/* DrawingDoc — 大模型图纸契约
 * 结构：{version, meta:{title,width,height,summary,confidence,standard,unit}, warnings[], steps:[{id,title,narration,primitives[]}]}
 * 图元：line / circle / arc / dimension / text / point
 * 坐标：SVG 用户坐标（y 向下）。转成 Paper 图纸坐标（y 向上）时统一翻转。
 */
const DrawingDoc = (() => {
  const CANVAS = { w: 920, h: 660 }
  const PAD = 34

  const LINE_ALIAS = {
    thick: 'thick', thin: 'thin', dashed: 'dashed', center: 'center',
    粗实线: 'thick', 细实线: 'thin', 细虚线: 'dashed', 虚线: 'dashed',
    点画线: 'center', 细点画线: 'center', 中心线: 'center',
    solid: 'thick', hidden: 'dashed', dashdot: 'center',
  }
  const STYLE = { thick: 'solid', thin: 'thin', dashed: 'hidden', center: 'center' }

  const num = v => {
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v)
    return null
  }
  const str = v => (typeof v === 'string' && v.trim() ? v.trim() : undefined)
  const rec = v => v && typeof v === 'object' && !Array.isArray(v)

  /* 从模型输出里抠出 JSON：容忍围栏、前后废话、多重包装 */
  function parseLoose(raw) {
    if (rec(raw)) return raw
    if (typeof raw !== 'string') return null
    let s = raw.trim()
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
    const start = s.indexOf('{')
    const end = s.lastIndexOf('}')
    if (start === -1 || end <= start) return null
    s = s.slice(start, end + 1)
    try { return JSON.parse(s) } catch { /* 常见：中文引号、尾逗号 */ }
    try {
      return JSON.parse(s.replace(/[“”]/g, '"').replace(/,\s*([}\]])/g, '$1'))
    } catch { return null }
  }

  /* ---------- 归一化：能修就修，修不了才丢 ---------- */
  function normalize(raw, opts = {}) {
    const issues = []
    const payload = parseLoose(raw)
    if (!rec(payload)) return { doc: null, issues: [{ level: 'error', msg: '无法从返回内容中解析出 JSON' }] }

    const metaRaw = rec(payload.meta) ? payload.meta : {}
    const W = num(metaRaw.width) || opts.width || CANVAS.w
    const H = num(metaRaw.height) || opts.height || CANVAS.h
    const clampX = v => Math.max(PAD, Math.min(W - PAD, v))
    const clampY = v => Math.max(PAD, Math.min(H - PAD, v))

    if (!Array.isArray(payload.steps) || !payload.steps.length) {
      return { doc: null, issues: [{ level: 'error', msg: 'steps 缺失或为空' }] }
    }

    const ids = new Set()
    const uid = (id, fb) => {
      let v = id && !ids.has(id) ? id : fb
      let n = 2
      while (ids.has(v)) v = `${fb}-${n++}`
      ids.add(v)
      return v
    }
    const clampPt = (p, path) => {
      if (!rec(p)) { issues.push({ level: 'error', msg: `${path} 坐标缺失` }); return null }
      const x = num(p.x), y = num(p.y)
      if (x === null || y === null) { issues.push({ level: 'error', msg: `${path} 坐标非法` }); return null }
      const cx = clampX(x), cy = clampY(y)
      if (cx !== x || cy !== y) issues.push({ level: 'warn', msg: `${path} 超出画布，已夹取`, fixed: true })
      return { x: cx, y: cy }
    }

    const steps = []
    let dropped = 0
    payload.steps.slice(0, 14).forEach((rs, si) => {
      if (!rec(rs)) { dropped++; return }
      const sid = uid(str(rs.id), `s${si + 1}`)
      const prims = []
      const list = Array.isArray(rs.primitives) ? rs.primitives : []
      list.slice(0, 20).forEach((rp, pi) => {
        if (!rec(rp)) return
        const kind = str(rp.kind)
        const id = uid(str(rp.id), `${sid}-e${pi + 1}`)
        const lt = LINE_ALIAS[(str(rp.lineType) || 'thick').toLowerCase()] || LINE_ALIAS[str(rp.lineType)] || 'thick'
        if (kind === 'line') {
          const x1 = num(rp.x1), y1 = num(rp.y1), x2 = num(rp.x2), y2 = num(rp.y2)
          if ([x1, y1, x2, y2].some(v => v === null)) { issues.push({ level: 'warn', msg: `第${si + 1}步 直线端点非法，已丢弃` }); return }
          if (Math.hypot(x2 - x1, y2 - y1) < 2) { issues.push({ level: 'warn', msg: `第${si + 1}步 零长度直线，已丢弃` }); return }
          prims.push({ id, kind, lineType: lt, x1: clampX(x1), y1: clampY(y1), x2: clampX(x2), y2: clampY(y2) })
        } else if (kind === 'circle') {
          const cx = num(rp.cx), cy = num(rp.cy), r = num(rp.r)
          if (cx === null || cy === null || r === null || r <= 0) { issues.push({ level: 'warn', msg: `第${si + 1}步 圆参数非法，已丢弃` }); return }
          prims.push({ id, kind, lineType: lt, cx: clampX(cx), cy: clampY(cy), r: Math.min(r, W) })
        } else if (kind === 'arc') {
          const cx = num(rp.cx), cy = num(rp.cy), r = num(rp.r)
          let a0 = num(rp.startAngle), a1 = num(rp.endAngle)
          if (cx === null || cy === null || r === null || r <= 0) { issues.push({ level: 'warn', msg: `第${si + 1}步 圆弧参数非法，已丢弃` }); return }
          if (a0 === null) a0 = 0
          if (a1 === null) a1 = a0 + 180
          if (Math.abs(a1 - a0) < 0.5) { issues.push({ level: 'warn', msg: `第${si + 1}步 圆弧起止角相同，已丢弃` }); return }
          prims.push({ id, kind, lineType: lt, cx: clampX(cx), cy: clampY(cy), r: Math.min(r, W), startAngle: a0, endAngle: a1 })
        } else if (kind === 'dimension') {
          const from = clampPt(rp.from, `第${si + 1}步 尺寸起点`)
          const to = clampPt(rp.to, `第${si + 1}步 尺寸终点`)
          if (!from || !to) return
          if (Math.hypot(to.x - from.x, to.y - from.y) < 3) { issues.push({ level: 'warn', msg: `第${si + 1}步 尺寸两点重合，已丢弃` }); return }
          const ori = ['aligned', 'horizontal', 'vertical'].includes(str(rp.orientation)) ? str(rp.orientation) : 'aligned'
          let text = str(rp.text)
          if (!text) {
            const v = ori === 'horizontal' ? Math.abs(to.x - from.x) : ori === 'vertical' ? Math.abs(to.y - from.y) : Math.hypot(to.x - from.x, to.y - from.y)
            text = String(Math.round(v * 10) / 10)
            issues.push({ level: 'info', msg: `第${si + 1}步 尺寸缺文字，已按测量值补全`, fixed: true })
          }
          prims.push({ id, kind, from, to, offset: num(rp.offset) ?? 16, orientation: ori, text, arrow: str(rp.arrow) || 'both' })
        } else if (kind === 'text' || kind === 'label') {
          const p = clampPt(rp, `第${si + 1}步 文字`)
          const s = str(rp.text) || str(rp.s)
          if (!p || !s) { issues.push({ level: 'warn', msg: `第${si + 1}步 文字内容为空，已丢弃` }); return }
          prims.push({ id, kind: 'text', p, text: s, size: num(rp.size) || 18, anchor: str(rp.anchor) || 'start', color: str(rp.color) })
        } else if (kind === 'point') {
          const p = clampPt(rp, `第${si + 1}步 点`)
          if (!p) return
          prims.push({ id, kind: 'point', p, color: str(rp.color) })
        } else {
          issues.push({ level: 'warn', msg: `第${si + 1}步 未知图元「${kind || 'undefined'}」，已跳过` })
        }
      })
      if (!prims.length) { dropped++; issues.push({ level: 'warn', msg: `第${si + 1}步无有效图元，已跳过` }); return }
      const title = str(rs.title) || `第 ${si + 1} 步`
      const narration = str(rs.narration) || str(rs.desc) || ''
      if (!narration) issues.push({ level: 'info', msg: `第${si + 1}步缺少讲解` })
      steps.push({ id: sid, title, narration, primitives: prims })
    })

    if (!steps.length) return { doc: null, issues: issues.concat([{ level: 'error', msg: '没有任何可渲染的步骤' }]) }

    const confidence = num(metaRaw.confidence)
    const warnings = (Array.isArray(payload.warnings) ? payload.warnings : []).map(str).filter(Boolean).slice(0, 8)
    const doc = {
      version: '1.0',
      meta: {
        title: str(metaRaw.title) || '未命名图纸',
        width: W, height: H,
        summary: str(metaRaw.summary) || '',
        standard: str(metaRaw.standard) || 'GB/T 4457.4',
        unit: 'mm',
        confidence: confidence === null ? null : Math.max(0, Math.min(1, confidence)),
      },
      warnings, steps,
    }
    if (dropped) issues.push({ level: 'info', msg: `共跳过 ${dropped} 个无效步骤` })
    return { doc, issues }
  }

  /* ---------- 转成渲染场景（Paper 坐标，y 向上） ---------- */
  function toScene(doc) {
    const H = doc.meta.height
    const K = doc.meta.width / 200
    const Y = y => H - y
    const P = ([x, y]) => [x, Y(y)]
    const steps = doc.steps.map(s => {
      const els = []
      s.primitives.forEach(p => {
        if (p.kind === 'line') {
          els.push(Paper.line(P([p.x1, p.y1]), P([p.x2, p.y2]), STYLE[p.lineType] || 'solid'))
        } else if (p.kind === 'circle') {
          els.push(Paper.circle(P([p.cx, p.cy]), p.r, STYLE[p.lineType] || 'solid'))
        } else if (p.kind === 'arc') {
          els.push(Paper.arc(P([p.cx, p.cy]), p.r, p.startAngle * Math.PI / 180, p.endAngle * Math.PI / 180, STYLE[p.lineType] || 'solid'))
        } else if (p.kind === 'dimension') {
          const r = Paper.dimPrim({
            from: P([p.from.x, p.from.y]), to: P([p.to.x, p.to.y]),
            offset: p.offset, orientation: p.orientation, text: p.text, arrow: p.arrow,
            size: 15, k: K,
          })
          els.push(...r.els)
        } else if (p.kind === 'text') {
          els.push(Paper.text(P([p.p.x, p.p.y]), p.text, {
            size: p.size, anchor: p.anchor, color: p.color || '#1a1f24', noAnim: false,
          }))
        } else if (p.kind === 'point') {
          els.push(Paper.dot(P([p.p.x, p.p.y]), { r: 2.6, color: p.color || '#c0392b', noAnim: false }))
        }
      })
      return { title: s.title, desc: s.narration, els }
    })
    return {
      title: doc.meta.title,
      summary: doc.meta.summary,
      confidence: doc.meta.confidence,
      warnings: doc.warnings || [],
      standard: doc.meta.standard,
      unit: doc.meta.unit,
      sheet: { w: doc.meta.width, h: doc.meta.height, frame: true, titleBlock: true },
      steps,
      mode: 'doc',
    }
  }

  /* 内置题库产物（Paper 元素）→ 同一套场景结构
   * 图幅只用两种标准比例（横版/竖版），按图形形态选择：
   * 横向图形用横版，竖向图形用竖版。同类题切换时纸张尺寸稳定，
   * 又不会把竖长的吊钩硬塞进横纸里。
   * 排布时必须扣掉 render.js 的页边距与标题栏，否则内容会压到标题栏上。
   */
  const SHEET_LAND = 920 / 660                 // 横版 ≈ 1.394
  const SHEET_PORT = 660 / 920                 // 竖版 ≈ 0.717
  const PAD_FRAC = 0.028                       // 与 render.js 的 pad 同源
  const TB_FRAC = 0.13                         // 与 render.js 的 tbH 同源
  const MARGIN = 11                            // 图形与图框的最小间隙

  /* 与 render.js 保持一致的页边距 / 标题栏高度 */
  const frameMetrics = (w, h) => {
    const pad = Math.min(w, h) * PAD_FRAC
    const tbH = Math.min(h * TB_FRAC, h - pad * 2 - 10)
    return { pad, tbH }
  }

  function fromDraw(draw) {
    const all = draw.steps.reduce((a, s) => a.concat(s.els), [])
    const bb = Paper.bbox(all)
    const bw = Math.max(bb.w, 1), bh = Math.max(bb.h, 1)
    const ratio = (bw / bh) >= 0.95 ? SHEET_LAND : SHEET_PORT

    // 由约束反解最小 h：宽向 w-2pad ≥ bw+2M；高向 h-2pad-tbH ≥ bh+2M
    const c = PAD_FRAC * Math.min(ratio, 1)
    const byWidth = (bw + 2 * MARGIN) / (ratio - 2 * c)
    const byHeight = (bh + 2 * MARGIN) / (1 - TB_FRAC - 2 * c)
    let h = Math.max(byWidth, byHeight, 60)
    let w = h * ratio
    // pad/tbH 依赖最终尺寸，迭代两轮收敛
    for (let i = 0; i < 3; i++) {
      const { pad, tbH } = frameMetrics(w, h)
      h = Math.max((bw + 2 * MARGIN + 2 * pad) / ratio, bh + 2 * MARGIN + 2 * pad + tbH)
      w = h * ratio
    }

    // 在"图框内、标题栏以上"的可用区居中。
    // 注意坐标系翻转：SVG 里标题栏在图框底部（y 向下），
    // 换到 paper 坐标（y 向上）后它占的是"下方的小 y"，所以可用区从 pad+tbH 起。
    const { pad, tbH } = frameMetrics(w, h)
    const availW = w - 2 * pad
    const y0 = pad + tbH, y1 = h - pad
    const dx = pad + availW / 2 - (bb.x0 + bb.x1) / 2
    const dy = (y0 + y1) / 2 - (bb.y0 + bb.y1) / 2

    const title = draw.title.length > 12 ? draw.title.slice(0, 12) + '…' : draw.title
    return {
      title,
      titleFull: draw.title,
      steps: draw.steps.map(s => ({ title: s.title, desc: s.desc, els: Paper.translate(s.els, dx, dy) })),
      sheet: { w, h, frame: true, titleBlock: true },
      standard: 'GB/T 4457.4', unit: 'mm',
      warnings: [], confidence: null, summary: '', mode: 'template',
    }
  }

  return { CANVAS, parseLoose, normalize, toScene, fromDraw }
})()
