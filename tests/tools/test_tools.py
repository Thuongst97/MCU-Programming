# SPDX-License-Identifier: MIT
"""Unit tests for the authoring and check tools. Run: python3 -m unittest discover -s tests/tools -v"""
import importlib.util
import shutil
import re
import subprocess
import sys
import tempfile
import textwrap
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def load(name):
    spec = importlib.util.spec_from_file_location(name.replace("-", "_"), ROOT / "tools" / f"{name}.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def copy_repo(tmp):
    """Copy the parts of the repo the site tools need into tmp and return its path."""
    dst = Path(tmp) / "repo"
    for part in ("site", "tools", "third_party"):
        shutil.copytree(ROOT / part, dst / part)
    return dst


class EmbedCodeTest(unittest.TestCase):
    def setUp(self):
        self.mod = load("embed-code")
        self.tmp = tempfile.TemporaryDirectory()
        self.mod.ROOT = Path(self.tmp.name)
        src = Path(self.tmp.name) / "examples/demo/main.c"
        src.parent.mkdir(parents=True)
        src.write_text(textwrap.dedent("""\
            #include "stm32f103xb.h"
            int main(void)
            {
                // [region:clock]
                RCC->CR |= RCC_CR_HSEON;  // «1»
                while (!(RCC->CR & RCC_CR_HSERDY)) { }
                // [endregion]
                return 0;
            }
            """), encoding="utf-8")

    def tearDown(self):
        self.tmp.cleanup()

    def page(self, attrs):
        return f'<p>x</p>\n<script type="text/plain" data-code data-src="examples/demo/main.c" {attrs} data-lang="c"></script>\n'

    def test_region_is_extracted_dedented_with_line_numbers(self):
        out, n = self.mod.process(self.page('data-region="clock"'))
        self.assertEqual(n, 1)
        self.assertIn('data-start="5"', out)
        self.assertIn('data-end="6"', out)
        self.assertIn("\nRCC->CR |= RCC_CR_HSEON;  // «1»\nwhile", out)
        self.assertNotIn("[region", out)

    def test_idempotent(self):
        once, _ = self.mod.process(self.page('data-region="clock"'))
        twice, _ = self.mod.process(once)
        self.assertEqual(once, twice)

    def test_line_range_and_whole_file(self):
        out, _ = self.mod.process(self.page('data-lines="1-2"'))
        self.assertIn('#include "stm32f103xb.h"\nint main(void)\n</script>', out)
        out, _ = self.mod.process(self.page(""))
        self.assertIn('data-end="9"', out)

    def test_errors(self):
        for attrs, msg in (('data-region="nope"', "not found"), ('data-lines="5-99"', "outside")):
            with self.assertRaisesRegex(self.mod.EmbedError, msg):
                self.mod.process(self.page(attrs))
        with self.assertRaisesRegex(self.mod.EmbedError, "repository-relative"):
            self.mod.process('<script type="text/plain" data-src="../etc/passwd"></script>')

    def test_marker_lines_are_skipped_with_true_numbers(self):
        out, _ = self.mod.process(self.page(""))
        self.assertIn('data-skip="4,7"', out)
        self.assertNotIn("[region", out)
        self.assertNotIn("[endregion", out)


class CheckRegsTest(unittest.TestCase):
    def setUp(self):
        mod = load("check-regs")
        self.mod = mod
        self.h = mod.Header(mod.HEADER.read_text(encoding="utf-8"))

    def test_selftest_passes(self):
        errors, n = self.mod.selftest(self.h)
        self.assertEqual(errors, [])
        self.assertGreaterEqual(n, 10)

    def test_detects_wrong_data(self):
        good = {"RCC_CFGR": {"periph": "RCC", "reg": "CFGR", "addr": 0x40021004, "fields": [{"name": "PLLMUL", "cmsis": "PLLMULL", "bits": [21, 18]}]}}
        self.assertEqual(self.mod.check_data(self.h, good), [])
        bad = {"RCC_CFGR": {"periph": "RCC", "reg": "CFGR", "addr": 0x40021008, "fields": [{"name": "SW", "bits": [2, 0]}]}}
        problems = self.mod.check_data(self.h, bad)
        self.assertEqual(len(problems), 2, problems)


class SiteToolsTest(unittest.TestCase):
    def run_tool(self, repo, name, *args):
        return subprocess.run([sys.executable, str(repo / "tools" / name), *args], capture_output=True, text=True)

    def test_check_site_passes_on_repo(self):
        r = self.run_tool(ROOT, "check-site.py")
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)

    @staticmethod
    def make_planned(repo, page_id):
        """Turn a ready page back into a planned one in a scratch copy (all pages may be ready)."""
        core = repo / "site/assets/js/core.js"
        text = core.read_text(encoding="utf-8").replace(f'{{ id: "{page_id}", status: "ready"', f'{{ id: "{page_id}", status: "planned"')
        text = re.sub(rf'^\s*"?{re.escape(page_id)}"?: \[[^\]]*\],\n', "", text, count=1, flags=re.M)   # its REFS entry
        core.write_text(text, encoding="utf-8")
        for f in (repo / f"site/{page_id}.html", repo / f"site/assets/js/pages/{page_id}.js"):
            f.unlink(missing_ok=True)

    def test_check_site_catches_problems(self):
        with tempfile.TemporaryDirectory() as tmp:
            repo = copy_repo(tmp)
            self.make_planned(repo, "setup")
            idx = repo / "site/index.html"
            idx.write_text(idx.read_text(encoding="utf-8").replace('href="#path"', 'href="#nowhere"').replace("</main>", '<a href="setup.html">x</a></main>'), encoding="utf-8")
            r = self.run_tool(repo, "check-site.py")
            self.assertEqual(r.returncode, 1)
            self.assertIn("anchor #nowhere", r.stdout)
            self.assertIn("links to planned page setup.html", r.stdout)

    def test_new_module_scaffold_is_blocked_until_written(self):
        with tempfile.TemporaryDirectory() as tmp:
            repo = copy_repo(tmp)
            self.make_planned(repo, "board")
            r = self.run_tool(repo, "new-module.py", "board")
            self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
            html = (repo / "site/board.html").read_text(encoding="utf-8")
            self.assertIn('id="pinout"', html)
            self.assertIn('<span class="sec-num">A.1</span>', html)
            self.assertIn('{ id: "board", status: "ready"', (repo / "site/assets/js/core.js").read_text(encoding="utf-8"))
            r = self.run_tool(repo, "check-site.py")
            self.assertEqual(r.returncode, 1)
            self.assertIn("[placeholders]", r.stdout)
            self.assertIn("needs >= 3 primary sources", r.stdout)


if __name__ == "__main__":
    unittest.main()
