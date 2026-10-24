#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Static consistency checks for the site and repository conventions. Run by CI on every change.

Checks (each failure names the rule it enforces):
  site-map     SITE in core.js: unique ids; "ready" pages exist, "planned" pages do not.
  sections     every ready page's section.doc-section ids match its SITE sections, in order,
               and each section has a .sec-num.
  refs         every ready page has REFS with >= 3 primary (non-community) sources, all keys defined.
  links        every local href/src in site/*.html resolves (file exists; #anchor exists in the
               target, or is a glossary #g-<term> anchor for an existing term); nothing links to a
               planned page.
  cache-bust   every local stylesheet/script URL carries ?v=__BUILD__.
  placeholders no TODO / FIXME / lorem in site HTML/JS.
  tokens       the two light-theme token blocks in main.css are identical (PLAN.md §2.2).
  callouts     every .callout.prod has data-doc (CLAUDE.md rule 13a).
  images       files under site/assets/img are <= 150 KB.
  spdx         our code files carry an SPDX-License-Identifier (CLAUDE.md rule 10b).
  actions      every `uses:` in .github/workflows is pinned to a 40-hex commit SHA with a version comment.
  autosar-ids  every SWS_/SRS_ requirement ID in site/ or autosar/ is listed in tools/autosar-ids.txt.
"""
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
errors = []


def err(rule, msg):
    errors.append(f"[{rule}] {msg}")


# ------------------------------------------------------------------ parse core.js
def js_block(text, start_pat):
    """Return the bracketed literal that starts at the first match of start_pat (balanced brackets)."""
    m = re.search(start_pat, text)
    if not m:
        return None
    i = m.end() - 1
    open_c = text[i]
    close_c = {"[": "]", "{": "}"}[open_c]
    depth, j, in_str = 0, i, None
    while j < len(text):
        c = text[j]
        if in_str:
            if c == "\\":
                j += 1
            elif c == in_str:
                in_str = None
        elif c in "\"'`":
            in_str = c
        elif c == open_c:
            depth += 1
        elif c == close_c:
            depth -= 1
            if depth == 0:
                return text[i:j + 1]
        j += 1
    return None


def parse_site(core):
    block = js_block(core, r"const SITE = \[")
    pages = []
    for chunk in re.split(r"\n\s*\{ id: ", block)[1:]:
        chunk = "{ id: " + chunk
        get = lambda k: (re.search(rf'\b{k}: "([^"]*)"', chunk) or [None, None])[1]
        phase = re.search(r"\bphase: (\d+)", chunk)
        sec_block = js_block(chunk, r"sections: \[") or "[]"
        sections = re.findall(r'\[\s*"([^"]+)",\s*"((?:[^"\\]|\\.)*)"', sec_block)
        pages.append({"id": get("id"), "status": get("status"), "phase": int(phase.group(1)) if phase else None,
                      "file": get("file"), "num": get("num"), "sections": [s[0] for s in sections]})
    return pages


def parse_refs(core):
    rblock = js_block(core, r"const R = \{") or "{}"
    keys = dict(re.findall(r"^\s*(\w+): \{[^\n]*?kind: \"(\w+)\"", rblock, re.M))
    for k in re.findall(r"^\s*(\w+): \{", rblock, re.M):
        keys.setdefault(k, "")
    refs_block = js_block(core, r"const REFS = \{") or "{}"
    refs = {k: re.findall(r'"(\w+)"', v) for k, v in re.findall(r'^\s*"?([\w-]+)"?: \[([^\]]*)\]', refs_block, re.M)}
    return keys, refs


# ------------------------------------------------------------------ HTML scan
class Scan(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids, self.links, self.sections, self.body_page = set(), [], [], None
        self._sec, self.prod_callouts, self.assets = None, [], []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if "id" in a:
            self.ids.add(a["id"])
        cls = (a.get("class") or "").split()
        if tag == "body":
            self.body_page = a.get("data-page")
        if tag == "section" and "doc-section" in cls and a.get("id"):
            self._sec = {"id": a["id"], "num": False}
            self.sections.append(self._sec)
        if "sec-num" in cls and self._sec is not None:
            self._sec["num"] = True
        if tag == "div" and "callout" in cls and "prod" in cls:
            self.prod_callouts.append(a.get("data-doc"))
        for attr in ("href", "src"):
            if a.get(attr):
                self.links.append((tag, a[attr], a.get("rel")))
        if (tag == "link" and a.get("rel") == "stylesheet") or tag == "script" and a.get("src"):
            self.assets.append(a.get("href") or a.get("src"))


def scan(path):
    s = Scan()
    s.feed(path.read_text(encoding="utf-8"))
    return s


def glossary_slugs():
    text = (SITE / "assets/js/glossary-data.js").read_text(encoding="utf-8")
    terms = re.findall(r'\{ term: "((?:[^"\\]|\\.)*)"', text)

    def slug(t):
        import unicodedata
        t = unicodedata.normalize("NFD", t.lower())
        t = "".join(c for c in t if not unicodedata.combining(c))
        return re.sub(r"^-|-$", "", re.sub(r"[^a-z0-9]+", "-", t))
    return {"g-" + slug(t) for t in terms}


# ------------------------------------------------------------------ checks
def main():
    core = (SITE / "assets/js/core.js").read_text(encoding="utf-8")
    pages = parse_site(core)
    by_file = {p["file"]: p for p in pages}
    ids = [p["id"] for p in pages]
    for i in sorted({i for i in ids if ids.count(i) > 1}):
        err("site-map", f"duplicate SITE id '{i}'")
    if not pages:
        err("site-map", "could not parse SITE from core.js")
    ref_keys, refs = parse_refs(core)

    scans = {p.name: scan(p) for p in sorted(SITE.glob("*.html"))}
    for p in pages:
        f = SITE / (p["file"] or "")
        if p["status"] == "ready":
            if not f.is_file():
                err("site-map", f"'{p['id']}' is ready but {p['file']} does not exist")
                continue
            s = scans[p["file"]]
            if s.body_page != p["id"]:
                err("site-map", f"{p['file']}: <body data-page> is '{s.body_page}', expected '{p['id']}'")
            got = [x["id"] for x in s.sections if x["id"] != "references"]
            if got != p["sections"]:
                err("sections", f"{p['file']}: section ids {got} do not match SITE {p['sections']}")
            for x in s.sections:
                if not x["num"]:
                    err("sections", f"{p['file']}#{x['id']}: missing .sec-num")
            keys = refs.get(p["id"])
            if keys is None:
                err("refs", f"'{p['id']}' has no REFS entry")
            else:
                for k in keys:
                    if k not in ref_keys:
                        err("refs", f"REFS['{p['id']}'] uses undefined key '{k}'")
                primary = [k for k in keys if ref_keys.get(k) not in ("community", None)]
                if len(primary) < 3:
                    err("refs", f"'{p['id']}' needs >= 3 primary sources, has {len(primary)}")
        elif p["status"] == "planned":
            if f.is_file():
                err("site-map", f"'{p['id']}' is planned but {p['file']} exists — set status to \"ready\"")
        else:
            err("site-map", f"'{p['id']}' has unknown status '{p['status']}'")

    planned_files = {p["file"] for p in pages if p["status"] == "planned"}
    gslugs = glossary_slugs()
    for name, s in scans.items():
        for tag, url, _rel in s.links:
            u = urlsplit(url)
            if u.scheme or url.startswith("//") or url.startswith("mailto:"):
                continue
            target = unquote(u.path) or name
            if target in planned_files:
                err("links", f"{name}: links to planned page {target}")
                continue
            tpath = (SITE / target)
            if not tpath.exists():
                err("links", f"{name}: broken link {url}")
                continue
            if u.fragment and target.endswith(".html"):
                frag = unquote(u.fragment)
                tscan = scans.get(target)
                known = (tscan.ids if tscan else set()) | {x for p in pages if p["file"] == target for x in p["sections"]}
                if frag not in known and not (target == "glossary.html" and frag in gslugs) and frag != "references":
                    err("links", f"{name}: anchor #{frag} not found in {target}")
        for a in s.assets:
            if a and not urlsplit(a).scheme and not a.startswith("//") and "?v=__BUILD__" not in a:
                err("cache-bust", f"{name}: {a} must end with ?v=__BUILD__")
        for doc in s.prod_callouts:
            if not doc:
                err("callouts", f"{name}: .callout.prod without data-doc")

    for path in list(SITE.glob("*.html")) + list((SITE / "assets/js").rglob("*.js")):
        for n, line in enumerate(path.read_text(encoding="utf-8").split("\n"), 1):
            if re.search(r"\b(TODO|FIXME|lorem ipsum)\b", line, re.I):
                err("placeholders", f"{path.relative_to(ROOT)}:{n}: {line.strip()[:80]}")

    css = (SITE / "assets/css/main.css").read_text(encoding="utf-8")
    light = js_block(css, r':root\[data-theme="light"\] \{')
    media = re.search(r'@media \(prefers-color-scheme: light\) \{\s*:root:not\(\[data-theme="dark"\]\) \{', css)
    media_block = js_block(css[media.start():], r':root:not\(\[data-theme="dark"\]\) \{') if media else None
    norm = lambda b: re.sub(r"\s+", " ", b or "").strip()
    if not light or not media_block:
        err("tokens", "main.css: light token blocks not found")
    elif norm(light) != norm(media_block):
        err("tokens", "main.css: :root[data-theme=light] and the prefers-color-scheme light block differ")

    img = SITE / "assets/img"
    for f in img.rglob("*") if img.is_dir() else []:
        if f.is_file() and f.stat().st_size > 150 * 1024:
            err("images", f"{f.relative_to(ROOT)} is {f.stat().st_size // 1024} KB (max 150 KB)")

    code_globs = ["site/assets/js/**/*.js", "site/assets/css/*.css", "tools/*.py", "tests/**/*.py", "tests/**/*.mjs",
                  "examples/**/*.c", "examples/**/*.h", "examples/**/*.ld", "examples/**/CMakeLists.txt",
                  "autosar/**/*.c", "autosar/**/*.h", "capstone/**/*.c", "capstone/**/*.h"]
    for g in code_globs:
        for f in ROOT.glob(g):
            if "node_modules" in f.parts or "/hal/" in f.as_posix():
                continue
            if "SPDX-License-Identifier" not in f.read_text(encoding="utf-8", errors="replace")[:600]:
                err("spdx", f"{f.relative_to(ROOT)}: missing SPDX-License-Identifier header")

    for wf in (ROOT / ".github/workflows").glob("*.yml"):
        for n, line in enumerate(wf.read_text(encoding="utf-8").split("\n"), 1):
            m = re.match(r"\s*-?\s*uses:\s*(\S+)(.*)$", line)
            if m and not m.group(1).startswith("./"):
                ref = m.group(1).split("@")[-1] if "@" in m.group(1) else ""
                if not re.fullmatch(r"[0-9a-f]{40}", ref) or not re.search(r"#\s*v\d", m.group(2)):
                    err("actions", f"{wf.relative_to(ROOT)}:{n}: pin to a full commit SHA with '# vX.Y.Z' comment: {m.group(1)}")

    ids_file = ROOT / "tools/autosar-ids.txt"
    known_ids = set()
    if ids_file.is_file():
        for line in ids_file.read_text(encoding="utf-8").split("\n"):
            if line.strip() and not line.startswith("#"):
                known_ids.add(line.split()[0])
    for base in (SITE, ROOT / "autosar", ROOT / "capstone"):
        for f in base.rglob("*") if base.is_dir() else []:
            if f.is_file() and f.suffix in (".html", ".js", ".c", ".h", ".md"):
                for rid in set(re.findall(r"\b(?:SWS|SRS)_[A-Za-z]+_\d{5}\b", f.read_text(encoding="utf-8", errors="replace"))):
                    if rid not in known_ids:
                        err("autosar-ids", f"{f.relative_to(ROOT)}: {rid} is not listed in tools/autosar-ids.txt")

    for e in errors:
        print("ERROR", e)
    ready = sum(p["status"] == "ready" for p in pages)
    print(f"check-site: {len(pages)} SITE pages ({ready} ready), {len(scans)} HTML file(s), {len(errors)} error(s)")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
