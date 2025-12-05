from __future__ import annotations

import aiohttp
from typing import Dict, Tuple

from .toon import parse_tokens
from .config import SERVER_URL, USER_AGENT


async def _headers() -> Dict[str, str]:
    return {
        "Content-Type": "text/plain",
        "Accept": "text/plain",
        "User-Agent": USER_AGENT,
    }


async def post(path: str, toon_payload: str) -> Tuple[int, str, Dict[str, str]]:
    url = f"{SERVER_URL}{path}"
    async with aiohttp.ClientSession() as session:
        async with session.post(url, data=toon_payload.encode(), headers=await _headers()) as resp:
            text = await resp.text()
            return resp.status, text, parse_tokens(text)


async def get(path: str, toon_query: str) -> Tuple[int, str, Dict[str, str]]:
    url = f"{SERVER_URL}{path}?toon={aiohttp.helpers.quote(toon_query, safe='')}"
    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=await _headers()) as resp:
            text = await resp.text()
            return resp.status, text, parse_tokens(text)
