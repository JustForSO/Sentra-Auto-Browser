# LLM配置模式详解

## 📋 概述

Sentra Auto Browser 提供了灵活的LLM配置系统，支持多种工作模式和用户控制选项。您可以根据不同的使用场景选择最适合的配置模式。

## 🎯 选择策略 (LLM_STRATEGY)

### 1. Priority（优先级模式）- 推荐
```bash
LLM_STRATEGY=priority
```
**特点：**
- 按优先级顺序使用端点
- 数字越小优先级越高
- 主端点失败时自动切换到备用端点
- 适合有主要和备用API的场景

**使用场景：**
- 生产环境（主API + 备用API）
- 成本控制（便宜API优先，贵的作备用）
- 性能优化（快速API优先）

### 2. Round Robin（轮询模式）
```bash
LLM_STRATEGY=round_robin
```
**特点：**
- 依次轮流使用所有可用端点
- 实现均匀的负载分布
- 避免单一端点过载

**使用场景：**
- 多个同等质量的API
- 负载均衡需求
- 避免单点过载

### 3. Load Balance（负载均衡模式）
```bash
LLM_STRATEGY=load_balance
```
**特点：**
- 基于响应时间和权重智能选择
- 动态调整负载分配
- 自动优化性能

**使用场景：**
- 性能要求高的场景
- 多个不同性能的API
- 需要动态优化的环境

### 4. Failover（故障转移模式）
```bash
LLM_STRATEGY=failover
```
**特点：**
- 主端点失败时立即切换
- 专注于高可用性
- 快速故障恢复

**使用场景：**
- 高可用性要求
- 关键业务应用
- 不能容忍服务中断

### 5. Random（随机模式）
```bash
LLM_STRATEGY=random
```
**特点：**
- 随机选择可用端点
- 简单的负载分散
- 避免预测性访问模式

**使用场景：**
- 测试环境
- 简单的负载分散需求
- 避免访问模式被检测

## 🔧 用户控制选项

### 1. 禁用健康检查模式
```bash
LLM_DISABLE_HEALTH_CHECK=true
```
**效果：**
- 所有端点始终被认为是健康的
- 不会因为健康检查失败而禁用端点
- 适合网络不稳定或API响应慢的环境

**适用场景：**
- 网络环境不稳定
- API响应时间较长
- 不希望端点被自动禁用

### 2. 总是重试所有端点模式
```bash
LLM_ALWAYS_RETRY_ALL=true
```
**效果：**
- 忽略选择策略，依次尝试所有端点
- 直到找到一个成功的端点
- 最大化成功率

**适用场景：**
- 对成功率要求极高
- 不在乎响应时间
- 多个不稳定的API

### 3. 严格模式
```bash
LLM_STRICT_MODE=true
```
**效果：**
- 遇到错误立即停止，不重试
- 快速失败，立即报告错误
- 适合调试和开发环境

**适用场景：**
- 开发和调试
- 需要快速发现问题
- 不希望掩盖错误

### 4. 调试模式
```bash
LLM_DEBUG_MODE=true
```
**效果：**
- 输出详细的调试日志
- 显示端点选择过程
- 记录详细的错误信息

**适用场景：**
- 问题排查
- 性能分析
- 配置验证

### 5. 回退模式控制
```bash
LLM_ENABLE_FALLBACK_MODE=false
```
**效果：**
- 禁用回退模式
- 不会尝试不健康的端点
- 更严格的错误处理

## 📊 性能参数配置

### 重试配置
```bash
LLM_MAX_RETRIES=3          # 最大重试次数
LLM_RETRY_DELAY=1000       # 重试延迟（毫秒）
LLM_TIMEOUT=30000          # 请求超时（毫秒）
```

### 负载均衡配置
```bash
LLM_LOAD_BALANCE_WINDOW=100      # 统计窗口大小
LLM_HEALTH_CHECK_INTERVAL=60000  # 健康检查间隔（毫秒）
LLM_FAILURE_THRESHOLD=3          # 失败阈值
LLM_RECOVERY_THRESHOLD=5         # 恢复阈值
```

## 🎯 推荐配置方案

### 生产环境（高可用）
```bash
LLM_STRATEGY=priority
LLM_MAX_RETRIES=3
LLM_RETRY_DELAY=1000
LLM_TIMEOUT=30000
LLM_ENABLE_FALLBACK_MODE=true

# 配置主要和备用API
OPENAI_API_KEYS=main_key,backup_key
OPENAI_BASE_URLS=https://api.openai.com/v1,https://backup-api.com/v1
OPENAI_PRIORITIES=1,2
```

### 开发测试环境
```bash
LLM_STRATEGY=round_robin
LLM_DEBUG_MODE=true
LLM_DISABLE_HEALTH_CHECK=true
LLM_MAX_RETRIES=1

# 使用测试API
OPENAI_API_KEYS=test_key1,test_key2
```

### 成本优化环境
```bash
LLM_STRATEGY=priority
LLM_ALWAYS_RETRY_ALL=true

# 便宜的API优先
OPENAI_API_KEYS=cheap_key,premium_key
OPENAI_BASE_URLS=https://cheap-api.com/v1,https://api.openai.com/v1
OPENAI_PRIORITIES=1,2
```

### 高性能环境
```bash
LLM_STRATEGY=load_balance
LLM_MAX_RETRIES=2
LLM_RETRY_DELAY=500
LLM_TIMEOUT=15000

# 配置权重
OPENAI_WEIGHTS=50,30,20
```

### 极简配置（单纯轮询）
```bash
LLM_STRATEGY=round_robin
LLM_DISABLE_HEALTH_CHECK=true
LLM_MAX_RETRIES=1

# 只配置API密钥，其他使用默认值
OPENAI_API_KEYS=key1,key2,key3
```

## 🔍 故障排查

### 常见问题和解决方案

**问题：端点总是被标记为不健康**
```bash
# 解决方案：禁用健康检查
LLM_DISABLE_HEALTH_CHECK=true
```

**问题：请求总是失败**
```bash
# 解决方案：启用所有重试模式
LLM_ALWAYS_RETRY_ALL=true
LLM_ENABLE_FALLBACK_MODE=true
```

**问题：需要查看详细错误信息**
```bash
# 解决方案：启用调试模式
LLM_DEBUG_MODE=true
```

**问题：响应时间太慢**
```bash
# 解决方案：减少超时和重试
LLM_TIMEOUT=10000
LLM_MAX_RETRIES=1
LLM_RETRY_DELAY=500
```

## 💡 最佳实践

1. **生产环境**：使用priority策略，配置主备API
2. **开发环境**：启用调试模式，禁用健康检查
3. **测试环境**：使用round_robin，启用所有重试
4. **成本控制**：按成本配置优先级
5. **性能优化**：使用load_balance策略
6. **高可用性**：启用回退模式和故障转移

## 🔄 配置验证

使用以下命令验证配置：
```bash
node test-simple.js
```

这将显示：
- 解析的配置参数
- 可用的端点数量
- 选择的策略
- 端点健康状态
