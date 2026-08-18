# Quota Monitor

Hermes Desktop 插件 — 多提供商 API 余额监控。

在状态栏显示已配置提供商的余额，点击展开详情面板，支持齿轮按钮选择性显示。

## ⚠️ 免责声明

**本项目由 AI（Hermes Agent / Nous Research）辅助生成，经人工审核后发布。**

- 代码逻辑、API 端点、数据格式均基于各提供商**官方公开文档**编写
- API 端点可能随提供商更新而变化，请以官方文档为准
- 本插件**不存储、不上传、不转发**任何 API Key 或余额数据 — 所有请求均在本地完成
- 使用本插件即表示您同意自行承担因 API 变更或密钥泄露导致的风险
- 本项目与 DeepSeek、OpenAI、OpenRouter、智谱AI 等提供商无官方关联

## 支持的提供商

| 提供商 | 类型 | 余额 API | 状态 |
|--------|------|----------|------|
| DeepSeek | `deepseek` | `GET /user/balance` | ✅ 内置 |
| OpenRouter | `openrouter` | `GET /api/v1/credits` | ✅ 内置 |
| 智谱GLM | `zhipu` | `GET /api/paas/v4/user/balance` | ✅ 内置 |
| OpenAI | `openai` | `GET /dashboard/billing/credit_grants` | ✅ 内置（默认关闭） |
| 任意 OpenAI 兼容 | `openai-compat` | 自定义 `base_url` + `balance_path` | ✅ 内置 |

## 安装

```bash
# 1. 克隆到 Hermes 插件目录
cd ~/.hermes/plugins
git clone https://github.com/RichardWang1101/hermes-quota-monitor.git

# 2. 复制桌面插件
cp -r hermes-quota-monitor/desktop-plugins/quota-monitor ~/.hermes/desktop-plugins/

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
| `balance_path` | ❌ | 余额端点路径（`openai-compat` 类型，默认 `/user/balance`） |
| `color` | ❌ | 品牌色（HEX） |
| `enabled` | ❌ | 是否启用（默认 true） |

### 支持的 type

| type | 说明 |
|------|------|
| `deepseek` | DeepSeek 余额 |
| `openrouter` | OpenRouter credits |
| `zhipu` | 智谱GLM 余额 |
| `openai` | OpenAI 预付费额度 |
| `openai-compat` | 任意 OpenAI 兼容提供商 |

## 添加新的提供商

### 步骤 1：在 `providers.json` 中添加配置

```json
{
  "id": "kimi",
  "name": "Kimi",
  "type": "openai-compat",
  "api_key_env": "KIMI_API_KEY",
  "base_url": "https://api.moonshot.cn",
  "balance_path": "/v1/user/balance",
  "color": "#ff6600",
  "enabled": true
}
```

### 步骤 2（可选）：添加专用查询函数

如果 `openai-compat` 不能正确解析响应，可在 `plugin_api.py` 中添加专用函数：

```python
def _query_kimi(provider: dict) -> dict:
    key = _env(provider["api_key_env"])
    if not key:
        return {"error": "API Key 未配置"}
    data = _get("https://api.moonshot.cn/v1/user/balance", key)
    if not data:
        return {"error": "请求失败"}
    return {
        "currency": "CNY",
        "total": str(data.get("balance", 0)),
    }
```

然后注册：`_QUERY_MAP["kimi"] = _query_kimi`

## 功能

- **状态栏芯片**：显示已启用提供商的余额
- **详情面板**：点击芯片展开，显示各提供商余额明细
- **齿轮设置**：选择性显示/隐藏提供商（持久化到 localStorage）
- **低余额预警**：余额低于阈值时对应提供商文字变色
- **自动刷新**：每 5 分钟查询一次
- **容错机制**：API 失败时保留旧数据

## 低余额预警

| 提供商 | 预警条件 | 颜色 |
|--------|---------|------|
| DeepSeek | 余额 ≤ ¥5 | 🔵 蓝色 |
| OpenCode Go | 任一周期 ≥ 80% | 🔴 红色 |
| 其他 | 自定义 | 在 `plugin.js` 中修改 `getAlertColor` |

## 隐私说明

- 所有 API 请求在本地完成，**不经过任何第三方服务器**
- API Key 从 `.env` 文件读取，**不硬编码在代码中**
- 提供商选择设置存储在浏览器 localStorage，**不上传**
- 余额数据仅用于本地显示，**不持久化存储**

## License

[MIT](LICENSE)

## 贡献

欢迎提交 Issue 和 Pull Request。

## AI 辅助声明

本项目使用 AI 工具（Hermes Agent by Nous Research）辅助开发。代码经过人工审核，但可能存在未发现的问题。使用前请自行验证功能是否满足需求。
