# RIBAO - AI 智能日报生成器

> 一款基于 AI 的智能日报生成桌面应用，支持智能生成、手动输入、邮件发送、日报提交等功能。

---

## 一、技术栈

### 1.1 后端技术栈


| 技术                    | 版本    | 说明                                |
| ----------------------- | ------- | ----------------------------------- |
| **Python**              | 3.10+   | 主开发语言，简洁高效                |
| **Flask**               | 3.0+    | 轻量级 Web 框架，提供 HTTP API 服务 |
| **Flask-CORS**          | 4.0+    | 跨域资源共享支持                    |
| **pywebview**           | 5.0+    | 将 Web 应用封装为原生桌面窗口       |
| **LangChain**           | 1.0+    | LLM 应用框架（可选，用于 AI 调用）  |
| **LangChain-Community** | 0.0.10+ | LangChain 社区扩展包                |
| **LangChain-Core**      | 0.3+    | LangChain 核心库                    |
| **火山引擎方舟 API**    | -       | AI 模型服务（doubao-pro-32k 等）    |

### 1.2 前端技术栈


| 技术                   | 说明                                  |
| ---------------------- | ------------------------------------- |
| **HTML5**              | 语义化标签，页面结构                  |
| **CSS3**               | 样式表，玻璃拟态（Glassmorphism）效果 |
| **CSS Variables**      | 主题色、透明度等动态配置              |
| **Vanilla JavaScript** | 原生 JS，无框架依赖，轻量高效         |

### 1.3 系统依赖


| 技术                     | 说明                                   |
| ------------------------ | -------------------------------------- |
| **Windows API (ctypes)** | 实现无边框窗口的拖拽、最小化、最大化   |
| **SMTP (smtplib)**       | 邮件发送服务（QQ邮箱）                 |
| **urllib**               | HTTP 请求（AI API 调用，作为回退方案） |
| **json**                 | JSON 数据解析与序列化                  |

### 1.4 AI 调用架构

```
用户请求
    ↓
generate_with_ai() / generate_with_ai_stream()
    ↓
检查 LangChain 是否可用？
    ├── 可用 → 尝试 LangChain ChatOpenAI
    │         ↓
    │    成功 → 返回结果
    │    失败 → 自动回退到 urllib
    └── 不可用 → 直接使用 urllib.request
                    ↓
            火山引擎方舟 API
                    ↓
            返回生成结果
```

---

## 二、项目结构

```
RIBAO/
│
├── 📁 根目录
│   ├── main.py                 # 🚀 应用入口，窗口控制
│   ├── requirements.txt        # 📦 Python 依赖清单
│   ├── config.json             # ⚙️ 系统配置（API、邮箱、模板）
│   ├── settings.json           # 🎨 用户设置（语言、主题、透明度）
│   ├── submit_config.json      # 📝 提交功能配置
│   ├── logo.ico                # 🖼️ 应用图标
│   └── main.spec               # 🔧 PyInstaller 打包配置
│
├── 📁 app/                     # 后端应用层
│   ├── __init__.py             # 包初始化
│   ├── app.py                  # Flask 路由与主逻辑
│   ├── api.py                  # AI 调用与邮件发送
│   ├── config.py               # 配置文件管理
│   ├── i18n.py                 # 多语言翻译
│   └── submit.py               # 日报提交功能
│
├── 📁 static/                  # 前端静态资源
│   ├── app.js                  # 前端交互逻辑
│   └── style.css               # 样式表
│
├── 📁 templates/               # HTML 模板
│   └── index.html              # 主页面
│
├── 📁 uploads/                 # 用户上传的背景文件
│   └── bg_*.mp4 / bg_*.png     # 背景视频或图片
│
└── 📁 日报/                    # 保存的日报文件
    └── MM月DD日 第N天.md       # 按日期天数命名
```

---

## 三、文件功能详解

### 3.1 根目录文件

#### main.py - 应用入口


| 组件                  | 说明                             |
| --------------------- | -------------------------------- |
| `WindowController` 类 | 窗口控制器，封装窗口操作         |
| `start_web_app()`     | 启动 Flask + 创建 pywebview 窗口 |
| `window.expose()`     | 暴露 Python 函数给 JS 调用       |

**核心方法：**

- `minimize()` - 最小化窗口
- `toggle_maximize()` - 切换最大化/还原
- `close()` - 关闭窗口
- `drag_window()` - 启动窗口拖拽

#### requirements.txt - 依赖清单

```
flask>=3.0.0           # Web 框架
flask-cors>=4.0.0      # 跨域支持
pywebview>=5.0.0       # 桌面壳
langchain>=1.0.0       # LLM 框架（可选）
langchain-community>=0.0.10  # LLM 社区扩展
langchain-core>=0.3.0  # LLM 核心库
```

---

### 3.2 app/ 后端模块

#### app/app.py - Flask 路由主文件

**API 路由表：**


