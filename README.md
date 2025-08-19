# Sentra Auto Browser

> 基于AI驱动的智能浏览器自动化框架，让网页操作变得简单而强大！

![Sentra Auto Browser 主界面](./docs/images/main.png)

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=for-the-badge&logo=playwright&logoColor=white)](https://playwright.dev/)
[![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com/)

---

## 目录
- 项目特色
- 核心功能
- 快速开始
- 桌面应用
  - 桌面端安装
  - 桌面端功能
  - 桌面端使用
- 命令行使用
- 编程使用
- 使用场景和示例
  - 核心技术演示
- 项目架构
- 高级配置
- 最佳实践
- 常见问题和解决方案
- 贡献指南
- 更新日志
- 许可证

---

## 项目特色

![项目特色展示](./docs/images/title.png)
![项目特色展示](./docs/images/workflow.jpeg)
![项目特色展示](./docs/images/file.png)

- AI驱动: 使用大语言模型进行智能决策，无需编写复杂的选择器
- 精准定位: 智能DOM元素检测，自动识别可交互元素
- 实时适应: 动态页面监控，自动适应页面变化
- 高性能: 智能缓存机制，优化执行效率
- 稳定可靠: 完善的错误处理和恢复机制
- 多模型支持: 支持OpenAI、Google Gemini、Anthropic等多种AI模型
- CDP连接: 支持连接到现有浏览器，无自动化检测痕迹
- 多标签页: 智能标签页管理，自动切换到最相关的页面
- 桌面管理: 现代化桌面应用，可视化管理和监控
- 美观界面: Windows 11风格设计，支持主题切换
- 插件系统: 丰富的插件生态，支持功能扩展
- 实时监控: 性能指标监控，资源使用分析

## 核心功能

### 智能浏览器操作

![智能浏览器操作流程](./docs/images/browser-automation-flow.svg)

**核心特性:**
- **自动化操作**: 点击、输入、滚动、导航等基础操作
- **智能等待**: 自动等待页面加载和元素出现
- **多标签页管理**: 智能切换和管理多个标签页
- **截图监控**: 实时截图和页面状态监控
- **错误恢复**: 自动检测和恢复操作失败

### AI决策引擎

![AI决策引擎工作流程](./docs/images/ai-decision-engine-flow.svg)

**AI能力特性:**
- **视觉理解**: 基于截图和DOM信息的智能决策
- **自然语言**: 用自然语言描述任务，无需编程
- **上下文感知**: 理解页面上下文，做出合适的操作选择
- **学习能力**: 从执行历史中学习，提高成功率

### 高级特性
- 用户数据目录: 支持保持登录状态和个人设置
- 无头/有头模式: 灵活切换显示模式
- 自定义配置: 丰富的浏览器和AI配置选项
- 详细日志: 完整的执行日志和调试信息
- 性能监控: 实时性能指标和优化建议

## 快速开始

### 安装方式

#### 方式一：从源码安装（推荐）

```bash
# 克隆项目
git clone https://github.com/JustForSO/Sentra-Auto-Browser.git
cd Sentra-Auto-Browser

# 安装依赖
npm install

# 编译项目
npm run build

# 安装浏览器
npx playwright install
```

#### 方式二：NPM安装（即将支持）

```bash
# 全局安装
npm install -g sentra-auto-browser

# 或本地安装
npm install sentra-auto-browser

# 安装浏览器
npx playwright install
```

### 环境配置

创建 `.env` 文件并配置你的AI模型API密钥：

```bash
# OpenAI配置
OPENAI_API_KEY=your_openai_api_key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o

# Google Gemini配置
GOOGLE_API_KEY=your_google_api_key
GOOGLE_MODEL=gemini-2.5-pro
GOOGLE_BASE_URL=https://generativelanguage.googleapis.com/v1beta/

# Anthropic配置
ANTHROPIC_API_KEY=your_anthropic_api_key
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# 浏览器配置
BROWSER_HEADLESS=false
BROWSER_VIEWPORT_WIDTH=1280
BROWSER_VIEWPORT_HEIGHT=720
BROWSER_TIMEOUT=30000

# CDP连接配置（可选）
BROWSER_CONNECT_TO_USER_BROWSER=false
BROWSER_DEBUG_HOST=localhost
BROWSER_DEBUG_PORT=9222

# 日志配置
LOG_LEVEL=info
DEBUG=false
```

最简高效 env 配置，使用CDP协议

```bash
# LLM 配置
# OpenAI 配置 (默认，优先级最高)
# OPENAI_API_KEY=sk-xxxxxx
# OPENAI_MODEL=gpt-5
# OpenAI-compatible API (代理，负载均衡)
# OPENAI_BASE_URL=https://api.openai.com
# openai形式供应商的api示例:
# OPENAI_BASE_URL=https://api.deepseek.com/v1
# OPENAI_BASE_URL=https://api.moonshot.cn/v1
# google，claude配置同理

OPENAI_BASE_URL=https://xxxxxx
OPENAI_API_KEY=sk-xxxxxx
OPENAI_MODEL=gpt-4o-mini

# Google Gemini 配置
GOOGLE_API_KEYS=AIzaSyBQY9CVy8MXEraQiwSOxZH-r0CGY8IWhec,AIzaSyBxAeqYFewlD5w69UXn-HFY-dsDl3crtE8
GOOGLE_MODELS=gemini-2.5-flash
GOOGLE_BASE_URL=https://api-proxy.me/gemini/v1beta/,https://api-proxy.me/gemini/v1beta/

# LLM 设置
LLM_DISABLE_HEALTH_CHECK=true
LLM_TEMPERATURE=0
LLM_MAX_TOKENS=-1

# 是否连接用户自己的浏览器
# true: 连接现有浏览器（无自动化痕迹）
# false: 使用Playwright启动新浏览器（标准模式）
BROWSER_CONNECT_TO_USER_BROWSER=true

# 连接模式：smart（智能）、connect（连接）、persistent（持久）、launch（启动）
BROWSER_CONNECTION_MODE=smart

# 调试端口配置
BROWSER_DEBUG_PORT=9222
BROWSER_DEBUG_HOST=localhost

# Edge浏览器路径
BROWSER_EXECUTABLE_PATH=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe

# 用户数据目录（改成你的实际路径）
BROWSER_USER_DATA_DIR=C:\Users\1\AppData\Local\Microsoft\Edge\User Data

# 反检测模式，默认关闭，按需启用
BROWSER_STEALTH_MODE=false

# 自动关闭浏览器，连接用户浏览器时建议设为false
BROWSER_AUTO_CLOSE=false

# 窗口显示配置
BROWSER_HEADLESS=false
BROWSER_MAXIMIZED=true
BROWSER_FULLSCREEN=false
BROWSER_WIDTH=1920
BROWSER_HEIGHT=1080

# GPU加速
BROWSER_ENABLE_GPU=true

# 自定义浏览器启动参数，例如：--enable-gpu,--start-maximized
# BROWSER_ARGS=--enable-gpu,--start-maximized

# 页面超时配置
BROWSER_TIMEOUT=30000
BROWSER_PAGE_LOAD_TIMEOUT=30000
BROWSER_NAVIGATION_TIMEOUT=30000

# Playwright 浏览器安装
BROWSER_AUTO_INSTALL=true

# ai决策
AGENT_MAX_STEPS=50
AGENT_MAX_ACTIONS_PER_STEP=3
AGENT_USE_VISION=true

# 日志
LOG_LEVEL=info
DEBUG=false
```

## 桌面应用

Sentra Auto Browser 提供了功能强大的桌面管理工具，让您可以通过图形界面轻松管理和监控浏览器自动化任务。

### 桌面端安装

#### 开发模式启动

```bash
# 进入桌面应用目录
cd desktop-app

# 安装依赖
npm install

# 启动开发模式
npm run dev
```

#### 构建可执行文件

```bash
# 构建应用
npm run build

# 打包为可执行文件
npm run package
```

构建完成后，可执行文件将在 `desktop-app/release/` 目录中。

### 桌面端功能

#### 核心功能模块

- 仪表板: 系统状态总览，实时监控运行状态
- 浏览器管理: 浏览器进程监控、性能分析、日志查看
- 端口管理: 端口占用监控、进程管理、服务状态检查
- 插件管理: 插件安装、启用/禁用、配置管理
- 系统设置: 环境变量配置、AI模型设置、浏览器参数
- 性能监控: 实时性能指标、资源使用情况、优化建议

#### 界面特色

- 现代化UI: Windows 11风格设计，支持深色/浅色主题
- 响应式布局: 自适应不同屏幕尺寸，支持窗口缩放
- 直观操作: 一键式操作，拖拽支持，快捷键丰富
- 实时数据: 实时图表、动态更新、性能监控
- 智能通知: 任务完成提醒、错误警告、状态变化通知

### 桌面端使用

#### 启动应用

1. 开发模式:
   ```bash
   cd desktop-app
   npm run dev
   ```

2. 生产模式:
   - 双击 `Sentra Desktop.exe` 启动
   - 或通过开始菜单启动

#### 主要操作流程

1. 仪表板监控
   - 查看系统运行状态
   - 监控浏览器进程数量
   - 检查端口占用情况
   - 查看插件运行状态

2. 浏览器管理
   - 查看所有浏览器进程
   - 监控内存和CPU使用
   - 查看实时日志输出
   - 终止异常进程

3. 端口管理
   - 扫描端口占用情况
   - 查看进程详细信息
   - 一键终止占用进程
   - 释放被占用端口

4. 插件管理
   - 浏览已安装插件
   - 启用/禁用插件功能
   - 查看插件详细信息
   - 打开插件目录

5. 系统配置
   - 配置AI模型参数
   - 设置环境变量
   - 调整浏览器选项
   - 保存配置更改

#### 快捷键支持

- `Ctrl + R`: 刷新当前页面数据
- `Ctrl + T`: 切换主题模式
- `Ctrl + ,`: 打开设置页面
- `F5`: 刷新所有数据
- `Ctrl + Q`: 退出应用

#### 系统要求

- 操作系统: Windows 10/11 (64位)
- 内存: 最低 4GB RAM，推荐 8GB+
- 存储: 至少 500MB 可用空间
- 网络: 需要互联网连接（用于AI模型调用）

#### 桌面应用配置

桌面应用支持以下配置文件和命令：

**项目结构**
```
desktop-app/
├── src/
│   ├── main.ts              # Electron主进程
│   ├── preload.js           # 预加载脚本
│   └── renderer/            # 渲染进程
│       ├── components/      # React组件
│       │   ├── Dashboard.tsx
│       │   ├── BrowserManager.tsx
│       │   ├── PortManager.tsx
│       │   ├── PluginManager.tsx
│       │   └── WindowsDesktop.tsx
│       └── styles/          # 样式文件
├── assets/                  # 资源文件
│   ├── icon.ico            # 应用图标(1024x1024)
│   └── icon.png            # PNG图标
├── scripts/                 # 构建脚本
└── package.json            # 依赖配置
```

**可用命令**
```bash
# 开发相关
npm run dev                  # 启动开发模式
npm run build               # 构建生产版本
npm run build:renderer      # 仅构建渲染进程
npm run build:main          # 仅构建主进程

# 打包相关
npm run package             # 打包为可执行文件
npm run clean               # 清理构建文件
```

**界面定制**
- 支持深色/浅色主题切换
- 现代化Windows 11风格设计
- 响应式布局，支持多种分辨率
- Chrome风格浏览器图标
- 玻璃效果和渐变背景

**数据存储**
- 使用 `electron-store` 持久化配置
- 自动保存用户偏好设置
- 支持配置导入/导出
- 实时同步设置更改

## 命令行使用

#### 基础命令

```bash
# 基础使用
npx sentra-auto run "打开百度，搜索人工智能，点击第一个结果"

# 可视化模式（显示浏览器窗口）
npx sentra-auto run "在淘宝搜索iPhone" --visible

# 无头模式（后台运行）
npx sentra-auto run "自动填写表单" --headless

# 调试模式
npx sentra-auto run "填写表单" --debug
```

#### 高级命令参数

```bash
# 指定AI模型和提供商
npx sentra-auto run "bilibili搜索动漫视频，并且播放人气高的视频，然后给这个视频点个赞" \
  --provider openai \
  --model gpt-4o-mini \
  --max-steps 7

# 复杂任务示例
npx sentra-auto run "bilibili搜索阴阳师须佐之男，并且播放人气高的视频，然后点赞" \
  --provider openai \
  --model gpt-4o-mini \
  --max-steps 7 \
  --debug

# 禁用视觉功能（提高速度）
npx sentra-auto run "自动登录网站" \
  --no-vision \
  --headless

# 自定义温度参数（创意性任务）
npx sentra-auto run "写一篇创意文章" \
  --temperature 0.7 \
  --max-steps 20

# 指定不同的AI提供商
npx sentra-auto run "翻译网页内容" --provider anthropic --model claude-sonnet-4
npx sentra-auto run "数据分析任务" --provider google --model gemini-2.5-flash
```

#### 配置管理

```bash
# 查看当前配置
npx sentra-auto config

# 查看所有环境变量配置
npx sentra-auto config --all

# 查看环境变量详情
npx sentra-auto config --env

# 测试连接
npx sentra-auto test
```

#### 命令行参数详解

**run 命令参数:**

| 参数 | 简写 | 说明 | 默认值 | 示例 |
|------|------|------|--------|------|
| `--provider` | - | AI提供商 | 自动检测 | `openai`, `anthropic`, `google` |
| `--model` | - | AI模型名称 | 配置文件 | `gpt-4o-mini`, `claude-sonnet-4` |
| `--max-steps` | - | 最大执行步数 | `100` | `--max-steps 7` |
| `--temperature` | - | AI温度参数 | `0` | `--temperature 0.7` |
| `--headless` | `-h` | 无头模式 | `false` | `--headless` |
| `--visible` | `-v` | 可视化模式 | `false` | `--visible` |
| `--no-vision` | - | 禁用视觉功能 | `false` | `--no-vision` |
| `--debug` | - | 调试模式 | `false` | `--debug` |

**config 命令参数:**

| 参数 | 说明 | 示例 |
|------|------|------|
| `--all` | 显示所有环境变量 | `npx sentra-auto config --all` |
| `--env` | 显示环境变量详情 | `npx sentra-auto config --env` |

**实际使用示例:**

```bash
# 视频网站自动化
npx sentra-auto run "bilibili搜索动漫视频，播放人气高的视频，然后给这个视频点个赞" \
  --provider openai \
  --model gpt-4o-mini \
  --max-steps 10 \
  --visible

# 电商购物自动化
npx sentra-auto run "淘宝搜索蓝牙耳机，筛选价格100-300元，查看评价最好的商品" \
  --provider anthropic \
  --model claude-sonnet-4 \
  --max-steps 15 \
  --debug

# 表单填写自动化
npx sentra-auto run "填写注册表单，用户名testuser，邮箱test@example.com" \
  --provider google \
  --model gemini-2.5-flash \
  --max-steps 5 \
  --headless

# 数据采集任务
npx sentra-auto run "从招聘网站采集前端工程师职位信息，保存到文件" \
  --provider openai \
  --model gpt-4o \
  --max-steps 20 \
  --no-vision \
  --temperature 0
```

#### CDP连接模式

Sentra Auto Browser 支持连接到现有的浏览器实例，这对于以下场景特别有用：

**使用场景:**
- 保持登录状态
- 使用现有的浏览器配置和扩展
- 调试和开发
- 更好的反检测能力

**配置步骤:**

1. **环境变量配置:**
```env
# 启用CDP连接
BROWSER_CONNECT_TO_USER_BROWSER=true
BROWSER_DEBUG_HOST=localhost
BROWSER_DEBUG_PORT=9222
BROWSER_AUTO_CLOSE=false

# 反检测模式
BROWSER_STEALTH_MODE=true
BROWSER_MAXIMIZED=true
```

2. **启动浏览器调试模式:**
```bash
# Chrome/Chromium
chrome --remote-debugging-port=9222 --user-data-dir="./user-data"

# Microsoft Edge
msedge --remote-debugging-port=9222 --user-data-dir="./user-data"

# 或者使用完整路径
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
```

3. **运行任务:**
```bash
npx sentra-auto run "你的任务描述"
```

**CDP连接的优势:**
- 保持用户登录状态和Cookie
- 使用现有的浏览器扩展和设置
- 更强的反检测能力
- 可以手动干预和调试
- 支持多标签页管理

## 编程使用

```typescript
import {
  Agent,
  BrowserSession,
  LLMFactory,
  Config
} from 'sentra-auto-browser';

async function main() {
  try {
    // 1. 获取配置
    const llmConfig = Config.getLLMConfig();
    const browserProfile = Config.getBrowserProfile();
    const agentSettings = Config.getAgentSettings();

    // 2. 创建AI模型实例
    const llm = LLMFactory.createLLM(llmConfig);

    // 3. 创建浏览器会话
    const session = new BrowserSession(browserProfile);
    await session.start();

    // 4. 启用增强功能
    await session.enableEnhancedMode();

    // 5. 创建智能代理
    const agent = new Agent(
      '打开京东，搜索"MacBook Pro"，查看第一个商品的详细信息',
      llm,
      session,
      agentSettings
    );

    // 6. 执行任务
    const result = await agent.run();

    console.log('任务执行结果:', {
      success: result.success,
      steps: result.steps.length,
      duration: result.totalDuration
    });

  } catch (error) {
    console.error('执行失败:', error);
  }
}

main().catch(console.error);
```

## 详细使用指南

### 支持的AI模型

#### OpenAI GPT系列
```typescript
import { OpenAILLM } from 'sentra-auto-browser';

const llm = new OpenAILLM({
  apiKey: 'your-api-key',
  model: 'gpt-4.1',
  maxTokens: 4000,
  temperature: 0,               // 0表示更确定性的输出
  baseURL: 'https://api.openai.com/v1'
});
```

#### Google Gemini
```typescript
import { GoogleLLM } from 'sentra-auto-browser';

const llm = new GoogleLLM({
  apiKey: 'your-api-key',
  model: 'gemini-2.5-pro',      // 支持长上下文
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/', // 可自定义API端点
  maxTokens: 4000
});
```

#### Anthropic Claude
```typescript
import { AnthropicLLM } from 'sentra-auto-browser';

const llm = new AnthropicLLM({
  apiKey: 'your-api-key',
  model: 'claude-sonnet-4',  // 最新版本
  maxTokens: 4000
});
```

### API 代理配置

对于国内用户或需要使用代理的场景，可以通过设置自定义 API 端点来解决网络访问问题：

#### OpenAI 代理配置
```bash
# .env 文件配置
OPENAI_API_KEY=your_openai_api_key
OPENAI_BASE_URL=https://api.openai.com/v1
# 或使用其他代理服务, 兼容openai格式即可
OPENAI_BASE_URL=https://api.deepseek.com/v1
OPENAI_BASE_URL=https://api.moonshot.cn/v1
```

#### Google Gemini 代理配置
```bash
# .env 文件配置
GOOGLE_API_KEY=your_google_api_key
GOOGLE_BASE_URL=https://generativelanguage.googleapis.com/v1beta/
# 或使用其他代理服务，例如
GOOGLE_BASE_URL=https://api-proxy.me/gemini/v1beta/
```

#### 代码中直接配置
```typescript
// OpenAI 代理配置
const openaiLLM = new OpenAILLM({
  apiKey: 'your-api-key',
  baseURL: 'https://api.openai.com/v1',
  model: 'gpt-4o'
});

// Google Gemini 代理配置
const googleLLM = new GoogleLLM({
  apiKey: 'your-api-key',
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/',
  model: 'gemini-2.5-flash'
});
```

### 浏览器配置选项

```typescript
const session = new BrowserSession({
  // 基础配置
  headless: false,                    // 是否无头模式
  viewport: { width: 1280, height: 720 }, // 视窗大小
  timeout: 30000,                     // 超时时间(毫秒)

  // 高级配置
  userDataDir: './user-data',         // 用户数据目录，保持登录状态
  executablePath: '/path/to/chrome',  // 自定义浏览器路径
  args: [                             // 额外启动参数
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-blink-features=AutomationControlled'
  ],

  // 环境配置
  locale: 'zh-CN',                    // 语言设置
  timezone: 'Asia/Shanghai',          // 时区设置
  colorScheme: 'light',               // 颜色主题

  // 网络配置
  proxy: {                            // 代理设置
    server: 'http://proxy:8080',
    username: 'user',
    password: 'pass'
  }
});
```

### 智能代理配置

```typescript
const agent = new Agent(task, llm, session, {
  maxSteps: 50,                       // 最大执行步数
  enableMemory: true,                 // 启用记忆功能
  enablePlanning: true,               // 启用规划功能
  enableReflection: true,             // 启用反思功能
  enableErrorRecovery: true,          // 启用错误恢复
  enablePerformanceMonitoring: true   // 启用性能监控
});
```

### 代理配置选项

```typescript
const agentSettings = {
  maxSteps: 100,                      // 最大执行步数
  maxActionsPerStep: 3,               // 每步最大操作数
  useVision: true,                    // 是否使用视觉功能
  retryFailedActions: true,           // 是否重试失败的操作
  maxRetries: 2,                      // 最大重试次数
  retryDelay: 500,                    // 重试延迟(毫秒)

  // 高级功能
  enableMemory: true,                 // 启用记忆功能
  memorySize: 1000,                   // 记忆容量
  enablePlanning: true,               // 启用规划功能
  planningSteps: 10,                  // 规划步数
  enableReflection: true,             // 启用反思功能
  reflectionInterval: 5,              // 反思间隔
  enableErrorRecovery: true,          // 启用错误恢复
  enablePerformanceMonitoring: true,  // 启用性能监控
  enableScreenshotOnError: true,      // 错误时截图
  enableActionValidation: true        // 启用操作验证
};
```

## 开发指南

### 项目结构

```
sentra-auto-browser/
├── src/
│   ├── agent/              # 智能代理核心
│   │   └── service.ts      # 代理主服务
│   ├── browser/            # 浏览器会话管理
│   │   ├── session.ts      # 浏览器会话
│   │   ├── master-controller.ts    # 主控制器
│   │   ├── smart-tab-manager.ts    # 智能标签页管理
│   │   ├── enhanced-dom-detector.ts # 增强DOM检测
│   │   └── enhanced-key-handler.ts  # 增强键盘处理
│   ├── controller/         # 操作控制器
│   │   └── service.ts      # 控制器服务
│   ├── dom/               # DOM分析和操作
│   │   ├── service.ts      # DOM服务
│   │   ├── buildDomTree.js # DOM树构建
│   │   └── element-semantic-analyzer.ts # 元素语义分析
│   ├── llm/               # 大语言模型集成
│   │   ├── base.ts         # 基础LLM类
│   │   ├── factory.ts      # LLM工厂
│   │   ├── openai.ts       # OpenAI集成
│   │   ├── google.ts       # Google Gemini集成
│   │   └── anthropic.ts    # Anthropic Claude集成
│   ├── memory/            # 记忆服务
│   ├── planning/          # 规划服务
│   ├── reflection/        # 反思服务
│   ├── recovery/          # 错误恢复服务
│   ├── monitoring/        # 性能监控服务
│   ├── cli/               # 命令行接口
│   │   └── index.ts        # CLI主入口
│   ├── config/            # 配置管理
│   ├── types/             # TypeScript类型定义
│   ├── utils/             # 工具函数
│   └── index.ts           # 主导出文件
├── examples/              # 使用示例
├── dist/                  # 编译输出
├── package.json           # 项目配置
├── tsconfig.json          # TypeScript配置
├── .env.example           # 环境变量示例
└── README.md              # 项目文档
```

### 编译和构建

```bash
# 清理旧文件
npm run clean

# 编译TypeScript
npm run build

# 开发模式（监听文件变化）
npm run dev

# 运行测试
npm test
```

### 运行示例

```bash
# 基础示例
node examples/simple.js

# 高级功能示例
node examples/advanced-features.js

# 电商自动化示例
node examples/ecommerce-automation.js

# 表单填写示例
node examples/form-filling.js
```

## 高级配置

### 环境变量完整列表

| 变量名 | 说明 | 默认值 | 示例 |
|--------|------|--------|------|
| **AI模型配置** |
| `OPENAI_API_KEY` | OpenAI API密钥 | - | `sk-...` |
| `OPENAI_BASE_URL` | OpenAI API地址 | `https://api.openai.com/v1` | 自定义API地址 |
| `OPENAI_MODEL` | OpenAI模型名称 | `gpt-4o` | `gpt-4`, `gpt-3.5-turbo` |
| `GOOGLE_API_KEY` | Google API密钥 | - | `AIza...` |
| `GOOGLE_BASE_URL` | Google API地址 | `https://generativelanguage.googleapis.com/v1beta/` | 自定义API地址 |
| `GOOGLE_MODEL` | Google模型名称 | `gemini-2.5-pro` | `gemini-2.5-flash` |
| `ANTHROPIC_API_KEY` | Anthropic API密钥 | - | `sk-ant-...` |
| `ANTHROPIC_MODEL` | Anthropic模型名称 | `claude-sonnet-4` | `claude-opus-4` |
| **浏览器配置** |
| `BROWSER_HEADLESS` | 无头模式 | `true` | `false` |
| `BROWSER_VIEWPORT_WIDTH` | 浏览器宽度 | `1280` | `1920` |
| `BROWSER_VIEWPORT_HEIGHT` | 浏览器高度 | `720` | `1080` |
| `BROWSER_TIMEOUT` | 超时时间(毫秒) | `30000` | `60000` |
| `BROWSER_USER_DATA_DIR` | 用户数据目录 | - | `./user-data` |
| **CDP连接配置** |
| `BROWSER_CONNECT_TO_USER_BROWSER` | 连接现有浏览器 | `false` | `true` |
| `BROWSER_DEBUG_HOST` | 调试主机 | `localhost` | `127.0.0.1` |
| `BROWSER_DEBUG_PORT` | 调试端口 | `9222` | `9223` |
| `BROWSER_AUTO_CLOSE` | 自动关闭浏览器 | `true` | `false` |
| **代理配置** |
| `AGENT_MAX_STEPS` | 最大执行步数 | `100` | `200` |
| `AGENT_USE_VISION` | 使用视觉功能 | `true` | `false` |
| `AGENT_MAX_RETRIES` | 最大重试次数 | `2` | `3` |
| **日志配置** |
| `LOG_LEVEL` | 日志级别 | `info` | `debug`, `warn`, `error` |
| `DEBUG` | 调试模式 | `false` | `true` |

### 调试模式

启用详细日志和调试信息：

```typescript
// 方法1: 环境变量
process.env.LOG_LEVEL = 'debug';
process.env.DEBUG = 'true';

// 方法2: 代码配置
import { logger } from 'sentra-auto-browser';

// 设置日志级别
logger.setLevel('debug');

// 启用特定模块的调试
process.env.DEBUG = 'agent:*,browser:*';

// 方法3: 命令行参数
npx sentra-auto run "任务描述" --debug
```

## 使用场景和示例

### 核心技术演示

项目根目录包含一个完整的浏览器自动化示例文件：

**`simple-browser-automation-example.js`** - 核心技术演示

这个文件展示了我们浏览器自动化的核心思路和技术实现：

- **智能元素检测** - 自动识别页面中的可交互元素
- **可视化标记系统** - 为元素添加彩色数字标记，便于AI识别
- **页面状态监控** - 实时监控页面变化和导航事件
- **智能标签页管理** - 自动管理多个标签页，智能切换到最佳页面
- **AI决策引擎** - 基于页面截图和元素信息做出智能决策

```bash
# 运行核心技术演示
node simple-browser-automation-example.js
```

这个示例帮助开发者理解：
- 如何检测和标记页面元素
- 如何监控页面状态变化
- 如何实现智能的浏览器控制逻辑
- 如何与AI模型集成进行决策

### 视频网站自动化

**命令行方式:**
```bash
# bilibili视频搜索和互动
npx sentra-auto run "bilibili搜索动漫视频，并且播放人气高的视频，然后给这个视频点个赞" \
  --provider openai \
  --model gpt-4o-mini \
  --max-steps 7

# YouTube视频操作
npx sentra-auto run "YouTube搜索编程教程，播放最新的JavaScript教程，订阅频道" \
  --provider anthropic \
  --model claude-sonnet-4 \
  --max-steps 10
```

**编程方式:**
```typescript
const task = `
1. 打开bilibili网站
2. 搜索"阴阳师须佐之男"相关视频
3. 选择播放量最高的视频
4. 播放视频
5. 给视频点赞
6. 添加到收藏夹
`;

const agent = new Agent(task, llm, session);
await agent.run();
```

### 电商自动化

**命令行方式:**
```bash
# 淘宝购物流程
npx sentra-auto run "淘宝搜索蓝牙耳机，筛选价格100-300元，查看评价最好的商品详情" \
  --provider openai \
  --model gpt-4o \
  --max-steps 15 \
  --visible

# 京东比价
npx sentra-auto run "京东搜索iPhone 15，比较不同商家的价格和评价" \
  --provider google \
  --model gemini-2.5-flash \
  --max-steps 12
```

**编程方式:**
```typescript
const task = `
电商购物流程：
1. 打开淘宝网站
2. 搜索"iPhone 15 Pro"
3. 设置价格筛选：8000-12000元
4. 按销量排序
5. 查看前3个商品的详情和评价
6. 选择评分最高的商品
7. 如果评分超过4.5分，加入购物车
`;

const agent = new Agent(task, llm, session);
await agent.run();
```

### 表单自动填写

**命令行方式:**
```bash
# 注册表单填写
npx sentra-auto run "填写网站注册表单，用户名testuser，邮箱test@example.com，密码123456" \
  --provider openai \
  --model gpt-4o-mini \
  --max-steps 5 \
  --headless

# 求职简历提交
npx sentra-auto run "在招聘网站提交简历，职位前端工程师，期望薪资15k-25k" \
  --provider anthropic \
  --model claude-sonnet-4 \
  --max-steps 8
```

**编程方式:**
```typescript
const task = `
自动填写注册表单：
- 用户名: testuser123
- 邮箱: test@example.com
- 密码: SecurePass123!
- 确认密码: SecurePass123!
- 手机号: 13800138000
- 验证码: 自动识别或手动输入
- 同意服务条款
- 提交表单并验证成功
`;

const agent = new Agent(task, llm, session);
await agent.run();
```

### 数据采集

**命令行方式:**
```bash
# 招聘信息采集
npx sentra-auto run "从Boss直聘采集前端工程师职位信息，北京地区，薪资15k-30k，保存前20条" \
  --provider openai \
  --model gpt-4o \
  --max-steps 20 \
  --no-vision

# 新闻数据采集
npx sentra-auto run "从新浪新闻采集今日科技新闻标题和链接，保存到文件" \
  --provider google \
  --model gemini-2.5-flash \
  --max-steps 15
```

**编程方式:**
```typescript
const task = `
数据采集任务：
1. 打开拉勾网
2. 搜索"前端工程师"职位
3. 设置筛选条件：
   - 地区：北京
   - 薪资：15k-30k
   - 经验：3-5年
4. 采集前20个职位的信息：
   - 公司名称
   - 职位名称
   - 薪资范围
   - 技能要求
   - 公司规模
5. 保存数据到CSV文件
`;

const agent = new Agent(task, llm, session);
await agent.run();
```

### 🧪 网站测试

**命令行方式:**
```bash
# 登录功能测试
npx sentra-auto run "测试网站登录功能，用户名admin，密码123456，验证登录成功" \
  --provider openai \
  --model gpt-4o-mini \
  --max-steps 6 \
  --debug

# 表单验证测试
npx sentra-auto run "测试注册表单的输入验证，尝试各种无效输入" \
  --provider anthropic \
  --model claude-sonnet-4 \
  --max-steps 10
```

**编程方式:**
```typescript
const task = `
自动化测试流程：
1. 打开登录页面
2. 测试空用户名登录（应该失败）
3. 测试错误密码登录（应该失败）
4. 输入正确的用户名和密码
5. 点击登录按钮
6. 验证是否成功跳转到首页
7. 检查用户头像是否显示
8. 测试退出登录功能
9. 验证是否返回登录页面
`;

const agent = new Agent(task, llm, session);
await agent.run();
```

## � 最佳实践

### 🎯 任务描述技巧

**✅ 好的任务描述:**
```bash
# 具体、清晰、有步骤
npx sentra-auto run "
1. 打开bilibili.com
2. 在搜索框输入'编程教程'
3. 点击搜索按钮
4. 选择播放量最高的视频
5. 播放视频并点赞
" --max-steps 8
```

**❌ 不好的任务描述:**
```bash
# 模糊、不具体
npx sentra-auto run "看视频" --max-steps 5
```

### ⚙️ 参数优化建议

**根据任务类型选择参数:**

```bash
# 简单任务：减少步数，提高速度
npx sentra-auto run "打开百度搜索AI" \
  --max-steps 3 \
  --no-vision \
  --headless

# 复杂任务：增加步数，启用视觉
npx sentra-auto run "完成复杂的电商购物流程" \
  --max-steps 20 \
  --visible \
  --debug

# 创意任务：提高温度参数
npx sentra-auto run "写一篇有创意的文章" \
  --temperature 0.7 \
  --max-steps 15
```

### 🔧 模型选择指南

| 任务类型 | 推荐模型 | 原因 |
|----------|----------|------|
| 简单操作 | `gpt-4o-mini` | 快速、经济 |
| 复杂逻辑 | `gpt-4.1` | 综合能力强 |
| 创意任务 | `claude-sonnet-4` | 聚合性好 |
| 快速响应 | `gemini-2.5-flash` | 响应速度快 |

### 🛡️ 反检测最佳实践

**使用CDP连接模式:**
```env
BROWSER_CONNECT_TO_USER_BROWSER=true
BROWSER_STEALTH_MODE=true
BROWSER_USER_DATA_DIR=./user-data
```

**启动浏览器:**
```bash
# 启动带调试端口的浏览器
chrome --remote-debugging-port=9222 --user-data-dir="./user-data"
```

## �🚨 常见问题和解决方案

### ❓ 常见问题

**Q: 为什么AI模型响应很慢？**
A: 可能原因和解决方案：
- 🌐 **网络问题**: 检查网络连接，尝试更换API地址
- 🔄 **模型负载**: 尝试更换模型或降低并发请求
- 📝 **Token过多**: 减少任务描述长度，使用`--no-vision`
- 🚀 **优化建议**: 使用`gpt-4o-mini`等快速模型

**Q: 浏览器启动失败怎么办？**
A: 检查步骤：
```bash
# 1. 安装浏览器
npx playwright install

# 2. 检查权限（Linux/Mac）
sudo chmod +x /path/to/browser

# 3. 尝试无头模式
npx sentra-auto run "任务" --headless

# 4. 检查配置
npx sentra-auto config --all
```

**Q: 如何处理验证码和登录？**
A: 推荐方案：
- 🔐 **使用CDP连接**: 保持登录状态
- 📁 **用户数据目录**: 保存Cookie和会话
- 👁️ **视觉识别**: 启用`--visible`模式手动处理
- ⏰ **预先登录**: 手动登录后再运行自动化

**Q: 如何提高操作成功率？**
A: 优化策略：
```bash
# 使用强大的模型
--provider openai --model gpt-4o

# 启用视觉功能
--visible

# 增加步数限制
--max-steps 20

# 启用调试模式
--debug
```

**Q: 程序卡住或无响应怎么办？**
A: 故障排除：
- 🔍 **检查日志**: 使用`--debug`查看详细信息
- ⏹️ **强制停止**: `Ctrl+C`终止程序
- 🔄 **重新启动**: 重启浏览器和程序
- 📊 **检查资源**: 确保内存和CPU充足

### 🔧 故障排除

```bash
# 清理缓存和重新安装
rm -rf node_modules package-lock.json
npm install

# 重新安装浏览器
npx playwright install

# 检查环境配置
npx sentra-auto config

# 测试连接
npx sentra-auto test
```

## 🚀 性能优化

### 💡 优化建议

1. **使用用户数据目录**: 避免重复登录，提高效率
2. **启用无头模式**: 在生产环境中使用无头模式
3. **合理设置超时**: 根据网络情况调整超时时间
4. **使用缓存**: 启用DOM缓存和智能等待
5. **批量操作**: 将相似操作合并执行

### 📊 性能监控

```typescript
// 启用性能监控
const agent = new Agent(task, llm, session, {
  enablePerformanceMonitoring: true,
  enableActionValidation: true,
  enableScreenshotOnError: true
});

// 获取性能报告
const result = await agent.run();
console.log('性能报告:', result.performanceMetrics);
```

## 🤝 贡献指南

我们欢迎所有形式的贡献！

### 🔄 贡献流程

1. **Fork 项目** - 点击右上角的 Fork 按钮
2. **创建分支** - `git checkout -b feature/amazing-feature`
3. **提交代码** - `git commit -m 'Add amazing feature'`
4. **推送分支** - `git push origin feature/amazing-feature`
5. **创建 PR** - 在 GitHub 上创建 Pull Request

### 📝 代码规范

- 使用 TypeScript 编写代码
- 遵循 ESLint 和 Prettier 规范
- 添加适当的注释和文档
- 编写单元测试
- 更新相关文档



## 🌟 支持项目

如果这个项目对你有帮助，请考虑：

- ⭐ 给项目一个星标
- 🔄 分享给更多的开发者
- 🤝 参与贡献代码

## 📝 更新日志

查看 [CHANGELOG.md](CHANGELOG.md) 了解项目的详细更新历史。

## 🙏 致谢

感谢以下开源项目和贡献者：

- [Playwright](https://playwright.dev/) - 强大的浏览器自动化库
- [Node.js](https://nodejs.org/) - JavaScript运行时环境
- [TypeScript](https://www.typescriptlang.org/) - 类型安全的JavaScript超集
- [Commander.js](https://github.com/tj/commander.js) - 命令行界面框架
- [browser-use](https://github.com/browser-use/browser-use) - ai浏览器自动化理念

## 📞 联系我们

- 🏠 项目主页: [Sentra-Auto-Browser](https://github.com/JustForSO/Sentra-Auto-Browser)
- 💬 讨论: [GitHub Discussions](https://github.com/JustForSO/Sentra-Auto-Browser/discussions)
- 🐛 问题: [GitHub Issues](https://github.com/JustForSO/Sentra-Auto-Browser/issues)

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给我们一个star！**

</div>