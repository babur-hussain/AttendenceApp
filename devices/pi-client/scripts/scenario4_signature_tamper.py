import asyncio
from toon_client.client import DeviceClient
from toon_client.toon import to_canonical_string, build_payload
from toon_client.keys import load_or_create_keys
from toon_client.http import post
from toon_client.device import uptime_seconds, memory_usage_mb, cpu_temp_c, last_boot_iso, network_status

async def run():
    c = DeviceClient()
    await c.register()

    keys = load_or_create_keys()
    hb = {
        "D1": "dev_sig_tamper",
        "HB1": "hb_tamper",
        "HB2": str(uptime_seconds()),
        "HB3": str(memory_usage_mb()),
        "HB4": f"{cpu_temp_c():.1f}",
        "HB5": last_boot_iso(),
        "HB6": network_status(),
        "FW2": "1.0.0",
        "TS": "2025-12-02T10:40:00.000Z",
        "NONCE": "cafebabecafebabecafebabecafebabe",
    }
    sig = keys.sign(to_canonical_string(hb).encode())
    # Tamper: modify HB2 after signing
    hb["SIG1"] = sig
    hb["HB2"] = "9999"
    payload = build_payload(hb)
    status, text, tok = await post("/api/devices/heartbeat", payload)
    print("Tampered heartbeat:", status, tok)

if __name__ == "__main__":
    asyncio.run(run())
