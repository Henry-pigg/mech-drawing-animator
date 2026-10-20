const AppConfig = {
  KEY: 'mech_draw_config',
  /* 构建标识：改版时递增，页面上可见，方便确认打开的是哪一版 */
  BUILD: 'r5 · fit',
  get() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || {} }
    catch { return {} }
  },
  save(cfg) { localStorage.setItem(this.KEY, JSON.stringify(cfg)) },
  get baseUrl() { return this.get().baseUrl || 'https://api.openai.com/v1' },
  get apiKey() { return this.get().apiKey || '' },
  get model() { return this.get().model || 'gpt-4o' },
  get hasApiKey() { return !!this.apiKey }
}