| 路由                            | 方法     | 功能              |
| ------------------------------- | -------- | ----------------- |
| `/`                             | GET      | 返回主页面        |
| `/api/i18n/<lang>`              | GET      | 获取多语言翻译    |
| `/api/settings`                 | GET      | 获取用户设置      |
| `/api/settings`                 | POST     | 保存用户设置      |
| `/api/generate`                 | POST     | 同步生成日报      |
| `/api/generate-stream`          | POST     | 流式生成日报      |
| `/api/save`                     | POST     | 保存日报到文件    |
| `/api/send`                     | POST     | 发送日报邮件      |
| `/api/template`                 | GET      | 获取日报模板      |
| `/api/template`                 | POST     | 保存日报模板      |
| `/api/history`                  | GET      | 获取历史日报列表  |
| `/api/history/<name>`           | GET/PUT  | 查看/编辑历史日报 |
| `/api/day-info`                 | GET      | 获取天数信息      |
| `/api/submit/config`            | GET/POST | 提交配置管理      |
| `/api/submit/prepare`           | POST     | 准备提交数据      |
| `/api/submit/open-page`         | POST     | 打开提交页面      |
| `/api/submit/copy`              | POST     | 复制到剪贴板      |
| `/api/submit/sections`          | POST     | 获取日报各部分    |
| `/api/upload-bg`                | POST     | 上传背景文件      |
| `/api/list-backgrounds`         | GET      | 列出历史壁纸      |
| `/api/delete-background/<name>` | DELETE   | 删除壁纸          |

#### app/api.py - AI 调用与邮件

**核心函数：**


| 函数                          | 说明                                |
| ----------------------------- | ----------------------------------- |
| `generate_with_ai()`          | 同步生成（LangChain + urllib 回退） |
| `generate_with_ai_stream()`   | 流式生成（逐字返回）                |
| `generate_with_ai_advanced()` | 高级生成，支持系统提示词            |
| `send_email()`                | SMTP 邮件发送                       |
| `_generate_with_langchain()`  | LangChain 调用实现                  |
| `_generate_with_urllib()`     | urllib 调用实现                     |
| `_clean_report()`             | 清理 Markdown 代码块                |
| `check_langchain_available()` | 检查 LangChain 可用性               |
| `get_ai_info()`               | 获取 AI 配置信息                    |

#### app/config.py - 配置管理


| 配置项              | 说明         |
| ------------------- | ------------ |
| `API_KEY`           | AI 服务密钥  |
| `API_BASE`          | AI 服务地址  |
| `MODEL_ENDPOINT_ID` | 模型端点 ID  |
| `SENDER_EMAIL`      | 发送邮箱     |
| `DEFAULT_RECEIVER`  | 默认接收邮箱 |
| `SMTP_SERVER/PORT`  | SMTP 服务器  |
| `REPORT_FOLDER`     | 日报保存路径 |

#### app/i18n.py - 国际化


| 语言    | 代码 | 翻译条目 |
| ------- | ---- | -------- |
| 中文    | `zh` | 150+     |
| English | `en` | 150+     |
| 日本語  | `ja` | 150+     |

#### app/submit.py - 日报提交

**核心函数：**


| 函数                          | 说明             |
| ----------------------------- | ---------------- |
| `load_submit_config()`        | 加载提交配置     |
| `save_submit_config()`        | 保存提交配置     |
| `extract_report_sections()`   | 提取日报各部分   |
| `prepare_submit_data()`       | 准备提交数据     |
| `open_report_page()`          | 打开日报页面     |
| `copy_to_clipboard()`         | 复制到剪贴板     |
| `generate_quickfill_script()` | 生成 JS 填写脚本 |

---

### 3.3 前端文件

#### templates/index.html - 主页面

**页面结构：**

```
┌─────────────────────────────────────────────┐
│  标题栏：Logo + 标题 + 导航 + 窗口控制      │
├──────────────┬──────────────────────────────┤
│              │                              │
│  输入区域    │       日报预览区             │
│  ┌────────┐  │       (可编辑)               │
│  │AI模式  │  │                              │
│  │手动模式│  │                              │
│  └────────┘  │                              │
│              │                              │
├──────────────┴──────────────────────────────┤
│  操作栏：保存 | 发送 | 提交日报              │
└─────────────────────────────────────────────┘
```

#### static/app.js - 前端交互

**核心功能：**


| 模块                | 说明       |
| ------------------- | ---------- |
| `initApp()`         | 应用初始化 |
| `generateReport()`  | 生成日报   |
| `streamGenerate()`  | 流式生成   |
| `showReport()`      | 显示日报   |
| `saveReport()`      | 保存日报   |
| `sendReport()`      | 发送邮件   |
| `showSubmitModal()` | 提交模态框 |
| `copyToClipboard()` | 复制文本   |

#### static/style.css - 样式表

**核心特性：**


| 特性          | 说明                 |
| ------------- | -------------------- |
| 玻璃拟态      | 半透明 + 模糊背景    |
| CSS Variables | 主题色动态配置       |
| 响应式布局    | 自适应窗口大小       |
| 三主题        | 浅色/深色/自定义     |
| 拖拽区域      | `-webkit-app-region` |

---

## 四、设计模式

### 4.1 架构模式


