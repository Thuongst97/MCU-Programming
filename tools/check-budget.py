#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Page-weight budget (PLAN.md §11, Phase 8): every page, with the local CSS/JS/images it loads,
transfers at most 400 KB, fonts excluded.

"Transfers" means gzip-compressed, the way GitHub Pages serves text files. Our sources are not
minified on purpose (readers open them), so the raw size is printed too, for information.

Usage:
  python3 tools/check-budget.py            # check every page in site/
  python3 tools/check-budget.py --list     # also print every page's sizes
"""
import gzip
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
BUDGET = 400 * 1024
ASSET = re.compile(r'(?:src|href)="(assets/[^"#?]+)')


def gz(data):
    return len(gzip.compress(data, compresslevel=6))


def weigh(page):
    html = page.read_bytes()
    raw, sent = len(html), gz(html)
    for ref in sorted(set(ASSET.findall(html.decode("utf-8")))):
        path = SITE / ref
        if path.is_file() and path.suffix not in (".woff", ".woff2", ".ttf"):
            data = path.read_bytes()
            raw += len(data)
            # raster images are already compressed; servers send them as they are
            sent += len(data) if path.suffix in (".webp", ".png", ".jpg") else gz(data)
    return raw, sent


def main(argv):
    rows = [(page.name, *weigh(page)) for page in sorted(SITE.glob("*.html"))]
    errors = [r for r in rows if r[2] > BUDGET]
    if "--list" in argv:
        for name, raw, sent in sorted(rows, key=lambda r: r[2]):
            print(f"  {name:28} {sent / 1024:6.1f} KB sent  ({raw / 1024:6.1f} KB raw)")
    for name, _, sent in errors:
        print(f"check-budget: {name}: {sent / 1024:.1f} KB transferred, budget {BUDGET // 1024} KB")
    heaviest = max(rows, key=lambda r: r[2])
    print(f"check-budget: {len(rows)} page(s), heaviest {heaviest[0]} "
          f"{heaviest[2] / 1024:.1f} KB transferred ({heaviest[1] / 1024:.1f} KB raw), {len(errors)} error(s)")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
