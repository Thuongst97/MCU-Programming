/* SPDX-License-Identifier: MIT
   Module 21 · OS, Scheduling and the COM Stack. */
(function () {
  "use strict";
  const { $, renderCodeExplorer, embedded, SequenceDiagram, StateMachine, Waveform, Checklist } = window.MCU;
  const explore = (host, id, notes) => renderCodeExplorer($(host), { ...embedded(id), notes });

  StateMachine($("#sm-osek"), {
    ariaLabel: "OSEK task states",
    initial: "suspended", height: 300, boxW: 170,
    states: [
      { id: "suspended", label: "Suspended", sub: "not activated", x: 40, y: 120, tone: "cdd", desc: "<p>The normal resting state of an OSEK task. It holds no context and uses no stack of its own in a real OSEK OS (basic tasks can share one).</p>" },
      { id: "ready", label: "Ready", sub: "activated", x: 400, y: 20, tone: "tool", desc: "<p>Activated by <code>ActivateTask</code> or an alarm, waiting for the CPU. The highest-priority ready task runs.</p>" },
      { id: "running", label: "Running", sub: "owns the CPU", x: 780, y: 120, tone: "svc", desc: "<p>The task body runs. A basic task ends with <code>TerminateTask()</code> and goes back to suspended.</p>" },
      { id: "waiting", label: "Waiting", sub: "extended tasks only", x: 400, y: 220, tone: "mcal", desc: "<p>Only extended tasks can wait: <code>WaitEvent(mask)</code> blocks until another task or an alarm calls <code>SetEvent</code>.</p>" },
    ],
    transitions: [
      { from: "suspended", to: "ready", label: "activate" },
      { from: "ready", to: "running", label: "start" },
      { from: "running", to: "ready", label: "preempt", bend: 30 },
      { from: "running", to: "suspended", label: "terminate" },
      { from: "running", to: "waiting", label: "WaitEvent" },
      { from: "waiting", to: "ready", label: "SetEvent" },
    ],
  });

  const NOS = {
    1: ["Suspended = blocked on a notification", "A basic task sleeps here until <code>ActivateTask</code> gives it a notification."],
    2: ["The TASK() body", "Runs to its end. <code>TerminateTask()</code> in the shim only records the end."],
    3: ["Activation limit 1", "A second activation while the task is pending or running fails with <code>E_OS_LIMIT</code>, which the error hook reports: the task overran its period."],
    4: ["Offset, then cycle", "The first expiry uses the increment, later ones the cycle, as <code>SetRelAlarm(id, increment, cycle)</code> specifies."],
    5: ["Alarm action", "Activate a task, set an event, or call a callback, as configured."],
  };
  explore("#ex-os-task", "src-os-task", NOS);
  explore("#ex-os-alarm", "src-os-alarm", NOS);
  renderCodeExplorer($("#ex-os-cfg"), { ...embedded("src-os-cfg"), notes: {} });
  explore("#ex-rte-tasks", "src-rte-tasks", {
    8: ["The application runs here", "Both runnables, in data-flow order: TurnLight first, then LampMonitor, which reads what TurnLight wrote."],
    9: ["Receive before the runnables", "So the runnables see this cycle's frames and Com's fresh deadline state."],
    10: ["Supervision decides", "Every 50 ms WdgM checks the alive counts and triggers the watchdog only if all entities checked in."],
  });

  const CELLS = 56;
  const row = (on) => { let s = "", prev = ""; for (let i = 0; i < CELLS; i++) { const c = on.includes(i) ? "1" : "0"; s += c === prev ? "." : c; prev = c; } return s; };
  const every = (p, from) => Array.from({ length: CELLS }, (_, i) => i).filter((i) => i >= from && (i - from) % p === 0);
  Waveform($("#wv-tasks"), {
    title: "TurnLight stage 3, first 55 ms (1 cell = 1 ms, run times not to scale)",
    hscale: 15,
    signals: [
      { name: "Init (6)", wave: row([0]) },
      { name: "Task5ms (5)", wave: row(every(5, 5)) },
      { name: "Task10ms (4)", wave: row(every(10, 10).map((i) => i + 1).filter((i) => i < CELLS)) },
      { name: "Task50ms (3)", wave: row([52]) },
    ],
    marks: [{ at: 0, text: "StartOS" }, { at: 10, text: "10 ms" }, { at: 50, text: "50 ms" }],
  });

  const NCOM = {
    1: ["Signal size", "1 to 8 bits in Com-lite; real Com handles up to 64 bits, byte arrays and both byte orders."],
    2: ["Triggered on change", "A new value marks the I-PDU for immediate transmission: the mixed transmission mode."],
    3: ["Periodic or triggered", "Sent when the 100 ms cycle expires or something changed, whichever comes first."],
    4: ["I-PDU callout", "The integrator's hook writes the alive counter into byte 2 just before sending."],
    5: ["Deadline monitoring", "No ClusterAck for 500 ms: the timeout notification tells the RTE, which tells the SWC through the age flag."],
  };
  explore("#ex-com-pack", "src-com-pack", NCOM);
  explore("#ex-com-main", "src-com-main", NCOM);
  renderCodeExplorer($("#ex-pdur"), { ...embedded("src-pdur"), notes: {} });
  renderCodeExplorer($("#ex-canif-tx"), { ...embedded("src-canif-tx"), notes: {} });
  explore("#ex-integ-init", "src-integ-init", {
    1: ["Cyclic alarms", "In a real OS configuration these alarms autostart; the shim needs them set from the first task."],
    2: ["Start the bus", "Production stacks do this through ComM and CanSM when communication is requested."],
  });

  SequenceDiagram($("#seq-signal"), {
    ariaLabel: "The LampLeft signal from SWC to CAN bus, and ClusterAck back",
    laneW: 140,
    lanes: [
      { title: "TurnLight", sub: "SWC", tone: "asw" },
      { title: "RTE", sub: "Rte.c", tone: "rte" },
      { title: "Com", sub: "signals → I-PDU", tone: "svc" },
      { title: "PduR", sub: "routing", tone: "svc" },
      { title: "CanIf", sub: "PDU → CAN ID", tone: "ecual" },
      { title: "Can", sub: "FDCAN1 driver", tone: "mcal" },
    ],
    steps: [
      { from: 0, to: 1, kind: "call", label: "Rte_Write…", title: "The SWC writes a data element",
        detail: "<p><code>Rte_Write_LampState_Left(TRUE)</code> in <code>RE_TurnLight_10ms</code>. The SWC only knows its port.</p>" },
      { from: 1, to: 2, kind: "call", label: "Com_SendSignal", title: "RTE → Com",
        detail: "<p>The RTE maps the data element to signal <code>ComConf_ComSignal_LampLeft</code>. Com writes bit 0 of the TurnLightStatus I-PDU buffer and, because the value changed, marks the I-PDU for sending.</p>",
        analogy: "Writing the letter and dropping it in the box." },
      { from: 2, to: 3, kind: "call", label: "PduR_ComTransmit", title: "Com_MainFunctionTx sends the I-PDU",
        detail: "<p>Later in the same 10 ms task, Com copies the buffer, the TX callout adds the alive counter, and Com hands PDU handle 0 to PduR.</p>" },
      { from: 3, to: 4, kind: "call", label: "CanIf_Transmit", title: "PduR routes to CanIf",
        detail: "<p>A static route: Com's PDU 0 is CanIf's TX PDU <code>TurnLightStatus</code>.</p>" },
      { from: 4, to: 5, kind: "call", label: "Can_Write", title: "CanIf adds the CAN ID",
        detail: "<p>CanIf looks up ID <code>0x3A0</code>, DLC 4 and the transmit hardware object, and calls the driver.</p>" },
      { from: 5, to: 5, label: "TXBAR", title: "On the wire",
        detail: "<p>The driver writes the frame into the next free TX element of the message RAM and sets its bit in <code>TXBAR</code>. FDCAN1 arbitrates and sends; the cluster acknowledges the frame.</p>" },
      { from: 5, to: 4, kind: "call", label: "CanIf_RxIndication", title: "ClusterAck comes back",
        detail: "<p><code>Can_MainFunction_Read</code> finds frame <code>0x3A1</code> in RX FIFO 0 and passes it up, in task context.</p>" },
      { from: 4, to: 2, kind: "call", label: "→ Com_RxIndication", title: "Up through PduR into Com",
        detail: "<p>CanIf maps the ID to its RX PDU, PduR to Com's I-PDU 1. Com stores the bytes and restarts the 500 ms deadline.</p>" },
      { from: 2, to: 1, kind: "call", label: "Rte_COMCbk…", title: "Com notifies the RTE",
        detail: "<p>The reception notification clears the RTE's timeout flag; <code>Rte_Read_ClusterAck_Alive</code> returns <code>RTE_E_OK</code> again.</p>" },
    ],
  });

  /* CAN matrix: signal values -> TurnLightStatus payload */
  const SIGS = [["LampLeft", 0, 1], ["LampRight", 1, 1], ["IndLeft", 2, 1], ["IndRight", 3, 1], ["Hazard", 4, 1], ["LampOutLeft", 5, 1], ["LampOutRight", 6, 1], ["ClusterLost", 7, 1], ["ResetCause", 8, 8], ["AliveCounter", 16, 8]];
  const vals = Object.fromEntries(SIGS.map(([n]) => [n, 0]));
  vals.LampLeft = 1; vals.IndLeft = 1; vals.AliveCounter = 42;
  const host = $("#can-matrix");
  host.innerHTML = `<div class="calc-title"><b>TurnLightStatus (0x3A0, DLC 4)</b></div>
    <div class="calc-inputs">${SIGS.map(([n, pos, len]) => `<label for="cm-${n}">${n} <small class="muted">bit ${pos}, ${len} bit</small>${len === 1 ? `<select id="cm-${n}" data-s="${n}"><option value="0">0</option><option value="1"${vals[n] ? " selected" : ""}>1</option></select>` : `<input id="cm-${n}" data-s="${n}" type="number" min="0" max="255" value="${vals[n]}">`}</label>`).join("")}</div>
    <div class="calc-out" aria-live="polite"></div>`;
  const draw = () => {
    let w = 0;
    SIGS.forEach(([n, pos, len]) => { w |= ((vals[n] & ((1 << len) - 1)) << pos) >>> 0; });
    const bytes = [0, 1, 2, 3].map((i) => (w >>> (8 * i)) & 0xff);
    const hx = (b) => b.toString(16).toUpperCase().padStart(2, "0");
    $(".calc-out", host).innerHTML = `<div class="fb-bytes">${bytes.map((b, i) => `<span class="${i === 0 ? "cmd" : i === 3 ? "len" : "pay"}" title="byte ${i}">${hx(b)}</span>`).join("")}</div>
      <p class="small muted">Byte 0 holds eight flags, byte 1 the reset cause, byte 2 the alive counter written by the I-PDU callout, byte 3 is reserved and always 0.</p>`;
  };
  host.addEventListener("input", (e) => { const n = e.target.dataset.s; if (n) { vals[n] = Math.max(0, Math.min(255, +e.target.value || 0)); draw(); } });
  draw();

  Checklist($("#ck-os-com"), [
    "You can say how an OSEK basic task differs from a FreeRTOS task, and list three ways the OS shim differs from a real AUTOSAR OS.",
    "You can explain why <code>Can_MainFunction_Read</code> runs before the runnables and <code>Com_MainFunctionTx</code> after them.",
    "You can follow <code>LampLeft</code> through Com, PduR, CanIf and Can by function name.",
    "You can compute the TurnLightStatus payload by hand for hazard on with both lamps lit.",
  ], { key: "autosar-os-com" });
})();
