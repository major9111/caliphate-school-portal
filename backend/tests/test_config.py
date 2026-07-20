"""Config — CORS_ORIGINS must accept both JSON array and comma-separated
string formats, since the latter is what most people naturally type into a
.env file or a host's environment variable settings. Regression test for a
real bug: the comma-separated form used to crash the entire app on startup."""
import importlib
import os


def _load_settings_with_env(monkeypatch, value):
    monkeypatch.setenv("CORS_ORIGINS", value)
    from app.core import config
    importlib.reload(config)
    return config.Settings()


def test_cors_origins_accepts_json_array(monkeypatch):
    settings = _load_settings_with_env(monkeypatch, '["https://a.com","https://b.com"]')
    assert settings.CORS_ORIGINS == ["https://a.com", "https://b.com"]


def test_cors_origins_accepts_comma_separated_string(monkeypatch):
    settings = _load_settings_with_env(monkeypatch, "https://a.com,https://b.com")
    assert settings.CORS_ORIGINS == ["https://a.com", "https://b.com"]


def test_cors_origins_accepts_single_origin_no_comma(monkeypatch):
    settings = _load_settings_with_env(monkeypatch, "https://a.com")
    assert settings.CORS_ORIGINS == ["https://a.com"]


def test_cors_origins_default_when_unset(monkeypatch):
    monkeypatch.delenv("CORS_ORIGINS", raising=False)
    from app.core import config
    importlib.reload(config)
    settings = config.Settings()
    assert "http://localhost:5173" in settings.CORS_ORIGINS
