from __future__ import annotations

import re
from typing import Dict, Tuple, List

SIG_PREFIX = ("SIG", "FW_SIG", "SIG_SERV")


def to_canonical_string(tokens: Dict[str, str]) -> str:
    items = []
    for k in sorted(tokens.keys()):
        if k.startswith(SIG_PREFIX):
            continue
        v = tokens[k]
        if v is None:
            continue
        items.append(f"{k}:{v}")
    return "|".join(items)


def build_payload(tokens: Dict[str, str]) -> str:
    return "|".join([f"{k}:{v}" for k, v in tokens.items() if v is not None])


def parse_tokens(payload: str) -> Dict[str, str]:
    out: Dict[str, str] = {}
    if not payload:
        return out
    parts = payload.strip().split("|")
    for p in parts:
        if ":" not in p:
            continue
        k, v = p.split(":", 1)
        out[k] = v
    return out

_array_key_re = re.compile(r"^(?P<prefix>[A-Z0-9]+)\[(?P<idx>\d+)\]\.(?P<key>[A-Z0-9_]+)$")


def parse_array_tokens(tokens: Dict[str, str], prefix: str) -> List[Dict[str, str]]:
    buckets: Dict[int, Dict[str, str]] = {}
    for k, v in tokens.items():
        m = _array_key_re.match(k)
        if not m:
            continue
        if m.group("prefix") != prefix:
            continue
        idx = int(m.group("idx"))
        item = buckets.setdefault(idx, {})
        item[m.group("key")] = v
    return [buckets[i] for i in sorted(buckets.keys())]


def build_array_tokens(items: List[Dict[str, str]], prefix: str) -> Dict[str, str]:
    out: Dict[str, str] = {}
    for i, item in enumerate(items):
        for k, v in item.items():
            out[f"{prefix}[{i}].{k}"] = v
    out[f"{prefix}_COUNT"] = str(len(items))
    return out
