/* SPDX-License-Identifier: MIT
   Module 08 · USART: Frames, Interrupts and a Command Shell. */
(function () {
  "use strict";
  const { $, esc, renderCodeExplorer, embedded, Register, Waveform, Wave, Calc, SequenceDiagram, Checklist } = window.MCU;
  const explore = (host, id, notes) => renderCodeExplorer($(host), { ...embedded(id), notes });

  /* ---------------------------------------------------------------- frame */
  const wv = Waveform($("#wv-uart"), Wave.uart({ byte: 0x48 }));
  const ch = $("#uart-char"), par = $("#uart-parity"), stop = $("#uart-stop"), out = $("#uart-out");
  const drawFrame = () => {
    const byte = (ch.value || "H").charCodeAt(0) & 0xff;
    const spec = Wave.uart({ byte, parity: par.value, stop: +stop.value });
    wv.update(spec);
    out.textContent = `'${String.fromCharCode(byte)}' = 0x${byte.toString(16).toUpperCase().padStart(2, "0")} = ${byte.toString(2).padStart(8, "0")}b, ${spec.frameBits} bit times, ${(spec.frameBits / 115200 * 1e6).toFixed(1)} µs at 115200 baud`;
  };
  [ch, par, stop].forEach((e) => e.addEventListener("input", drawFrame));
  drawFrame();

  /* ---------------------------------------------------------------- baud */
  Calc.widget($("#calc-brr"), "brr", { defaults: { pclk: 72000000, baud: 115200 } });
  Register($("#reg-brr"), { reg: "USART_BRR", value: 0x271 });
  Register($("#reg-sr"), { reg: "USART_SR", value: 0x000000c0 });

  /* ---------------------------------------------------------------- interrupts */
  const N04 = {
    1: ["Receive interrupt only", "<code>RXNEIE</code> on from the start: every received byte raises an interrupt. The transmit interrupt stays off until there is something to send."],
    2: ["Priority before enable", "Below the timers that must not jitter, above the main loop. 6 out of 0–15."],
    3: ["Received a byte (or lost one)", "<code>RXNE</code> and <code>ORE</code> both mean \"read DR\". Reading <code>DR</code> after reading <code>SR</code> clears both."],
    4: ["Only if we asked", "<code>TXE</code> is set whenever the data register is empty, which is most of the time. Check <code>TXEIE</code> too, or the handler would react to TXE while receiving."],
    5: ["Nothing left to send", "Turn <code>TXEIE</code> off, otherwise the empty data register would re-trigger the interrupt forever."],
    6: ["Bounded wait for space", "When the buffer is full, wait for the ISR to drain it, with an upper limit."],
    7: ["CR1 is shared", "Both <code>main()</code> and the ISR change <code>CR1</code>, so the read-modify-write here runs with interrupts masked for three instructions."],
    8: ["Drain the RX buffer", "Everything the ISR queued since the last pass goes to the shell."],
    9: ["Sleep until the next byte", "<code>WFI</code> stops the CPU clock until an interrupt (Sleep mode, <a href=\"power-wdg.html#modes\">module 13</a>)."],
  };
  explore("#ex-init", "src-04-init", N04);
  explore("#ex-isr", "src-04-isr", N04);
  SequenceDiagram($("#seq-rx"), {
    ariaLabel: "A received byte from the RX pin to the shell",
    laneW: 160,
    lanes: [
      { title: "RX pin", sub: "PA10", tone: "hw" },
      { title: "USART1", sub: "shift register, DR", tone: "hw" },
      { title: "ISR", sub: "USART1_IRQHandler", tone: "mcal" },
      { title: "Ring buffer", sub: "s_rx", tone: "tool" },
      { title: "main()", sub: "shell_feed()", tone: "asw" },
    ],
    steps: [
      { from: 0, to: 1, kind: "bus", label: "10 bit times", title: "A frame arrives", detail: "<p>Start bit, 8 data bits, stop bit: about 87 µs at 115 200 baud. The USART samples each bit and shifts it in.</p>" },
      { from: 1, to: 2, kind: "irq", label: "RXNE → IRQ 37", title: "Byte complete", detail: "<p>The byte moves to <code>DR</code>, <code>RXNE</code> is set and, with <code>RXNEIE</code>, the interrupt fires. From now on the next byte has 87 µs before it overwrites this one (overrun).</p>" },
      { from: 2, to: 3, kind: "call", label: "ringbuf_put()", title: "Queue it", detail: "<p>The ISR reads <code>DR</code> (clearing <code>RXNE</code>), stores the byte and returns: a few hundred nanoseconds of work.</p>", analogy: "A receptionist who takes the parcel, puts it on the shelf and goes back to the desk, instead of opening it." },
      { from: 3, to: 4, kind: "ret", label: "ringbuf_get()", title: "Main loop picks it up", detail: "<p>Whenever <code>main()</code> wakes up, it takes every queued byte and gives it to the shell. If it is busy for a while, bytes wait in the buffer instead of being lost.</p>" },
    ],
  });

  /* ---------------------------------------------------------------- ring buffer visualizer */
  const SIZE = 8, host = $("#rb-viz");
  let head = 0, tail = 0, next = 0x41;
  const store = new Array(SIZE).fill("");
  const R = 86, CX = 120, CY = 110;
  const draw = (msg) => {
    let s = "";
    for (let i = 0; i < SIZE; i++) {
      const a0 = (i / SIZE) * 2 * Math.PI - Math.PI / 2, a1 = ((i + 1) / SIZE) * 2 * Math.PI - Math.PI / 2;
      const p = (a, r) => `${CX + r * Math.cos(a)},${CY + r * Math.sin(a)}`;
      const used = (i - tail + SIZE) % SIZE < head - tail;
      s += `<path class="rb-slot${used ? " used" : ""}" d="M${p(a0, R)} A${R},${R} 0 0 1 ${p(a1, R)} L${p(a1, 46)} A46,46 0 0 0 ${p(a0, 46)} Z"/>`;
      const am = (a0 + a1) / 2;
      s += `<text class="rb-val" x="${CX + 66 * Math.cos(am)}" y="${CY + 66 * Math.sin(am) + 4}" text-anchor="middle">${used ? esc(store[i]) : ""}</text>`;
      s += `<text class="rb-idx" x="${CX + 100 * Math.cos(am)}" y="${CY + 100 * Math.sin(am) + 4}" text-anchor="middle">${i}</text>`;
    }
    const marker = (idx, cls, label) => {
      const am = ((idx % SIZE) + 0.5) / SIZE * 2 * Math.PI - Math.PI / 2;
      return `<g class="rb-ptr ${cls}"><line x1="${CX}" y1="${CY}" x2="${CX + 42 * Math.cos(am)}" y2="${CY + 42 * Math.sin(am)}"/><text x="${CX + 30 * Math.cos(am)}" y="${CY + 30 * Math.sin(am) - 4}" text-anchor="middle">${label}</text></g>`;
    };
    s += marker(tail, "tail", "T") + marker(head, "head", "H");
    host.innerHTML = `<div class="rb-wrap"><svg viewBox="0 0 240 220" role="img" aria-label="Ring buffer with 8 slots">${s}</svg>
      <div class="rb-side"><div class="rb-btns"><button type="button" class="btn sm primary" data-rb="put">Put '${String.fromCharCode(next)}' (ISR)</button><button type="button" class="btn sm" data-rb="get">Get (main)</button></div>
      <p class="mono small">head = ${head}, tail = ${tail}<br>count = head − tail = ${head - tail}<br>slot = index &amp; ${SIZE - 1}</p><p class="small">${msg || ""}</p></div></div>`;
  };
  host.addEventListener("click", (e) => {
    const b = e.target.closest("[data-rb]");
    if (!b) return;
    if (b.dataset.rb === "put") {
      if (head - tail >= SIZE) return draw("Full: the byte is dropped (and counted). The ISR never waits.");
      store[head % SIZE] = String.fromCharCode(next);
      next = next === 0x5a ? 0x41 : next + 1;
      head++;
      draw("Stored, then head moved: main() can never see a slot before its data is written.");
    } else {
      if (head === tail) return draw("Empty: head == tail. Nothing to read.");
      const v = store[tail % SIZE];
      tail++;
      draw(`Read '${esc(v)}', then tail moved: the slot is free for the ISR again.`);
    }
  });
  draw("Press Put a few times, then Get. Keep going past slot 7 to see the wrap.");
  explore("#ex-rbtype", "src-04-rbtype", { 1: ["volatile indices", "Each index is written by one side and read by the other, so both are <code>volatile</code>. The data array is not: it is only read after the index that publishes it."] });
  explore("#ex-rb", "src-04-rb", {
    2: ["Fill level", "Free-running indices: the difference is the count, even after the indices wrap at 2<sup>32</sup>."],
    3: ["Power-of-two size", "The mask turns any index into a slot number with one AND instruction."],
    4: ["Publish after writing", "The order matters. Moving <code>head</code> first would let <code>main()</code> read a slot whose data is not there yet."],
    5: ["Free after reading", "Likewise, <code>tail</code> moves only after the byte has been copied out."],
  });

  /* ---------------------------------------------------------------- shell */
  const NSH = {
    6: ["Split in place", "Each space becomes a terminator, so the words become separate C strings inside the line buffer: no copying, no allocation."],
    7: ["Look it up", "A linear search through a const table of names and function pointers. Fine for ten commands."],
    8: ["Enter runs the line", "Terminals send CR, LF or both; a CR followed by LF counts once."],
    9: ["Backspace", "Remove the last character and erase it on the terminal with <code>\\b \\b</code>: back, space, back."],
    10: ["Printable characters only", "Control characters are ignored and an overlong line is cut, never overflowed."],
  };
  explore("#ex-feed", "src-04-feed", NSH);
  explore("#ex-exec", "src-04-exec", NSH);

  /* ---------------------------------------------------------------- LIN */
  const pid = (id) => {
    const b = (n) => (id >> n) & 1;
    const p0 = b(0) ^ b(1) ^ b(2) ^ b(4), p1 = 1 - (b(1) ^ b(3) ^ b(4) ^ b(5));
    return (id & 0x3f) | (p0 << 6) | (p1 << 7);
  };
  const frameBits = (byte) => "0" + Array.from({ length: 8 }, (_, i) => (byte >> i) & 1).join("") + "1";
  const lin = Waveform($("#wv-lin"), { signals: [{ name: "LIN", wave: "1" }] });
  const linId = $("#lin-id"), linOut = $("#lin-out");
  const drawLin = () => {
    const id = Math.max(0, Math.min(63, parseInt(linId.value, 10) || 0));
    const p = pid(id);
    const wave = "11" + "0".repeat(13) + "1" + frameBits(0x55) + "1" + frameBits(p) + "11";
    lin.update({
      title: "LIN frame header",
      signals: [{ name: "LIN", wave }],
      bands: [{ from: 2, to: 15, text: "break ≥ 13 bits", cls: "b-stop" }, { from: 15, to: 16, text: "", cls: "" },
        { from: 16, to: 26, text: "sync 0x55", cls: "b-data" }, { from: 27, to: 37, text: `PID 0x${p.toString(16).toUpperCase()}`, cls: "b-id" }],
    });
    linOut.textContent = `ID ${id} → PID 0x${p.toString(16).toUpperCase().padStart(2, "0")} (P0 = ${(p >> 6) & 1}, P1 = ${(p >> 7) & 1})`;
  };
  linId.addEventListener("input", drawLin);
  drawLin();

  Checklist($("#ck-uart"), [
    "You can draw the 8N1 frame of any byte and compute BRR for any clock and baud rate.",
    "Example 04 answers <code>help</code>, <code>clock</code> and <code>led on</code> in your terminal.",
    "You can explain why the ring buffer needs no lock, and when it would.",
    "You know what the LIN break and the protected identifier are for.",
  ], { key: "uart" });
})();
