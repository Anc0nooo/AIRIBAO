# RIBAO - AI 智能日报生成器

<div align="center">

<img src="logo.ico" alt="RIBAO Logo" width="80" height="80"/>

<h3>🚀 一款基于 AI 的智能日报生成桌面应用</h3>

<p align="center">
    <strong>AI 驱动 · 智能生成 · 一键提交</strong>
  </p>

<p>
    <a href="#功能特性">功能特性</a> · 
    <a href="#技术栈">技术栈</a> · 
    <a href="#快速开始">快速开始</a> · 
    <a href="#使用说明">使用说明</a> · 
    <a href="#配置说明">配置说明</a>
  </p>

</div>

---

## ✨ 功能特性

### 🤖 AI 智能生成

- **火山引擎方舟 API** 驱动，智能识别工作内容
- **LangChain 框架**支持（可选），更灵活的 AI 调用
- **流式生成**模式，逐字输出，体验流畅
- **自定义提示词**，适配不同岗位需求

### 📝 双模式输入

- **AI 模式**：描述工作内容，AI 自动生成日报
- **手动模式**：按模板填写，结构化输入

### 💾 日报管理

- **自动编号**：按天数自动命名（第 N 天）
- **历史查看**：查看和编辑历史日报
- **Markdown 格式**：清晰易读

### 📧 邮件发送

- **SMTP 邮件**：一键发送日报到指定邮箱
- **自定义配置**：支持任意 SMTP 服务器

### 📋 日报提交

- **智能解析**：自动提取工作内容、明日计划、所需支持
- **一键复制**：复制全部或部分内容
- **快捷填写**：生成 JS 脚本，自动填写日报系统

### 🎨 个性化设置

- **三语言支持**：中文 / English / 日本語
- **三主题切换**：浅色 / 深色 / 自定义背景
- **玻璃拟态 UI**：现代化视觉效果
- **窗口透明度**：自由调节
- **自定义背景**：支持图片和视频

---

## 🛠 技术栈

### 后端


| 技术       | 版本  | 说明             |
| ---------- | ----- | ---------------- |
| Python     | 3.10+ | 主开发语言       |
| Flask      | 3.0+  | Web 框架         |
| Flask-CORS | 4.0+  | 跨域支持         |
| pywebview  | 5.0+  | 桌面窗口封装     |
| LangChain  | 1.0+  | LLM 框架（可选） |

### 前端


| 技术       | 说明                |
| ---------- | ------------------- |
| HTML5      | 页面结构            |
| CSS3       | 玻璃拟态样式        |
| Vanilla JS | 原生 JS，无框架依赖 |

### AI 服务

- **火山引擎方舟 API**
- 支持 doubao-pro-32k 等模型

---

## 🚀 快速开始

### 环境要求

- Python 3.10+
- Windows 操作系统

### 安装步骤

#### 1. 克隆项目

```bash
git clone <repository-url>
cd RIBAO
```

#### 2. 安装依赖

```bash
pip install -r requirements.txt
```

#### 3. 配置 API

编辑 `config.json`，填入火山引擎方舟 API 密钥：

```json
{
  "api": {
    "key": "你的API密钥",
    "base_url": "https://ark.cn-beijing.volces.com/api/v3",
    "model_endpoint": "你的模型端点ID"
  }
}
```

#### 4. 运行应用

```bash
python main.py
```

应用启动后会自动打开窗口，即可开始使用！

---

## 📖 使用说明

### AI 生成日报

1. 选择 **「AI 智能生成」** 模式
2. 在输入框描述今天的工作内容，例如：
   ```
   1. 完成用户登录模块的开发
   2. 修复了订单支付的 bug
   3. 参加了需求评审会议
   ```
3. 点击 **「生成内容」** 按钮
4. AI 会自动生成结构化的日报

### 手动输入日报

1. 选择 **「手动输入」** 模式
2. 分别填写：
   - 开发类任务（一行一条）
   - 交付类任务（一行一条）
   - 明日计划
   - 所需支持
3. 点击 **「生成内容」** 按钮

### 保存日报

- 点击 **「保存文件」** 按钮
- 日报会保存为 `日报/MM月DD日 第N天.md`

### 发送邮件

1. 在设置中配置邮箱信息
2. 点击 **「发送邮件」** 按钮
3. 日报会发送到指定邮箱

### 提交日报

1. 点击 **「提交日报」** 按钮
2. 查看日报各部分预览
3. 点击 **「复制全部」** 复制内容
4. 如果配置了日报系统 URL，点击 **「打开日报页面」**
5. 在日报系统页面粘贴内容完成提交

---

## ⚙️ 配置说明

### config.json - 系统配置

```json
{
  "api": {
    "key": "API密钥",
    "base_url": "https://ark.cn-beijing.volces.com/api/v3",
    "model_endpoint": "模型端点ID"
  },
  "email": {
    "sender_email": "发送邮箱",
    "sender_auth_code": "授权码",
    "smtp_server": "smtp.qq.com",
    "smtp_port": 465,
    "default_receiver": "接收邮箱"
  },
  "template": {
    "report": "日报模板",
    "ai_prompt": "AI提示词"
  }
}
```

