#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Scaffold a module page from its SITE entry (CLAUDE.md "How to add a new module", step 2).

  python3 tools/new-module.py setup

creates site/<file>.html (one section per SITE section, with TODO placeholders),
site/assets/js/pages/<id>.js, adds an empty REFS entry, and flips the page's SITE status
from "planned" to "ready". tools/check-site.py then fails until every TODO is written and the
page has at least three primary references, so a half-written page cannot be merged.
"""
import re
import sys
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
CORE = SITE / "assets/js/core.js"
TPL = ROOT / "tools/templates"
sys.path.insert(0, str(ROOT / "tools"))


def load_check_site():
    import importlib.util
    spec = importlib.util.spec_from_file_location("check_site", ROOT / "tools/check-site.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def entry_text(core, pid):
    m = re.search(rf'\{{ id: "{re.escape(pid)}", status: "(\w+)"', core)
    if not m:
        sys.exit(f"'{pid}' is not in SITE (core.js). Add it to PLAN.md §3 and core.js first.")
    return m


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    pid = sys.argv[1]
    cs = load_check_site()
    core = CORE.read_text(encoding="utf-8")
    m = entry_text(core, pid)
    page = next(p for p in cs.parse_site(core) if p["id"] == pid)
    chunk = core[m.start():core.index("] },", m.start())]
    field = lambda k: re.search(rf'\b{k}: "((?:[^"\\]|\\.)*)"', chunk).group(1)
    titles = dict(re.findall(r'\[\s*"([^"]+)",\s*"((?:[^"\\]|\\.)*)"', chunk))
    html_path = SITE / page["file"]
    js_path = SITE / "assets/js/pages" / f"{pid}.js"
    if html_path.exists() or js_path.exists():
        sys.exit(f"{html_path.relative_to(ROOT)} or {js_path.relative_to(ROOT)} already exists")

    num = page["num"]
    kind = "Module" if num.isdigit() else "Reference"
    prefix = str(int(num)) if num.isdigit() else num
    sec_tpl = (TPL / "section.html").read_text(encoding="utf-8")
    sections = "".join(sec_tpl.replace("{{sid}}", sid).replace("{{stitle}}", escape(titles[sid]))
                       .replace("{{snum}}", f"{prefix}.{i}") for i, sid in enumerate(page["sections"], 1))
    vals = {"id": pid, "num": num, "kind": kind, "group": escape(field("group")), "title": escape(field("title")),
            "short": escape(field("short")), "desc": escape(field("desc")), "sections": sections}
    html = (TPL / "module.html").read_text(encoding="utf-8")
    for k, v in vals.items():
        html = html.replace("{{" + k + "}}", v)
    html_path.write_text(html, encoding="utf-8")
    js_path.write_text((TPL / "page.js").read_text(encoding="utf-8").replace("{{title}}", field("title")), encoding="utf-8")

    core = core[:m.start()] + core[m.start():].replace(f'status: "{m.group(1)}"', 'status: "ready"', 1)
    if not re.search(rf'^\s*"?{re.escape(pid)}"?: \[', core, re.M):
        core = core.replace("  const REFS = {\n", f'  const REFS = {{\n    "{pid}": [],\n', 1)
    CORE.write_text(core, encoding="utf-8")
    print(f"created {html_path.relative_to(ROOT)} and {js_path.relative_to(ROOT)}; {pid} is now 'ready' with an empty REFS entry.")
    print("Next: write every section (no TODO left), add >= 3 primary references, run tools/check-site.py.")


if __name__ == "__main__":
    main()
