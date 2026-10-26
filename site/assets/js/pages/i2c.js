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
    ariaLabel: "I2C master transmitter sequence on the STM32G4",
    initial: "idle", height: 300, boxW: 160,
    states: [
      { id: "idle", label: "Idle", sub: "BUSY = 0", x: 20, y: 20, tone: "hw", desc: "<p>Wait until <code>ISR.BUSY</code> is clear: nobody is using the bus.</p>" },
      { id: "start", label: "START + address", sub: "CR2: SADD, NBYTES, START", x: 280, y: 20, tone: "tool", desc: "<p>One write to <code>CR2</code> sets the address, the byte count, <code>AUTOEND</code> and <code>START</code>. The peripheral sends START and the address byte by itself.</p>" },
      { id: "data", label: "Byte wanted", sub: "TXIS = 1", x: 540, y: 20, tone: "tool", desc: "<p>The slave acknowledged; the peripheral asks for the next byte with <code>TXIS</code>. Writing <code>TXDR</code> clears it.</p>" },
      { id: "reload", label: "Chunk done", sub: "TCR = 1", x: 540, y: 140, tone: "tool", desc: "<p>More than 255 bytes: with <code>RELOAD</code> set, the peripheral stops after each chunk and waits for a new <code>NBYTES</code>.</p>" },
      { id: "stop", label: "STOP sent", sub: "STOPF = 1", x: 280, y: 140, tone: "svc", desc: "<p>With <code>AUTOEND</code>, STOP follows the last byte automatically. Clear <code>STOPF</code> through <code>ICR</code>.</p>" },
      { id: "nack", label: "NACK", sub: "NACKF = 1", x: 800, y: 80, tone: "cdd", desc: "<p>No acknowledge: wrong address, or the slave refused a byte. Clear <code>NACKF</code> through <code>ICR</code>, make sure STOP goes out, report the error. Without this branch, code waits forever for <code>TXIS</code>.</p>" },
    ],
    transitions: [
      { from: "idle", to: "start", label: "write CR2" },
      { from: "start", to: "data", label: "address ACKed" },
      { from: "start", to: "nack", label: "no ACK" },
      { from: "data", to: "data", label: "TXDR = byte" },
      { from: "data", to: "nack", label: "byte NACKed" },
      { from: "data", to: "reload", label: "255 sent" },
      { from: "reload", to: "data", label: "new NBYTES", bend: 40 },
      { from: "data", to: "stop", label: "last byte" },
      { from: "nack", to: "stop", label: "clear NACKF", bend: 40 },
      { from: "stop", to: "idle", label: "bus free" },
    ],
  });
  Register($("#reg-i2cisr"), { reg: "I2C_ISR", value: 0x00000003 });
  Register($("#reg-timingr"), { reg: "I2C_TIMINGR", value: 0xa0640d18 });

  const N06 = {
    1: ["Take over the pins", "Temporarily make SCL (PA9) and SDA (PA8) plain open-drain GPIO outputs so software can clock the bus."],
    2: ["Clock until SDA is released", "A slave stuck in the middle of a byte releases SDA after at most 9 clock pulses."],
    3: ["Reset the I2C block", "Clearing <code>PE</code> resets the peripheral's internal state machine and flags; the configuration registers keep their values."],
    4: ["Open-drain alternate function", "The pins stay open-drain (set during recovery) when they switch to AF4: I2C must never drive a line high. The internal pull-ups are a weak backup; the module's own resistors do the real work."],
    5: ["Compute TIMINGR", "From the kernel clock and the requested rate. If no setting fits the I2C specification, initialisation fails loudly instead of running out of spec."],
    6: ["Write TIMINGR", "Only possible while <code>PE</code> = 0. For 170 MHz and 400 kHz the result is <code>0xA0640D18</code>: prescaler 11, low 25, high 14 ticks, plus hold and set-up delays."],
    7: ["Enable", "<code>PE</code> = 1: the peripheral is ready."],
    8: ["Address in SADD[7:1]", "In 7-bit mode the address goes into bits 7:1 of <code>SADD</code>; <code>RD_WRN</code> = 0 means write."],
    9: ["Count, ending, START", "<code>NBYTES</code> and either <code>AUTOEND</code> (last chunk) or <code>RELOAD</code> (more to come), then <code>START</code>: all in one write."],
    10: ["TXIS: next byte, please", "Every wait also watches <code>NACKF</code>, so an absent display ends the transfer instead of hanging."],
    11: ["STOPF: done", "With <code>AUTOEND</code>, the peripheral sent STOP after the last byte. Clear <code>STOPF</code> through <code>ICR</code> for the next transfer."],
  };
  ["write", "init", "recover"].forEach((r) => explore(`#ex-${r}`, `src-06-${r}`, N06));
  explore("#ex-calc", "src-06-calc", {
    1: ["Start with a fine tick", "Pick the smallest prescaler that keeps the tick around 60 ns, then try slower ticks until every field fits."],
    2: ["SCL low and high", "At least the specification's minimum low and high times, rounded up to whole ticks …"],
    3: ["… stretched to the period", "… then lengthened together until low + high fills a 400 kHz period (2.5 µs)."],
    4: ["Data hold", "SDADEL delays SDA after SCL falls, using the formula in RM0440 with the analog filter's delay."],
    5: ["Data set-up", "SCLDEL leaves room for the rise time and the set-up time before SCL rises again."],
  });
  Pinout($("#po-oled"), { board: "nucleo", mode: "wiring", ...window.MCU_DATA.wiring["06"] });
  Checklist($("#ck-i2c"), [
    "You can draw START, address, ACK, data and STOP, and say who drives SDA in each bit.",
    "Example 06 reports <code>probe 0x3C: OK</code> and the OLED shows text and a moving bar.",
    "With the OLED unplugged, example 06 reports <code>no ACK</code> and keeps running.",
    "You know why the OLED is on D8/D7 and not on D15/D14, and why every I2C driver needs a bus-recovery routine.",
  ], { key: "i2c" });
})();
