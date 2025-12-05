import os
import socket
from pathlib import Path

HOME = Path.home()
TOON_DIR = HOME / ".toon"
TOON_DIR.mkdir(parents=True, exist_ok=True)

SERVER_URL = os.environ.get("SERVER_URL", "http://localhost:3000").rstrip("/")
DEVICE_ID = os.environ.get("DEVICE_ID", socket.gethostname())
SERVER_PUBLIC_KEY_BASE64 = os.environ.get("SERVER_PUBLIC_KEY_BASE64", "")  # REQUIRED for verifying SIG_SERV

KEYS_PATH = TOON_DIR / "device_keys.json"
DB_PATH = TOON_DIR / "toon_client.db"

MANUFACTURER = os.environ.get("DEVICE_MANUFACTURER", "Raspberry_Pi_Foundation")
MODEL = os.environ.get("DEVICE_MODEL", "Pi_4_Model_B")
FIRMWARE_VERSION = os.environ.get("DEVICE_FW_VERSION", "1.0.0")
OTA_STAGING_DIR = TOON_DIR / "staging"
OTA_STAGING_DIR.mkdir(parents=True, exist_ok=True)

DEFAULT_RTO_SECONDS = int(os.environ.get("DEFAULT_RTO_SECONDS", "60"))
MAX_BACKOFF_SECONDS = int(os.environ.get("MAX_BACKOFF_SECONDS", "600"))

USER_AGENT = f"TOON-Pi-Client/1.0 ({MODEL})"
