import asyncio
from toon_client.client import DeviceClient

async def run():
    c = DeviceClient()
    await c.register()
    # Send an ACK ERROR for a made-up command to demonstrate format
    resp = await c.command_ack("cmd_nonexistent", False, "Invalid configuration file format", 156)
    print("ACK error response:", resp)

if __name__ == "__main__":
    asyncio.run(run())
