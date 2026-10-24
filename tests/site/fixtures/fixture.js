// SPDX-License-Identifier: MIT
// Renders the engines on tests/site/fixtures/engines.html with sample data.
(function () {
  "use strict";
  const { $, renderCodeExplorer, embedded, SequenceDiagram, Diagram } = window.MCU;
  renderCodeExplorer($("#explorer"), { ...embedded("src-demo"), notes: { 1: ["LED on", "PC13 is active-low."], 2: ["LED off", "Set the bit."] } });
  SequenceDiagram($("#seq-demo"), {
    lanes: [{ title: "EXTI", sub: "line 0", tone: "hw" }, { title: "NVIC", sub: "Cortex-M3", tone: "hw" }, { title: "ISR", sub: "EXTI0_IRQHandler", tone: "asw" }],
    steps: [
      { from: 0, to: 1, kind: "irq", label: "pending", detail: "<p>Edge on PA0.</p>" },
      { from: 1, to: 2, kind: "call", label: "vector", code: "void EXTI0_IRQHandler(void) {}", analogy: "Triage desk." },
      { from: 2, to: 0, kind: "ret", label: "clear PR0" },
    ],
  });
  Diagram.layered($("#lg-demo"), {
    id: "lgdemo",
    bands: [
      { key: "asw", tag: "SWC", title: ["Application"] },
      { key: "rte", tag: "RTE", title: ["Runtime Environment"], sub: ["generated in production"], boundary: true, tone: "rte" },
      { key: "bsw", tag: "MCAL", title: ["MCAL"] },
    ],
    nodes: [
      { id: "swc", band: "asw", title: "TurnLight", sub: "RE_TurnLight_10ms", tag: "SWC" },
      { id: "dio", band: "bsw", title: "Dio", sub: "Dio_WriteChannel", tag: "MCAL" },
    ],
    edges: [{ from: "swc", to: "dio", kind: "rte", label: "Rte_Write" }],
  });
})();
