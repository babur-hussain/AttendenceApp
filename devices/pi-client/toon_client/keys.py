from __future__ import annotations

import base64
import json
import os
from pathlib import Path
from typing import Tuple

from nacl import signing, exceptions

from .config import KEYS_PATH


class DeviceKeys:
    def __init__(self, signing_key: signing.SigningKey, verify_key: signing.VerifyKey):
        self.signing_key = signing_key
        self.verify_key = verify_key

    @property
    def private_key_b64(self) -> str:
        return base64.b64encode(bytes(self.signing_key)).decode()

    @property
    def public_key_b64(self) -> str:
        return base64.b64encode(bytes(self.verify_key)).decode()

    def sign(self, data: bytes) -> str:
        sig = self.signing_key.sign(data).signature
        return base64.b64encode(sig).decode()

    @staticmethod
    def verify_with_public_b64(public_key_b64: str, data: bytes, signature_b64: str) -> bool:
        try:
            vk = signing.VerifyKey(base64.b64decode(public_key_b64))
            vk.verify(data, base64.b64decode(signature_b64))
            return True
        except (exceptions.BadSignatureError, ValueError):
            return False


def _write_secure(path: Path, data: dict):
    tmp = path.with_suffix(".tmp")
    with open(tmp, "w") as f:
        json.dump(data, f)
    os.chmod(tmp, 0o600)
    os.replace(tmp, path)


def load_or_create_keys() -> DeviceKeys:
    if KEYS_PATH.exists():
        with open(KEYS_PATH, "r") as f:
            doc = json.load(f)
        sk_bytes = base64.b64decode(doc["private_key_b64"])
        sk = signing.SigningKey(sk_bytes)
        return DeviceKeys(sk, sk.verify_key)

    sk = signing.SigningKey.generate()
    keys = DeviceKeys(sk, sk.verify_key)

    _write_secure(KEYS_PATH, {
        "private_key_b64": keys.private_key_b64,
        "public_key_b64": keys.public_key_b64,
    })
    return keys
