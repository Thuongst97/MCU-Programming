/* SPDX-License-Identifier: MIT
   Module 12 · CAN and CAN FD with FDCAN (and LIN in Theory). */
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
    $("#arb-table").innerHTML = `<table class="t arb"><thead><tr><th><span class="sr-only">Sender</span></th>${Array.from({ length: 11 }, (_, i) => `<th>ID${10 - i}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>`;
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
      { id: "off", label: "Bus off", sub: "TEC > 255", x: 770, y: 90, tone: "cdd", desc: "<p>The node has disconnected itself. The G4's FDCAN sets <code>CCCR.INIT</code> and stays off the bus until software clears <code>INIT</code>; then it waits for 129 × 11 recessive bits before taking part again. Whether and when to do that is an application decision (AUTOSAR's CanSM makes it).</p>" },
    ],
    transitions: [
      { from: "active", to: "passive", label: "errors pile up", desc: "Each transmit error adds 8 to TEC, a receive error usually 1 to REC; each success subtracts 1." },
      { from: "passive", to: "active", label: "both ≤ 127" },
      { from: "passive", to: "off", label: "TEC > 255" },
      { from: "off", to: "active", label: "INIT cleared, 129 × 11 recessive", bend: 60 },
    ],
  });
  Register($("#reg-esr"), { reg: "FDCAN_PSR", value: 0x0000000f });
  Register($("#reg-ecr"), { reg: "FDCAN_ECR", value: 0x00000000 });

  /* ------------------------------------------------ bit timing: the calculators drive the register view */
  const nbtp = Register($("#reg-nbtp"), { reg: "FDCAN_NBTP", value: 0x04100f02 });
  Calc.widget($("#calc-can"), "can", { onResult: (r) => { if (r) nbtp.set(r.reg); } });
  Calc.widget($("#calc-can-data"), "canData");

  /* ------------------------------------------------ FDCAN code */
  Register($("#reg-cccr"), { reg: "FDCAN_CCCR", value: 0x00000303 });
  const N11 = {
    1: ["Kernel clock first", "<code>FDCANSEL = 10</code> selects PCLK1 (170 MHz). The reset value selects HSE, which is not running in this course, and the controller would count no time quanta at all."],
    2: ["Off the bus", "<code>INIT</code> is already 1 after reset; setting it again makes the function safe to call twice. The wait confirms the controller really stopped."],
    3: ["Nominal bit timing", "<code>CCE</code> unlocks the protected registers; <code>NBTP</code> takes the arbitration-phase timing, each field as value − 1."],
    4: ["CAN FD on", "Only if a data-phase timing is given: <code>DBTP</code>, then <code>FDOE</code> (allow FD frames) and <code>BRSE</code> (allow the bit-rate switch)."],
    5: ["No filters, FIFO 0", "After zeroing the message RAM, <code>RXGFC = 0</code> means: no filter elements, and standard frames that match none go to RX FIFO 0."],
    6: ["Internal loopback", "<code>TEST</code> + <code>MON</code> keep the controller off the pins; <code>TEST.LBCK</code> feeds its own TX back into its RX. A self-test without wires."],
    7: ["Join the bus", "Clearing <code>INIT</code> makes the controller wait for 11 recessive bits on FDCAN1_RX. Without a transceiver, RX may never be recessive and the wait times out."],
    8: ["TX FIFO full?", "<code>TXFQS.TFQF</code>: all three TX elements still wait for the bus. Report it rather than overwrite a pending frame."],
    9: ["Write the element", "Header word 0: the 11-bit ID in bits 28:18. Word 1: DLC in bits 19:16, plus FDF and BRS for CAN FD. Then the data, 4 bytes per word, padding with zeros up to the DLC's length."],
    10: ["Request transmission", "Setting the element's bit in <code>TXBAR</code> hands it to the controller, which arbitrates and retries in hardware."],
    11: ["Read the element", "At the FIFO's get index: ID from word 0, DLC, FDF and BRS from word 1, then the data words."],
    12: ["Release the slot", "Writing the get index to <code>RXF0A</code> frees the element. Without it the FIFO fills after three frames and later ones are lost."],
    13: ["Internal loopback self-test", "Proves the clock, both bit timings and the driver work, CAN FD included, before any wiring is involved."],
    14: ["Node B reacts", "Mirror the button on the LED and answer, so node A can see the round trip."],
    15: ["Event + cycle", "Send on change and every 100 ms: the typical pattern for automotive signals, so a receiver also notices when the sender disappears."],
    16: ["A CAN FD frame", "Once a second, 16 bytes with <code>fd</code> and <code>brs</code> set: the data phase runs at 1 Mbit/s."],
    17: ["Watch the counters", "On a healthy bus TEC and REC stay at 0. Unplug the other node and watch TEC climb on hardware: no ACK is a transmit error."],
  };
  ["init", "tx", "rx", "self", "main"].forEach((r) => explore(`#ex-${r}`, `src-11-${r}`, N11));
  explore("#ex-dlc", "src-11-dlc", {});

  /* ------------------------------------------------ message RAM layout (RM0440 FDCAN message RAM, redrawn) */
  const MRAM = [
    { o: 0x000, n: "Standard ID filters", s: "28 × 1 word", d: "One word per filter: type (range, dual ID or classic ID + mask), what to do on a match, and two 11-bit IDs." },
    { o: 0x070, n: "Extended ID filters", s: "8 × 2 words", d: "The same for 29-bit identifiers." },
    { o: 0x0B0, n: "RX FIFO 0", s: "3 × 18 words", d: "Received frames. Example 11 and the AUTOSAR Can driver read from here." },
    { o: 0x188, n: "RX FIFO 1", s: "3 × 18 words", d: "A second receive FIFO, for frames a filter sends there." },
    { o: 0x260, n: "TX event FIFO", s: "3 × 2 words", d: "Optional: the ID and timestamp of each frame that went out." },
    { o: 0x278, n: "TX buffers / FIFO", s: "3 × 18 words", d: "Frames to send. Example 11 uses them as a FIFO (<code>TXBC = 0</code>)." },
  ];
  const mr = $("#mram");
  let ms = "";
  MRAM.forEach((m, i) => {
    const y = 10 + i * 44;
    ms += `<g class="lg-node tn-${i < 2 ? "mcal" : i < 4 ? "svc" : "asw"}" data-m="${i}" tabindex="0" role="button" aria-label="${esc(m.n)}"><rect class="lg-card" x="150" y="${y}" width="520" height="38" rx="7"/><text class="lg-title" x="164" y="${y + 17}">${esc(m.n)}</text><text class="lg-sub" x="164" y="${y + 31}">${esc(m.s)}</text></g><text class="hd-sub" x="140" y="${y + 24}" text-anchor="end">+0x${m.o.toString(16).toUpperCase().padStart(3, "0")}</text>`;
  });
  mr.innerHTML = `<svg class="lg-svg" viewBox="0 0 690 ${10 + MRAM.length * 44}" role="group" aria-label="FDCAN1 message RAM layout from SRAMCAN_BASE">${ms}</svg><div class="sm-info" id="mram-info"></div>`;
  const showM = (i) => {
    mr.querySelectorAll("[data-m]").forEach((g) => g.classList.toggle("focus", +g.dataset.m === i));
    $("#mram-info").innerHTML = `<h3 class="w-title">SRAMCAN_BASE + 0x${MRAM[i].o.toString(16).toUpperCase().padStart(3, "0")} · ${esc(MRAM[i].n)}</h3><p>${MRAM[i].d}</p>`;
  };
  mr.addEventListener("click", (e) => { const g = e.target.closest("[data-m]"); if (g) showM(+g.dataset.m); });
  mr.addEventListener("keydown", (e) => { const g = e.target.closest("[data-m]"); if (g && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); showM(+g.dataset.m); } });
  showM(2);

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
  Pinout($("#po-can"), { board: "nucleo", mode: "wiring", ...window.MCU_DATA.wiring["11"] });
  SequenceDiagram($("#seq-can"), {
    ariaLabel: "Button on node A switches the LED on node B over CAN",
    laneW: 165,
    lanes: [
      { title: "Node A", sub: "button B1", tone: "asw" },
      { title: "FDCAN1 A", sub: "TX FIFO", tone: "mcal" },
      { title: "Bus", sub: "CAN_H / CAN_L", tone: "hw" },
      { title: "FDCAN1 B", sub: "RX FIFO 0", tone: "mcal" },
      { title: "Node B", sub: "LED LD2", tone: "asw" },
    ],
    steps: [
      { from: 0, to: 1, kind: "call", label: "can_send(0x100)", title: "Button pressed", detail: "<p>Node A notices the change and writes a TX element with ID <code>0x100</code> (hypothetical), data[0] = 1.</p>" },
      { from: 1, to: 2, kind: "pdu", label: "frame", title: "On the wire", detail: "<p>The controller waits for an idle bus, sends SOF, wins arbitration, and sends the frame with CRC and stuff bits.</p>" },
      { from: 2, to: 3, kind: "pdu", label: "ACK", title: "Received and acknowledged", detail: "<p>Node B's controller checks the CRC and drives the ACK slot dominant. Without any receiver, A would retry forever and its TEC would rise.</p>" },
      { from: 3, to: 4, kind: "irq", label: "RF0N → IRQ 21", title: "Interrupt on node B", detail: "<p>The frame lands in RX FIFO 0; <code>IR.RF0N</code> raises <code>FDCAN1_IT0</code> (IRQ 21) and the handler copies the element into a queue for <code>main()</code>.</p>" },
      { from: 4, to: 4, label: "LD2 on", title: "Act", detail: "<p>Node B switches its LED and answers with frame <code>0x101</code>.</p>" },
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
    "You can compute <code>FDCAN_NBTP</code> for 500 kbit/s and 250 kbit/s at 170 MHz, and say why the sample point is 85 % and not 87.5 %.",
    "Example 11's internal-loopback self-test passes on one board without any transceiver.",
    "With two boards wired, B1 on node A switches LD2 on node B, node B prints the 16-byte CAN FD frames, and both report TEC 0 / REC 0.",
    "You unplugged the bus on node A and watched its TEC rise to error passive.",
  ], { key: "can" });
})();
