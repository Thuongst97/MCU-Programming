/* SPDX-License-Identifier: MIT
   Module 11 · SPI and a W25Qxx Flash. */
(function () {
  "use strict";
  const { $, renderCodeExplorer, embedded, Register, Pinout, Waveform, Wave, SequenceDiagram, Checklist } = window.MCU;
  const explore = (host, id, notes) => renderCodeExplorer($(host), { ...embedded(id), notes });

  const wv = Waveform($("#wv-spi"), Wave.spi({}));
  const draw = () => {
    const mode = +$("#spi-mode").value;
    const mosi = parseInt($("#spi-mosi").value, 16) & 0xff, miso = parseInt($("#spi-miso").value, 16) & 0xff;
    wv.update(Wave.spi({ mode, mosi: [mosi], miso: [miso] }));
  };
  ["#spi-mode", "#spi-mosi", "#spi-miso"].forEach((s) => $(s).addEventListener("input", draw));
  draw();

  Register($("#reg-spicr1"), { reg: "SPI_CR1", value: 0x0000035c });
  const N07 = {
    1: ["CS high first", "Set the output latch before the pin becomes an output, so the flash never sees a glitch on CS."],
    2: ["Pin modes", "SCK and MOSI are alternate-function outputs; MISO is an ordinary input that the SPI reads; CS is a plain GPIO."],
    3: ["Master, ÷ 16", "4.5 MHz from the 72 MHz APB2 clock."],
    4: ["Software NSS", "<code>SSM</code> ignores the NSS pin; <code>SSI = 1</code> tells the master it is not being selected by someone else (otherwise it raises a mode fault)."],
    5: ["8-bit access", "Writing <code>DR</code> through a byte pointer is a single 8-bit transfer; with DFF = 0 a 16-bit write also works on the F1, but the byte access states the intent."],
    6: ["Read what came back", "Every byte sent clocks one byte in. Reading <code>DR</code> clears <code>RXNE</code>; skipping it would cause an overrun."],
    7: ["Wait for BSY", "TXE is set as soon as the byte moves to the shift register. BSY clears only when the last bit is out."],
    8: ["Two channels", "DMA1 channel 2 is hard-wired to SPI1 RX and channel 3 to SPI1 TX (RM0008 §13.3.7)."],
    9: ["Dummy TX", "Memory → peripheral, memory address not incremented: the same 0xFF byte is sent again and again."],
    10: ["Enable requests", "Enable the RX request before the TX request, so no received byte is missed (RM0008 §25.3.9)."],
  };
  ["init", "xfer", "dma"].forEach((r) => explore(`#ex-${r}`, `src-07-${r}`, N07));
  Pinout($("#po-spi"), { board: "bluepill", mode: "wiring", ...window.MCU_DATA.wiring["07"] });
  explore("#ex-busy", "src-07-busy", {
    1: ["Clock in the status", "Send the command, then a dummy byte: the flash answers during the dummy byte."],
    2: ["Write enable", "Sets the flash's write-enable latch. It clears itself after every erase or program, so it is needed every time."],
  });
  explore("#ex-ep", "src-07-ep", {
    3: ["CS high starts the erase", "The flash only starts the operation once the command is complete and CS rises."],
    4: ["Stay within one page", "A page program that crosses a 256-byte page boundary wraps around to the start of the same page and overwrites it."],
  });
  SequenceDiagram($("#seq-pp"), {
    ariaLabel: "Programming one page of a W25Q flash",
    lanes: [{ title: "Firmware", sub: "w25q.c", tone: "asw" }, { title: "SPI1", sub: "+ CS on PA4", tone: "hw" }, { title: "W25Qxx", sub: "NOR flash", tone: "hw" }],
    steps: [
      { from: 0, to: 2, kind: "bus", label: "CS↓ 0x06 CS↑", title: "Write enable", detail: "<p>Sets the write-enable latch (WEL).</p>" },
      { from: 0, to: 2, kind: "bus", label: "CS↓ 0x02 A23..A0 data… CS↑", title: "Page program", detail: "<p>Command, 24-bit address MSB first, up to 256 data bytes. Programming starts when CS rises; bits can only go from 1 to 0, so the area must have been erased.</p>" },
      { from: 0, to: 2, kind: "bus", label: "CS↓ 0x05 → status CS↑", title: "Poll BUSY", detail: "<p>Read status register 1 until BUSY = 0: typically under a millisecond for a page, much longer for an erase.</p>", analogy: "Knocking on the door every so often until the builder says \"done\"." },
      { from: 2, to: 0, kind: "ret", label: "BUSY = 0", title: "Done", detail: "<p>WEL is cleared automatically. Read the page back to verify.</p>" },
    ],
  });
  Checklist($("#ck-spi"), [
    "You can explain CPOL and CPHA and pick the right mode from a datasheet's timing diagram.",
    "Example 07 prints your flash's JEDEC ID and <code>0 mismatches</code> for both reads.",
    "You know why CS must wait for <code>BSY</code> and why every erase needs a write enable.",
  ], { key: "spi" });
})();
