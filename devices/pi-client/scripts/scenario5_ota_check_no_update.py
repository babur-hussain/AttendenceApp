import asyncio
from toon_client.client import DeviceClient

async def run():
    c = DeviceClient()
    await c.register()
    resp = await c.firmware_check()
    print("Firmware check:", resp)

if __name__ == "__main__":
    asyncio.run(run())
