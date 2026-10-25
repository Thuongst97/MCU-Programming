/* SPDX-License-Identifier: MIT
   Module 25 · Capstone 2: The Same ECU on FreeRTOS. */
(function () {
  "use strict";
  const { $, renderCodeExplorer, embedded, Waveform, Compare, Checklist } = window.MCU;
  const explore = (host, id, notes) => renderCodeExplorer($(host), { ...embedded(id), notes });

  const CELLS = 30;
  const row = (on) => { let s = "", prev = ""; for (let i = 0; i < CELLS; i++) { const c = on.includes(i) ? "1" : "0"; s += c === prev ? "." : c; prev = c; } return s; };
  Waveform($("#wv-rtos"), {
    title: "Stage 2, 30 ms after a button press at 8 ms (1 cell = 1 ms, run times not to scale)",
    hscale: 26,
    signals: [
      { name: "lamp (4)", wave: row([0, 5, 10, 15, 20, 25]) },
      { name: "input (3)", wave: row([1, 11, 21]) },
      { name: "logic (3)", wave: row([2, 12, 22]) },
      { name: "can (2)", wave: row([3, 13, 23]) },
      { name: "supervisor (1)", wave: row([4]) },
      { name: "idle", wave: row([6, 7, 8, 9, 14, 16, 17, 18, 19, 24, 26, 27, 28, 29]) },
    ],
    marks: [{ at: 8, text: "press" }, { at: 11, text: "debounce starts" }],
  });
  const N2 = {
    1: ["Queue, never block", "Timeout 0: if the queue were full, the edge would be dropped rather than delaying the 10 ms sampling."],
    2: ["Drain the queue", "Every edge since the last run, in order."],
    3: ["Mailbox", "<code>xQueueOverwrite</code> on a one-element queue: the readers always see the newest complete snapshot."],
    4: ["Wake the CAN task", "Only on a change; the bit makes it send at once instead of waiting up to 100 ms."],
    5: ["Event or timeout", "Wakes on \"status changed\" or after 10 ms to poll RX and run the 100 ms cycle."],
    6: ["All four or nothing", "Waits up to 50 ms for every task's bit; only then the watchdog is fed."],
  };
  ["input", "logic", "can", "sup"].forEach((r) => explore(`#ex-s2-${r}`, `src-s2-${r}`, N2));
  Compare($("#cmp-sup"), { bad: "src-c-s1sup", good: "src-c-s2sup", rule: ["TL-REQ-009"],
    why: "Both feed the watchdog only when every activity checked in. Stage 1 collects bits in a variable that only one context touches; stage 2 uses an event group, the thread-safe way, and the supervisor's low priority adds a second protection: a task that hogs the CPU starves it." });
  $("#cmp-sup .cmp-col.bad .cmp-tag").textContent = "Stage 1";
  $("#cmp-sup .cmp-col.good .cmp-tag").textContent = "Stage 2";

  Checklist($("#ck-cap2"), [
    "The acceptance suite passes for stage 2 (the same tests as stage 1).",
    "You can explain why the supervisor has the lowest priority.",
    "You can say what the mailbox protects against, compared with a shared global struct.",
    "You measured the stack high-water marks on the board and adjusted the stack size, or you know how to.",
  ], { key: "capstone-rtos" });
})();
