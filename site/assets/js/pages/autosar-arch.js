/* SPDX-License-Identifier: MIT
   Module 18 · AUTOSAR Classic: Layered Architecture. */
(function () {
  "use strict";
  const { $, renderCodeExplorer, embedded, Diagram, StateMachine, Checklist } = window.MCU;

  Diagram.layered($("#lg-autosar"), {
    id: "autosar",
    label: "AUTOSAR Classic layers as implemented for the TurnLight capstone",
    nodeH: 52,
    bands: [
      { key: "asw", tag: "SWC", title: ["Application"], sub: ["hand-written"] },
      { key: "rte", tag: "RTE", title: ["RTE"], sub: ["generated"], boundary: true, marker: "RTE" },
      { key: "svc", tag: "Svc", title: ["Services"], sub: ["vendor BSW"] },
      { key: "ecual", tag: "ECUAL", title: ["ECU abstraction"], sub: ["vendor + project"] },
      { key: "mcal", tag: "MCAL", title: ["MCAL"], sub: ["silicon vendor"] },
      { key: "hw", tag: "HW", title: ["STM32G474"], sub: ["registers"] },
    ],
    nodes: [
      { id: "tl", band: "asw", at: [0.05, 0.45], title: "TurnLight", sub: "RE_TurnLight_10ms", tip: "Application SWC: the turn-signal state machine" },
      { id: "lm", band: "asw", at: [0.55, 0.95], title: "LampMonitor", sub: "RE_LampMonitor_10ms", tip: "Application SWC: lamp-out detection" },
      { id: "rte", band: "rte", title: "RTE", sub: "Rte_Read / Rte_Write / Rte_Call" },
      { id: "os", band: "svc", title: "OS", sub: "tasks, alarms", tip: "OS — here an OSEK-like shim over FreeRTOS, not a real AUTOSAR OS" },
      { id: "com", band: "svc", title: "Com + PduR", sub: "signals, routing" },
      { id: "dem", band: "svc", title: "Dem", sub: "events, DTCs" },
      { id: "wdgm", band: "svc", title: "WdgM", sub: "alive supervision" },
      { id: "ecum", band: "svc", title: "EcuM", sub: "start-up" },
      { id: "iohwab", band: "ecual", title: "IoHwAb", sub: "stalk, lamps, current" },
      { id: "canif", band: "ecual", title: "CanIf", sub: "PDU ↔ CAN ID" },
      { id: "wdgif", band: "ecual", title: "WdgIf", sub: "device mapping" },
      { id: "dio", band: "mcal", title: "Dio / Port", sub: "pins" },
      { id: "pwm", band: "mcal", title: "Pwm / Adc", sub: "lamps, current" },
      { id: "can", band: "mcal", title: "Can", sub: "FDCAN1, classic frames" },
      { id: "wdg", band: "mcal", title: "Wdg / Mcu", sub: "IWDG, clocks" },
      { id: "gpio", band: "hw", title: "GPIO, TIM3, ADC1", sub: "PB12-14, PA6/7, PA1" },
      { id: "fdcan", band: "hw", title: "FDCAN1, IWDG", sub: "PA11/12, LSI" },
    ],
    edges: [
      { from: "tl", to: "rte", kind: "rte" }, { from: "lm", to: "rte", kind: "rte" },
      { from: "rte", to: "iohwab", kind: "call" }, { from: "rte", to: "com", kind: "call" }, { from: "rte", to: "dem", kind: "call" },
      { from: "rte", to: "wdgm", kind: "call" }, { from: "com", to: "canif", kind: "pdu" }, { from: "canif", to: "can", kind: "pdu" },
      { from: "iohwab", to: "dio", kind: "call" }, { from: "iohwab", to: "pwm", kind: "call" }, { from: "wdgm", to: "wdgif", kind: "call" },
      { from: "wdgif", to: "wdg", kind: "call" }, { from: "dio", to: "gpio", kind: "hw" }, { from: "pwm", to: "gpio", kind: "hw" },
      { from: "can", to: "fdcan", kind: "hw" }, { from: "wdg", to: "fdcan", kind: "hw" }, { from: "ecum", to: "wdg", kind: "opt" },
    ],
  });

  StateMachine($("#sm-method"), {
    ariaLabel: "AUTOSAR methodology from system description to ECU binary",
    initial: "sys", height: 300, boxW: 180,
    states: [
      { id: "sys", label: "System description", sub: "OEM: ECUs, buses, SWCs", x: 10, y: 20, tone: "tool", desc: "<p>The OEM describes the whole vehicle network: which SWCs exist, which ECU runs them, which signals travel on which bus. Format: ARXML.</p>" },
      { id: "extract", label: "ECU extract", sub: "one ECU's part", x: 410, y: 20, tone: "tool", desc: "<p>The part of the system description that concerns one ECU: its SWCs, its ports, its frames. Handed to the supplier.</p>" },
      { id: "config", label: "ECU configuration", sub: "every BSW parameter", x: 810, y: 20, tone: "svc", desc: "<p>The supplier configures every module for this ECU in a configuration tool: pins, timers, CAN IDs, signals, DTCs, tasks. Still ARXML.</p>" },
      { id: "gen", label: "Generators", sub: "RTE, BSW cfg, OS", x: 810, y: 210, tone: "rte", desc: "<p>Generators write the RTE, the module configuration files (<code>*_Cfg.h</code>, <code>*_PBcfg.c</code>), MemMap headers and the OS tables.</p>" },
      { id: "swc", label: "SWC code", sub: "hand-written", x: 410, y: 210, tone: "asw", desc: "<p>Developers implement the runnables against the generated <code>Rte_&lt;Swc&gt;.h</code> contract header.</p>" },
      { id: "bin", label: "ECU binary", sub: "build + flash", x: 10, y: 210, tone: "hw", desc: "<p>Compiler and linker combine vendor BSW, generated code and SWCs into one image, flashed like any other firmware.</p>" },
    ],
    transitions: [
      { from: "sys", to: "extract", label: "extract" },
      { from: "extract", to: "config", label: "configure" },
      { from: "config", to: "gen", label: "generate" },
      { from: "gen", to: "swc", label: "contract headers" },
      { from: "swc", to: "bin", label: "compile + link" },
    ],
  });

  renderCodeExplorer($("#ex-ecum"), { ...embedded("src-ar-ecum"), notes: {
    1: ["Init list zero", "The integrator's callout: Det first, so every later module can report development errors."],
    2: ["Mcu", "The clock tree comes up before anything that depends on it, like baud rates and timers."],
    3: ["Init list one", "Port and the drivers the OS needs. In this project it also prints the boot line."],
    4: ["Hand-over", "From here on everything runs in OS tasks; start-up continues in the first task with init list two."],
    5: ["Init list two", "Called from the Init task: communication stack, Dem, IoHwAb, watchdog, then the RTE."],
  } });

  Checklist($("#ck-arch"), [
    "You can name the layers from SWC to MCAL and say which ones a project writes itself.",
    "You can explain why an SWC must not include <code>Dio.h</code>.",
    "You can find, for any file in <code>autosar/</code>, what it would be in production from its banner.",
    "You can read an AUTOSAR document name and say what kind of document it is.",
  ], { key: "autosar-arch" });
})();
