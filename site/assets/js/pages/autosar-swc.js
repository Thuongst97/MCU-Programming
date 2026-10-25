/* SPDX-License-Identifier: MIT
   Module 19 · Software Components, Ports and the RTE. */
(function () {
  "use strict";
  const { $, renderCodeExplorer, embedded, SequenceDiagram, Checklist } = window.MCU;
  const explore = (host, id, notes) => renderCodeExplorer($(host), { ...embedded(id), notes });
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  SequenceDiagram($("#seq-ports"), {
    ariaLabel: "One 10 ms cycle of the TurnLight ECU through its ports",
    laneW: 160,
    lanes: [
      { title: "TurnLight", sub: "application SWC", tone: "asw" },
      { title: "RTE", sub: "generated", tone: "rte" },
      { title: "LampMonitor", sub: "application SWC", tone: "asw" },
      { title: "IoHwAb", sub: "ECU abstraction", tone: "ecual" },
      { title: "Com", sub: "BSW service", tone: "svc" },
    ],
    steps: [
      { from: 0, to: 1, kind: "call", label: "Call StalkLeft_Get", title: "Client-server: read the stalk",
        detail: "<p>TurnLight is a client of an operation <code>Get</code> on its R-port <code>StalkLeft</code>. It does not know that IoHwAb serves it, or that the stalk is PB12.</p>" },
      { from: 1, to: 3, kind: "call", label: "IoHwAb_Digital_Get", title: "The RTE calls the server",
        detail: "<p>Same ECU, same task: the generated code is a direct function call. IoHwAb returns the debounced level.</p>" },
      { from: 0, to: 1, kind: "call", label: "Read LampFailed", title: "Sender-receiver: read a data element",
        detail: "<p>LampMonitor is the sender of <code>LampFailed</code>; TurnLight reads the last value from the RTE's buffer.</p>" },
      { from: 0, to: 1, kind: "call", label: "Write LampState", title: "Sender-receiver: write",
        detail: "<p>One write, two receivers: the RTE copies the value into LampMonitor's buffer and into the Com signal <code>LampLeft</code> of the CAN message.</p>",
        analogy: "Posting one letter that the post office delivers to two addresses." },
      { from: 1, to: 4, kind: "call", label: "Com_SendSignal", title: "Inter-ECU data goes through Com",
        detail: "<p>The signal leaves the ECU on the next <code>Com_MainFunctionTx</code> (module 21).</p>" },
      { from: 2, to: 1, kind: "call", label: "Read LampState", title: "LampMonitor reads what TurnLight wrote",
        detail: "<p>The runnable-to-task mapping guarantees TurnLight ran first in this cycle, so the value is current.</p>" },
      { from: 2, to: 1, kind: "call", label: "Call SetEventStatus", title: "A service port to Dem",
        detail: "<p>Diagnostics is a BSW service seen through a port. On a lamp failure LampMonitor reports the event; Dem keeps the DTC status (module 22).</p>" },
    ],
  });

  const NTL = {
    1: ["Client-server call", "Read the debounced stalk through IoHwAb. The return code is ignored on purpose: IoHwAb leaves the value unchanged on error, and the default is \"not pressed\"."],
    2: ["Sender-receiver read", "The latest lamp-failure flag written by LampMonitor."],
    3: ["The function itself", "The same state machine as stages 1 and 2, called as an application library. The SWC adds only the port plumbing."],
    4: ["Command the lamp", "A client-server call to IoHwAb, which ramps the PWM duty."],
    5: ["Publish the lamp state", "One write; the RTE delivers it to LampMonitor and to the CAN message."],
    6: ["Data with an age", "Com watches ClusterAck's deadline; the RTE adds <code>RTE_E_MAX_AGE_EXCEEDED</code> to the return code when the data is too old."],
    7: ["Report to Dem", "Only on a change: Dem keeps the status, the SWC does not have to."],
    8: ["Alive indication", "Tell WdgM this runnable ran. If it stops, the watchdog resets the ECU."],
  };
  explore("#ex-swc-tl", "src-swc-tl", NTL);
  explore("#ex-rte-api", "src-rte-api", {
    1: ["Port + operation", "<code>Rte_Call_&lt;port&gt;_&lt;operation&gt;</code> becomes a function named after the component too, so two SWCs can have ports with the same name."],
    2: ["Port + data element", "<code>Rte_Read_&lt;port&gt;_&lt;element&gt;</code>."],
    3: ["The same for writes", "A generator can also define these as inline functions or macros that touch the buffer directly."],
  });
  const NR = {
    1: ["VFB trace hook", "Every RTE API can call a hook so tools (or our UART log) can watch the virtual function bus. Disabled hooks cost nothing."],
    2: ["Intra-ECU buffer", "LampMonitor reads from here."],
    3: ["Inter-ECU signal", "The same data element is also mapped to a Com signal."],
    4: ["Receiver side", "Same task, so no lock is needed. With different tasks the generator would add protection."],
    5: ["Value plus status", "The RTE combines Com's value with its timeout state into one return code."],
    6: ["Com's timeout notification", "Configured in Com's I-PDU table: called when no ClusterAck arrived for 500 ms."],
    7: ["Client-server to a service", "A direct call into IoHwAb."],
  };
  ["sr", "age", "cs"].forEach((r) => explore(`#ex-rte-${r}`, `src-rte-${r}`, NR));

  /* tiny RTE "generator": port description -> generated names */
  const host = $("#rte-gen");
  host.innerHTML = `<div class="calc-title"><b>Port → RTE API</b></div>
    <div class="calc-inputs">
      <label for="rg-swc">SWC <input id="rg-swc" value="TurnLight" spellcheck="false"></label>
      <label for="rg-port">Port <input id="rg-port" value="LampState" spellcheck="false"></label>
      <label for="rg-elem">Element / operation <input id="rg-elem" value="Left" spellcheck="false"></label>
      <label for="rg-kind">Interface <select id="rg-kind"><option value="sr-p">Sender-receiver, provided (sender)</option><option value="sr-r">Sender-receiver, required (receiver)</option><option value="cs-r">Client-server, required (client)</option><option value="cs-p">Client-server, provided (server)</option></select></label>
      <label for="rg-type">Data type <select id="rg-type"><option>boolean</option><option>uint8</option><option>uint16</option></select></label>
    </div><div class="calc-out" aria-live="polite"></div>`;
  const ident = (s) => (s.match(/[A-Za-z0-9]+/g) || ["X"]).join("");
  const gen = () => {
    const swc = ident($("#rg-swc").value), port = ident($("#rg-port").value), el = ident($("#rg-elem").value);
    const kind = $("#rg-kind").value, ty = $("#rg-type").value;
    let rows = [];
    if (kind === "sr-p") rows = [[`Rte_Write_${port}_${el}`, `Std_ReturnType Rte_Write_${swc}_${port}_${el}(${ty} data)`, "explicit write"], [`Rte_IWrite_RE_${swc}_10ms_${port}_${el}`, `void (${ty} data)`, "implicit write, if the runnable declares it"]];
    else if (kind === "sr-r") rows = [[`Rte_Read_${port}_${el}`, `Std_ReturnType Rte_Read_${swc}_${port}_${el}(${ty} *data)`, "explicit read"], [`Rte_IRead_RE_${swc}_10ms_${port}_${el}`, `${ty} (void)`, "implicit read"]];
    else if (kind === "cs-r") rows = [[`Rte_Call_${port}_${el}`, `Std_ReturnType Rte_Call_${swc}_${port}_${el}(${ty} arg)`, "client call (synchronous)"]];
    else rows = [[`RE_${swc}_${port}_${el}`, `Std_ReturnType RE_${swc}_${port}_${el}(${ty} arg)`, "server runnable, triggered by an operation-invoked event"]];
    $(".calc-out", host).innerHTML = `<table class="t"><thead><tr><th>Name the SWC uses</th><th>Generated function</th><th>Note</th></tr></thead><tbody>${rows.map(([a, b, c]) => `<tr><td><code>${esc(a)}</code></td><td><code>${esc(b)}</code></td><td>${esc(c)}</td></tr>`).join("")}</tbody></table>
      <p class="small muted">Runnable names follow the course's convention <code>RE_&lt;Swc&gt;_&lt;Name&gt;</code>; projects choose their own. <code>Std_ReturnType</code> carries RTE status codes such as <code>RTE_E_OK</code>.</p>`;
  };
  host.addEventListener("input", gen);
  gen();

  Checklist($("#ck-swc"), [
    "You can say for each port of TurnLight whether it is sender-receiver or client-server, and why.",
    "You can explain the difference between <code>Rte_Read</code> and <code>Rte_IRead</code>.",
    "You can trace <code>Rte_Write_LampState_Left</code> to both of its receivers in <code>Rte.c</code>.",
    "You understand how TurnLight learns that the cluster is gone without a timer of its own.",
  ], { key: "autosar-swc" });
})();
