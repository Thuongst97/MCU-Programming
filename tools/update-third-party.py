#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Vendor (or verify) third-party code into third_party/<component>/.

Every component is described in tools/versions.json under "third_party":
repo, tag, commit, licence file, and the subset of files to copy. This script is the
only way third_party/ changes (CLAUDE.md rule 10).

Usage:
  python3 tools/update-third-party.py --all                 # re-vendor every component at its pinned tag
  python3 tools/update-third-party.py unity v2.7.0          # move one component to a new tag
  python3 tools/update-third-party.py --check               # CI: verify LICENSE/README/files match versions.json
"""
import argparse
import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VERSIONS = ROOT / "tools" / "versions.json"
THIRD = ROOT / "third_party"


def load():
    return json.loads(VERSIONS.read_text(encoding="utf-8"))


def save(data):
    VERSIONS.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def readme(key, c, digests):
    rows = "\n".join(f"| `{c['dest']}/{f}` | `{digests[f][:16]}…` |" for f in c["files"])
    return f"""# {c['name']} (`third_party/{key}`)

Vendored copy. **Do not edit these files**; update them only with
`python3 tools/update-third-party.py {key} <tag>` (see CLAUDE.md rule 10).

| | |
|---|---|
| Upstream | {c['repo']} |
| Tag | `{c['tag']}` |
| Commit | `{c['commit']}` |
| Licence | {c['licence']} (upstream file kept unchanged as `{c['licence_file']}`) |
| Copied from | `{c['base']}/` (subset below) |

## Files

| File | SHA-256 |
|---|---|
{rows}
"""


def vendor(key, c, tag=None):
    tag = tag or c["tag"]
    with tempfile.TemporaryDirectory() as tmp:
        src = Path(tmp) / "src"
        subprocess.run(["git", "-c", "advice.detachedHead=false", "clone", "-q", "--depth", "1",
                        "--branch", tag, c["repo"], str(src)], check=True)
        commit = subprocess.run(["git", "-C", str(src), "rev-parse", "HEAD"], check=True,
                                capture_output=True, text=True).stdout.strip()
        out = THIRD / key
        if out.exists():
            shutil.rmtree(out)
        (out / c["dest"]).mkdir(parents=True)
        digests = {}
        for f in c["files"]:
            s = src / c["base"] / f
            if not s.is_file():
                sys.exit(f"{key}: {c['base']}/{f} not found at {tag}")
            d = out / c["dest"] / f
            d.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(s, d)
            digests[f] = sha256(d)
        shutil.copyfile(src / c["licence_file"], out / c["licence_file"])
    c["tag"], c["commit"], c["sha256"] = tag, commit, digests
    (THIRD / key / "README.md").write_text(readme(key, c, digests), encoding="utf-8")
    print(f"vendored {key} {tag} ({commit[:12]}), {len(digests)} files")


def check(data):
    errors = []
    comps = data["third_party"]
    for key, c in comps.items():
        d = THIRD / key
        if not (d / c["licence_file"]).is_file():
            errors.append(f"{key}: missing {c['licence_file']}")
        rd = d / "README.md"
        if not rd.is_file():
            errors.append(f"{key}: missing README.md")
        else:
            text = rd.read_text(encoding="utf-8")
            for needle in (c["repo"], c["tag"], c["commit"]):
                if needle not in text:
                    errors.append(f"{key}: README.md does not mention {needle}")
        for f in c["files"]:
            p = d / c["dest"] / f
            if not p.is_file():
                errors.append(f"{key}: missing {c['dest']}/{f}")
            elif c.get("sha256", {}).get(f) != sha256(p):
                errors.append(f"{key}: {c['dest']}/{f} differs from the vendored copy (edited in place?)")
    if THIRD.is_dir():
        for d in sorted(p for p in THIRD.iterdir() if p.is_dir()):
            if d.name not in comps:
                errors.append(f"third_party/{d.name} is not listed in tools/versions.json")
    for e in errors:
        print("ERROR", e)
    print(f"third_party check: {len(comps)} component(s), {len(errors)} error(s)")
    return 1 if errors else 0


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("component", nargs="?")
    ap.add_argument("tag", nargs="?")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--check", action="store_true")
    a = ap.parse_args()
    data = load()
    if a.check:
        sys.exit(check(data))
    comps = data["third_party"]
    if a.all:
        keys = list(comps)
    elif a.component in comps:
        keys = [a.component]
    else:
        ap.error(f"component must be one of: {', '.join(comps)} (or use --all / --check)")
    for k in keys:
        vendor(k, comps[k], a.tag if not a.all else None)
    save(data)


if __name__ == "__main__":
    main()
