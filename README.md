# 机械制图过程演示

拍一张机械零件图，AI 自动生成逐步绘制动画——每一步怎么画、为什么这么画，边看边学。

## 这是什么

一个纯前端网页工具，帮大学生理解机械制图的绘制过程：

- 上传零件照片 → AI 识别尺寸参数 → 自动生成绘制步骤动画
- 每一步配有讲解文字
- 支持播放/暂停/上一步/下一步/速度调节
- 也可以手动选模板（轴类、法兰盘、支架）直接看演示

## 技术原理

```
用户拍零件图
    ↓
多模态 LLM 读图 → 输出 JSON（零件类型 + 尺寸参数）
    ↓
参数化模板引擎 → 根据尺寸自动计算坐标，生成绘制步骤
    ↓
Canvas 动画 → 逐步播放，带讲解
```

**坐标由引擎算，不是 LLM 画的**——所以比例准确，不会歪。
LLM 只负责读尺寸数字（Ø20、R30、长度50），这是它擅长的事。

## 使用方法

### 1. 打开网页

直接用浏览器打开 `index.html` 即可，不需要服务器。

> 注意：调用 AI 接口需要联网。如果浏览器报 CORS 错误，可以用本地服务器打开：
> ```bash
> # 在项目目录下
> python3 -m http.server 8080
> # 浏览器打开 http://localhost:8080
> ```

### 2. 配置 API

点右上角 **⚙ API 设置**，填入：

| 字段 | 说明 | 默认值 |
|---|---|---|
| API Base URL | OpenAI 兼容接口地址 | `https://api.openai.com/v1` |
| API Key | 你的密钥 | （必填） |
| 模型名称 | 多模态模型 | `gpt-4o` |

支持任何 OpenAI 兼容的多模态接口（OpenAI、Azure、本地部署的 vLLM 等）。
API Key 只存在浏览器 localStorage 里，不会上传到任何服务器。

### 3. 使用

- **上传图片**：点"📷 拍照/上传图片"，选一张机械制图照片
- **手动模板**：左侧选一个零件类型，直接看动画
- **播放控制**：底部控制条播放/暂停/上一步/下一步/调速

## 项目结构

```
mech-drawing-animator/
├── index.html          # 主页面
├── css/
│   └── style.css       # 样式
├── js/
│   ├── config.js       # API 配置（localStorage）
│   ├── templates.js    # 参数化零件模板（核心）
│   ├── engine.js       # Canvas 绘制引擎
│   ├── player.js       # 动画播放器
│   ├── llm.js          # 多模态 LLM 识图
│   └── app.js          # 主逻辑
└── README.md
```

## 支持的零件类型

| 类型 | 模板函数 | 参数 |
|---|---|---|
| 轴类（shaft） | `Templates.shaft()` | segments(直径+长度)、倒角、键槽 |
| 法兰盘（flange） | `Templates.flange()` | 外径、内径、螺栓孔分布圆、孔数 |
| 支架（bracket） | `Templates.bracket()` | 底板长宽高、孔径、孔位置 |

## 怎么加新零件模板

在 `js/templates.js` 里加一个函数：

```javascript
myNewTemplate(params) {
  const steps = []
  // Step 1
  steps.push({
    desc: '这一步画什么',
    elements: [{ type: 'line', x1: 100, y1: 200, x2: 300, y2: 200 }]
  })
  // ...
  return steps
}
```

然后在 `generate()` 分发器里注册：

```javascript
generate(type, params) {
  if (type === 'shaft') return this.shaft(params)
  if (type === 'flange') return this.flange(params)
  if (type === 'mynew') return this.myNewTemplate(params)  // 加这行
}
```

支持的 element 类型：`line`、`rect`、`circle`、`arc`、`centerline`、`dim`。

## 开发说明

- 纯原生 JS，无框架、无构建工具
- 零后端，所有逻辑在浏览器跑
- LLM API 调用是直连的（生产环境建议加代理）
- 可以用 Codex / Cursor 等 AI agent 继续扩展功能

## License

MIT
