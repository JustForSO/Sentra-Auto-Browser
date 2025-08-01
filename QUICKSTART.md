# 🚀 Sentra Auto Browser - 快速入门指南

## ⚡ 5分钟快速开始

### 1️⃣ 安装项目

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

### 2️⃣ 配置API密钥

复制环境变量文件并配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，至少配置一个AI提供商：

```env
# OpenAI配置（推荐）
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini

# 或者使用其他提供商
# GOOGLE_API_KEY=your_google_api_key_here
# ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### 3️⃣ 第一次运行

```bash
# 简单测试
npx sentra-auto run "打开百度，搜索人工智能" --visible

# 查看配置
npx sentra-auto config
```

## 🎯 常用命令示例

### 📱 视频网站自动化

```bash
# bilibili视频操作
npx sentra-auto run "bilibili搜索编程教程，播放最热门的视频，点赞" \
  --provider openai \
  --model gpt-4o-mini \
  --max-steps 8 \
  --visible

# YouTube操作
npx sentra-auto run "YouTube搜索JavaScript教程，订阅频道" \
  --max-steps 6 \
  --visible
```

### 🛒 电商购物

```bash
# 淘宝购物
npx sentra-auto run "淘宝搜索蓝牙耳机，价格100-300元，查看评价最好的" \
  --max-steps 12 \
  --visible

# 京东比价
npx sentra-auto run "京东搜索iPhone，比较价格" \
  --max-steps 8 \
  --visible
```

### 📝 表单填写

```bash
# 注册表单
npx sentra-auto run "填写注册表单，用户名testuser，邮箱test@example.com" \
  --max-steps 5 \
  --visible

# 求职简历
npx sentra-auto run "提交简历，职位前端工程师" \
  --max-steps 8 \
  --visible
```

## 🔧 高级功能

### 🔗 CDP连接模式（保持登录状态）

1. **配置环境变量:**
```env
BROWSER_CONNECT_TO_USER_BROWSER=true
BROWSER_DEBUG_PORT=9222
BROWSER_AUTO_CLOSE=false
BROWSER_STEALTH_MODE=true
```

2. **启动浏览器调试模式:**
```bash
# Windows Chrome
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="./user-data"

# Windows Edge
"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --remote-debugging-port=9222 --user-data-dir="./user-data"

# Mac Chrome
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir="./user-data"

# Linux Chrome
google-chrome --remote-debugging-port=9222 --user-data-dir="./user-data"
```

3. **运行任务:**
```bash
npx sentra-auto run "你的任务描述"
```

### 📊 配置查看

```bash
# 基本配置
npx sentra-auto config

# 详细配置
npx sentra-auto config --all

# 环境变量
npx sentra-auto config --env
```

## 💡 使用技巧

### ✅ 任务描述最佳实践

**好的描述（具体、清晰）:**
```bash
npx sentra-auto run "
1. 打开bilibili.com
2. 搜索'编程教程'
3. 选择播放量最高的视频
4. 播放视频
5. 点赞并收藏
" --max-steps 8
```

**不好的描述（模糊）:**
```bash
npx sentra-auto run "看视频" --max-steps 5
```

### ⚙️ 参数选择指南

| 任务复杂度 | 推荐参数 | 说明 |
|------------|----------|------|
| 简单 | `--max-steps 3-5` `--no-vision` | 快速执行 |
| 中等 | `--max-steps 8-12` `--visible` | 平衡性能 |
| 复杂 | `--max-steps 15-25` `--debug` | 详细调试 |

### 🤖 模型选择

| 模型 | 适用场景 | 特点 |
|------|----------|------|
| `gpt-4o-mini` | 简单任务 | 快速、经济 |
| `gpt-4o` | 复杂任务 | 理解力强 |
| `claude-sonnet-4` | 创意任务 | 创意性好 |
| `gemini-2.5-flash` | 快速响应 | 速度快 |

## 🚨 常见问题

### ❓ 启动失败

```bash
# 检查浏览器安装
npx playwright install

# 检查配置
npx sentra-auto config --all

# 尝试无头模式
npx sentra-auto run "测试任务" --headless
```

### ❓ API错误

```bash
# 检查API密钥
echo $OPENAI_API_KEY

# 测试网络连接
curl -I https://api.openai.com/v1/models

# 查看详细错误
npx sentra-auto run "任务" --debug
```

### ❓ 操作失败

```bash
# 启用视觉模式
npx sentra-auto run "任务" --visible

# 增加步数
npx sentra-auto run "任务" --max-steps 20

# 使用更强模型
npx sentra-auto run "任务" --provider openai --model gpt-4o
```

## 📚 更多资源

- 📖 [完整文档](README.md)
- 💻 [编程示例](examples/)
- 🔧 [配置参考](.env.example)
- 🐛 [问题反馈](https://github.com/JustForSO/Sentra-Auto-Browser/issues)

## 🎉 开始你的自动化之旅！

现在你已经掌握了基础用法，可以开始探索更多可能性：

1. 🎬 **视频网站自动化** - 自动播放、点赞、收藏
2. 🛒 **电商购物助手** - 比价、筛选、下单
3. 📝 **表单自动填写** - 注册、申请、提交
4. 📊 **数据采集工具** - 抓取、整理、保存
5. 🧪 **网站自动测试** - 功能测试、回归测试

**记住：** 
- 使用 `--visible` 观察执行过程
- 使用 `--debug` 查看详细日志  
- 使用 `--max-steps` 控制执行步数
- 提供清晰具体的任务描述

祝你使用愉快！🚀
