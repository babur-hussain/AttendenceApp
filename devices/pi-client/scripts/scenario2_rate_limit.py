import asyncio
from toon_client.client import DeviceClient

async def run():
    c = DeviceClient()
    await c.register()
    # Send many heartbeats quickly to trigger rate limit
    for i in range(105):
        resp = await c.heartbeat_once()
        print(i+1, resp)
        await asyncio.sleep(0.2)

if __name__ == "__main__":
    asyncio.run(run())
