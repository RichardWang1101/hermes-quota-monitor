"""Quota Monitor — open source version.

Queries official provider APIs. Providers defined in providers.json.
Returns flat format: {"deepseek": {...}, "openai": {...}, "updated_at": ...}
"""
import os
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter

router = APIRouter()

_DIR = Path(__file__).parent
_ENV = {}
for _line in Path("D:/hermes/.env").read_text(encoding="utf-8").splitlines():
    _line = _line.strip()
    if _line and not _line.startswith("#") and "=" in _line:
        _k, _v = _line.split("=", 1)
        _ENV[_k] = _v
        os.environ.setdefault(_k, _v)


def _env(key: str) -> str:
    return _ENV.get(key, os.environ.get(key, ""))


def _get(url: str, token: str, timeout: int = 10) -> dict | None:
    try:
        result = subprocess.run(
            ["curl", "-s", url, "-H", f"Authorization: Bearer {token}",
             "-H", "Content-Type: application/json"],
            capture_output=True, text=True, timeout=timeout,
        )
        if result.returncode != 0 or not result.stdout.strip():
            return None
        return json.loads(result.stdout)
    except Exception:
        return None


def _parse_reset(resets_at: str) -> int:
    """Return seconds until reset, or 0 if already reset."""
    if not resets_at:
        return 0
    try:
        reset_time = datetime.fromisoformat(resets_at.replace("Z", "+00:00"))
        delta = reset_time - datetime.now(timezone.utc)
        return max(0, int(delta.total_seconds()))
    except Exception:
        return 0


# --- Provider query functions ---

def _query_deepseek(provider: dict) -> dict:
    key = _env(provider["api_key_env"])
    if not key:
        return {"error": "API Key 未配置"}
    data = _get("https://api.deepseek.com/user/balance", key)
    if not data:
        return {"error": "请求失败"}
    if not data.get("is_available"):
        return {"error": "账户不可用"}
    infos = data.get("balance_infos", [])
    for info in infos:
        if info.get("currency") == "CNY":
            return {
                "currency": "CNY",
                "total": info.get("total_balance", "0"),
                "granted": info.get("granted_balance", "0"),
                "topped_up": info.get("topped_up_balance", "0"),
            }
    if infos:
        info = infos[0]
        return {
            "currency": info.get("currency", "?"),
            "total": info.get("total_balance", "0"),
            "granted": info.get("granted_balance", "0"),
            "topped_up": info.get("topped_up_balance", "0"),
        }
    return {"error": "无余额数据"}


def _query_openai(provider: dict) -> dict:
    key = _env(provider["api_key_env"])
    if not key:
        return {"error": "API Key 未配置"}
    base = provider.get("base_url", "https://api.openai.com")
    data = _get(f"{base}/dashboard/billing/credit_grants", key)
    if not data:
        return {"error": "请求失败"}
    total = data.get("total_granted", 0)
    used = data.get("total_used", 0)
    remaining = data.get("total_available", total - used)
    return {
        "currency": "USD",
        "total": f"{remaining:.2f}",
        "granted": f"{total:.2f}",
        "used": f"{used:.2f}",
    }


def _query_openrouter(provider: dict) -> dict:
    key = _env(provider["api_key_env"])
    if not key:
        return {"error": "API Key 未配置"}
    data = _get("https://openrouter.ai/api/v1/credits", key)
    if not data:
        return {"error": "请求失败"}
    d = data.get("data", {})
    total = d.get("total_credits", 0)
    used = d.get("total_usage", 0)
    remaining = total - used
    return {
        "currency": "USD",
        "total": f"{remaining:.2f}",
        "granted": f"{total:.2f}",
        "used": f"{used:.2f}",
    }


def _query_zhipu(provider: dict) -> dict:
    key = _env(provider["api_key_env"])
    if not key:
        return {"error": "API Key 未配置"}
    data = _get("https://open.bigmodel.cn/api/paas/v4/user/balance", key)
    if not data:
        return {"error": "请求失败"}
    if "error" in data:
        return {"error": data["error"].get("message", "请求失败")}
    total = data.get("total_balance", 0)
    granted = data.get("granted_balance", 0)
    topped = data.get("topped_up_balance", 0)
    return {
        "currency": "CNY",
        "total": f"{float(total):.2f}",
        "granted": f"{float(granted):.2f}",
        "topped_up": f"{float(topped):.2f}",
    }




def _query_openai_compat(provider: dict) -> dict:
    """Query OpenAI-compatible provider balance.

    Requires `base_url` and `balance_path` in provider config.
    Tries to normalize common response formats.
    """
    key = _env(provider["api_key_env"])
    if not key:
        return {"error": "API Key 未配置"}
    base = provider.get("base_url", "")
    path = provider.get("balance_path", "/user/balance")
    if not base:
        return {"error": "未配置 base_url"}
    data = _get(f"{base.rstrip('/')}{path}", key)
    if not data:
        return {"error": "请求失败"}
    if "error" in data:
        msg = data["error"]
        if isinstance(msg, dict):
            msg = msg.get("message", str(msg))
        return {"error": str(msg)}
    for total_key, used_key, rem_key in [
        ("total_balance", "used_balance", "available_balance"),
        ("balance", "used", "available"),
        ("total_credits", "total_usage", None),
    ]:
        if total_key in data:
            total = float(data.get(total_key, 0))
            used = float(data.get(used_key, 0)) if used_key else 0
            remaining = float(data[rem_key]) if rem_key and rem_key in data else total - used
            return {
                "currency": data.get("currency", "CNY"),
                "total": f"{remaining:.2f}",
                "granted": f"{total:.2f}",
                "used": f"{used:.2f}",
            }
    return {"currency": "?", "total": json.dumps(data, ensure_ascii=False)}


_QUERY_MAP = {
    "deepseek": _query_deepseek,
    "openrouter": _query_openrouter,
    "zhipu": _query_zhipu,
    "openai": _query_openai,
    "openai-compat": _query_openai_compat,
}


def _load_providers() -> list[dict]:
    try:
        data = json.loads((_DIR / "providers.json").read_text(encoding="utf-8"))
        return [p for p in data.get("providers", []) if p.get("enabled", True)]
    except Exception:
        return []


@router.get("/status")
def status():
    providers = _load_providers()
    result = {"updated_at": datetime.now(timezone.utc).isoformat()}
    for p in providers:
        fn = _QUERY_MAP.get(p["type"])
        if fn:
            try:
                result[p["id"]] = fn(p)
            except Exception:
                result[p["id"]] = {"error": "查询异常"}
    return result
