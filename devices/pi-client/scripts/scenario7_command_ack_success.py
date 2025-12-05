import asyncio
from toon_client.client import DeviceClient

async def run():
    c = DeviceClient()
    await c.register()
    cmds = await c.commands_poll()
    if not cmds:
        print("No commands queued. Issue one on the server to test.")
        return
    for cmd in cmds:
        await c._handle_command(cmd)
        print("Handled command:", cmd.get("CMD1"), cmd.get("CMD2"))

if __name__ == "__main__":
    asyncio.run(run())
