# 插件系统文档

## 概述

sentra-auto-browser 的插件系统允许您扩展浏览器自动化功能，添加视觉特效、页面修改和其他增强功能。插件系统采用模块化设计，支持AI驱动的插件选择和执行。

## 核心特性

- **AI驱动选择**: AI可以根据用户请求自动选择和执行合适的插件
- **iframe隔离**: 插件在iframe中运行，不会干扰原始页面功能
- **类型安全**: 完整的TypeScript类型定义
- **生命周期管理**: 完整的插件初始化、执行和清理流程
- **权限系统**: 细粒度的插件权限控制

## 插件类别

### 视觉特效 (visual-effects)
- **snowfall-effect**: 雪花飘落特效
- **rain-effect**: 雨滴特效（计划中）
- **fireworks-effect**: 烟花特效（计划中）
- **particles-effect**: 粒子特效（计划中）

### 页面修改 (page-modification)
- DOM元素创建、修改、删除
- 样式注入和修改
- 脚本注入

### 交互增强 (interaction)
- 用户交互增强（计划中）
- 手势识别（计划中）

### 实用工具 (utility)
- 数据提取工具（计划中）
- 页面分析工具（计划中）

## 使用方法

### CLI命令

#### 查看插件列表
```bash
npx sentra-auto plugin --list
```

#### 测试插件系统
```bash
npx sentra-auto plugin --test
```

#### 查看插件详情
```bash
npx sentra-auto plugin --info snowfall-effect
```

#### 在任务中启用/禁用插件
```bash
# 启用插件系统（默认）
npx sentra-auto run "给页面添加雪花效果" --enable-plugins

# 禁用插件系统
npx sentra-auto run "搜索内容" --disable-plugins

# 测试插件系统
npx sentra-auto run "测试" --plugin-test
```

### AI指令示例

插件系统可以通过自然语言指令触发：

```bash
# 雪花特效
npx sentra-auto run "给页面添加雪花效果"
npx sentra-auto run "让页面下雪"
npx sentra-auto run "添加冬天的感觉"

# 页面修改
npx sentra-auto run "修改页面样式"
npx sentra-auto run "给页面添加装饰"
```

## 插件开发

### 创建新插件

1. **实现Plugin接口**:
```typescript
import { Plugin, PluginExecuteParams, PluginResult } from '../types';

export class MyPlugin implements Plugin {
  id = 'my-plugin';
  name = '我的插件';
  version = '1.0.0';
  description = '插件描述';
  category = 'visual-effects';
  
  async execute(params: PluginExecuteParams): Promise<PluginResult> {
    // 插件逻辑
    return {
      success: true,
      message: '执行成功'
    };
  }
}
```

2. **注册插件**:
在 `src/plugins/registry.ts` 中添加您的插件：
```typescript
const plugins = [
  new SnowfallPlugin(),
  new MyPlugin(), // 添加您的插件
];
```

### 插件权限

插件可以请求以下权限：
- `dom-read`: 读取DOM
- `dom-write`: 修改DOM
- `iframe-create`: 创建iframe
- `script-inject`: 注入脚本
- `style-inject`: 注入样式
- `network-request`: 网络请求
- `storage-access`: 存储访问
- `clipboard-access`: 剪贴板访问

### 页面修改插件基类

对于页面修改插件，可以继承 `BasePageModificationPlugin`：

```typescript
import { BasePageModificationPlugin } from '../base/page-modification-plugin';

export class MyPagePlugin extends BasePageModificationPlugin {
  id = 'my-page-plugin';
  name = '页面插件';
  // ... 其他属性

  protected async executePageModification(params: PluginExecuteParams): Promise<PluginResult> {
    // 页面修改逻辑
    await this.injectStyles('.my-class { color: red; }');
    return { success: true, message: '页面修改完成' };
  }
}
```

## 配置选项

### 环境变量

```bash
# 启用/禁用插件系统
ENABLE_PLUGINS=true  # 默认: true
```

### Agent设置

```typescript
const agentSettings = {
  enablePlugins: true, // 启用插件系统
  // ... 其他设置
};
```

## 故障排除

### 常见问题

1. **插件未加载**
   - 检查插件是否在registry中注册
   - 检查插件权限配置
   - 查看控制台错误信息

2. **插件执行失败**
   - 检查插件依赖是否满足
   - 验证插件参数是否正确
   - 查看详细错误日志

3. **页面干扰问题**
   - 确保使用iframe隔离
   - 检查CSS选择器冲突
   - 验证脚本注入安全性

### 调试模式

启用调试模式查看详细日志：
```bash
npx sentra-auto run "任务" --debug
```

## API参考

### 核心接口

- `Plugin`: 插件基础接口
- `PluginManager`: 插件管理器
- `PluginRegistry`: 插件注册表
- `BasePageModificationPlugin`: 页面修改插件基类

### 动作类型

- `execute_plugin`: 执行指定插件
- `create_page_effect`: 创建页面特效
- `modify_page`: 修改页面内容
- `wrap_page_iframe`: 包装页面到iframe

详细的API文档请参考TypeScript类型定义文件。
