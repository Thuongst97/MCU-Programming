/* SPDX-License-Identifier: MIT
   Module 16 · Bootloaders and Flash Programming. */
(function () {
  "use strict";
  const { $, renderCodeExplorer, embedded, Register, MemoryMap, SequenceDiagram, Checklist } = window.MCU;
  const explore = (host, id, notes) => renderCodeExplorer($(host), { ...embedded(id), notes });
  const hex = (v, d = 8) => "0x" + (v >>> 0).toString(16).toUpperCase().padStart(d, "0");

  Register($("#reg-flashcr"), { reg: "FLASH_CR", value: 0x00000080 });
  Register($("#reg-flashsr"), { reg: "FLASH_SR", value: 0x00000020 });
  const NF = {
    1: ["Key sequence", "<code>FLASH_KEY1</code> then <code>FLASH_KEY2</code> (from the CMSIS header). Only done when <code>LOCK</code> is set; writing the keys to an unlocked FPEC counts as a wrong key."],
    2: ["Page erase", "Select <code>PER</code>, give any address inside the page, set <code>STRT</code>, wait for <code>BSY</code> to clear (with a timeout, like every hardware wait in the course)."],
    3: ["Program mode", "With <code>PG</code> set, an ordinary 16-bit store to a flash address programs it."],
    4: ["Half-words only", "The F1 programs 16 bits per operation. A 32-bit store would be split by the bus and fail."],
    5: ["Read back", "Compare what flash now holds with what was meant. Cheap, and it catches a page that was not erased."],
  };
  explore("#ex-unlock", "src-12-unlock", NF);
  explore("#ex-ferase", "src-12-ferase", NF);
  explore("#ex-program", "src-12-program", NF);

  /* flash partition bar, used sizes from the generated memory maps */
  const maps = (window.MCU_DATA && window.MCU_DATA.memmap) || {};
  const used = (name) => (maps[name] ? MemoryMap.summarize(maps[name]).flashUsed : 0);
  const KB = 1024, W = 1000, X = (a) => (a / (64 * KB)) * W;
  const slots = [
    { cls: "bl", at: 0, size: 15 * KB, used: used("12-bootloader"), t: "bootloader", s: "0x08000000 · 15 KB" },
    { cls: "rec", at: 15 * KB, size: KB, t: "image record", s: "0x08003C00 · 1 KB" },
    { cls: "app", at: 16 * KB, size: 48 * KB, used: used("12-application"), t: "application", s: "0x08004000 · 48 KB" },
  ];
  $("#part-bar").innerHTML = `<svg viewBox="0 0 ${W} 120" role="img" aria-label="Flash split into a 15 KB bootloader, a 1 KB image record and a 48 KB application slot">
    ${slots.map((p) => `<rect class="part-slot ${p.cls}" x="${X(p.at) + 1}" y="12" width="${X(p.size) - 2}" height="54" rx="6"><title>${p.t}: ${p.s}</title></rect>
      ${p.used ? `<rect class="part-used ${p.cls}" x="${X(p.at) + 1}" y="58" width="${Math.max(2, X(p.used) - 2)}" height="8" rx="2"><title>${p.used} bytes used</title></rect>` : ""}
      ${p.size > KB ? `<text class="part-t" x="${X(p.at) + X(p.size) / 2}" y="36" text-anchor="middle">${p.t}</text>` : `<text class="part-s" x="${X(p.at) + X(p.size) / 2}" y="9" text-anchor="middle">record</text>`}
      <text class="part-s" x="${X(p.at) + X(p.size) / 2}" y="52" text-anchor="middle">${p.size > KB ? p.s : ""}</text>`).join("")}
    ${[0, 16, 32, 48, 64].map((k) => `<text class="part-s" x="${Math.min(W - 24, Math.max(0, X(k * KB)))}" y="88">${k} KB</text>`).join("")}
    <text class="part-s" x="0" y="112">bars at the bottom of each slot: bytes used by the debug build (${used("12-bootloader")} B and ${used("12-application")} B)</text>
  </svg>`;
  MemoryMap($("#mm-app"), { map: "12-application" });

  explore("#ex-app", "src-12-app", {
    1: ["Start like after reset", "The bootloader stayed on HSI, so the application's normal clock setup works unchanged."],
    2: ["VTOR", "Prints <code>0x08004000</code>: <code>SystemInit()</code> set it from the address of this image's vector table."],
    3: ["Back to the bootloader", "A software reset runs the bootloader again, which then waits 500 ms for a HELLO frame."],
  });

  SequenceDiagram($("#seq-jump"), {
    ariaLabel: "From reset through the bootloader into the application",
    laneW: 165,
    lanes: [
      { title: "Cortex-M3", sub: "reset, VTOR = 0", tone: "hw" },
      { title: "Bootloader", sub: "0x08000000", tone: "svc" },
      { title: "Flash slot", sub: "record + image", tone: "hw" },
      { title: "NVIC / SysTick", sub: "core peripherals", tone: "mcal" },
      { title: "Application", sub: "0x08004000", tone: "asw" },
    ],
    steps: [
      { from: 0, to: 1, kind: "call", label: "reset vector", title: "The bootloader always runs first",
        detail: "<p>The core loads SP and PC from the bootloader's vector table, as after any reset. The application is never started directly by the hardware.</p>" },
      { from: 1, to: 2, kind: "bus", label: "check record + CRC", title: "Is there a valid image?",
        detail: "<p>Magic number, a check word that catches a half-written record, a size within the slot, a plausible initial SP (inside the 20 KB of RAM) and reset vector (inside the image, Thumb bit set), and finally the CRC-32 over the whole image.</p>",
        analogy: "Checking the passenger's ticket, passport and boarding time before opening the gate." },
      { from: 1, to: 1, label: "500 ms window", title: "Give the host a chance",
        detail: "<p>A HELLO frame in this window, or the button held at reset, keeps the bootloader in update mode. Without a valid image it never leaves.</p>" },
      { from: 1, to: 3, kind: "bus", label: "disable, clear, reset", title: "Leave nothing running",
        detail: "<p>Interrupts off, SysTick stopped, every NVIC enable and pending bit cleared, the peripherals the bootloader used reset through <code>RCC_APB2RSTR</code> and their clocks switched off.</p>" },
      { from: 1, to: 0, kind: "bus", label: "VTOR = 0x08004000", title: "Point exceptions at the application",
        detail: "<p>From now on, every exception uses the application's table. <code>__DSB()</code> and <code>__ISB()</code> make sure the write has taken effect before anything else happens.</p>" },
      { from: 1, to: 0, kind: "bus", label: "MSP = word 0", title: "Load the application's stack pointer",
        detail: "<p>Exactly what the hardware does at reset, done in software: the first word of the application's vector table becomes the main stack pointer. The bootloader's stack is abandoned.</p>" },
      { from: 1, to: 4, kind: "call", label: "branch to word 1", title: "Start the application",
        detail: "<p>Call the application's reset vector with interrupts enabled again (as after a reset). Its <code>Reset_Handler</code> copies <code>.data</code>, zeroes <code>.bss</code>, runs <code>SystemInit()</code> and <code>main()</code>. It never returns.</p>" },
    ],
  });
  const NB = {
    1: ["Record first", "Cheap checks before the expensive CRC: magic and the check word catch an erased or half-written record."],
    2: ["Plausible stack pointer", "Word 0 must point into the 20 KB of SRAM and be word-aligned. Erased flash (<code>0xFFFFFFFF</code>) fails here."],
    3: ["Plausible reset vector", "Inside the image and with bit 0 set (Thumb)."],
    4: ["CRC over the image", "The final word on integrity: a single flipped bit anywhere changes it."],
    5: ["Interrupts off", "Nothing may interrupt the hand-over."],
    6: ["Clear the NVIC", "Disable every interrupt and drop pending requests, so the application starts with a clean controller."],
    7: ["Reset the peripherals", "Pulse their reset bits: registers return to their reset values, as the application expects."],
    8: ["VTOR", "The application's vector table, 256-byte aligned."],
    9: ["New stack", "From here on, no local variable of this function on the old stack may be used."],
    10: ["Jump", "The address comes from the application's table, so the bootloader needs no knowledge of the application's code."],
    11: ["Record erased first", "If power fails during the update, there is no valid record and the bootloader stays in charge."],
    12: ["Bounds check", "Offset and length must stay inside the 48 KB slot. Never trust a length that came over a wire."],
    13: ["Verify what is in flash", "The CRC is computed from flash, not from the received frames, so a programming error is caught too."],
    14: ["Record written last", "Only now does the image become bootable."],
    15: ["When to stay", "No valid image, or the button on PA0 held at reset."],
    16: ["Any valid frame", "The first valid frame cancels the countdown, so a host that answers within 500 ms keeps the bootloader in update mode."],
  };
  explore("#ex-validate", "src-12-validate", NB);
  explore("#ex-jump", "src-12-jump", NB);
  explore("#ex-handle", "src-12-handle", NB);
  explore("#ex-blerase", "src-12-blerase", NB);
  explore("#ex-main", "src-12-main", NB);
  explore("#ex-parser", "src-12-parser", {
    2: ["Hunt for SOF", "Bytes before <code>0xA5</code> are ignored, so the bootloader's own log text or line noise cannot confuse it."],
    3: ["Length check before copying", "A frame that claims more than the buffer holds is refused at once, before a single payload byte is stored."],
    4: ["One verdict per frame", "CRC good: a frame. CRC bad: the caller answers NACK and the host resends."],
  });

  /* frame builder: same CRC-32 as src/proto.c and zlib */
  const CRC_T = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc32 = (bytes) => { let c = 0xffffffff; for (const b of bytes) c = CRC_T[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const CMDS = [["HELLO", 1, ""], ["ERASE", 2, ""], ["WRITE", 3, "00 00 00 00 00 50 00 20"], ["DONE", 4, "28 08 00 00 12 34 56 78"], ["RUN", 5, ""]];
  const fb = $("#frame-builder");
  fb.innerHTML = `<div class="calc-title"><b>Frame builder</b></div>
    <div class="calc-inputs"><label for="fb-cmd">Command <select id="fb-cmd">${CMDS.map(([n, c], i) => `<option value="${i}">${n} (0x0${c})</option>`).join("")}</select></label>
    <label for="fb-pay">Payload (hex bytes) <input id="fb-pay" type="text" spellcheck="false" autocomplete="off"></label></div>
    <div class="calc-out" aria-live="polite"></div>`;
  const out = $(".calc-out", fb);
  const run = () => {
    const cmd = CMDS[+$("#fb-cmd").value][1];
    const pay = ($("#fb-pay").value.match(/[0-9a-f]{1,2}/gi) || []).map((h) => parseInt(h, 16)).slice(0, 260);
    const body = [cmd, pay.length & 0xff, pay.length >> 8, ...pay];
    const c = crc32(body);
    const crcb = [c & 0xff, (c >>> 8) & 0xff, (c >>> 16) & 0xff, c >>> 24];
    const b2 = (v) => v.toString(16).toUpperCase().padStart(2, "0");
    out.innerHTML = `<div class="fb-bytes"><span class="sof" title="start of frame">A5</span><span class="cmd" title="command">${b2(cmd)}</span>
      <span class="len" title="length, low byte">${b2(body[1])}</span><span class="len" title="length, high byte">${b2(body[2])}</span>
      ${pay.map((b) => `<span class="pay">${b2(b)}</span>`).join("")}${crcb.map((b) => `<span class="crc" title="CRC-32, little-endian">${b2(b)}</span>`).join("")}</div>
      <p class="small muted">CRC-32 = <code>${hex(c)}</code> over ${body.length} bytes · frame length ${body.length + 5} bytes${cmd === 3 && pay.length % 2 ? " · <b>odd data length: the bootloader answers NACK</b>" : ""}</p>`;
  };
  $("#fb-cmd").addEventListener("change", () => { $("#fb-pay").value = CMDS[+$("#fb-cmd").value][2]; run(); });
  $("#fb-pay").addEventListener("input", run);
  run();

  Checklist($("#ck-bootloader"), [
    "You can describe how the system bootloader is entered and which pins it uses on the F103.",
    "You can list the steps to erase a page and program a half-word, and say why the FPEC must be unlocked first.",
    "Example 12 runs in Renode: the empty slot waits, an update from <code>upload.py --frames-out</code> starts the application, and <kbd>r</kbd> returns to the bootloader.",
    "You can explain every line of <code>jump_to_app()</code> and what goes wrong without it.",
    "You can say why the record is erased first and written last.",
  ], { key: "bootloader" });
})();
