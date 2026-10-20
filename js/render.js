/* SvgRender — 图纸渲染器
 * 输入 scene = {sheet:{w,h}, steps:[{title,desc,els}], title, ...}
 * 输出内联 SVG：图框、标题栏、国标线型、按步生长的动画
 */
class SvgRender {
  constructor(host) {
    this.host = host
    this.step = 0
    this.scene = null
  }

  setScene(scene) {
    this.scene = scene
    this.step = 0
    this.build()
  }

  showStep(i) { this.step = i; this.build() }

  build() {
    if (!this.scene) { this.host.innerHTML = ''; return }
    this.host.innerHTML = SvgRender.buildSvg(this.scene, this.step)
    this.svg = this.host.querySelector('svg')
  }

  static buildSvg(sc, stepIndex, opts = {}) {
    const { w, h } = sc.sheet
    const k = w / 200                                  // 线宽随图幅缩放
    const pad = Math.min(w, h) * 0.028
    const frame = { x: pad, y: pad, w: w - pad * 2, h: h - pad * 2 }
    const tbW = Math.min(w * 0.32, w - pad * 2 - 10)
    const tbH = Math.min(h * 0.11, h - pad * 2 - 10)
    const tb = { x: frame.x + frame.w - tbW, y: frame.y + frame.h - tbH, w: tbW, h: tbH }

    const SY = y => h - y
    const parts = []
    parts.push(`<svg class="dw" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(sc.title || '')}">`)
    parts.push(`<style>${SvgRender.CSS}</style>`)
    parts.push(`<defs><pattern id="grid" width="${20 * k}" height="${20 * k}" patternUnits="userSpaceOnUse"><path d="M${20 * k} 0H0V${20 * k}" fill="none" stroke="#eef2f7" stroke-width="${Math.max(0.6, k * 0.4)}"/></pattern></defs>`)
    parts.push(`<rect width="${w}" height="${h}" fill="#fff"/>`)
    parts.push(`<rect x="${frame.x}" y="${frame.y}" width="${frame.w}" height="${frame.h}" fill="url(#grid)"/>`)
    parts.push(`<rect x="${frame.x}" y="${frame.y}" width="${frame.w}" height="${frame.h}" fill="none" stroke="#121820" stroke-width="${Math.max(1, k * 0.55)}"/>`)

    // 逐步铺开
    sc.steps.forEach((st, si) => {
      if (si > stepIndex) return
      parts.push(SvgRender.renderStep(st, si, si === stepIndex && opts.animate !== false, h, k))
    })

    // 标题栏
    if (sc.sheet.titleBlock) {
      const titleStr = sc.title || '未命名图纸'
      const cjk = /[\u4e00-\u9fa5]/g
      const textW = (str, fs) => (String(str).match(cjk) || []).length * fs + (String(str).replace(cjk, '').length * 0.55 * fs)
      const fs1 = Math.max(2.0 * k, Math.min(tbH * 0.34, (tbW - 14) / Math.max(1, textW(titleStr, 1))))
      const fs2 = Math.max(1.7 * k, Math.min(tbH * 0.18, (tbW * 0.36) / 9))
      parts.push(`<g font-family="'Segoe UI','Microsoft YaHei',sans-serif">
        <rect x="${tb.x}" y="${tb.y}" width="${tb.w}" height="${tb.h}" fill="#fff" stroke="#121820" stroke-width="${Math.max(1, k * 0.5)}"/>
        <line x1="${tb.x}" y1="${tb.y + tbH * 0.48}" x2="${tb.x + tb.w}" y2="${tb.y + tbH * 0.48}" stroke="#121820" stroke-width="${Math.max(0.8, k * 0.35)}"/>
        <text x="${tb.x + 7}" y="${tb.y + tbH * 0.31}" font-size="${r(fs1)}" font-weight="600" fill="#121820">${esc(titleStr)}</text>
        <text x="${tb.x + 7}" y="${tb.y + tbH * 0.78}" font-size="${r(fs2)}" fill="#5a6a80">${esc(sc.standard || 'GB/T 4457.4 — 线型')}</text>
        <text x="${tb.x + tb.w - 7}" y="${tb.y + tbH * 0.78}" font-size="${r(fs2)}" fill="#5a6a80" text-anchor="end">单位 ${esc(sc.unit || 'mm')}</text>
      </g>`)
    }
    parts.push('</svg>')
    return parts.join('')
  }

