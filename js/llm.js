class LLMRecognizer {
  async recognize(imageFile) {
    if (!AppConfig.hasApiKey) throw new Error('请先在右上角设置中填入 API Key')
    const base64 = await this._fileToBase64(imageFile)
    const prompt = `你是一个机械制图老师。看这张零件图，读出零件类型和所有尺寸参数。

只输出 JSON，不要解释，不要 markdown 代码块。

零件类型有三种：
- "shaft"：轴类（回转体，有水平中心线贯穿，多段圆柱）
- "flange"：法兰盘类（圆盘，有同心圆和螺栓孔）
- "bracket"：支架类（L形或板状，带孔）

输出格式：
{
  "type": "shaft | flange | bracket",
  "name": "零件名称（中文）",
  "segments": [{"diameter": 数字, "length": 数字}],
  "hasChamfer": true/false,
  "hasKeyway": true/false,
  "outerDiameter": 数字,
  "innerDiameter": 数字,
  "thickness": 数字,
  "boltCircle": 数字,
  "boltCount": 数字,
  "boltDiameter": 数字,
  "baseLength": 数字,
  "baseWidth": 数字,
  "height": 数字,
  "holeDiameter": 数字,
  "holeOffset": 数字
}

规则：
1. 尺寸数字直接从图上读，单位 mm，不要估
2. 图上没有的尺寸给一个合理的默认值
3. 拿不准类型就选最接近的
4. 只输出 JSON`

    const res = await fetch(`${AppConfig.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AppConfig.apiKey}`
      },
      body: JSON.stringify({
        model: AppConfig.model,
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: base64 } },
            { type: 'text', text: prompt }
          ]
        }],
        max_tokens: 1000
      })
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`API 错误 ${res.status}: ${err}`)
    }
    const data = await res.json()
    let content = data.choices[0].message.content.trim()
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    try { return JSON.parse(content) }
    catch { throw new Error('AI 返回格式错误，请重试') }
  }
  _fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }
}
