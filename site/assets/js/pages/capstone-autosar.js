/* SPDX-License-Identifier: MIT
   Module 26 · Capstone 3: Refactoring into AUTOSAR Layers. */
(function () {
  "use strict";
  const { $, renderCodeExplorer, embedded, Diagram, Compare, Checklist } = window.MCU;
  const explore = (host, id, notes) => renderCodeExplorer($(host), { ...embedded(id), notes });

  Diagram.layered($("#lg-tl3"), {
    id: "tl3",
    label: "TurnLight stage 3: files per layer",
    nodeH: 50,
    bands: [
      { key: "asw", tag: "SWC", title: ["asw/"], sub: ["hand-written"] },
      { key: "rte", tag: "RTE", title: ["rte/"], sub: ["generated"], boundary: true, marker: "RTE" },
      { key: "svc", tag: "Svc", title: ["autosar/services"], sub: ["+ os_shim"] },
      { key: "ecual", tag: "ECUAL", title: ["autosar/ecual"], sub: [""] },
      { key: "mcal", tag: "MCAL", title: ["autosar/mcal"], sub: [""] },
    ],
    nodes: [
      { id: "tl", band: "asw", at: [0.05, 0.45], title: "TurnLight.c", sub: "RE_TurnLight_Init / _10ms" },
      { id: "lm", band: "asw", at: [0.55, 0.95], title: "LampMonitor.c", sub: "RE_LampMonitor_10ms" },
      { id: "rte", band: "rte", title: "Rte.c + Rte_TurnLight.h + Rte_LampMonitor.h", sub: "buffers, Com/Dem/WdgM/IoHwAb mapping, TASK() bodies" },
      { id: "os", band: "svc", title: "Os.c (shim)", sub: "4 tasks, 3 alarms" },
      { id: "com", band: "svc", title: "Com.c, PduR.c", sub: "2 I-PDUs, 10 signals" },
      { id: "dem", band: "svc", title: "Dem.c", sub: "3 events" },
      { id: "wdgm", band: "svc", title: "WdgM.c", sub: "3 entities" },
      { id: "ecum", band: "svc", title: "EcuM.c", sub: "init lists" },
      { id: "io", band: "ecual", title: "IoHwAb.c", sub: "debounce, ramps, current" },
      { id: "canif", band: "ecual", title: "CanIf.c", sub: "0x3A0 / 0x3A1" },
      { id: "wdgif", band: "ecual", title: "WdgIf.h", sub: "macros" },
      { id: "port", band: "mcal", title: "Port.c, Dio.c", sub: "9 pins" },
      { id: "pwm", band: "mcal", title: "Pwm.c, Adc.c", sub: "TIM3, ADC1" },
      { id: "can", band: "mcal", title: "Can.c", sub: "polling" },
      { id: "wdg", band: "mcal", title: "Wdg.c, Mcu.c", sub: "IWDG, PLL" },
      { id: "canfd", band: "mcal", title: "Can (CAN FD mode)", sub: "not configured", soft: true,
        tip: "FDCAN1 can do it (example 11), but stage 3 runs classic frames. See 26.5 for what changes per layer." },
    ],
    edges: [
      { from: "tl", to: "rte", kind: "rte" }, { from: "lm", to: "rte", kind: "rte" },
      { from: "rte", to: "io", kind: "call" }, { from: "rte", to: "com", kind: "call" }, { from: "rte", to: "dem", kind: "call" }, { from: "rte", to: "wdgm", kind: "call" },
      { from: "com", to: "canif", kind: "pdu" }, { from: "canif", to: "can", kind: "pdu" }, { from: "io", to: "port", kind: "call" }, { from: "io", to: "pwm", kind: "call" },
      { from: "wdgm", to: "wdgif", kind: "call" }, { from: "wdgif", to: "wdg", kind: "call" },
      { from: "canif", to: "canfd", kind: "opt" },
    ],
  });

  /* 26.5: DLC ↔ payload length, classic CAN vs CAN FD (ISO 11898-1:2015) */
  const FD_LEN = [0, 1, 2, 3, 4, 5, 6, 7, 8, 12, 16, 20, 24, 32, 48, 64];
  const fd = $("#fd-dlc");
  fd.innerHTML = `<div class="wv-controls"><label for="fd-bytes">Payload <input id="fd-bytes" type="range" min="0" max="64" value="20"></label><span id="fd-bytes-out" class="mono small"></span></div>
    <div class="table-wrap"><table class="t"><thead><tr><th><span class="sr-only">Aspect</span></th><th>Classic CAN</th><th>CAN FD</th></tr></thead><tbody id="fd-rows"></tbody></table></div>`;
  const showFd = () => {
    const n = +$("#fd-bytes").value;
    const dlc = FD_LEN.findIndex((len) => len >= n);
    const pad = FD_LEN[dlc] - n;
    const frames = Math.max(1, Math.ceil(n / 8));
    $("#fd-bytes-out").textContent = `${n} byte${n === 1 ? "" : "s"} of application data`;
    $("#fd-rows").innerHTML = `
      <tr><td>Frames on the bus</td><td>${n <= 8 ? "1" : `${frames} (needs segmentation: CanTp or an application protocol)`}</td><td>1</td></tr>
      <tr><td>DLC sent</td><td>${n <= 8 ? n : "up to 8 per frame"}</td><td>${dlc}</td></tr>
      <tr><td>Bytes in the data field</td><td>${n <= 8 ? n : "up to 8 per frame"}</td><td>${FD_LEN[dlc]}${pad ? ` (${pad} padding byte${pad === 1 ? "" : "s"})` : ""}</td></tr>`;
  };
  $("#fd-bytes").addEventListener("input", showFd);
  showFd();

  const tag = (id, a, b) => { $(`${id} .cmp-col.bad .cmp-tag`).textContent = a; $(`${id} .cmp-col.good .cmp-tag`).textContent = b; };
  Compare($("#cmp-in"), { bad: "src-c-in-before", good: "src-c-in-after", rule: ["Inputs through ports"],
    why: "Stage 1 reads buttons and debounces them in the integration code and writes into a global input struct. In stage 3 IoHwAb owns the pins and the debouncing; the SWC asks for the stalk state through a client-server port and never learns that it is PB12." });
  tag("#cmp-in", "Stage 1: input job", "Stage 3: TurnLight runnable");
  Compare($("#cmp-lamp"), { bad: "src-c-lamp-before", good: "src-c-lamp-after", rule: ["Outputs through IoHwAb → Pwm"],
    why: "The ramp logic is the same; the difference is the layer. Stage 1 writes <code>TIM3-&gt;CCR1</code> itself. Stage 3's IoHwAb ramps in the SWS duty scale and calls <code>Pwm_SetDutyCycle</code>, so moving a lamp to another timer is a change in <code>Pwm_PBcfg.c</code>, not in code." });
  tag("#cmp-lamp", "Stage 1: hw/tl_hw.c", "Stage 3: IoHwAb");
  Compare($("#cmp-can"), { bad: "src-c-can-before", good: "src-c-can-after", rule: ["Communication by configuration"],
    why: "Stage 1's job decides when to send, packs bytes and calls the driver. In stage 3 those decisions are data: signal positions, the triggered-on-change property, the 100 ms period, the 500 ms deadline. The CAN matrix becomes a table a generator could write." });
  tag("#cmp-can", "Stage 1: CAN job", "Stage 3: Com configuration");

  explore("#ex-c-lm", "src-c-lm", {
    1: ["Read the lamp command", "Written by TurnLight in the same task, just before."],
    2: ["Current from IoHwAb", "The ADC group is converted by IoHwAb; the SWC sees a number."],
    3: ["Same logic as stage 1", "The lamp-out rules did not change."],
    4: ["To TurnLight and Com", "The RTE fans the write out."],
    5: ["To Dem", "A DTC instead of a log line."],
  });
  explore("#ex-c-rte-tasks", "src-c-rte-tasks", {
    8: ["The runnables", "Where stage 1 had a list of jobs, the RTE has task bodies generated from the runnable-to-task mapping."],
    9: ["BSW main functions in the same task", "Can and Com run before and after the runnables."],
    10: ["Supervision", "WdgM checks every entity's alive indications."],
  });
  explore("#ex-c-wdgm", "src-c-wdgm", {
    1: ["Count since the last cycle", "Each supervised entity reported its checkpoint this many times in the last 50 ms."],
    2: ["Out of range", "Too few (stalled) or too many (runaway): the entity expires."],
    3: ["All alive", "Trigger through WdgIf → Wdg → IWDG."],
    4: ["Stop triggering", "The IWDG resets the ECU within 100 ms; the next boot reports a watchdog reset (TL-REQ-009, TL-REQ-010)."],
  });

  Checklist($("#ck-cap3"), [
    "The TurnLight host tests pass, and the hardware checklist in <code>docs/acceptance.md</code> passes for stage 3 on two NUCLEO boards.",
    "<code>python3 tools/check-autosar.py</code> and <code>python3 tools/run-misra.py</code> pass.",
    "You can point to the file where each requirement TL-REQ-001…010 is implemented in stage 3.",
    "You changed a signal's bit position in <code>Com_PBcfg.c</code> and the cluster in <code>cluster/</code> to match, and the tests still pass.",
    "You can list what the OS shim lacks compared with a real AUTOSAR OS.",
  ], { key: "capstone-autosar" });
})();
