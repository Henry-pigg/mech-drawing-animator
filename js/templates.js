const Templates = {
  shaft(params) {
    const segs = params.segments || [{diameter:20,length:60},{diameter:30,length:80},{diameter:25,length:50}]
    const totalLen = segs.reduce((s, x) => s + x.length, 0)
    const startX = (900 - totalLen * 3) / 2
    const centerY = 280
    const scale = 3
    const steps = []

    steps.push({
      desc: '第一步：画水平中心线作为基准。用细点划线，超出轮廓两端各 5~10mm。',
      elements: [{ type: 'centerline', x1: startX - 20, y1: centerY, x2: startX + totalLen * scale + 20, y2: centerY }]
    })

    let x = startX
    segs.forEach((seg, i) => {
      const w = seg.length * scale
      const h = seg.diameter * scale
      steps.push({
        desc: `第${i+2}步：画第 ${i+1} 段轴，直径 Ø${seg.diameter}，长度 ${seg.length}。粗实线，从中心线上下对称画出。`,
        elements: [{ type: 'rect', x: x, y: centerY - h/2, w: w, h: h }]
      })
      x += w
    })

    if (params.hasChamfer) {
      const c = 2
      steps.push({
        desc: `第${steps.length+1}步：画倒角 C${c}。在轴端 45° 切角。`,
        elements: [
          { type: 'line', x1: startX, y1: centerY - segs[0].diameter*scale/2, x2: startX + c*scale, y2: centerY - segs[0].diameter*scale/2 + c*scale },
          { type: 'line', x1: startX, y1: centerY + segs[0].diameter*scale/2, x2: startX + c*scale, y2: centerY + segs[0].diameter*scale/2 - c*scale }
        ]
      })
    }

    if (params.hasKeyway) {
      const keySeg = segs[1] || segs[0]
      const keyX = startX + (segs[0]?.length || 0) * scale + 20
      steps.push({
        desc: `第${steps.length+1}步：画键槽。宽 6mm，深 3mm，位于轴段上方。`,
        elements: [{ type: 'rect', x: keyX, y: centerY - keySeg.diameter*scale/2 - 10, w: 40, h: 10 }]
      })
    }

    let dimX = startX
    segs.forEach((seg, i) => {
      const w = seg.length * scale
      steps.push({
        desc: `第${steps.length+1}步：标注第 ${i+1} 段的直径 Ø${seg.diameter} 和长度 ${seg.length}。`,
        elements: [
          { type: 'dim', x1: dimX, y1: centerY - seg.diameter*scale/2 - 25, x2: dimX + w, y2: centerY - seg.diameter*scale/2 - 25, text: String(seg.length) },
          { type: 'dim', x1: dimX + w/2, y1: centerY - seg.diameter*scale/2 - 45, x2: dimX + w/2, y2: centerY - seg.diameter*scale/2, text: `Ø${seg.diameter}` }
        ]
      })
      dimX += w
    })
    return steps
  },

  flange(params) {
    const od = params.outerDiameter || 80
    const id = params.innerDiameter || 40
    const bc = params.boltCircle || 60
    const n = params.boltCount || 4
    const bd = params.boltDiameter || 8
    const cx = 450, cy = 280, scale = 3
    const steps = []

    steps.push({
      desc: '第一步：画十字中心线。水平和垂直点划线交点为圆心。',
      elements: [
        { type: 'centerline', x1: cx - od*scale, y1: cy, x2: cx + od*scale, y2: cy },
        { type: 'centerline', x1: cx, y1: cy - od*scale, x2: cx, y2: cy + od*scale }
      ]
    })
    steps.push({
      desc: `第二步：画法兰外圆 Ø${od}。粗实线圆。`,
      elements: [{ type: 'circle', cx, cy, r: od*scale/2 }]
    })
    steps.push({
      desc: `第三步：画内孔 Ø${id}。与外圆同心。`,
      elements: [{ type: 'circle', cx, cy, r: id*scale/2 }]
    })
    steps.push({
      desc: `第四步：画螺栓孔中心圆（点划线），Ø${bc}。`,
      elements: [{ type: 'circle', cx, cy, r: bc*scale/2, dashed: true }]
    })
    const angles = []
    for (let i = 0; i < n; i++) angles.push((i * 2 * Math.PI) / n - Math.PI/2)
    steps.push({
      desc: `第五步：在螺栓孔中心圆上均匀分布 ${n} 个螺栓孔 Ø${bd}。`,
      elements: angles.map(a => ({
        type: 'circle',
        cx: cx + (bc*scale/2) * Math.cos(a),
        cy: cy + (bc*scale/2) * Math.sin(a),
        r: bd*scale/2
      }))
    })
    steps.push({
      desc: '第六步：标注各尺寸——外径、内径、螺栓孔分布圆和螺栓孔直径。',
      elements: [
        { type: 'dim', x1: cx - od*scale/2, y1: cy - od*scale/2 - 30, x2: cx + od*scale/2, y2: cy - od*scale/2 - 30, text: `Ø${od}` },
        { type: 'dim', x1: cx - id*scale/2, y1: cy + id*scale/2 + 20, x2: cx + id*scale/2, y2: cy + id*scale/2 + 20, text: `Ø${id}` }
      ]
    })
    return steps
  },

  bracket(params) {
    const bl = params.baseLength || 60
    const bw = params.baseWidth || 12
    const h = params.height || 50
    const hd = params.holeDiameter || 10
    const ho = params.holeOffset || 20
    const ox = 250, oy = 350, scale = 3
    const steps = []

    steps.push({
      desc: '第一步：画底面基准线和左侧竖直线作为定位。',
      elements: [
        { type: 'line', x1: ox - 20, y1: oy, x2: ox + bl*scale + 20, y2: oy },
        { type: 'line', x1: ox, y1: oy + 20, x2: ox, y2: oy - h*scale - 20 }
      ]
    })
    steps.push({
      desc: `第二步：画底板轮廓，长 ${bl}mm，厚 ${bw}mm。`,
      elements: [{ type: 'rect', x: ox, y: oy - bw*scale, w: bl*scale, h: bw*scale }]
    })
    steps.push({
      desc: `第三步：画竖板轮廓，高 ${h}mm，与底板左侧对齐。`,
      elements: [{ type: 'rect', x: ox, y: oy - h*scale - bw*scale, w: bw*scale, h: h*scale }]
    })
    steps.push({
      desc: `第四步：画竖板上的安装孔 Ø${hd}，距底面 ${ho}mm。`,
      elements: [
        { type: 'centerline', x1: ox + bw*scale/2 - 15, y1: oy - bw*scale - ho*scale, x2: ox + bw*scale/2 + 15, y2: oy - bw*scale - ho*scale },
        { type: 'centerline', x1: ox + bw*scale/2, y1: oy - bw*scale - ho*scale - 15, x2: ox + bw*scale/2, y2: oy - bw*scale - ho*scale + 15 },
        { type: 'circle', cx: ox + bw*scale/2, cy: oy - bw*scale - ho*scale, r: hd*scale/2 }
      ]
    })
    steps.push({
      desc: '第五步：标注底板长度、高度和孔的尺寸。',
      elements: [
        { type: 'dim', x1: ox, y1: oy + 20, x2: ox + bl*scale, y2: oy + 20, text: String(bl) },
        { type: 'dim', x1: ox - 30, y1: oy - bw*scale, x2: ox - 30, y2: oy - h*scale - bw*scale, text: String(h) }
      ]
    })
    return steps
  },

  generate(type, params) {
    if (type === 'shaft') return this.shaft(params)
    if (type === 'flange') return this.flange(params)
    if (type === 'bracket') return this.bracket(params)
    return []
  }
}
