import asyncio
from toon_client.client import DeviceClient

async def run():
    c = DeviceClient()
    await c.register()
    resp = await c.heartbeat_once()
    print("Heartbeat response:", resp)

if __name__ == "__main__":
    asyncio.run(run())
