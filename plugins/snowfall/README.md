# 雪花飘落特效插件

为网页添加美丽的雪花飘落动画效果，营造冬日浪漫氛围。

## 功能特点

- 🌨️ 逼真的雪花飘落动画
- ⚙️ 丰富的自定义参数
- 🎨 支持自定义颜色和透明度
- 💨 可调节风力效果
- ⏱️ 支持定时自动停止
- 📱 响应式设计，适配移动设备
- 🚀 高性能，不影响页面正常使用

## 参数说明

| 参数名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| intensity | number | 50 | 雪花密度，数值越大雪花越多 (1-200) |
| speed | number | 1 | 雪花下落速度，数值越大下落越快 (0.1-5) |
| size | number | 1 | 雪花大小倍数 (0.5-3) |
| color | string | #ffffff | 雪花颜色，支持十六进制颜色值 |
| opacity | number | 0.8 | 雪花透明度 (0.1-1) |
| wind | number | 0 | 风力强度，影响雪花飘动幅度 (-5到5) |
| duration | number | 0 | 持续时间（秒），0表示永久 (0-3600) |

## 使用示例

### 基础使用
```javascript
// 使用默认参数
{
  "pluginId": "snowfall-effect"
}
```

### 自定义参数
```javascript
// 高密度快速雪花
{
  "pluginId": "snowfall-effect",
  "parameters": {
    "intensity": 100,
    "speed": 2,
    "size": 1.2,
    "color": "#e6f3ff",
    "opacity": 0.9,
    "wind": 2,
    "duration": 60
  }
}
```

### 轻柔雪花
```javascript
// 轻柔慢速雪花
{
  "pluginId": "snowfall-effect",
  "parameters": {
    "intensity": 20,
    "speed": 0.5,
    "size": 0.8,
    "opacity": 0.6,
    "wind": -1
  }
}
```

## 技术实现

- 使用CSS3动画实现流畅的雪花飘落效果
- JavaScript动态创建和管理雪花元素
- 采用定时器控制雪花生成频率
- 自动清理过期雪花元素，避免内存泄漏
- 支持多种雪花字符，增加视觉丰富度

## 兼容性

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+
- ✅ 移动端浏览器

## 注意事项

1. 高密度设置可能影响页面性能，建议根据设备性能调整
2. 插件会在页面顶层创建雪花容器，不会影响页面交互
3. 可以通过调用 `window.sentraSnowfall.stop()` 手动停止效果
4. 插件支持重复执行，会自动清理之前的效果

## 版本历史

### v1.0.0
- 初始版本
- 支持基础雪花飘落效果
- 提供丰富的自定义参数
- 响应式设计支持
