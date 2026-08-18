# Quota Monitor

Hermes Desktop 插件 — 多提供商 API 余额监控。

在状态栏显示已配置提供商的余额，点击展开详情面板，支持齿轮按钮选择性显示。

## 支持的提供商

| 提供商 | 类型 | 余额 API | 状态 |
|--------|------|----------|------|
| DeepSeek | `deepseek` | `GET /user/balance` | ✅ 内置 |
| OpenRouter | `openrouter` | `GET /api/v1/credits` | ✅ 内置 |
| 智谱GLM | `zhipu` | `GET /api/paas/v4/user/balance` | ✅ 内置 |
| OpenAI | `openai` | `GET /dashboard/billing/credit_grants` | ✅ 内置（默认关闭） |
| 任意 OpenAI 兼容 | `openai-compat` | 自定义 `base_url` | 📝 可扩展 |

## 安装

```bash
# 1. 克隆到 Hermes 插件目录
cd ~/.hermes/plugins
git clone https://github.com/yourname/quota-monitor.git

# 2. 复制桌面插件
cp -r quota-monitor/desktop-plugins/quota-monitor ~/.hermes/desktop-plugins/

# 3. 在 config.yaml 的 plugins.enabled 中添加
# plugins:
#   enabled:
#     - quota-monitor

# 4. 重启 Hermes Desktop
```

## 配置

编辑 `plugins/quota-monitor/dashboard/providers.json`：

```json
{
  "providers": [
    {
      "id": "deepseek",
      "name": "DeepSeek",
      "type": "deepseek",
      "api_key_env": "DEEPSEEK_API_KEY",
      "color": "#4D6BFE",
      "enabled": true
    }
  ]
}
```

### 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| `id` | ✅ | 唯一标识（下划线格式，如 `opencode_go`） |
| `name` | ✅ | 显示名称（如 `OpenCode Go`） |
| `type` | ✅ | 查询函数类型（见下方支持列表） |
| `api_key_env` | ✅ | 环境变量名（从 `.env` 读取） |
| `base_url` | ❌ | API 基础地址（`openai` / `openai-compat` 类型可选） |
| `color` | ❌ | 品牌色（HEX） |
| `enabled` | ❌ | 是否启用（默认 true） |

### 支持的 type

| type | 说明 | 对应查询函数 |
|------|------|-------------|
| `deepseek` | DeepSeek 余额 | `_query_deepseek` |
| `openrouter` | OpenRouter credits | `_query_openrouter` |
| `zhipu` | 智谱GLM 余额 | `_query_zhipu` |
| `openai` | OpenAI 预付费额度 | `_query_openai` |

## 添加新的提供商

### 步骤 1：在 `providers.json` 中添加配置

```json
{
  "id": "my_provider",
  "name": "My Provider",
  "type": "my_provider",
  "api_key_env": "MY_PROVIDER_API_KEY",
  "color": "#ff6600",
  "enabled": true
}
```

### 步骤 2：在 `plugin_api.py` 中添加查询函数

```python
def _query_my_provider(provider: dict) -> dict:
    """查询 My Provider 余额。"""
    key = _env(provider["api_key_env"])
    if not key:
        return {"error": "API Key 未配置"}
    
    data = _get("https://api.myprovider.com/user/balance", key)
    if not data:
        return {"error": "请求失败"}
    
    # 返回格式（二选一）：
    
    # 格式 A：余额型（DeepSeek 风格）
    return {
        "currency": "CNY",           # 或 "USD"
        "total": "100.00",           # 总余额
        "granted": "50.00",          # 赠送余额（可选）
        "topped_up": "50.00",        # 充值余额（可选）
    }
    
    # 格式 B：额度型（OpenAI 风格）
    return {
        "currency": "USD",
        "total": "10.00",            # 剩余额度
        "granted": "20.00",          # 总额度
        "used": "10.00",             # 已用额度
    }
```

### 步骤 3：注册到查询映射

```python
_QUERY_MAP = {
    "deepseek": _query_deepseek,
    "openrouter": _query_openrouter,
    "zhipu": _query_zhipu,
    "openai": _query_openai,
    "my_provider": _query_my_provider,  # ← 添加这行
}
```

### 步骤 4：在前端 `plugin.js` 中添加元数据

```javascript
const PROVIDER_meta = {
  // ... 已有提供商
  my_provider: { label: 'My Provider', color: '#ff6600' },
}

const LOGOS = {
  // ... 已有 logo
  my_provider: 'https://myprovider.com/favicon.ico',  // 可选
}
```

## 功能

- **状态栏芯片**：显示已启用提供商的余额
- **详情面板**：点击芯片展开，显示各提供商余额明细
- **齿轮设置**：选择性显示/隐藏提供商
- **低余额预警**：余额低于阈值时芯片变色
- **自动刷新**：每 5 分钟查询一次
- **容错机制**：API 失败时保留旧数据，不闪退

## 低余额预警规则

| 提供商 | 预警条件 | 芯片颜色 |
|--------|---------|---------|
| DeepSeek | 余额 ≤ ¥5 | 蓝色 |
| OpenCode Go | 任一周期 ≥ 80% | 红色 |
| 其他 | 余额 ≤ $1 | 对应品牌色 |

可在 `plugin.js` 的 `pctColor` 和芯片渲染逻辑中自定义阈值。

## License

MIT
