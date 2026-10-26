/* SPDX-License-Identifier: MIT
   Module 17 · Testing, Static Analysis and MISRA C. */
(function () {
  "use strict";
  const { $, renderCodeExplorer, embedded, Diagram, Compare, Checklist } = window.MCU;
  const explore = (host, id, notes) => renderCodeExplorer($(host), { ...embedded(id), notes });

  Diagram.layered($("#lg-pyramid"), {
    id: "pyramid",
    label: "The course's test pyramid: many fast checks at the bottom, few slow ones at the top",
    nodeH: 52,
    toneLabels: { cdd: "On the board (slow, few)", svc: "On the host (fast, many)", tool: "Without running (every build)" },
    bands: [
      { key: "hw", tag: "HW", title: ["NUCLEO-G474RE"], sub: ["manual"], tone: "cdd" },
      { key: "host", tag: "Host", title: ["Unity"], sub: ["CTest"], tone: "svc" },
      { key: "static", tag: "Static", title: ["Compiler", "cppcheck"], sub: ["every push"], tone: "tool" },
    ],
    nodes: [
      { id: "hw1", band: "hw", at: [0.2, 0.5], title: "\"You are done when…\"", sub: "UART output, LED, buttons", tip: "Each hands-on module ends with a checklist you tick off on the board, comparing the virtual COM port output with expected-output.txt" },
      { id: "hw2", band: "hw", at: [0.5, 0.8], title: "timing, analog, CAN", sub: "scope, meter, 2 boards", tip: "Checks only real hardware can answer: real timing, analog values, current, pixels, CAN bit timing. There is no simulator for the G474 (PLAN.md D13)" },
      { id: "host1", band: "host", at: [0.08, 0.36], title: "debounce, scheduler", sub: "ring buffer, shell" },
      { id: "host2", band: "host", at: [0.36, 0.64], title: "ADC math, font, JEDEC", sub: "fault decoder" },
      { id: "host3", band: "host", at: [0.64, 0.92], title: "bootloader protocol", sub: "bad-vs-good gallery" },
      { id: "st1", band: "static", at: [0, 0.33], title: "-Wall -Wextra -Werror", sub: "-Wconversion -Wshadow" },
      { id: "st2", band: "static", at: [0.33, 0.66], title: "cppcheck", sub: "bugs + MISRA addon" },
      { id: "st3", band: "static", at: [0.66, 1], title: "check-site, embed-code", sub: "the site's own checks" },
    ],
    edges: [
      { from: "st2", to: "host2", label: "compiles clean" },
      { from: "host2", to: "hw1", label: "logic proven" },
    ],
  });

  const N04 = {
    1: ["The seam", "The shell never names the UART. It calls whatever function it was given."],
    2: ["Injected at init", "The firmware passes <code>uart_puts</code>; the test passes <code>capture</code>."],
    3: ["A fake", "Collects everything the shell writes into a string the test can search."],
    4: ["Fresh state for every test", "<code>setUp()</code> runs before each test, so tests never depend on each other's order."],
    5: ["Arrange, act", "Type a command that does not exist, followed by Enter."],
    6: ["Assert", "Two observable outcomes: no command ran, and the user was told why."],
  };
  explore("#ex-seam", "src-04-seam", N04);
  explore("#ex-tseam", "src-04-tseam", N04);
  explore("#ex-ttest", "src-04-ttest", N04);

  Compare($("#cmp-sign"), { bad: "src-bad-sign", good: "src-good-sign", rule: ["MISRA C:2012 Rule 10.4", "-Wsign-compare"],
    why: "Comparing a signed with an unsigned value converts the signed one to unsigned: −1 becomes 4 294 967 295, which is not below 10. Rule 10.4 asks both operands of such an operator to have the same essential type category. The fix handles the negative case explicitly, then compares like with like." });
  Compare($("#cmp-prec"), { bad: "src-bad-prec", good: "src-good-prec", rule: ["MISRA C:2012 Rule 12.1", "-Wparentheses"],
    why: "<code>==</code> and <code>!=</code> bind more tightly than <code>&amp;</code>, so the bad version tests bit 0 instead of TXE. A classic in register code. Rule 12.1 (advisory) recommends making precedence explicit with parentheses." });
  Compare($("#cmp-narrow"), { bad: "src-bad-narrow", good: "src-good-narrow", rule: ["MISRA C:2012 Rule 10.3", "-Wconversion"],
    why: "Assigning a 32-bit value to an 8-bit object silently keeps the low 8 bits: 300 becomes 44. Rule 10.3 forbids assigning to a narrower essential type implicitly. The fix checks the range and makes the conversion visible." });
  Compare($("#cmp-wrap"), { bad: "src-bad-wrap", good: "src-good-wrap", rule: ["Tick wrap-around", "MISRA C:2012 Dir 4.1"],
    why: "A 32-bit millisecond counter wraps after about 49.7 days. Adding to <code>start</code> can wrap too, and then the comparison is wrong: the bad version reports a 512 ms timeout as expired after 16 ms. Subtracting first gives the elapsed time correctly across the wrap, because unsigned arithmetic is modulo 2<sup>32</sup>. No single rule finds this; Directive 4.1 asks you to minimise run-time failures, and an edge-case test does find it." });

  Checklist($("#ck-quality"), [
    "<code>cmake --preset host-tests &amp;&amp; cmake --build --preset host-tests &amp;&amp; ctest --preset host-tests</code> runs every host test and passes.",
    "You wrote a new Unity test for one of the course's pure modules, and saw it fail before you fixed the code.",
    "<code>python3 tools/run-misra.py --list</code> runs and you can explain two of its findings in your own words.",
    "You can say what makes a rule mandatory, required or advisory, and when a deviation is needed.",
    "You can explain why each \"before\" version in the gallery passes casual tests.",
  ], { key: "quality" });
})();
