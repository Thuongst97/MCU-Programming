/* SPDX-License-Identifier: MIT
   Module 22 · Diagnostics (DCM/DEM, UDS) and NvM. */
(function () {
  "use strict";
  const { $, renderCodeExplorer, embedded, SequenceDiagram, StateMachine, Checklist } = window.MCU;
  const explore = (host, id, notes) => renderCodeExplorer($(host), { ...embedded(id), notes });

  SequenceDiagram($("#seq-uds"), {
    ariaLabel: "A tester reads DTCs from the TurnLight ECU",
    laneW: 150,
    lanes: [
      { title: "Tester", sub: "workshop tool", tone: "tool" },
      { title: "CanTp", sub: "ISO-TP", tone: "ecual" },
      { title: "Dcm", sub: "DSL / DSD / DSP", tone: "svc" },
      { title: "Dem", sub: "event memory", tone: "svc" },
      { title: "LampMonitor", sub: "monitor SWC", tone: "asw" },
    ],
    steps: [
      { from: 4, to: 3, kind: "call", label: "SetEventStatus(FAILED)", title: "Earlier: a monitor reports",
        detail: "<p>During driving, LampMonitor saw no current on the right lamp and reported <code>TL_E_LAMP_OUT_R</code> as failed. Dem set testFailed, pending and confirmed in its status byte.</p>" },
      { from: 0, to: 1, kind: "bus", label: "02 19 02 09", title: "Request: ReadDTCInformation",
        detail: "<p>A single frame: PCI <code>02</code> (2 data bytes follow), SID <code>19</code>, sub-function <code>02</code> (report DTCs by status mask), mask <code>09</code> (testFailed or confirmed). Hypothetical diagnostic CAN IDs.</p>" },
      { from: 1, to: 2, kind: "call", label: "request complete", title: "CanTp hands the request to Dcm", detail: "<p>The request is complete in one frame, so CanTp forwards it at once.</p>" },
      { from: 2, to: 2, label: "session? SID allowed?", title: "DSL and DSD check", detail: "<p>0x19 is allowed in the default session without security access, so the request goes on to processing.</p>" },
      { from: 2, to: 3, kind: "call", label: "filter DTCs", title: "DSP asks Dem", detail: "<p>Dem walks its events and returns those whose status byte matches the mask, with their DTC number and status.</p>" },
      { from: 2, to: 1, kind: "call", label: "59 02 FF 93 00 12 2F", title: "Positive response", detail: "<p><code>0x59</code> = <code>0x19</code> + <code>0x40</code>; availability mask; DTC <code>930012</code> (hypothetical) with status <code>0x2F</code>. Longer than 7 bytes with more DTCs, so CanTp may need first and consecutive frames.</p>" },
      { from: 1, to: 0, kind: "bus", label: "frames on the bus", title: "Back to the tester", detail: "<p>The tester decodes the DTC and shows \"right turn lamp open circuit\" from its own database.</p>" },
    ],
  });

  /* UDS DTC status byte viewer */
  const BITS = [
    ["testFailed", "The latest test result was a failure."],
    ["testFailedThisOperationCycle", "Failed at least once in this operation cycle (e.g. this ignition cycle)."],
    ["pendingDTC", "Failed in this or the last operation cycle: not yet confirmed or not yet healed."],
    ["confirmedDTC", "Failed often enough to be stored; stays set until cleared or aged out."],
    ["testNotCompletedSinceLastClear", "The test has not run to completion since the last clear."],
    ["testFailedSinceLastClear", "Failed at least once since the last clear."],
    ["testNotCompletedThisOperationCycle", "The test has not completed in this operation cycle."],
    ["warningIndicatorRequested", "A warning lamp is requested for this fault."],
  ];
  let status = 0x2f;
  const host = $("#dtc-bits");
  const draw = () => {
    host.innerHTML = `<div class="dtcb-row">${BITS.map((_, i) => 7 - i).map((b) => `<button type="button" class="dtcb-bit${(status >> b) & 1 ? " on" : ""}" data-b="${b}" aria-pressed="${!!((status >> b) & 1)}" title="${BITS[b][0]}"><small>${b}</small><b>${(status >> b) & 1}</b></button>`).join("")}</div>
      <p class="dtcb-hex">Status <code>0x${status.toString(16).toUpperCase().padStart(2, "0")}</code></p>
      <ul class="dtcb-list">${BITS.map(([n, d], b) => `<li class="${(status >> b) & 1 ? "on" : ""}"><code>bit ${b}</code> <b>${n}</b>: ${d}</li>`).join("")}</ul>`;
  };
  host.addEventListener("click", (e) => { const b = e.target.closest("[data-b]"); if (b) { status ^= 1 << +b.dataset.b; draw(); } });
  draw();

  explore("#ex-dem-set", "src-dem-set", {
    1: ["Debouncing", "PREFAILED/PREPASSED move a counter; the event is qualified when it reaches a threshold."],
    2: ["Already qualified", "FAILED and PASSED jump straight to the threshold."],
    3: ["Failed", "testFailed, this-cycle, pending, confirmed and since-last-clear are set; Dem-lite confirms at the first failure."],
    4: ["Passed", "Only testFailed clears: the history bits stay so a workshop still sees that it happened."],
    5: ["Tell the integration", "The configured callback receives the old and the new status byte."],
  });
  explore("#ex-dem-cb", "src-dem-cb", {
    3: ["Log only testFailed changes", "One line per qualified failure or recovery, the same as stages 1 and 2 print."],
  });

  /* ISO-TP segmentation */
  const tp = $("#isotp");
  tp.innerHTML = `<div class="calc-title"><b>ISO-TP segmentation (classic CAN, 8-byte frames)</b></div>
    <div class="calc-inputs"><label for="tp-len">Message length (bytes) <input id="tp-len" type="number" min="1" max="4095" value="20"></label></div>
    <div class="calc-out" aria-live="polite"></div>`;
  const seg = () => {
    const n = Math.max(1, Math.min(4095, +$("#tp-len").value || 1));
    const hx = (v) => v.toString(16).toUpperCase().padStart(2, "0");
    let html = "";
    if (n <= 7) {
      html = `<div class="fb-bytes"><span class="sof" title="PCI: single frame">0${n.toString(16).toUpperCase()}</span>${"<span class=\"pay\">··</span>".repeat(n)}</div><p class="small muted">One single frame.</p>`;
    } else {
      const cfs = Math.ceil((n - 6) / 7);
      const rows = [`<div class="fb-bytes"><span class="sof" title="PCI: first frame + length">1${(n >> 8).toString(16).toUpperCase()}</span><span class="sof">${hx(n & 0xff)}</span>${"<span class=\"pay\">··</span>".repeat(6)} <span class="small muted">FF</span></div>`,
        `<div class="fb-bytes"><span class="crc" title="flow control from the receiver">30</span><span class="crc">00</span><span class="crc">00</span> <span class="small muted">FC (receiver: continue, no block limit, no gap)</span></div>`];
      let left = n - 6;
      for (let i = 1; i <= cfs; i++) {
        const k = Math.min(7, left);
        left -= k;
        if (i <= 4 || i === cfs) rows.push(`<div class="fb-bytes"><span class="cmd" title="PCI: consecutive frame + sequence number">2${(i % 16).toString(16).toUpperCase()}</span>${"<span class=\"pay\">··</span>".repeat(k)} <span class="small muted">CF ${i}</span></div>`);
        else if (i === 5) rows.push(`<p class="small muted">… ${cfs - 5} more consecutive frames …</p>`);
      }
      html = rows.join("") + `<p class="small muted">${n} bytes = 1 first frame + ${cfs} consecutive frame${cfs > 1 ? "s" : ""}, plus the receiver's flow control.</p>`;
    }
    $(".calc-out", tp).innerHTML = html;
  };
  tp.addEventListener("input", seg);
  seg();

  StateMachine($("#sm-fee"), {
    ariaLabel: "Flash EEPROM emulation with two pages",
    initial: "a", height: 260, boxW: 190,
    states: [
      { id: "a", label: "Page A active", sub: "append new versions", x: 30, y: 20, tone: "svc", desc: "<p>Each write of a block appends a new copy with a header to page A. Reading returns the newest copy. Page B is erased and empty.</p>" },
      { id: "afull", label: "Page A full", sub: "no room for the next write", x: 400, y: 20, tone: "cdd", desc: "<p>The next write does not fit. Fee starts a page swap before accepting it.</p>" },
      { id: "copy", label: "Copy to page B", sub: "newest copy of each block", x: 770, y: 20, tone: "tool", desc: "<p>Only the latest version of every block is copied, then page B is marked active. Until that marker is written, page A stays the valid one, so a reset here loses nothing.</p>" },
      { id: "erase", label: "Erase page A", sub: "one erase cycle used", x: 770, y: 170, tone: "mcal", desc: "<p>Page A is erased (tens of milliseconds on the G474, DS12288) and becomes the spare. Each swap costs one of its ~10 000 erase cycles.</p>" },
      { id: "b", label: "Page B active", sub: "append new versions", x: 400, y: 170, tone: "svc", desc: "<p>The roles have swapped. Writes append to page B until it fills, and the cycle repeats in the other direction.</p>" },
    ],
    transitions: [
      { from: "a", to: "afull", label: "many writes" },
      { from: "afull", to: "copy", label: "swap" },
      { from: "copy", to: "erase", label: "B marked active" },
      { from: "erase", to: "b", label: "A erased" },
      { from: "b", to: "a", label: "B full → swap back", bend: -40 },
    ],
  });

  Checklist($("#ck-diag"), [
    "You can decode a positive and a negative UDS response from their first bytes.",
    "You can name the eight status bits of a DTC and say which ones stay set after the fault heals.",
    "You can explain why a monitor should report PREFAILED instead of FAILED for a single bad sample.",
    "You can say how many CAN frames a 100-byte UDS response needs with ISO-TP.",
    "You can explain why Fee never rewrites a block in place.",
  ], { key: "autosar-diag-nvm" });
})();