### settings.json - 用户设置

```json
{
  "language": "zh",
  "email": "",
  "opacity": 1.0,
  "theme": "light",
  "bgImage": null,
  "bgVideo": null,
  "bgType": "image"
}
```

### submit_config.json - 提交配置

```json
{
  "enabled": true,
  "url": "日报系统地址",
  "fields": {
    "project": "",
    "manager": "",
    "normal_hours": 8.0,
    "overtime_hours": 0.0
  },
  "mapping": {
    "work_content": "today_report",
    "deliverable": "plan_and_support"
  },
  "auto_open": true,
  "auto_copy": true
}
```

---

## 📁 项目结构

```
RIBAO/
├── main.py                 # 🚀 应用入口
├── requirements.txt        # 📦 依赖清单
├── config.json             # ⚙️ 系统配置
├── settings.json           # 🎨 用户设置
├── submit_config.json      # 📝 提交配置
├── logo.ico                # 🖼️ 应用图标
├── main.spec               # 🔧 打包配置
│
├── app/                    # 📁 后端应用
│   ├── __init__.py
│   ├── app.py             # Flask 路由
│   ├── api.py             # AI 调用
│   ├── config.py          # 配置管理
│   ├── i18n.py            # 多语言
│   └── submit.py          # 提交功能
│
├── static/                 # 📁 前端资源
│   ├── app.js             # 交互逻辑
│   └── style.css          # 样式表
│
├── templates/              # 📁 模板
│   └── index.html          # 主页面
│
├── uploads/                # 📁 上传文件
│   └── bg_*.mp4/png       # 背景文件
│
└── 日报/                   # 📁 日报存档
    └── MM月DD日 第N天.md
```

---

## 🏗 架构设计

### 技术架构

```
┌─────────────────────────────────────────────────────┐
│                    RIBAO 应用                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────┐     ┌─────────────────────────┐   │
│  │  前端 UI     │     │  Flask 后端             │   │
│  │  (HTML/CSS/  │────▶│  ├── API 路由           │   │
│  │   JS)        │     │  ├── AI 调用            │   │
│  └─────────────┘     │  ├── 配置管理           │   │
│                      │  ├── 邮件服务           │   │
│                      │  └── 提交功能           │   │
│                      └─────────────────────────┘   │
│                                │                    │
│                                ▼                    │
│                      ┌─────────────────────┐       │
│                      │   火山引擎方舟 API   │       │
│                      └─────────────────────┘       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### AI 调用架构

```
用户请求
    ↓
generate_with_ai()
    ↓
LangChain 可用？
    ├── 是 → 尝试 LangChain
    │        ↓ 失败
    │    回退到 urllib
    └── 否 → 直接使用 urllib
              ↓
        火山引擎 API
```

---

## 📦 打包发布

### 打包为可执行文件

```bash
# 使用 PyInstaller 打包
pyinstaller main.spec

# 或手动打包
pyinstaller --noconfirm --windowed --icon=logo.ico main.py
```

打包后的可执行文件在 `dist/` 目录下。

---

## 🔧 开发指南

### 添加新的 AI 模型

1. 在 `app/api.py` 中修改 `_get_llm()` 函数
2. 支持 LangChain 的所有模型（ChatOpenAI、ChatVolcengine 等）

### 添加新的语言

1. 在 `app/i18n.py` 中添加新语言条目
2. 每个语言需包含所有翻译键

### 自定义日报模板

在 `config.json` 的 `template` 字段中修改：

- `report`：日报模板，支持 `{dev_tasks}`、`{deliver_tasks}` 等占位符
- `ai_prompt`：AI 提示词，支持 `{work_description}` 占位符

---

## ❓ 常见问题

### Q: AI 生成失败怎么办？

检查以下几点：

1. API 密钥是否正确配置
2. 模型端点 ID 是否有效
3. 网络连接是否正常

### Q: 如何更换 AI 模型？

修改 `config.json` 中的 `model_endpoint` 为新的模型端点 ID。

### Q: 邮件发送失败？

1. 检查 SMTP 服务器和端口配置
2. 确认授权码正确（QQ 邮箱需使用授权码而非密码）
3. 检查网络连接

### Q: 支持哪些操作系统？

目前主要支持 Windows，macOS 和 Linux 可参考 pywebview 文档。

---

## 📄 许可证

本项目仅供学习和个人使用。

---

## 🙏 致谢

- [Flask](https://flask.palletsprojects.com/) - Web 框架
- [pywebview](https://pywebview.flowrl.com/) - 桌面窗口
- [LangChain](https://www.langchain.com/) - LLM 框架
- [火山引擎](https://www.volcengine.com/) - AI 服务

---

<div align="center">

<p>💡 如果这个项目对你有帮助，请给个 ⭐ Star 支持一下！</p>

</div>
