#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Inline real source files from the repository into site pages (CLAUDE.md rule 14).

A page declares what it wants:

  <script type="text/plain" data-code data-src="examples/00-nucleo-blink-uart/bare/src/main.c"
          data-region="clock" data-lang="c" data-file="main.c"></script>

and this tool fills the tag with the file's content and adds data-start / data-end (line numbers
in the source file, used for the "View source" link) and data-sha (first 12 hex digits of the
file's SHA-256, so stale embeds are easy to spot in a diff).

Selecting part of a file:
  data-region="name"   lines between "[region:name]" and "[endregion]" marker comments (preferred:
                       survives edits). Regions must not nest.
  data-lines="12-58"   an explicit 1-based inclusive line range.
  (neither)            the whole file.

Region marker lines are never shown; when a whole-file or line-range selection contains some, their
source line numbers go into data-skip so the page still shows true line numbers. The extracted text
is dedented. «n» annotation markers stay in place; the runtime strips them.

Usage:
  python3 tools/embed-code.py            # rewrite pages in place
  python3 tools/embed-code.py --check    # CI: exit 1 if any page is out of date or a source is missing
"""
import argparse
import hashlib
import html
import re
import sys
import textwrap
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"

TAG_RE = re.compile(r'(<script\b(?=[^>]*\btype="text/plain")(?=[^>]*\bdata-src=")[^>]*>)(.*?)(</script>)', re.S)
ATTR_RE = re.compile(r'\s(data-[\w-]+)(?:="([^"]*)")?')
REGION_START = re.compile(r"\[region:([\w-]+)\]")
REGION_END = re.compile(r"\[endregion\]")


class EmbedError(Exception):
    pass


def attrs_of(tag):
    return {k: html.unescape(v or "") for k, v in ATTR_RE.findall(tag)}


def set_attr(tag, name, value):
    """Set or replace data-* attribute `name` on an opening tag string."""
    if re.search(rf'\s{name}="[^"]*"', tag):
        return re.sub(rf'\s{name}="[^"]*"', f' {name}="{value}"', tag)
    return tag[:-1] + f' {name}="{value}">'


def extract(src_path, region=None, lines=None):
    """Return (text, first_line, last_line) for the requested part of the file (1-based lines)."""
    if not src_path.is_file():
        raise EmbedError(f"source not found: {src_path.relative_to(ROOT)}")
    all_lines = src_path.read_text(encoding="utf-8").split("\n")
    if all_lines and all_lines[-1] == "":
        all_lines.pop()
    if region:
        start = end = None
        for i, line in enumerate(all_lines):
            m = REGION_START.search(line)
            if m and m.group(1) == region:
                if start is not None:
                    raise EmbedError(f"region '{region}' defined twice in {src_path.relative_to(ROOT)}")
                start = i + 1
            elif start is not None and end is None:
                if REGION_START.search(line):
                    raise EmbedError(f"region '{region}' in {src_path.relative_to(ROOT)} contains a nested region (not allowed)")
                if REGION_END.search(line):
                    end = i
        if start is None:
            raise EmbedError(f"region '{region}' not found in {src_path.relative_to(ROOT)}")
        if end is None:
            raise EmbedError(f"region '{region}' in {src_path.relative_to(ROOT)} has no [endregion]")
        first, last = start + 1, end            # 1-based, inclusive
    elif lines:
        m = re.fullmatch(r"(\d+)-(\d+)", lines)
        if not m:
            raise EmbedError(f"bad data-lines '{lines}' (expected e.g. 12-58)")
        first, last = int(m.group(1)), int(m.group(2))
        if not 1 <= first <= last <= len(all_lines):
            raise EmbedError(f"data-lines {lines} outside 1-{len(all_lines)} in {src_path.relative_to(ROOT)}")
    else:
        first, last = 1, len(all_lines)
    body, skip = [], []
    for n in range(first, last + 1):
        line = all_lines[n - 1]
        if REGION_START.search(line) or REGION_END.search(line):
            skip.append(n)      # marker lines are not shown; the runtime keeps true line numbers
        else:
            body.append(line)
    if not body:
        raise EmbedError(f"empty selection in {src_path.relative_to(ROOT)}")
    text = textwrap.dedent("\n".join(body))
    if re.search(r"</script", text, re.I):
        raise EmbedError(f"{src_path.relative_to(ROOT)} contains '</script' and cannot be embedded")
    return text, first, last, skip


def process(page_text, page_name="page"):
    """Return (new_text, embed_count). Raises EmbedError on any problem."""
    count = 0

    def repl(m):
        nonlocal count
        open_tag, _old, close = m.groups()
        a = attrs_of(open_tag)
        src = a["data-src"]
        if src.startswith("/") or ".." in Path(src).parts:
            raise EmbedError(f"{page_name}: data-src must be a repository-relative path: {src}")
        path = ROOT / src
        text, first, last, skip = extract(path, a.get("data-region"), a.get("data-lines"))
        tag = set_attr(open_tag, "data-start", str(first))
        tag = set_attr(tag, "data-end", str(last))
        tag = set_attr(tag, "data-sha", hashlib.sha256(path.read_bytes()).hexdigest()[:12])
        if skip:
            tag = set_attr(tag, "data-skip", ",".join(map(str, skip)))
        elif "data-skip=" in tag:
            tag = re.sub(r'\sdata-skip="[^"]*"', "", tag)
        count += 1
        return f"{tag}\n{text}\n{close}"

    return TAG_RE.sub(repl, page_text), count


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--check", action="store_true", help="do not write; fail if any page would change")
    ap.add_argument("pages", nargs="*", help="pages to process (default: site/*.html)")
    a = ap.parse_args()
    pages = [Path(p) for p in a.pages] or sorted(SITE.glob("*.html"))
    stale, errors, total = [], [], 0
    for page in pages:
        old = page.read_text(encoding="utf-8")
        try:
            new, n = process(old, page.name)
        except EmbedError as e:
            errors.append(f"{page.name}: {e}")
            continue
        total += n
        if new != old:
            if a.check:
                stale.append(page.name)
            else:
                page.write_text(new, encoding="utf-8")
                print(f"updated {page.name} ({n} block(s))")
    for e in errors:
        print("ERROR", e)
    for s in stale:
        print(f"ERROR {s}: embedded code is out of date — run python3 tools/embed-code.py")
    print(f"embed-code: {len(pages)} page(s), {total} embedded block(s), {len(errors) + len(stale)} error(s)")
    sys.exit(1 if errors or stale else 0)


if __name__ == "__main__":
    main()
