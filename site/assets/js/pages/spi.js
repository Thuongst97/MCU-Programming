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

  Register($("#reg-spicr1"), { reg: "SPI_CR1", value: 0x00000364 });
  Register($("#reg-spicr2"), { reg: "SPI_CR2", value: 0x00001700, show: ["FRXTH", "DS", "TXDMAEN", "RXDMAEN"] });
  const N07 = {
    1: ["CS high first", "Set the output latch before the pin becomes an output, so the flash never sees a glitch on CS."],
    2: ["Pins to SPI2", "SCK, MISO and MOSI get alternate function 5 (DS12288); CS on PB12 stays a plain GPIO output."],
    3: ["Master, ÷ 32", "<code>BR = 100</code>: PCLK1 ÷ 32 = 5.3 MHz. CPOL and CPHA stay 0: mode 0, which the W25Q supports."],
    4: ["Software NSS", "<code>SSM</code> ignores the NSS pin; <code>SSI = 1</code> tells the master it is not being selected by someone else (otherwise it raises a mode fault)."],
    5: ["8-bit access", "With <code>DS = 0111</code> (8-bit frames), a 16-bit write to <code>DR</code> would push <i>two</i> frames into the FIFO. Writing through a byte pointer sends exactly one."],
    6: ["Read what came back", "Every byte sent clocks one byte in. <code>FRXTH = 1</code> raises <code>RXNE</code> as soon as one byte is in the RX FIFO; reading <code>DR</code> as a byte takes it out. Skipping the read would fill the FIFO and overrun."],
    7: ["Wait for BSY", "<code>TXE</code> is set as soon as there is room in the TX FIFO. <code>BSY</code> clears only when the last bit is out."],
    8: ["DMAMUX first", "SPI2_RX (request 12) to DMAMUX channel 1, which drives DMA1 channel 2; SPI2_TX (request 13) to DMAMUX channel 2 → DMA1 channel 3."],
    9: ["Dummy TX", "Memory → peripheral, memory address not incremented: the same 0xFF byte is sent again and again."],
    10: ["Enable requests", "Enable the RX request before the TX request, so no received byte is missed (RM0440, SPI with DMA)."],
  };
  ["init", "xfer", "dma"].forEach((r) => explore(`#ex-${r}`, `src-07-${r}`, N07));
  Pinout($("#po-spi"), { board: "nucleo", mode: "wiring", ...window.MCU_DATA.wiring["07"] });
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
    lanes: [{ title: "Firmware", sub: "w25q.c", tone: "asw" }, { title: "SPI2", sub: "+ CS on PB12", tone: "hw" }, { title: "W25Qxx", sub: "NOR flash", tone: "hw" }],
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
    "You know why CS must wait for <code>BSY</code>, why every erase needs a write enable, and what DMAMUX has to do before the DMA read works.",
  ], { key: "spi" });
})();
