from __future__ import annotations

import asyncio
from toon_client.client import DeviceClient


async def get_client() -> DeviceClient:
    return DeviceClient()
