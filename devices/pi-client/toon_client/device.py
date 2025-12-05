from __future__ import annotations

import datetime as dt
import os
import time
from typing import Tuple

import psutil


def uptime_seconds() -> int:
    try:
        boot_time = psutil.boot_time()
        return int(time.time() - boot_time)
    except Exception:
        return int(os.popen("cut -d. -f1 /proc/uptime").read().strip() or 0)


def memory_usage_mb() -> int:
    try:
        return int(psutil.virtual_memory().used / (1024 * 1024))
    except Exception:
        return 0


def cpu_temp_c() -> float:
    # On many Pis, available via /sys/class/thermal/thermal_zone0/temp
    try:
        path = "/sys/class/thermal/thermal_zone0/temp"
        if os.path.exists(path):
            with open(path, "r") as f:
                return round(int(f.read().strip()) / 1000.0, 1)
    except Exception:
        pass
    return 0.0


def last_boot_iso() -> str:
    try:
        bt = dt.datetime.utcfromtimestamp(psutil.boot_time())
        return bt.replace(microsecond=0).isoformat() + "Z"
    except Exception:
        return dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def network_status() -> str:
    # Simplified: ONLINE if any interface up
    try:
        stats = psutil.net_if_stats()
        for _, st in stats.items():
            if st.isup:
                return "ONLINE"
        return "OFFLINE"
    except Exception:
        return "ONLINE"
