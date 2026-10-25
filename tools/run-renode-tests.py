#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Run every Renode Robot test in the repository against a firmware build.

  cmake --preset bluepill-debug && cmake --build --preset bluepill-debug
  python3 tools/run-renode-tests.py                       # all suites, build/bluepill-debug
  python3 tools/run-renode-tests.py examples/00-*/bare/test/00.robot
  python3 tools/run-renode-tests.py --build-dir build/bluepill-release

Results (log.html, report.html, robot_output.xml) go to build/renode-results/, never into source
folders. Needs `renode-test` on PATH (Renode portable package + its tests/requirements.txt).
"""
import argparse
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SUITE_GLOBS = ["examples/*/test/*.robot", "examples/*/*/test/*.robot", "capstone/**/test/*.robot"]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("suites", nargs="*", help="robot files (default: every suite in the repo)")
    ap.add_argument("--build-dir", default="build/bluepill-debug")
    ap.add_argument("--results-dir", default="build/renode-results")
    ap.add_argument("-j", "--jobs", default="1")
    a = ap.parse_args()

    runner = shutil.which("renode-test")
    if not runner:
        sys.exit("renode-test not found on PATH (install the Renode portable package, see setup.html#renode)")
    suites = [Path(s).resolve() for s in a.suites] or sorted({p for g in SUITE_GLOBS for p in ROOT.glob(g)})
    if not suites:
        sys.exit("no .robot suites found")
    build = (ROOT / a.build_dir).resolve()
    if not build.is_dir():
        sys.exit(f"{build} does not exist: build the firmware first (cmake --build --preset bluepill-debug)")
    results = (ROOT / a.results_dir).resolve()
    results.mkdir(parents=True, exist_ok=True)
    cmd = [runner, "-r", str(results), "-j", a.jobs, "--variable", f"BUILD_DIR:{build}", *map(str, suites)]
    print(f"running {len(suites)} suite(s) against {build.relative_to(ROOT)}")
    r = subprocess.run(cmd, cwd=results)   # renode-test also writes aggregated reports to the cwd
    print(f"results: {results.relative_to(ROOT)}/report.html")
    sys.exit(r.returncode)


if __name__ == "__main__":
    main()
