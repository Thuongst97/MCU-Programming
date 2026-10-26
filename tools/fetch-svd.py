#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Download the STM32G474 SVD for Cortex-Debug's peripheral view into .cache/svd/ (not committed).

The SVD is not stored in this repository because its licence is unclear (PLAN.md §2.4). This tool
downloads it from the pinned source in tools/versions.json and checks its SHA-256.

  python3 tools/fetch-svd.py          # then point Cortex-Debug's "svdFile" at .cache/svd/STM32G474.svd
"""
import hashlib
import json
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main():
    cfg = json.loads((ROOT / "tools/versions.json").read_text(encoding="utf-8"))["svd"]
    dest = ROOT / cfg["dest"]
    if dest.is_file() and hashlib.sha256(dest.read_bytes()).hexdigest() == cfg["sha256"]:
        print(f"{dest.relative_to(ROOT)} already present and verified")
        return
    dest.parent.mkdir(parents=True, exist_ok=True)
    for src in cfg["sources"]:
        try:
            print(f"downloading {src['name']} ...")
            data = urllib.request.urlopen(src["url"], timeout=60).read()
        except OSError as e:
            print(f"  failed: {e}")
            continue
        digest = hashlib.sha256(data).hexdigest()
        if digest != cfg["sha256"]:
            print(f"  checksum mismatch ({digest}); not using this copy")
            continue
        dest.write_bytes(data)
        print(f"saved {dest.relative_to(ROOT)} ({len(data) // 1024} KB, SHA-256 verified)")
        return
    sys.exit("could not download a verified STM32G474.svd; see setup.html#debug for a manual download")


if __name__ == "__main__":
    main()
