/* SPDX-License-Identifier: MIT
   Module 10 · I2C and an SSD1306 OLED. */
(function () {
  "use strict";
  const { $, renderCodeExplorer, embedded, Register, Pinout, Waveform, Wave, StateMachine, Checklist } = window.MCU;
  const explore = (host, id, notes) => renderCodeExplorer($(host), { ...embedded(id), notes });

  const wv = Waveform($("#wv-i2c"), Wave.i2c({}));
  const draw = () => {
    const addr = parseInt($("#i2c-addr").value, 16) & 0x7f;
    const rw = +$("#i2c-rw").value;
    const bytes = $("#i2c-data").value.split(/[\s,]+/).filter(Boolean).slice(0, 4).map((h) => parseInt(h, 16) & 0xff);
    const nack = $("#i2c-nack").checked;
    const spec = nack ? Wave.i2c({ addr, rw, bytes: [], acks: [1] }) : Wave.i2c({ addr, rw, bytes });
    wv.update(spec);
  };
  ["#i2c-addr", "#i2c-rw", "#i2c-data", "#i2c-nack"].forEach((s) => $(s).addEventListener("input", draw));
  draw();

  StateMachine($("#sm-i2c"), {
    ariaLabel: "I2C master transmitter event sequence on the STM32F1",
    initial: "idle", height: 300, boxW: 160,
    states: [
      { id: "idle", label: "Idle", sub: "BUSY = 0", x: 20, y: 20, tone: "hw", desc: "<p>Wait until <code>SR2.BUSY</code> is clear: nobody is using the bus.</p>" },
      { id: "start", label: "START sent", sub: "EV5: SB = 1", x: 280, y: 20, tone: "tool", desc: "<p>Set <code>CR1.START</code>; the peripheral generates the start condition and sets <code>SB</code>. Reading SR1 and then writing DR clears it.</p>" },
      { id: "addr", label: "Address ACKed", sub: "EV6: ADDR = 1", x: 540, y: 20, tone: "tool", desc: "<p>Write <code>address &lt;&lt; 1</code> to DR. When a slave acknowledges, <code>ADDR</code> is set. Clear it by reading SR1 then <b>SR2</b>: until then SCL is held low.</p>" },
      { id: "data", label: "Sending data", sub: "EV8: TXE = 1", x: 540, y: 140, tone: "tool", desc: "<p>Write a byte to DR whenever <code>TXE</code> says the data register is empty. The shift register sends the previous byte meanwhile.</p>" },
      { id: "btf", label: "Last byte done", sub: "EV8_2: BTF = 1", x: 280, y: 140, tone: "tool", desc: "<p>After the last byte, wait for <code>BTF</code>: both DR and the shift register are empty.</p>" },
      { id: "stop", label: "STOP", sub: "CR1.STOP = 1", x: 20, y: 140, tone: "svc", desc: "<p>Set <code>STOP</code>: the peripheral releases the bus after the stop condition.</p>" },
      { id: "nack", label: "NACK (AF)", sub: "error", x: 800, y: 80, tone: "cdd", desc: "<p><code>AF</code> set: no acknowledge. Clear it (write 0), send STOP, report the error. Without this branch, code waits forever for ADDR.</p>" },
    ],
    transitions: [
      { from: "idle", to: "start", label: "set START" },
      { from: "start", to: "addr", label: "DR = addr<<1" },
      { from: "addr", to: "nack", label: "no ACK" },
      { from: "addr", to: "data", label: "read SR2" },
      { from: "data", to: "data", label: "DR = byte" },
      { from: "data", to: "nack", label: "byte NACKed" },
      { from: "data", to: "btf", label: "last byte" },
      { from: "btf", to: "stop", label: "set STOP" },
      { from: "nack", to: "stop", label: "clear AF", bend: 40 },
      { from: "stop", to: "idle", label: "bus free" },
    ],
  });
  Register($("#reg-i2csr1"), { reg: "I2C_SR1", value: 0x00000082 });

  const N06 = {
    1: ["Take over the pins", "Temporarily make SCL and SDA plain open-drain GPIOs so software can clock the bus."],
    2: ["Clock until SDA is released", "A slave stuck in the middle of a byte releases SDA after at most 9 clock pulses."],
    3: ["Reset the I2C block", "<code>SWRST</code> puts the peripheral's state machine back to its reset state, clearing a latched BUSY."],
    4: ["Open-drain alternate function", "I2C outputs must never drive high; CNF = 11 is alternate-function open-drain."],
    5: ["FREQ", "The peripheral's input clock in MHz (36). It derives its internal timings from this."],
    6: ["Fast mode clock", "<code>FS</code> selects fast mode; with DUTY = 0, the clock low:high ratio is 2:1, so CCR = 36 MHz ÷ (3 × 400 kHz) = 30."],
    7: ["Rise time", "Maximum SCL rise time in peripheral clock cycles + 1: 300 ns in fast mode × 36 MHz + 1 = 11."],
    8: ["START", "EV5 follows when the start condition is on the bus."],
    9: ["Address + W", "7-bit address shifted left, bit 0 = 0 for write."],
    10: ["Clear ADDR", "Reading SR1 (inside the wait) and then SR2 clears <code>ADDR</code> and releases SCL."],
    11: ["Wait for BTF, then STOP", "Waiting for <code>TXE</code> alone would send STOP while the last byte is still shifting out."],
  };
  ["write", "init", "recover"].forEach((r) => explore(`#ex-${r}`, `src-06-${r}`, N06));
  Pinout($("#po-oled"), { board: "bluepill", mode: "wiring", ...window.MCU_DATA.wiring["06"] });
  explore("#ex-ssdinit", "src-06-ssdinit", {
    1: ["Off while configuring", "Avoids showing garbage while the settings change."],
    2: ["Charge pump", "Most cheap modules have no separate high-voltage supply for the OLED; the controller's internal charge pump makes it."],
    3: ["Horizontal addressing", "The controller fills page 0 left to right, then page 1, and so on: a 1024-byte stream lands exactly in place."],
    4: ["On", "Display on. Everything after this is data."],
  });
  explore("#ex-flush", "src-06-flush", {
    5: ["Set the window", "Column 0–127 and page 0–7: the whole screen. Sent as commands (control byte 0x00)."],
    6: ["1024 bytes of pixels", "One transaction with control byte 0x40: the whole framebuffer."],
  });
  explore("#ex-pixel", "src-06-pixel", {
    1: ["Which byte", "Page = y ÷ 8; each page is 128 bytes, one per column."],
    2: ["Which bit", "Bit 0 is the top pixel of the page. Setting or clearing it leaves the other 7 pixels alone."],
  });
  Checklist($("#ck-i2c"), [
    "You can draw START, address, ACK, data and STOP, and say who drives SDA in each bit.",
    "Example 06 reports <code>probe 0x3C: OK</code> and the OLED shows text and a moving bar.",
    "With the OLED unplugged, example 06 reports <code>no ACK</code> and keeps running.",
    "You know why the F1 I2C needs a bus-recovery routine.",
  ], { key: "i2c" });
})();
