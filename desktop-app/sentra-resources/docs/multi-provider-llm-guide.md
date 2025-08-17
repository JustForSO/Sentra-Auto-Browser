# 多供应商配置指南

## 概述

Sentra Auto Browser 现在支持强大的多供应商LLM配置系统，允许您同时使用多个AI供应商的API，并通过智能策略自动选择最佳端点。

## ✨ 主要特性

- 🔄 **多供应商支持**：同时配置OpenAI、Google Gemini、Anthropic Claude
- 🎯 **智能选择策略**：轮询、优先级、负载均衡、故障转移、随机选择
- 📍 **位置对应**：密钥与端点数量相同时自动一一对应
- 🏥 **健康检查**：自动监控端点状态和性能
- 📊 **性能监控**：实时统计和负载均衡
- 🔄 **向后兼容**：完全兼容原有单一供应商配置

## 🔧 配置方式

### 1. 多供应商配置（推荐）

```bash
# 使用策略配置
LLM_STRATEGY=priority  # 可选: round_robin, priority, load_balance, failover, random

# OpenAI 多端点配置
OPENAI_API_KEYS=sk-xxx1,sk-xxx2,sk-xxx3
OPENAI_BASE_URLS=https://api.openai.com/v1,https://api.deepseek.com/v1,https://yuanplus.cloud/v1
OPENAI_MODELS=gpt-4o,deepseek-chat,gpt-4-turbo
OPENAI_PRIORITIES=1,2,3
OPENAI_WEIGHTS=50,30,20

# Google Gemini 多端点配置
GOOGLE_API_KEYS=AIza-xxx1,AIza-xxx2
GOOGLE_BASE_URLS=https://generativelanguage.googleapis.com/v1beta/,https://api-proxy.me/gemini/v1beta/
GOOGLE_MODELS=gemini-2.5-flash,gemini-pro
GOOGLE_PRIORITIES=2,3
GOOGLE_WEIGHTS=70,30

# Anthropic Claude 多端点配置
ANTHROPIC_API_KEYS=sk-ant-xxx1,sk-ant-xxx2
ANTHROPIC_BASE_URLS=https://api.anthropic.com,https://api-proxy.anthropic.com
ANTHROPIC_MODELS=claude-3-5-sonnet-20241022,claude-3-haiku-20240307
ANTHROPIC_PRIORITIES=1,2
ANTHROPIC_WEIGHTS=80,20
```

### 2. 传统单一供应商配置（兼容）

```bash
# 仍然支持原有的单一配置方式
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o
OPENAI_BASE_URL=https://api.openai.com/v1
```

## 🎯 使用策略说明

### Priority（优先级）
按优先级顺序使用端点，数字越小优先级越高。适合有主要和备用API的场景。

```bash
LLM_STRATEGY=priority
OPENAI_PRIORITIES=1,2,3  # 优先使用第一个，失败时使用第二个
```

### Round Robin（轮询）
依次轮流使用所有可用端点，实现均匀分布。适合负载均衡场景。

```bash
LLM_STRATEGY=round_robin
```

### Load Balance（负载均衡）
基于响应时间和权重智能选择最佳端点。适合性能优化场景。

```bash
LLM_STRATEGY=load_balance
OPENAI_WEIGHTS=50,30,20  # 权重配置
```

### Failover（故障转移）
主端点失败时自动切换到健康的备用端点。适合高可用场景。

```bash
LLM_STRATEGY=failover
```

### Random（随机）
随机选择可用端点。适合简单的负载分散场景。

```bash
LLM_STRATEGY=random
```

## 📍 位置对应规则

当密钥数量与端点数量相同时，系统会按位置一一对应：

```bash
# 3个密钥对应3个端点
OPENAI_API_KEYS=key1,key2,key3
OPENAI_BASE_URLS=url1,url2,url3
# key1 -> url1, key2 -> url2, key3 -> url3
```

当数量不同时，系统会智能分配：

```bash
# 2个密钥对应3个端点
OPENAI_API_KEYS=key1,key2
OPENAI_BASE_URLS=url1,url2,url3
# 系统会智能分配密钥到端点
```

## 🔄 高级配置

```bash
# 重试配置
LLM_MAX_RETRIES=3
LLM_RETRY_DELAY=1000
LLM_TIMEOUT=30000

# 负载均衡配置
LLM_LOAD_BALANCE_WINDOW=100
LLM_HEALTH_CHECK_INTERVAL=60000

# 模型参数
LLM_TEMPERATURE=0
LLM_MAX_TOKENS=4000
```

## 💡 使用建议

### 1. 生产环境推荐配置
```bash
LLM_STRATEGY=failover
OPENAI_API_KEYS=primary_key,backup_key
OPENAI_BASE_URLS=https://api.openai.com/v1,https://backup-api.com/v1
OPENAI_PRIORITIES=1,2
```

### 2. 开发测试环境
```bash
LLM_STRATEGY=round_robin
OPENAI_API_KEYS=dev_key1,dev_key2
GOOGLE_API_KEYS=dev_google_key
```

### 3. 成本优化配置
```bash
LLM_STRATEGY=priority
OPENAI_API_KEYS=cheap_api_key,premium_api_key
OPENAI_BASE_URLS=https://cheap-api.com/v1,https://api.openai.com/v1
OPENAI_PRIORITIES=1,2
```

## 🏥 监控和调试

系统提供了丰富的监控信息：

- 端点健康状态
- 响应时间统计
- 成功/失败率
- 负载分布情况

这些信息会在日志中显示，帮助您优化配置。

## 🔄 迁移指南

从单一供应商配置迁移到多供应商配置：

1. **保持现有配置**：原有配置仍然有效
2. **逐步添加**：可以逐步添加新的端点配置
3. **测试验证**：在开发环境中测试新配置
4. **生产部署**：确认无误后部署到生产环境

## ❓ 常见问题

**Q: 可以混合使用不同供应商吗？**
A: 是的，系统支持同时配置多个供应商，会根据策略智能选择。

**Q: 如何确保API密钥安全？**
A: 建议使用环境变量，不要将密钥硬编码在代码中。

**Q: 性能会受到影响吗？**
A: 多供应商配置实际上可以提高性能和可靠性，通过负载均衡和故障转移。

**Q: 如何监控使用情况？**
A: 系统提供详细的日志和统计信息，可以监控每个端点的使用情况。
