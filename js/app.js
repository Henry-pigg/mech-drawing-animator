document.addEventListener('DOMContentLoaded', () => {
  const engine = new DrawEngine('canvas')
  const player = new Player(engine)
  const recognizer = new LLMRecognizer()

  const fileInput = document.getElementById('file-input')
  const btnUpload = document.getElementById('btn-upload')
  const overlay = document.getElementById('overlay-loading')
  const currentPartName = document.getElementById('current-part-name')
  const currentPartParams = document.getElementById('current-part-params')
  const settingsModal = document.getElementById('settings-modal')

  btnUpload.onclick = () => fileInput.click()
  fileInput.onchange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!AppConfig.hasApiKey) {
      alert('请先点右上角 ⚙ API 设置，填入你的 API Key')
      openSettings()
      return
    }
    overlay.classList.remove('hidden')
    try {
      const result = await recognizer.recognize(file)
      loadPart(result)
    } catch (err) {
      alert('识别失败：' + err.message)
    } finally {
      overlay.classList.add('hidden')
    }
  }

  document.querySelectorAll('.template-item').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.template-item').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      const type = btn.dataset.template
      const defaults = {
        shaft: {
          type: 'shaft', name: '三台阶轴',
          segments: [{diameter:20,length:60},{diameter:30,length:80},{diameter:25,length:50}],
          hasChamfer: true, hasKeyway: true
        },
        flange: {
          type: 'flange', name: '法兰盘',
          outerDiameter: 80, innerDiameter: 40, thickness: 15,
          boltCircle: 60, boltCount: 4, boltDiameter: 8
        },
        bracket: {
          type: 'bracket', name: 'L形支架',
          baseLength: 60, baseWidth: 12, height: 50,
          holeDiameter: 10, holeOffset: 20
        }
      }
      loadPart(defaults[type])
    }
  })

  function loadPart(result) {
    const steps = Templates.generate(result.type, result)
    if (steps.length === 0) { alert('不支持的零件类型'); return }
    player.loadSteps(steps)
    currentPartName.textContent = result.name || result.type
    currentPartParams.textContent = JSON.stringify(result, null, 2)
  }

  function openSettings() {
    const cfg = AppConfig.get()
    document.getElementById('cfg-baseurl').value = cfg.baseUrl || 'https://api.openai.com/v1'
    document.getElementById('cfg-apikey').value = cfg.apiKey || ''
    document.getElementById('cfg-model').value = cfg.model || 'gpt-4o'
    settingsModal.classList.remove('hidden')
  }
  document.getElementById('btn-settings').onclick = openSettings
  document.getElementById('btn-cancel-settings').onclick = () => settingsModal.classList.add('hidden')
  document.getElementById('btn-save-settings').onclick = () => {
    AppConfig.save({
      baseUrl: document.getElementById('cfg-baseurl').value,
      apiKey: document.getElementById('cfg-apikey').value,
      model: document.getElementById('cfg-model').value
    })
    settingsModal.classList.add('hidden')
  }

  loadPart({
    type: 'shaft', name: '示例：三台阶轴',
    segments: [{diameter:20,length:60},{diameter:30,length:80},{diameter:25,length:50}],
    hasChamfer: true, hasKeyway: true
  })
})