| 模式              | 说明                                            |
| ----------------- | ----------------------------------------------- |
| **MVC 架构**      | Model（后端）+ View（前端）+ Controller（路由） |
| **前后端分离**    | Flask 提供 API，原生 JS 处理交互                |
| **Client-Server** | pywebview 封装的 C/S 桌面应用                   |

### 4.2 设计模式


| 模式           | 应用位置           | 说明                           |
| -------------- | ------------------ | ------------------------------ |
| **单例模式**   | `WindowController` | 全局唯一窗口控制器             |
| **工厂模式**   | AI 调用            | 创建 LangChain/urllib 实例     |
| **策略模式**   | AI 生成            | 多种生成策略（同步/流式/高级） |
| **观察者模式** | 前端事件           | 按钮点击事件监听               |
| **代理模式**   | AI 回退            | LangChain 失败回退 urllib      |
| **外观模式**   | 配置管理           | 封装所有配置操作               |
| **模板方法**   | 日报生成           | 统一的日报格式模板             |
| **适配器模式** | 多语言             | 适配不同语言翻译               |
| **装饰器模式** | Flask 路由         | `@app.route()` 注册路由        |
| **迭代器模式** | 流式生成           | `yield` 逐字返回               |

### 4.3 数据流转

```
┌─────────────┐   HTTP API    ┌─────────────┐   API 调用    ┌─────────────┐
│   前端 UI   │ ────────────→ │  Flask 路由  │ ───────────→ │  AI 服务    │
│  (app.js)   │ ←──────────── │  (app.py)   │ ←──────────── │  (火山引擎) │
└─────────────┘   JSON 响应   └─────────────┘   JSON 响应   └─────────────┘
      │                             │
      │ 保存/发送/复制               │ 文件操作/邮件
      ↓                             ↓
┌─────────────┐              ┌─────────────┐
│  用户交互    │              │  本地存储    │
│  (剪贴板)    │              │  (日报/配置) │
└─────────────┘              └─────────────┘
```

---

## 五、功能模块

### 5.1 AI 智能生成

- 火山引擎方舟 API（doubao-pro-32k 等）
- LangChain 框架支持（可选）
- 同步生成 + 流式生成
- 自定义 AI 提示词

### 5.2 手动输入

- 开发类任务
- 交付类任务
- 明日计划
- 所需支持

### 5.3 日报管理

- Markdown 格式保存
- 自动编号（第 N 天）
- 历史查看/编辑
- 按日期命名

### 5.4 邮件发送

- SMTP 邮件服务
- 自定义收发邮箱
- 配置持久化

### 5.5 日报提交

- 智能解析日报结构
- 打开日报系统页面
- 一键复制全部/部分内容
- JS 自动填写脚本

### 5.6 个性化设置

- 三语言（中/英/日）
- 三主题（浅/深/自定义）
- 背景图片/视频
- 窗口透明度调节
- 自定义模板

---

## 六、配置文件

### config.json

```json
{
  "api": {
    "key": "AI密钥",
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

### settings.json

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

### submit_config.json

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

## 七、API 依赖关系

```
main.py (入口)
├── app/app.py (Flask 路由层)
│   ├── app/config.py (配置管理)
│   │   ├── config.json
│   │   └── settings.json
│   ├── app/api.py (AI 调用层)
│   │   ├── LangChain (可选)
│   │   └── urllib (回退)
│   ├── app/i18n.py (国际化)
│   └── app/submit.py (提交功能)
│       └── submit_config.json
│
└── 前端资源
    ├── static/app.js
    └── static/style.css

templates/
└── index.html
```

---

## 八、打包部署

### 安装依赖

```bash
pip install -r requirements.txt
```

### 开发运行

```bash
python main.py
```

### PyInstaller 打包

```bash
# 方式一：使用 spec 文件
pyinstaller main.spec

# 方式二：手动打包
pyinstaller --noconfirm --windowed --icon=logo.ico main.py
```

### 打包后目录

```
dist/
├── main.exe
└── _internal/
    ├── app/
    ├── static/
    ├── templates/
    └── ...
```

---

## 九、版本历史


| 版本 | 日期    | 说明                         |
| ---- | ------- | ---------------------------- |
| v1.0 | -       | 初始版本                     |
| v1.1 | 2026-08 | 集成 LangChain，优化 AI 调用 |
| v1.2 | 2026-08 | 提交功能优化，按钮常驻显示   |
| v1.3 | 2026-08 | 窗口拖拽完善，玻璃拟态优化   |
| v1.4 | 2026-08 | 文档更新，技术栈整理         |

---

## 十、技术亮点

1. **混合 AI 调用**：LangChain + urllib 双保险，保证服务可用
2. **玻璃拟态 UI**：半透明 + 模糊背景，支持自定义
3. **三语言支持**：中/英/日无障碍切换
4. **流式生成**：逐字返回，体验流畅
5. **智能解析**：自动提取日报各部分
6. **原生窗口**：pywebview 封装，无浏览器依赖
7. **零配置启动**：首次运行自动安装依赖
8. **数据持久化**：配置、模板、日报本地保存
9. **响应式设计**：自适应窗口大小
10. **现代化 UI**：Glassmorphism 玻璃拟态风格