  static renderStep(st, si, animate, h, k) {
    const SY = y => h - y
    const groups = { solid: [], hidden: [], center: [], thin: [], dim: [] }
    const extras = []
    let textIdx = 0

    st.els.forEach((el, ei) => {
      const key = el.st === 'hidden' ? 'hidden' : el.st === 'center' ? 'center' : el.st === 'thin' ? 'thin' : el.st === 'dim' ? 'dim' : 'solid'
      if (el.t === 'line') {
        groups[key].push(`M${r(el.a[0])} ${r(SY(el.a[1]))}L${r(el.b[0])} ${r(SY(el.b[1]))}`)
      } else if (el.t === 'poly') {
        if (!el.pts || el.pts.length < 2) return
        let d = `M${r(el.pts[0][0])} ${r(SY(el.pts[0][1]))}`
        for (let i = 1; i < el.pts.length; i++) d += `L${r(el.pts[i][0])} ${r(SY(el.pts[i][1]))}`
        if (el.closed) d += 'Z'
        if (el.fill) extras.push({ kind: 'fill', d, color: el.color || '#121820', ei })
        else groups[key].push(d)
      } else if (el.t === 'circle') {
        const cx = el.c[0], cy = SY(el.c[1]), rr = el.r
        groups[key].push(`M${r(cx - rr)} ${r(cy)}A${r(rr)} ${r(rr)} 0 1 0 ${r(cx + rr)} ${r(cy)}A${r(rr)} ${r(rr)} 0 1 0 ${r(cx - rr)} ${r(cy)}`)
      } else if (el.t === 'arc') {
        let a0 = el.a0, a1 = el.a1
        while (a1 < a0) a1 += Math.PI * 2
        const large = (a1 - a0) > Math.PI ? 1 : 0
        const p0 = [el.c[0] + el.r * Math.cos(a0), SY(el.c[1] + el.r * Math.sin(a0))]
        const p1 = [el.c[0] + el.r * Math.cos(a1), SY(el.c[1] + el.r * Math.sin(a1))]
        groups[key].push(`M${r(p0[0])} ${r(p0[1])}A${r(el.r)} ${r(el.r)} 0 ${large} 0 ${r(p1[0])} ${r(p1[1])}`)
      } else if (el.t === 'dot') {
        extras.push({ kind: 'dot', cx: el.p[0], cy: SY(el.p[1]), r: Math.max(1.4, el.r * (k / 3)), color: el.color || '#c0392b', hollow: el.hollow, ei })
      } else if (el.t === 'arrow') {
        const tip = [el.tip[0], SY(el.tip[1])], from = [el.from[0], SY(el.from[1])]
        const dx = tip[0] - from[0], dy = tip[1] - from[1], L = Math.hypot(dx, dy) || 1
        const ux = dx / L, uy = dy / L
        const len = Math.min(L, 2.8 * k), wid = 1.0 * k
        extras.push({
          kind: 'fill', ei,
          d: `M${r(tip[0])} ${r(tip[1])}L${r(tip[0] - ux * len - uy * wid)} ${r(tip[1] - uy * len + ux * wid)}L${r(tip[0] - ux * len + uy * wid)} ${r(tip[1] - uy * len - ux * wid)}Z`,
          color: el.color || '#121820',
        })
      } else if (el.t === 'text') {
        const x = el.p[0], y = SY(el.p[1])
        const anchor = el.anchor === 'start' ? 'start' : el.anchor === 'end' ? 'end' : 'middle'
        const rot = el.rot ? ` transform="rotate(${(-el.rot * 180 / Math.PI).toFixed(2)} ${r(x)} ${r(y)})"` : ''
        const fs = el.size || 3
        const weight = el.weight || 400
        extras.push({
          kind: 'text', ei, delay: textIdx++,
          html: `<text x="${r(x)}" y="${r(y)}" font-size="${r(fs)}" fill="${el.color || '#121820'}" text-anchor="${anchor}" dominant-baseline="middle" font-weight="${weight}"${rot}${el.italic ? ' font-style="italic"' : ''}>${esc(el.s)}</text>`,
        })
      }
    })

    const sw = { solid: 0.62 * k, hidden: 0.32 * k, center: 0.2 * k, thin: 0.18 * k, dim: 0.18 * k }
    const dash = {
      solid: '', hidden: `${3 * k} ${1.6 * k}`, center: `${10 * k} ${1.5 * k} ${1.4 * k} ${1.5 * k}`, thin: '', dim: '',
    }

    const out = [`<g data-step="${si}" class="step">`]
    let gi = 0
    Object.keys(groups).forEach(key => {
      const d = groups[key].join('')
      if (!d) return
      const id = `mk-${si}-${key}`
      const delay = animate ? gi * 80 : 0
      gi++
      if (animate) {
        out.push(`<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
          <path d="${d}" fill="none" stroke="#fff" stroke-width="${sw[key] * 6 + 1}" stroke-linecap="round" class="rv" pathLength="1" style="animation-delay:${delay}ms"/>
        </mask>`)
      }
      out.push(`<path d="${d}" fill="none" stroke="${key === 'dim' ? '#2f5d9e' : '#121820'}" stroke-width="${r(sw[key])}" stroke-linecap="round" stroke-linejoin="round"${dash[key] ? ` stroke-dasharray="${dash[key]}"` : ''}${animate ? ` mask="url(#${id})"` : ''}/>`)
    })

    extras.forEach((x, idx) => {
      const delay = animate ? 260 + Math.min(6, idx) * 60 : 0
      if (x.kind === 'text') {
        out.push(x.html.replace('<text ', `<text class="${animate ? 'fi' : ''}" style="animation-delay:${delay}ms" `))
      } else if (x.kind === 'dot') {
        out.push(`<circle cx="${r(x.cx)}" cy="${r(x.cy)}" r="${r(x.r)}" fill="${x.hollow ? '#fff' : x.color}" stroke="${x.color}" stroke-width="${r(1.2 * k / 3)}" class="${animate ? 'fi' : ''}" style="animation-delay:${delay}ms"/>`)
      } else {
        out.push(`<path d="${x.d}" fill="${x.color}" class="${animate ? 'fi' : ''}" style="animation-delay:${delay}ms"/>`)
      }
    })
    out.push('</g>')
    return out.join('')
  }

