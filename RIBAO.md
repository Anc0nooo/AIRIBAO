RIBAO/
├── main.py                     # 🚀 入口文件
├── requirements.txt            # 📦 依赖包 (flask, flask-cors, pywebview)
├── config.json                 # ⚙️ 系统配置 (API密钥、邮箱、模板)
├── settings.json               # 🎨 用户设置 (语言、主题、透明度)
├── submit_config.json          # 📝 提交功能配置
├── logo.ico                    # 🖼️ 应用图标
├── main.spec                   # 🔧 PyInstaller打包配置
│
├── app/                        # 📁 后端应用
│   ├── __init__.py             # 包初始化
│   ├── app.py                  # Flask路由与主逻辑
│   ├── api.py                  # AI调用与邮件发送
│   ├── config.py               # 配置文件管理
│   ├── i18n.py                 # 多语言翻译
│   └── submit.py               # 日报提交功能
│
├── static/                     # 📁 前端静态资源
│   ├── app.js                  # 前端交互逻辑
│   └── style.css               # 样式表
│
├── templates/                  # 📁 HTML模板
│   └── index.html              # 主页面
│
├── uploads/                    # 📁 用户上传的背景文件
│   ├── bg_*.mp4               # 背景视频
│   └── bg_*.png               # 背景图片
│
└── 日报/                       # 📁 保存的日报文件
└── MM月DD日 第N天.md       # 按日期天数命名的日报

后端框架 Flask Python 
Web框架，提供HTTP API服务 
桌面壳 pywebview 将Web应用封装为原生桌面窗口 
前端 HTML5 + CSS3 + Vanilla JS 原生前端技术，无框架依赖 
AI服务 火山引擎方舟(Ark) API 提供AI智能生成日报功能 
邮件服务 SMTP (QQ邮箱) 支持通过邮件发送日报 
国际化 自定义i18n模块 支持中文、英文、日文三种语言 
窗口控制 Windows API (ctypes) 实现无边框窗口的拖拽、最小化、最大化




🔹 app/api.py
API调用模块 ，提供：

- generate_with_ai() : 调用AI生成日报（同步）
- generate_with_ai_stream() : 调用AI流式生成（逐字返回）
- send_email() : 通过SMTP发送邮件 
- 🔹 app/config.py
  配置管理模块 ，负责：
- 加载/保存 config.json （API密钥、邮箱、模板）
- 管理日报模板（AI提示词、日报格式）
- 计算下一个天数编号 
- 🔹 app/i18n.py
  国际化模块 ，包含：
- 中文 ( zh )、英文 ( en )、日文 ( ja ) 三种语言
- 120+ 个翻译条目 
- 🔹 app/submit.py
  日报提交模块 ，支持：
- 从日报内容中提取各部分（工作内容、明日计划、所需支持）
- 打开日报系统页面
- 复制内容到剪贴板
- 生成快捷填写的JavaScript脚本 
- 🔹 static/app.js
  前端交互逻辑 ，负责：
- 应用初始化（加载语言、设置、天数信息）
- 事件绑定（按钮点击、窗口拖拽）
- 主题切换、背景设置
- 日报生成、预览、保存、发送、提交 
- 🔹 static/style.css
  样式表 ，包含：
- CSS变量（主题色、透明度、模糊度）
- 玻璃拟态（Glassmorphism）效果
- 响应式布局
- 三种主题（浅色、深色、自定义背景） 
- 🔹 templates/index.html
  主页面模板 ，结构：
- 顶部标题栏（应用名称、导航按钮、窗口控制）
- 左侧输入区（AI模式/手动模式切换）
- 右侧预览区（日报显示与编辑）
- 设置/历史/模板/提交等模态框
