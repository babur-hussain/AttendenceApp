import asyncio
from toon_client.client import DeviceClient

async def run():
    c = DeviceClient()
    await c.register()
    resp = await c.firmware_check()
    if resp.get("S1") == "update_available":
        ok = await c.firmware_apply_flow(resp, force_fail=True)
        print("Forced apply result:", ok)
    else:
        print("No update available; server must advertise a firmware release.")

if __name__ == "__main__":
    asyncio.run(run())