  /* 导出：去掉动画，保留完整图形 */
  static cleanSvg(svg) {
    const clone = svg.cloneNode(true)
    clone.querySelectorAll('.rv').forEach(el => { el.removeAttribute('class') })
    clone.querySelectorAll('.fi').forEach(el => { el.removeAttribute('class'); el.style.animation = 'none'; el.style.opacity = '1' })
    clone.querySelectorAll('mask').forEach(m => {
      const id = m.id
      clone.querySelectorAll(`[mask="url(#${id})"]`).forEach(el => el.removeAttribute('mask'))
      m.remove()
    })
    return clone
  }

  async exportSvg(name) {
    if (!this.scene) return
    const full = this.fullSvg()
    download(new Blob([full], { type: 'image/svg+xml;charset=utf-8' }), `${name || 'drawing'}.svg`)
  }

  fullSvg() {
    // 先展开全部步骤再序列化
    const keep = this.step
    this.step = this.scene.steps.length - 1
    this.build()
    const svg = SvgRender.cleanSvg(this.svg)
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    const out = new XMLSerializer().serializeToString(svg)
    this.step = keep
    this.build()
    return `<?xml version="1.0" encoding="UTF-8"?>\n${out}`
  }

  async exportPng(name, scale = 2) {
    if (!this.scene) return
    const { w, h } = this.scene.sheet
    const src = this.fullSvg()
    const img = new Image()
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src)
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url })
    const cv = document.createElement('canvas')
    cv.width = w * scale; cv.height = h * scale
    const ctx = cv.getContext('2d')
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height)
    ctx.drawImage(img, 0, 0, cv.width, cv.height)
    const blob = await new Promise(r => cv.toBlob(r, 'image/png'))
    download(blob, `${name || 'drawing'}.png`)
  }
}

SvgRender.CSS = `
.rv{stroke-dasharray:1;stroke-dashoffset:1;animation:rv 900ms cubic-bezier(.35,0,.25,1) forwards}
@keyframes rv{to{stroke-dashoffset:0}}
.fi{opacity:0;animation:fi 340ms ease-out forwards}
@keyframes fi{to{opacity:1}}
`

const r = v => Math.round(v * 100) / 100
const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function download(blob, filename) {
  const a = document.createElement('a')
  const url = URL.createObjectURL(blob)
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
