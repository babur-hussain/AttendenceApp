import asyncio
from toon_client.client import DeviceClient
from toon_client.toon import to_canonical_string, build_payload

async def run():
    c = DeviceClient()
    await c.register()
    # Build a heartbeat and send
    tokens = {
        "D1": c.__dict__["_DeviceClient__dict__"] if False else "",  # no-op to keep linter quiet
    }
    # Use public API
    resp = await c.heartbeat_once()
    print("1st heartbeat:", resp)

    # Attempt a replay: reuse the last NONCE by resending same payload
    # We craft a new heartbeat but overwrite NONCE and SIG incorrectly to simulate replay
    # Easiest: Just call heartbeat_once twice but with same NONCE is not accessible.
    # Instead, we simulate by building a signed payload once and resending it.
    from toon_client.keys import load_or_create_keys
    from toon_client.device import uptime_seconds, memory_usage_mb, cpu_temp_c, last_boot_iso, network_status
    keys = load_or_create_keys()

    nonce = "deadbeefdeadbeefdeadbeefdeadbeef"
    hb = {
        "D1": c.__dict__.get("_device_id", None) or "dev_nonce_replay",
        "HB1": "hb_replay",
        "HB2": str(uptime_seconds()),
        "HB3": str(memory_usage_mb()),
        "HB4": f"{cpu_temp_c():.1f}",
        "HB5": last_boot_iso(),
        "HB6": network_status(),
        "FW2": "1.0.0",
        "TS": "2025-12-02T10:30:00.000Z",
        "NONCE": nonce,
    }
    sig = keys.sign(to_canonical_string(hb).encode())
    hb["SIG1"] = sig
    payload = build_payload(hb)

    from toon_client.http import post
    status, text, tok = await post("/api/devices/heartbeat", payload)
    print("Replay attempt 1:", status, tok)
    # Replay same payload again
    status, text, tok = await post("/api/devices/heartbeat", payload)
    print("Replay attempt 2 (should be rejected):", status, tok)

if __name__ == "__main__":
    asyncio.run(run())
