#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Install the pinned Arm GCC (xPack build) on Linux x86-64, from tools/versions.json.
Used by CI; also handy on a Linux workstation (setup.html#install shows the per-OS steps).

  python3 tools/install-tools.py --dest ~/.local/mcu-tools gcc
  # then add the printed directories to PATH

Prints the bin directories (one per line) so CI can append them to $GITHUB_PATH.
"""
import argparse
import json
import sys
import tarfile
import tempfile
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
KEYS = {"gcc": "arm-gnu-toolchain"}


def install(tool, dest):
    entry = json.loads((ROOT / "tools/versions.json").read_text(encoding="utf-8"))["tools"][KEYS[tool]]
    target = dest / entry["linux_x64_dir"]
    if not target.is_dir():
        with tempfile.TemporaryDirectory() as tmp:
            archive = Path(tmp) / "pkg.tar.gz"
            print(f"downloading {entry['linux_x64_url']}", file=sys.stderr)
            urllib.request.urlretrieve(entry["linux_x64_url"], archive)
            with tarfile.open(archive) as t:
                t.extractall(dest, filter="tar")
    return target


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("tools", nargs="+", choices=sorted(KEYS))
    ap.add_argument("--dest", default=str(Path.home() / ".local/mcu-tools"))
    a = ap.parse_args()
    dest = Path(a.dest).expanduser()
    dest.mkdir(parents=True, exist_ok=True)
    for t in a.tools:
        print(install(t, dest))


if __name__ == "__main__":
    main()
