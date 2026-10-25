/* SPDX-License-Identifier: MIT
   Module 12 · CAN with bxCAN (and CAN FD, LIN in Theory). */
(function () {
  "use strict";
  const { $, esc, renderCodeExplorer, embedded, Register, Pinout, Waveform, Wave, Calc, StateMachine, SequenceDiagram, Checklist } = window.MCU;
  const explore = (host, id, notes) => renderCodeExplorer($(host), { ...embedded(id), notes });

  /* ------------------------------------------------ physical layer: TX logic and the two bus wires */
  const tx = "1100101100111";
  const level = (bits, dom, rec) => {
    const pts = [];
    bits.split("").forEach((b, i) => { const v = b === "0" ? dom : rec; pts.push([i, v], [i + 0.999, v]); });
    return pts;
  };
  Waveform($("#wv-phys"), {
    title: "CAN_TX logic level and the CAN_H / CAN_L voltages",
    signals: [
      { name: "CAN_TX", wave: tx },
      { name: "CAN_H", analog: level(tx, 0.85, 0.5), ref: 0.5, refText: "2.5 V" },
      { name: "CAN_L", analog: level(tx, 0.15, 0.5), ref: 0.5, refText: "2.5 V" },
    ],
    bands: tx.split("").map((b, i) => (b === "0" ? { from: i, to: i + 1, text: "dom", cls: "b-stop" } : null)).filter(Boolean),
  });

  /* ------------------------------------------------ frame */
  const wvCan = Waveform($("#wv-can"), Wave.can({}));
  const drawFrame = () => {
    const id = parseInt($("#can-id").value, 16) & 0x7ff;
    const data = $("#can-data").value.split(/[\s,]+/).filter(Boolean).slice(0, 8).map((h) => parseInt(h, 16) & 0xff);
    const f = Wave.can({ id, data });
    wvCan.update({ ...f, hscale: 9 });
    $("#can-out").textContent = `CRC 0x${f.crc.toString(16).toUpperCase().padStart(4, "0")}, ${f.stuffCount} stuff bit(s), ${f.bitCount} bits on the wire`;
  };
  ["#can-id", "#can-data"].forEach((s) => $(s).addEventListener("input", drawFrame));
  drawFrame();

  /* ------------------------------------------------ arbitration */
  const arb = $("#arb");
  arb.innerHTML = `<div class="wv-controls">${[["arb-a", "120"], ["arb-b", "11F"], ["arb-c", "3A0"]].map(([id, v], i) => `<label for="${id}">Node ${"ABC"[i]} ID (hex) <input id="${id}" type="text" value="${v}"></label>`).join("")}</div><div id="arb-table" class="table-wrap"></div><p id="arb-out" class="small"></p>`;
  const drawArb = () => {
    const nodes = ["arb-a", "arb-b", "arb-c"].map((id, i) => ({ name: "ABC"[i], raw: $("#" + id).value.trim() }))
      .filter((n) => n.raw !== "").map((n) => ({ ...n, id: parseInt(n.raw, 16) & 0x7ff, out: -1 }));
    if (!nodes.length) return;
    let rows = "";
    const bus = [];
    for (let b = 10; b >= 0; b--) {
      const alive = nodes.filter((n) => n.out < 0);
      const busBit = alive.some((n) => ((n.id >> b) & 1) === 0) ? 0 : 1;
      bus.push(busBit);
      alive.forEach((n) => { if (((n.id >> b) & 1) !== busBit) n.out = 10 - b; });
    }
    nodes.forEach((n) => {
      rows += `<tr><td>Node ${n.name} <code>0x${n.id.toString(16).toUpperCase().padStart(3, "0")}</code></td>`;
      for (let i = 0; i < 11; i++) {
        const bit = (n.id >> (10 - i)) & 1;
        const cls = n.out >= 0 && i > n.out ? "arb-off" : n.out === i ? "arb-lost" : "";
        rows += `<td class="${cls}">${n.out >= 0 && i > n.out ? "·" : bit}</td>`;
      }
      rows += `</tr>`;
    });
    rows += `<tr class="arb-bus"><td>Bus (wired-AND)</td>${bus.map((b) => `<td>${b}</td>`).join("")}</tr>`;
    $("#arb-table").innerHTML = `<table class="t arb"><thead><tr><th></th>${Array.from({ length: 11 }, (_, i) => `<th>ID${10 - i}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>`;
    const winners = nodes.filter((n) => n.out < 0);
    $("#arb-out").innerHTML = winners.length === 1
      ? `Node <b>${winners[0].name}</b> wins and sends its frame unharmed. ${nodes.filter((n) => n.out >= 0).map((n) => `Node ${n.name} lost at bit ID${10 - n.out}`).join("; ")}; losers retry after the frame.`
      : `Equal IDs: two nodes would send the same identifier, which a CAN network must never allow (the data part would collide).`;
  };
  arb.addEventListener("input", drawArb);
  drawArb();

  StateMachine($("#sm-err"), {
    ariaLabel: "CAN fault confinement states",
    initial: "active", height: 240, boxW: 190,
    states: [
      { id: "active", label: "Error active", sub: "TEC ≤ 127, REC ≤ 127", x: 30, y: 90, tone: "svc", desc: "<p>Normal state. On an error the node sends an <b>active</b> error frame (6 dominant bits) that destroys the frame for everyone.</p>" },
      { id: "passive", label: "Error passive", sub: "TEC or REC > 127", x: 400, y: 90, tone: "rte", desc: "<p>The node still communicates but may only send <b>passive</b> error flags (recessive), so it can no longer disturb others, and it waits longer before retransmitting.</p>" },
      { id: "off", label: "Bus off", sub: "TEC > 255", x: 770, y: 90, tone: "cdd", desc: "<p>The node has disconnected itself. bxCAN can recover automatically after 128 × 11 recessive bits if <code>CAN_MCR.ABOM</code> is set (example 11 sets it).</p>" },
    ],
    transitions: [
      { from: "active", to: "passive", label: "errors pile up", desc: "Each transmit error adds 8 to TEC, a receive error usually 1 to REC; each success subtracts 1." },
      { from: "passive", to: "active", label: "both ≤ 127" },
      { from: "passive", to: "off", label: "TEC > 255" },
      { from: "off", to: "active", label: "128 × 11 recessive", bend: 60 },
    ],
  });
  Register($("#reg-esr"), { reg: "CAN_ESR", value: 0x00080000 });

  /* ------------------------------------------------ bit timing: the calculator drives the register view */
  const btr = Register($("#reg-btr"), { reg: "CAN_BTR", value: 0x001e0003 });
  Calc.widget($("#calc-can"), "can", { onResult: (r) => { if (r) btr.set(r.btr); } });

  /* ------------------------------------------------ bxCAN code */
  Register($("#reg-mcr"), { reg: "CAN_MCR", value: 0x00000041 });
  const N11 = {
    1: ["Remap to PB8/PB9", "<code>CAN_REMAP = 10</code>. <code>SWJ_CFG</code> reads back as undefined, so the write sets it explicitly to its reset value (keep SWD)."],
    2: ["Wake up and initialise", "After reset bxCAN sleeps. Writing <code>MCR</code> with <code>INRQ</code> (and without <code>SLEEP</code>) requests Initialization mode; <code>ABOM</code> enables automatic bus-off recovery."],
    3: ["Bit timing", "Only writable in Initialization mode. For the self-test, LBKM + SILM loop TX to RX inside the chip."],
    4: ["Filters", "Filter init mode, then bank 0 as one 32-bit mask filter with mask 0 (accept all) assigned to FIFO 0."],
    5: ["Shared vector", "FIFO 0 interrupt is IRQ 20, shared with USB low-priority: one more reason the two can't coexist."],
    6: ["Join the bus", "Clearing <code>INRQ</code> leaves Initialization only after 11 recessive bits on CAN_RX; a missing transceiver keeps <code>INAK</code> set and the wait times out."],
    7: ["Three mailboxes", "Pick an empty one; if all three wait for the bus, report it instead of overwriting a pending frame."],
    8: ["Request transmission", "Identifier in bits 31:21 for standard IDs, then <code>TXRQ</code>. Arbitration and retries happen in hardware."],
    9: ["Read the FIFO head", "Identifier, length and the 8 data bytes of the oldest frame."],
    10: ["Release the slot", "<code>RFOM0</code> frees the FIFO entry; the next frame moves up. Without it the FIFO fills after three frames and later ones are lost (or overwrite, depending on <code>RFLM</code>)."],
    11: ["Silent loopback self-test", "Proves the clock, the bit timing and the driver work before any wiring is involved."],
    12: ["Node B reacts", "Mirror the button on the LED and answer, so node A can see the round trip."],
    13: ["Event + cycle", "Send on change and every 100 ms: the typical pattern for automotive signals, so a receiver also notices when the sender disappears."],
    14: ["Watch the counters", "On a healthy bus TEC and REC stay at 0. Unplug the other node and watch TEC climb on hardware."],
  };
  ["init", "tx", "rx", "self", "main"].forEach((r) => explore(`#ex-${r}`, `src-11-${r}`, N11));

  /* ------------------------------------------------ filters: mask-mode checker */
  const flt = $("#flt");
  flt.innerHTML = `<div class="wv-controls"><label for="flt-id">Filter ID (hex) <input id="flt-id" type="text" value="100"></label><label for="flt-mask">Mask (hex) <input id="flt-mask" type="text" value="7F0"></label><label for="flt-test">Incoming IDs (hex) <input id="flt-test" type="text" value="100 101 10F 110 3A0"></label></div><div id="flt-out"></div>`;
  const drawFlt = () => {
    const fid = parseInt($("#flt-id").value, 16) & 0x7ff, mask = parseInt($("#flt-mask").value, 16) & 0x7ff;
    const ids = $("#flt-test").value.split(/[\s,]+/).filter(Boolean).map((h) => parseInt(h, 16) & 0x7ff);
    const bin = (v) => v.toString(2).padStart(11, "0");
    $("#flt-out").innerHTML = `<p class="mono small">filter ${bin(fid)}<br>mask&nbsp;&nbsp; ${bin(mask)} (1 = must match)</p><ul class="flt-list">${ids.map((id) => {
      const ok = ((id ^ fid) & mask) === 0;
      return `<li class="${ok ? "ok" : "no"}"><code>0x${id.toString(16).toUpperCase().padStart(3, "0")}</code> ${bin(id)} → ${ok ? "accepted" : "rejected"}</li>`;
    }).join("")}</ul>`;
  };
  flt.addEventListener("input", drawFlt);
  drawFlt();

  /* ------------------------------------------------ two nodes */
  Pinout($("#po-can"), { board: "bluepill", mode: "wiring", ...window.MCU_DATA.wiring["11"] });
  SequenceDiagram($("#seq-can"), {
    ariaLabel: "Button on node A switches the LED on node B over CAN",
    laneW: 165,
    lanes: [
      { title: "Node A", sub: "button PA0", tone: "asw" },
      { title: "bxCAN A", sub: "mailbox", tone: "mcal" },
      { title: "Bus", sub: "CAN_H / CAN_L", tone: "hw" },
      { title: "bxCAN B", sub: "FIFO 0", tone: "mcal" },
      { title: "Node B", sub: "LED PC13", tone: "asw" },
    ],
    steps: [
      { from: 0, to: 1, kind: "call", label: "can_send(0x100)", title: "Button pressed", detail: "<p>Node A notices the change and fills a mailbox with ID <code>0x100</code> (hypothetical), data[0] = 1.</p>" },
      { from: 1, to: 2, kind: "pdu", label: "frame", title: "On the wire", detail: "<p>bxCAN waits for an idle bus, sends SOF, wins arbitration, and sends the frame with CRC and stuff bits.</p>" },
      { from: 2, to: 3, kind: "pdu", label: "ACK", title: "Received and acknowledged", detail: "<p>Node B's controller checks the CRC and drives the ACK slot dominant. Without any receiver, A would retry forever and its TEC would rise.</p>" },
      { from: 3, to: 4, kind: "irq", label: "FMP0 → IRQ 20", title: "Interrupt on node B", detail: "<p>The frame passes filter bank 0 into FIFO 0; the handler copies it into a queue for <code>main()</code>.</p>" },
      { from: 4, to: 4, label: "LED on", title: "Act", detail: "<p>Node B switches its LED and answers with frame <code>0x101</code>.</p>" },
      { from: 4, to: 0, kind: "ret", label: "0x101 (LED state)", title: "Round trip", detail: "<p>Node A prints the reply: the whole path works in both directions.</p>" },
    ],
  });

  const N13 = {
    1: ["Parity P0", "Even parity over ID bits 0, 1, 2 and 4."],
    2: ["Parity P1", "Odd parity over ID bits 1, 3, 4 and 5. A slave drops a header whose parity does not match."],
    3: ["Enhanced checksum", "LIN 2.x includes the protected ID; the classic LIN 1.x checksum covers the data only (and is still used for the diagnostic frames 0x3C/0x3D)."],
    4: ["Sum with carry", "An 8-bit sum where every carry is added back in."],
    5: ["Inverted", "The receiver adds everything including the checksum and expects 0xFF."],
  };
  renderCodeExplorer($("#ex-13-pid"), { ...embedded("src-13-pid"), notes: N13 });
  renderCodeExplorer($("#ex-13-cs"), { ...embedded("src-13-cs"), notes: N13 });
  Checklist($("#ck-can"), [
    "You can explain dominant and recessive, and why the lowest ID wins arbitration.",
    "You can compute <code>CAN_BTR</code> for 500 kbit/s and 250 kbit/s at 36 MHz.",
    "Example 11's self-test passes on one board without any transceiver.",
    "With two boards wired, the button on node A switches the LED on node B, and both report TEC 0 / REC 0.",
    "You unplugged the bus on node A and watched its TEC rise to error passive.",
  ], { key: "can" });
})();
