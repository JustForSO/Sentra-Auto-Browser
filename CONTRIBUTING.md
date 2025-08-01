# 🤝 贡献指南

感谢你对 Sentra Auto Browser 项目的关注！我们欢迎所有形式的贡献。

## 📋 贡献方式

### 🐛 报告问题

如果你发现了bug或有功能建议：

1. 检查 [Issues](https://github.com/JustForSO/Sentra-Auto-Browser/issues) 是否已有相关问题
2. 如果没有，请创建新的Issue，包含：
   - 详细的问题描述
   - 复现步骤
   - 期望的行为
   - 实际的行为
   - 环境信息（操作系统、Node.js版本等）
   - 相关的日志或截图

### 💻 代码贡献

#### 开发环境设置

```bash
# 1. Fork 项目到你的GitHub账户
# 2. 克隆你的fork
git clone https://github.com/YOUR_USERNAME/Sentra-Auto-Browser.git
cd Sentra-Auto-Browser

# 3. 添加上游仓库
git remote add upstream https://github.com/JustForSO/Sentra-Auto-Browser.git

# 4. 安装依赖
npm install

# 5. 安装浏览器
npx playwright install

# 6. 编译项目
npm run build
```

#### 开发流程

1. **创建分支**
   ```bash
   git checkout -b feature/your-feature-name
   # 或
   git checkout -b fix/your-bug-fix
   ```

2. **进行开发**
   - 编写代码
   - 添加测试
   - 更新文档

3. **测试你的更改**
   ```bash
   # 编译项目
   npm run build
   
   # 运行测试
   npm test
   
   # 检查TypeScript类型
   npx tsc --noEmit
   ```

4. **提交更改**
   ```bash
   git add .
   git commit -m "feat: 添加新功能描述"
   # 或
   git commit -m "fix: 修复bug描述"
   ```

5. **推送分支**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **创建Pull Request**
   - 在GitHub上创建PR
   - 填写详细的描述
   - 等待代码审查

## 📝 代码规范

### 🎯 编码标准

- **语言**: 使用TypeScript编写代码
- **注释**: 使用中文注释，清晰描述代码功能
- **命名**: 使用有意义的变量和函数名
- **格式**: 遵循项目现有的代码风格

### 📁 文件结构

```
src/
├── agent/          # AI代理核心逻辑
├── browser/        # 浏览器操作相关
├── cli/           # 命令行界面
├── config/        # 配置管理
├── controller/    # 操作控制器
├── dom/           # DOM操作
├── llm/           # AI模型接口
└── utils/         # 工具函数
```

### 🧪 测试要求

- 为新功能添加单元测试
- 确保所有测试通过
- 测试覆盖率应保持在合理水平
- 添加集成测试（如果适用）

### 📖 文档要求

- 更新相关的README部分
- 添加代码注释
- 更新API文档（如果适用）
- 添加使用示例

## 🏷️ 提交信息规范

使用以下格式的提交信息：

```
<类型>: <描述>

[可选的正文]

[可选的脚注]
```

### 类型

- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更新
- `style`: 代码格式化（不影响功能）
- `refactor`: 代码重构
- `test`: 添加或修改测试
- `chore`: 构建过程或辅助工具的变动

### 示例

```
feat: 添加CDP连接支持

- 支持连接到现有浏览器实例
- 添加反检测机制
- 更新配置选项

Closes #123
```

## 🔍 代码审查

### 审查标准

- 代码功能正确性
- 代码可读性和维护性
- 测试覆盖率
- 文档完整性
- 性能影响

### 审查流程

1. 自动化测试必须通过
2. 至少一个维护者审查
3. 解决所有审查意见
4. 合并到主分支

## 🚀 发布流程

### 版本号规范

遵循 [语义化版本](https://semver.org/lang/zh-CN/)：

- `MAJOR.MINOR.PATCH`
- `1.0.0` → `1.0.1` (补丁)
- `1.0.0` → `1.1.0` (次版本)
- `1.0.0` → `2.0.0` (主版本)

### 发布步骤

1. 更新版本号
2. 更新CHANGELOG
3. 创建发布标签
4. 自动发布到NPM

## 🆘 获取帮助

如果你在贡献过程中遇到问题：

- 查看 [Issues](https://github.com/JustForSO/Sentra-Auto-Browser/issues)
- 创建新的Issue询问
- 查看项目文档

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者！

---

再次感谢你的贡献！🎉
