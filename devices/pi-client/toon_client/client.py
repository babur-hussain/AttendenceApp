from __future__ import annotations

import asyncio
import base64
import hashlib
import os
import time
from typing import Dict, List

from .config import (
    DEVICE_ID,
    MANUFACTURER,
    MODEL,
    FIRMWARE_VERSION,
    DEFAULT_RTO_SECONDS,
    MAX_BACKOFF_SECONDS,
    SERVER_PUBLIC_KEY_BASE64,
    OTA_STAGING_DIR,
)
from .device import uptime_seconds, memory_usage_mb, cpu_temp_c, last_boot_iso, network_status
from .http import post, get
from .keys import load_or_create_keys, DeviceKeys
from .toon import to_canonical_string, build_payload, parse_array_tokens
from .storage import init_db, audit, add_nonce, nonce_used


class DeviceClient:
    def __init__(self):
        self.keys: DeviceKeys = load_or_create_keys()
        self.rto_sec = DEFAULT_RTO_SECONDS
        self.current_fw = FIRMWARE_VERSION

    async def register(self):
        tokens = {
            "D1": DEVICE_ID,
            "D2": "RPI_TERMINAL",
            "D3": self.keys.public_key_b64,
            "D4": MANUFACTURER,
            "D5": MODEL,
            "TS": self._ts(),
            "NONCE": self._nonce(),
        }
        sig = self.keys.sign(to_canonical_string(tokens).encode())
        tokens["SIG1"] = sig
        payload = build_payload(tokens)
        await audit("register", "out", payload)
        status, text, resp = await post("/api/devices/register", payload)
        await audit("register", "in", text)
        if resp.get("S1") not in {"registered", "ok"}:
            raise RuntimeError(f"Registration failed: {text}")
        if "RTO" in resp:
            self.rto_sec = max(10, int(resp["RTO"]))

    async def heartbeat_once(self) -> Dict[str, str]:
        tokens = {
            "D1": DEVICE_ID,
            "HB1": f"hb_{int(time.time())}",
            "HB2": str(uptime_seconds()),
            "HB3": str(memory_usage_mb()),
            "HB4": f"{cpu_temp_c():.1f}",
            "HB5": last_boot_iso(),
            "HB6": network_status(),
            "FW2": self.current_fw,
            "TS": self._ts(),
            "NONCE": self._nonce(),
        }
        sig = self.keys.sign(to_canonical_string(tokens).encode())
        tokens["SIG1"] = sig
        payload = build_payload(tokens)
        await add_nonce(tokens["NONCE"])  # ensure we never reuse locally
        await audit("heartbeat", "out", payload)
        status, text, resp = await post("/api/devices/heartbeat", payload)
        await audit("heartbeat", "in", text)
        if resp.get("RTO"):
            self.rto_sec = min(MAX_BACKOFF_SECONDS, max(10, int(resp["RTO"])) )
        return resp

    async def commands_poll(self) -> List[Dict[str, str]]:
        tokens = {
            "D1": DEVICE_ID,
            "TS": self._ts(),
            "NONCE": self._nonce(),
        }
        sig = self.keys.sign(to_canonical_string(tokens).encode())
        tokens["SIG1"] = sig
        query = build_payload(tokens)
        await audit("commands_poll", "out", query)
        status, text, resp = await get("/api/devices/commands", query)
        await audit("commands_poll", "in", text)
        cmds = parse_array_tokens(resp, "CMD")
        verified: List[Dict[str, str]] = []
        for c in cmds:
            sig_serv = c.get("SIG_SERV")
            if not sig_serv or not SERVER_PUBLIC_KEY_BASE64:
                continue
            # verify signature over canonical subset for command
            vt = {k: v for k, v in c.items() if k in {"CMD1", "CMD2", "CMD3", "CMD4", "CMD5", "TS"}}
            if self._verify_server_signature(vt, sig_serv):
                verified.append(c)
        return verified

    async def command_ack(self, cmd_id: str, ok: bool, message: str, duration_ms: int = 0):
        tokens = {
            "D1": DEVICE_ID,
            "CMD1": cmd_id,
            "ACK1": "OK" if ok else "ERROR",
            "ACK2": message,
            "ACK3": str(duration_ms),
            "TS": self._ts(),
            "NONCE": self._nonce(),
        }
        sig = self.keys.sign(to_canonical_string(tokens).encode())
        tokens["SIG1"] = sig
        payload = build_payload(tokens)
        await audit("command_ack", "out", payload)
        status, text, resp = await post("/api/devices/command-ack", payload)
        await audit("command_ack", "in", text)
        return resp

    async def firmware_check(self) -> Dict[str, str]:
        tokens = {
            "D1": DEVICE_ID,
            "FW2": self.current_fw,
            "TS": self._ts(),
            "NONCE": self._nonce(),
        }
        sig = self.keys.sign(to_canonical_string(tokens).encode())
        tokens["SIG1"] = sig
        payload = build_payload(tokens)
        await audit("fw_check", "out", payload)
        status, text, resp = await post("/api/devices/firmware/check", payload)
        await audit("fw_check", "in", text)
        return resp

    async def firmware_apply_flow(self, resp: Dict[str, str], force_fail: bool = False) -> bool:
        # Verify manifest signature
        fw_sig = resp.get("FW_SIG")
        vt = {k: resp[k] for k in ["FW1", "FW2", "FW4", "FW5"] if k in resp}
        if not fw_sig or not self._verify_server_signature(vt, fw_sig):
            await audit("fw_manifest", "in", "ERR: invalid FW_SIG")
            return False
        # Download
        url = resp.get("FW3")
        checksum_hex = resp.get("FW4")
        size_str = resp.get("FW5", "0")
        fw_id = resp.get("FW1", "fw")
        path = OTA_STAGING_DIR / f"{fw_id}.bin"
        ok = await self._download_to(url, path)
        if not ok:
            await audit("fw_download", "in", "ERR: download failed")
            return False
        # Verify checksum
        if checksum_hex:
            h = hashlib.sha256()
            with open(path, "rb") as f:
                for chunk in iter(lambda: f.read(65536), b""):
                    h.update(chunk)
            if h.hexdigest() != checksum_hex:
                await audit("fw_checksum", "in", "ERR: checksum mismatch")
                return False
        # Apply (stub for Pi: swap current symlink)
        if force_fail:
            applied = False
        else:
            applied = await self._apply_staged(path)
        # Ack
        ack_tokens = {
            "D1": DEVICE_ID,
            "FW1": fw_id,
            "FW2": resp.get("FW2", ""),
            "ACK1": "OK" if applied else "ERROR",
            "ACK2": "Firmware applied successfully" if applied else "Apply failed, rolled back",
            "TS": self._ts(),
            "NONCE": self._nonce(),
        }
        sig = self.keys.sign(to_canonical_string(ack_tokens).encode())
        ack_tokens["SIG1"] = sig
        ack_payload = build_payload(ack_tokens)
        await audit("fw_ack", "out", ack_payload)
        _, ack_text, _ = await post("/api/devices/firmware/ack", ack_payload)
        await audit("fw_ack", "in", ack_text)
        if applied:
            self.current_fw = resp.get("FW2", self.current_fw)
        return applied

    async def run_forever(self):
        await init_db()
        await self.register()
        backoff = self.rto_sec
        while True:
            try:
                resp = await self.heartbeat_once()
                # Commands
                cmds = []
                pending = resp.get("PENDING_CMDS")
                if pending and int(pending) > 0:
                    cmds = await self.commands_poll()
                for c in cmds:
                    await self._handle_command(c)
                # Firmware
                if resp.get("FW_AVAILABLE") == "true" or resp.get("FW2"):
                    fw_resp = await self.firmware_check()
                    if fw_resp.get("S1") == "update_available":
                        await self.firmware_apply_flow(fw_resp)
                backoff = self.rto_sec
            except Exception as e:
                await audit("error", "in", f"{type(e).__name__}:{e}")
                backoff = min(MAX_BACKOFF_SECONDS, max(10, int(backoff * 2)))
            await asyncio.sleep(backoff)

    async def _handle_command(self, cmd: Dict[str, str]):
        cmd_id = cmd.get("CMD1", "")
        ctype = cmd.get("CMD2", "")
        start = time.time()
        ok = True
        message = ""
        try:
            if ctype == "RESTART":
                message = "Restart simulated"
                # Optionally: os.system('sudo reboot')
            elif ctype == "FETCH_LOGS":
                # Simulate fetch logs and upload separately if needed
                message = cmd.get("CMD3", "") or "logs captured"
            else:
                message = f"unsupported command {ctype}"
                ok = False
        except Exception as e:
            ok = False
            message = f"error: {e}"
        finally:
            dur_ms = int((time.time() - start) * 1000)
            await self.command_ack(cmd_id, ok, message, dur_ms)

    def _verify_server_signature(self, tokens_subset: Dict[str, str], signature_b64: str) -> bool:
        if not SERVER_PUBLIC_KEY_BASE64:
            return False
        data = to_canonical_string(tokens_subset).encode()
        return DeviceKeys.verify_with_public_b64(SERVER_PUBLIC_KEY_BASE64, data, signature_b64)

    async def _download_to(self, url: str | None, path) -> bool:
        if not url:
            return False
        import aiohttp
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as resp:
                    if resp.status != 200:
                        return False
                    with open(path, "wb") as f:
                        while True:
                            chunk = await resp.content.read(65536)
                            if not chunk:
                                break
                            f.write(chunk)
            return True
        except Exception:
            return False

    async def _apply_staged(self, path) -> bool:
        # Stub: stage -> active swap (simulate success)
        try:
            # Ensure file exists
            return os.path.exists(path)
        except Exception:
            return False

    def _ts(self) -> str:
        return time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())

    def _nonce(self) -> str:
        import secrets
        n = secrets.token_hex(16)
        return n
