# Sentra Auto Browser 插件系统

这是一个基于文件夹结构的插件系统，让用户可以轻松创建和管理页面修改插件。

## 插件结构

每个插件都是一个独立的文件夹，包含以下文件：

```
plugins/
├── your-plugin-name/
│   ├── plugin.json      # 插件配置文件（必需）
│   ├── index.js         # 插件执行脚本（必需）
│   ├── style.css        # 插件样式文件（可选）
│   └── README.md        # 插件说明文档（可选）
```

## 配置文件格式 (plugin.json)

```json
{
  "id": "your-plugin-id",
  "name": "插件显示名称",
  "version": "1.0.0",
  "description": "插件功能描述",
  "author": "作者名称",
  "category": "visual-effects",
  "tags": ["标签1", "标签2"],
  "permissions": ["dom-modification", "style-injection", "script-injection"],
  "parameters": [
    {
      "name": "参数名",
      "type": "number",
      "description": "参数描述",
      "default": 50,
      "min": 1,
      "max": 100,
      "required": false
    }
  ],
  "enabled": true,
  "autoLoad": false,
  "priority": 1
}
```

### 配置字段说明

- **id**: 插件唯一标识符
- **name**: 插件显示名称
- **version**: 插件版本号
- **description**: 插件功能描述
- **author**: 插件作者（可选）
- **category**: 插件类别
  - `visual-effects`: 视觉特效
  - `decoration`: 装饰效果
  - `interaction`: 交互功能
  - `utility`: 实用工具
  - `audio`: 音频效果
- **tags**: 插件标签数组，用于搜索和分类
- **permissions**: 插件所需权限
  - `dom-modification`: DOM修改权限
  - `style-injection`: 样式注入权限
  - `script-injection`: 脚本注入权限
- **parameters**: 插件参数定义数组
- **enabled**: 是否启用插件
- **autoLoad**: 是否自动加载
- **priority**: 插件优先级

### 参数类型

- `string`: 字符串
- `number`: 数字
- `boolean`: 布尔值
- `array`: 数组
- `object`: 对象

## 执行脚本 (index.js)

插件执行脚本是一个JavaScript文件，在沙盒环境中执行。

### 可用的全局变量和函数

```javascript
// 插件参数
const parameters = {
  // 用户传入的参数
};

// 页面对象
const page = {
  // Playwright页面对象
};

// 插件路径
const pluginPath = "/path/to/plugin";

// 插件配置
const config = {
  // plugin.json的内容
};

// 控制台输出
console.log("信息");
console.error("错误");
console.warn("警告");

// 注入CSS样式
await injectCSS("css内容");

// 注入JavaScript代码
await injectJS("js代码");

// 查询DOM元素
const element = await querySelector("选择器");

// 读取插件文件
const content = readFile("文件名");
```

### 执行脚本示例

```javascript
// 获取参数
const intensity = parameters.intensity || 50;
const color = parameters.color || '#ffffff';

// 读取样式文件
const cssContent = readFile('style.css');

// 注入样式
await injectCSS(cssContent);

// 注入脚本
const script = `
  // 你的JavaScript代码
  console.log('插件已启动');
`;

await injectJS(script);

// 返回执行结果
return {
  success: true,
  message: "插件执行成功",
  data: { intensity, color }
};
```

## 样式文件 (style.css)

可选的CSS样式文件，定义插件的视觉效果。

```css
/* 插件样式 */
.my-plugin-element {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 999999;
  pointer-events: none;
}

@keyframes my-animation {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
```

## 创建新插件

1. 在 `plugins` 目录下创建新文件夹
2. 创建 `plugin.json` 配置文件
3. 创建 `index.js` 执行脚本
4. 可选：创建 `style.css` 样式文件
5. 可选：创建 `README.md` 说明文档

## 现有插件

### 雪花飘落特效 (snowfall)
- 为页面添加美丽的雪花飘落动画
- 支持自定义密度、速度、颜色等参数

### 雨滴特效 (rain)
- 为页面添加逼真的雨滴下落动画
- 支持自定义密度、速度、角度等参数

## 最佳实践

1. **性能优化**: 避免创建过多DOM元素，及时清理不需要的元素
2. **样式隔离**: 使用唯一的CSS类名前缀，避免样式冲突
3. **错误处理**: 在执行脚本中添加适当的错误处理
4. **参数验证**: 验证用户输入的参数，提供合理的默认值
5. **清理机制**: 提供停止和清理插件效果的方法
6. **响应式设计**: 考虑不同屏幕尺寸的适配

## 调试技巧

1. 使用 `console.log` 输出调试信息
2. 检查浏览器开发者工具的控制台
3. 验证CSS样式是否正确注入
4. 确保JavaScript代码语法正确
5. 检查插件配置文件格式是否正确

## 安全注意事项

1. 插件在沙盒环境中执行，访问受限
2. 不要在插件中包含恶意代码
3. 谨慎处理用户输入的参数
4. 避免访问敏感的页面信息
