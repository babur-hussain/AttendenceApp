from __future__ import annotations

import asyncio
from .client import DeviceClient


async def main():
    client = DeviceClient()
    await client.run_forever()


if __name__ == "__main__":
    asyncio.run(main())
