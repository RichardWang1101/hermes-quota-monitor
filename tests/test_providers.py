"""Tests for quota-monitor query functions."""
import json
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock

# Add parent dir to path
sys.path.insert(0, str(Path(__file__).parent.parent / "dashboard"))

import plugin_api


def _mock_get(responses):
    """Create a mock _get that returns responses in order."""
    calls = iter(responses)
    def mock_get(url, token, timeout=10):
        return next(calls)
    return mock_get


class TestQueryDeepSeek:
    def test_success_cny(self):
        mock_data = {
            "is_available": True,
            "balance_infos": [{"currency": "CNY", "total_balance": "100.00", "granted_balance": "50.00", "topped_up_balance": "50.00"}]
        }
        with patch.object(plugin_api, "_get", return_value=mock_data):
            result = plugin_api._query_deepseek({"api_key_env": "DEEPSEEK_API_KEY"})
        assert result["currency"] == "CNY"
        assert result["total"] == "100.00"
        assert result["granted"] == "50.00"

    def test_no_key(self):
        with patch.object(plugin_api, "_env", return_value=""):
            result = plugin_api._query_deepseek({"api_key_env": "MISSING"})
        assert "error" in result

    def test_request_failed(self):
        with patch.object(plugin_api, "_get", return_value=None):
            result = plugin_api._query_deepseek({"api_key_env": "DEEPSEEK_API_KEY"})
        assert result["error"] == "请求失败"

    def test_no_data(self):
        with patch.object(plugin_api, "_get", return_value={"is_available": True, "balance_infos": []}):
            result = plugin_api._query_deepseek({"api_key_env": "DEEPSEEK_API_KEY"})
        assert "error" in result


class TestQueryOpenRouter:
    def test_success(self):
        mock_data = {"data": {"total_credits": 100.0, "total_usage": 30.0}}
        with patch.object(plugin_api, "_get", return_value=mock_data):
            result = plugin_api._query_openrouter({"api_key_env": "OPENROUTER_API_KEY"})
        assert result["currency"] == "USD"
        assert result["total"] == "70.00"
        assert result["granted"] == "100.00"
        assert result["used"] == "30.00"

    def test_no_key(self):
        with patch.object(plugin_api, "_env", return_value=""):
            result = plugin_api._query_openrouter({"api_key_env": "MISSING"})
        assert "error" in result


class TestQueryOpenAICompat:
    def test_success_balance(self):
        mock_data = {"total_balance": 200.0, "used_balance": 50.0, "currency": "CNY"}
        with patch.object(plugin_api, "_get", return_value=mock_data), \
             patch.object(plugin_api, "_env", return_value="fake-key"):
            result = plugin_api._query_openai_compat({
                "api_key_env": "TEST_KEY",
                "base_url": "https://api.example.com",
                "balance_path": "/user/balance",
            })
        assert result["currency"] == "CNY"
        assert result["total"] == "150.00"
        assert result["granted"] == "200.00"

    def test_no_base_url(self):
        with patch.object(plugin_api, "_env", return_value="key"):
            result = plugin_api._query_openai_compat({"api_key_env": "TEST_KEY"})
        assert "error" in result

    def test_error_response(self):
        mock_data = {"error": {"message": "Unauthorized"}}
        with patch.object(plugin_api, "_get", return_value=mock_data), \
             patch.object(plugin_api, "_env", return_value="fake-key"):
            result = plugin_api._query_openai_compat({
                "api_key_env": "TEST_KEY",
                "base_url": "https://api.example.com",
            })
        assert result["error"] == "Unauthorized"

    def test_unknown_format_fallback(self):
        mock_data = {"some_field": "some_value"}
        with patch.object(plugin_api, "_get", return_value=mock_data), \
             patch.object(plugin_api, "_env", return_value="fake-key"):
            result = plugin_api._query_openai_compat({
                "api_key_env": "TEST_KEY",
                "base_url": "https://api.example.com",
            })
        assert "currency" in result


class TestParseReset:
    def test_empty(self):
        assert plugin_api._parse_reset("") == 0

    def test_future(self):
        from datetime import datetime, timezone, timedelta
        future = (datetime.now(timezone.utc) + timedelta(hours=5)).isoformat().replace("+00:00", "Z")
        result = plugin_api._parse_reset(future)
        assert result > 0

    def test_past(self):
        from datetime import datetime, timezone, timedelta
        past = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat().replace("+00:00", "Z")
        result = plugin_api._parse_reset(past)
        assert result == 0
