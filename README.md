# Quota Monitor

Hermes Desktop 插件 — 多提供商 API 余额监控 / Multi-provider API quota monitor for Hermes Desktop.

[English](#english) | [中文](#中文)

---

<a id="中文"></a>

## 中文

在状态栏显示已配置提供商的余额，点击展开详情面板，支持齿轮按钮选择性显示。

### ⚠️ 免责声明

**本项目由 AI（Hermes Agent / Nous Research）辅助生成，经人工审核后发布。**

- 代码逻辑、API 端点、数据格式均基于各提供商**官方公开文档**编写
- API 端点可能随提供商更新而变化，请以官方文档为准
- 本插件**不存储、不上传、不转发**任何 API Key 或余额数据 — 所有请求均在本地完成
- 使用本插件即表示您同意自行承担因 API 变更或密钥泄露导致的风险
- 本项目与 DeepSeek、OpenAI、OpenRouter、智谱AI 等提供商无官方关联

### 支持的提供商

| 提供商 | 类型 | 余额 API | 状态 |
|--------|------|----------|------|
| DeepSeek | `deepseek` | `GET /user/balance` | ✅ 内置 |
| OpenRouter | `openrouter` | `GET /api/v1/credits` | ✅ 内置 |
| 智谱GLM | `zhipu` | `GET /api/paas/v4/user/balance` | ✅ 内置 |
| OpenAI | `openai` | `GET /dashboard/billing/credit_grants` | ✅ 内置（默认关闭） |
| 任意 OpenAI 兼容 | `openai-compat` | 自定义 `base_url` + `balance_path` | ✅ 内置 |

### 安装

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

### 配置

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

#### 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| `id` | ✅ | 唯一标识（下划线格式，如 `opencode_go`） |
| `name` | ✅ | 显示名称 |
| `type` | ✅ | 查询函数类型 |
| `api_key_env` | ✅ | 环境变量名（从 `.env` 读取） |
| `base_url` | ❌ | API 基础地址（`openai` / `openai-compat` 类型） |
| `balance_path` | ❌ | 余额端点路径（`openai-compat` 类型，默认 `/user/balance`） |
| `color` | ❌ | 品牌色（HEX） |
| `enabled` | ❌ | 是否启用（默认 true） |

### 添加新的提供商

1. 在 `providers.json` 中添加配置
2. （可选）在 `plugin_api.py` 中添加专用查询函数并注册到 `_QUERY_MAP`
3. （可选）在 `plugin.js` 的 `PROVIDER_meta` 和 `LOGOS` 中添加元数据

详见 `plugin_api.py` 中的 `_query_openai_compat` 作为模板。

### 功能

- 状态栏芯片 — 显示已启用提供商的余额
- 详情面板 — 点击芯片展开，显示各提供商余额明细
- 齿轮设置 — 选择性显示/隐藏提供商
- 语言切换 — 中文/英文
- 低余额预警 — 余额低于阈值时对应提供商文字变色
- 自动刷新 — 每 5 分钟查询一次
- 容错机制 — API 失败时保留旧数据

### 隐私说明

- 所有 API 请求在本地完成，不经过任何第三方服务器
- API Key 从 `.env` 文件读取，不硬编码在代码中
- 提供商选择设置存储在浏览器 localStorage，不上传
- 余额数据仅用于本地显示，不持久化存储

### License

[MIT](LICENSE)

---

<a id="english"></a>

## English

Shows provider balances in the status bar. Click to expand details. Gear icon for selective display.

### ⚠️ Disclaimer

**This project was generated with AI assistance (Hermes Agent by Nous Research) and reviewed by a human.**

- API endpoints and data formats are based on each provider's **official public documentation**
- Endpoints may change without notice — refer to official docs for latest info
- This plugin **does not store, upload, or transmit** any API keys or balance data — all requests are local
- Use at your own risk for API changes or key exposure
- This project has no official affiliation with DeepSeek, OpenAI, OpenRouter, or Zhipu AI

### Supported Providers

| Provider | Type | Balance API | Status |
|----------|------|-------------|--------|
| DeepSeek | `deepseek` | `GET /user/balance` | ✅ Built-in |
| OpenRouter | `openrouter` | `GET /api/v1/credits` | ✅ Built-in |
| Zhipu GLM | `zhipu` | `GET /api/paas/v4/user/balance` | ✅ Built-in |
| OpenAI | `openai` | `GET /dashboard/billing/credit_grants` | ✅ Built-in (disabled by default) |
| Any OpenAI-compatible | `openai-compat` | Custom `base_url` + `balance_path` | ✅ Built-in |

### Installation

```bash
# 1. Clone into Hermes plugin directory
cd ~/.hermes/plugins
git clone https://github.com/RichardWang1101/hermes-quota-monitor.git

# 2. Copy desktop plugin
cp -r hermes-quota-monitor/desktop-plugins/quota-monitor ~/.hermes/desktop-plugins/

# 3. Add to config.yaml plugins.enabled:
# plugins:
#   enabled:
#     - quota-monitor

# 4. Restart Hermes Desktop
```

### Configuration

Edit `plugins/quota-monitor/dashboard/providers.json`:

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

#### Fields

| Field | Required | Description |
|-------|----------|-------------|
| `id` | ✅ | Unique identifier (underscore format, e.g. `opencode_go`) |
| `name` | ✅ | Display name |
| `type` | ✅ | Query function type |
| `api_key_env` | ✅ | Environment variable name (read from `.env`) |
| `base_url` | ❌ | API base URL (`openai` / `openai-compat` types) |
| `balance_path` | ❌ | Balance endpoint path (`openai-compat` type, default `/user/balance`) |
| `color` | ❌ | Brand color (HEX) |
| `enabled` | ❌ | Enable provider (default true) |

### Adding a New Provider

1. Add config entry to `providers.json`
2. (Optional) Add a dedicated query function in `plugin_api.py` and register in `_QUERY_MAP`
3. (Optional) Add metadata in `plugin.js`'s `PROVIDER_meta` and `LOGOS`

See `_query_openai_compat` in `plugin_api.py` as a template.

### Features

- Status bar chip — shows enabled providers' balances
- Detail panel — click chip to expand, shows per-provider balance details
- Gear settings — selectively show/hide providers
- Language toggle — Chinese / English
- Low balance alerts — provider text changes color when below threshold
- Auto refresh — queries every 5 minutes
- Fault tolerance — preserves old data on API failure

### Privacy

- All API requests are local — no third-party servers involved
- API keys read from `.env` file — never hardcoded
- Provider selection stored in browser localStorage — never uploaded
- Balance data is display-only — not persisted

### License

[MIT](LICENSE)

---

## AI-Assisted / AI 辅助声明

This project was developed with the assistance of AI tools (Hermes Agent by Nous Research). Code has been reviewed by a human, but may contain undiscovered issues. Please verify functionality before use.

本项目使用 AI 工具（Hermes Agent by Nous Research）辅助开发。代码经过人工审核，但可能存在未发现的问题。使用前请自行验证。
