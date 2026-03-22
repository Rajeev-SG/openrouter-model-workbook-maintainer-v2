from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import requests

from .helpers import ensure_dir, iso_now, read_json, slugify, write_json


class CachedFetcher:
    def __init__(self, cache_dir: Path, refresh: bool = False, timeout: int = 90):
        self.cache_dir = cache_dir
        self.refresh = refresh
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update(
            {"User-Agent": "model-intelligence-maintainer/0.1"}
        )

    def _payload_path(self, family: str, name: str, ext: str) -> Path:
        ensure_dir(self.cache_dir / family)
        return self.cache_dir / family / f"{slugify(name)}.{ext}"

    def get_json(self, url: str, family: str, name: str, headers: dict[str, str] | None = None) -> dict[str, Any]:
        path = self._payload_path(family, name, "json")
        if path.exists() and not self.refresh:
            return read_json(path)
        try:
            response = self.session.get(url, timeout=self.timeout, headers=headers or {})
            response.raise_for_status()
        except requests.RequestException:
            if path.exists():
                return read_json(path)
            raise
        payload = response.json()
        write_json(path, payload)
        return payload

    def get_text(
        self,
        url: str,
        family: str,
        name: str,
        headers: dict[str, str] | None = None,
        suffix: str = "html",
    ) -> str:
        path = self._payload_path(family, name, suffix)
        if path.exists() and not self.refresh:
            return path.read_text(encoding="utf-8")
        try:
            response = self.session.get(url, timeout=self.timeout, headers=headers or {})
            response.raise_for_status()
        except requests.RequestException:
            if path.exists():
                return path.read_text(encoding="utf-8")
            raise
        text = response.text
        path.write_text(text, encoding="utf-8")
        return text

    def download_file(self, url: str, family: str, name: str, suffix: str) -> Path:
        path = self._payload_path(family, name, suffix)
        if path.exists() and not self.refresh:
            return path
        try:
            response = self.session.get(url, timeout=self.timeout)
            response.raise_for_status()
        except requests.RequestException:
            if path.exists():
                return path
            raise
        path.write_bytes(response.content)
        return path

    def write_snapshot_metadata(self, family: str, payload: dict[str, Any]) -> None:
        payload = {"fetched_at": iso_now(), **payload}
        write_json(self._payload_path(family, "manifest", "json"), payload)


def require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"{name} is required for this workflow.")
    return value
