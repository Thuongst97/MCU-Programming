/* SPDX-License-Identifier: MIT
   Module 01 · What Is a Microcontroller?: block diagram of the STM32F103, the 4 GB address space,
   memory-mapped registers and the toolchain pipeline. */
(function () {
  "use strict";
  const { $, esc, Diagram, renderCodeExplorer, embedded, SequenceDiagram, Register } = window.MCU;

  /* ------------------------------------------------ inside the chip (DS5319 block diagram, redrawn) */
  Diagram.layered($("#lg-f103"), {
    id: "f103",
    label: "Block diagram of the STM32F103C8: core, AHB bus matrix, APB2 and APB1 peripherals",
    nodeH: 56,
    toneLabels: { hw: "Cortex-M3 core", tool: "AHB: memories and bus masters", ecual: "APB2 peripherals (≤ 72 MHz)", svc: "APB1 peripherals (≤ 36 MHz)" },
    bands: [
      { key: "core", tag: "Core", title: ["Cortex-M3"], sub: ["Arm IP"], tone: "hw" },
      { key: "ahb", tag: "AHB", title: ["Bus matrix", "72 MHz max"], sub: ["memories, DMA"], tone: "tool" },
      { key: "apb2", tag: "APB2", title: ["APB2 bridge"], sub: ["≤ 72 MHz"], tone: "ecual" },
      { key: "apb1", tag: "APB1", title: ["APB1 bridge"], sub: ["≤ 36 MHz"], tone: "svc" },
    ],
    nodes: [
      { id: "cpu", band: "core", title: "CPU", sub: "Thumb-2, ≤ 72 MHz", tip: "Cortex-M3 — ARMv7-M core: Thumb-2, hardware divide, no FPU" },
      { id: "nvic", band: "core", title: "NVIC", sub: "43 IRQs, 16 levels" },
      { id: "systick", band: "core", title: "SysTick", sub: "24-bit timer" },
      { id: "dbg", band: "core", title: "SW-DP", sub: "debug port PA13/PA14", tip: "SW-DP — the Serial Wire Debug port the ST-Link talks to" },
      { id: "bus", band: "ahb", title: "Bus matrix", sub: "ICode · DCode · System", tip: "Bus matrix — arbitrates between the CPU and DMA for memories and peripherals" },
      { id: "flash", band: "ahb", title: "Flash 64 KB", sub: "0x08000000, prefetch", tip: "Flash — program memory, read through the flash interface with wait states" },
      { id: "sram", band: "ahb", title: "SRAM 20 KB", sub: "0x20000000", tip: "SRAM — data, stack and heap; empty after power-on" },
      { id: "dma", band: "ahb", title: "DMA1", sub: "7 channels" },
      { id: "rcc", band: "ahb", title: "RCC", sub: "clocks and resets" },
      { id: "gpio", band: "apb2", title: "GPIOA–C", sub: "+ AFIO, EXTI" },
      { id: "usart1", band: "apb2", title: "USART1", sub: "PA9/PA10" },
      { id: "spi1", band: "apb2", title: "SPI1", sub: "PA4–PA7" },
      { id: "adc", band: "apb2", title: "ADC1/2", sub: "12-bit" },
      { id: "tim1", band: "apb2", title: "TIM1", sub: "advanced timer" },
      { id: "tim", band: "apb1", title: "TIM2–4", sub: "general purpose" },
      { id: "usart23", band: "apb1", title: "USART2/3", sub: "" },
      { id: "i2c", band: "apb1", title: "I2C1/2", sub: "" },
      { id: "can", band: "apb1", title: "bxCAN", sub: "shares SRAM with USB" },
      { id: "usb", band: "apb1", title: "USB FS", sub: "PA11/PA12" },
      { id: "wdg", band: "apb1", title: "IWDG/WWDG", sub: "+ PWR, BKP, RTC" },
    ],
    edges: [
      { from: "cpu", to: "bus", kind: "hw", label: "I/D/S buses" },
      { from: "dbg", to: "cpu", kind: "opt" },
      { from: "nvic", to: "cpu", kind: "opt" },
      { from: "bus", to: "flash", kind: "hw" },
      { from: "bus", to: "sram", kind: "hw" },
      { from: "dma", to: "bus", kind: "hw" },
      { from: "bus", to: "rcc", kind: "hw" },
      { from: "bus", to: "gpio", kind: "hw" }, { from: "bus", to: "usart1", kind: "hw" }, { from: "bus", to: "spi1", kind: "hw" },
      { from: "bus", to: "adc", kind: "hw" }, { from: "bus", to: "tim1", kind: "hw" },
      { from: "bus", to: "tim", kind: "hw" }, { from: "bus", to: "usart23", kind: "hw" }, { from: "bus", to: "i2c", kind: "hw" },
      { from: "bus", to: "can", kind: "hw" }, { from: "bus", to: "usb", kind: "hw" }, { from: "bus", to: "wdg", kind: "hw" },
    ],
  });

  /* ------------------------------------------------ address space (DS5319 memory map, redrawn; not to scale) */
  const REGIONS = [
    { a: "0xE0000000", n: "Cortex-M3 internal peripherals", s: "NVIC, SysTick and SCB at 0xE000E000; debug units", d: "Part of the core, the same on every Cortex-M3. CMSIS gives them names: <code>NVIC</code>, <code>SysTick</code>, <code>SCB</code>." , c: "hw" },
    { a: "0x42000000", n: "Peripheral bit-band alias", s: "one word per peripheral bit", d: "Each bit of the peripheral region also appears as a whole 32-bit word here. Writing 1 or 0 to that word sets or clears just that bit, atomically. ST's HAL uses it; this course uses BSRR-style registers instead (ARM DDI 0337).", c: "tool" },
    { a: "0x40000000", n: "Peripherals", s: "APB1 0x40000000 · APB2 0x40010000 · AHB 0x40018000", d: "Every peripheral register. A few landmarks: TIM2 <code>0x40000000</code>, USART1 <code>0x40013800</code>, GPIOC <code>0x40011000</code>, RCC <code>0x40021000</code>, flash interface <code>0x40022000</code>.", c: "ecual" },
    { a: "0x22000000", n: "SRAM bit-band alias", s: "one word per SRAM bit", d: "Same trick as above, for the first 1 MB of SRAM.", c: "tool" },
    { a: "0x20000000", n: "SRAM, 20 KB", s: "0x20000000–0x20004FFF", d: "Global variables, the stack and the heap. Its content is random after power-on, which is why the startup code fills it.", c: "svc" },
    { a: "0x1FFFF800", n: "Option bytes", s: "16 bytes", d: "Non-volatile settings such as read-out protection and write protection (PM0075).", c: "mcal" },
    { a: "0x1FFFF000", n: "System memory, 2 KB", s: "ST's bootloader", d: "A small ROM program from ST that can load firmware over USART1. It runs when you boot with BOOT0 = 1 (AN2606). The flash size register sits just below the option bytes, at <code>0x1FFFF7E0</code>.", c: "mcal" },
    { a: "0x08000000", n: "Flash, 64 KB", s: "0x08000000–0x0800FFFF", d: "Your program: vector table first, then code and constants. Survives power-off. Erased in 1 KB pages.", c: "asw" },
    { a: "0x00000000", n: "Boot alias", s: "flash, system memory or SRAM", d: "Depending on the BOOT pins, flash (normal), system memory or SRAM also appears here. The core reads its first stack pointer and reset vector from address 0.", c: "rte" },
  ];
  const host = $("#mm-space");
  host.classList.add("hd-wrap");
  const RH = 38, W = 760;
  let svg = "";
  REGIONS.forEach((r, i) => {
    const y = 10 + i * (RH + 6);
    svg += `<g class="lg-node tn-${r.c}" data-r="${i}" tabindex="0" role="button" aria-label="${esc(r.n)}">
      <rect class="lg-card" x="150" y="${y}" width="${W - 170}" height="${RH}" rx="7"/>
      <text class="lg-title" x="164" y="${y + 17}">${esc(r.n)}</text>
      <text class="lg-sub" x="164" y="${y + 31}">${esc(r.s)}</text></g>
      <text class="hd-sub" x="140" y="${y + 24}" text-anchor="end">${esc(r.a)}</text>`;
  });
  host.innerHTML = `<svg class="lg-svg" viewBox="0 0 ${W} ${10 + REGIONS.length * (RH + 6)}" role="group" aria-label="STM32F103 address space, highest addresses at the top">${svg}</svg><div class="sm-info" id="mm-space-info"></div>`;
  const info = $("#mm-space-info");
  const show = (i) => {
    const r = REGIONS[i];
    host.querySelectorAll("[data-r]").forEach((g) => g.classList.toggle("focus", +g.dataset.r === i));
    info.innerHTML = `<h3 class="w-title"><code>${esc(r.a)}</code> · ${esc(r.n)}</h3><p>${r.d}</p>`;
  };
  host.addEventListener("click", (e) => { const g = e.target.closest("[data-r]"); if (g) show(+g.dataset.r); });
  host.addEventListener("keydown", (e) => { const g = e.target.closest("[data-r]"); if (g && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); show(+g.dataset.r); } });
  show(7);

  /* ------------------------------------------------ registers */
  renderCodeExplorer($("#ex-led"), {
    ...embedded("src-00-led-f"),
    notes: {
      1: ["RCC-&gt;APB2ENR", "<code>RCC</code> is a pointer to a struct laid over the RCC registers at <code>0x40021000</code>; <code>APB2ENR</code> is the member at offset <code>0x18</code>. Setting bit <code>IOPCEN</code> switches on the clock of the GPIOC block."],
      2: ["Read, clear, …", "Reads <code>GPIOC_CRH</code>, clears the four bits that belong to pin 13 with an inverted mask …"],
      3: ["… set, write back", "… ORs in the new value and writes all 32 bits back. The settings of pins 8–12 and 14–15 are untouched."],
      4: ["A write with a side effect", "Writing to <code>BSRR</code> changes the pin immediately. Reading <code>BSRR</code> back would not even return what you wrote: it is write-only. That is why registers are not ordinary memory."],
    },
  });
  Register($("#reg-apb2enr"), { reg: "RCC_APB2ENR", value: 0x00000014 });

  /* ------------------------------------------------ toolchain */
  SequenceDiagram($("#seq-toolchain"), {
    ariaLabel: "From C source to bytes in flash",
    laneW: 150,
    lanes: [
      { title: "main.c", sub: "your source", tone: "asw" },
      { title: "gcc -E / cc1", sub: "preprocess + compile", tone: "tool" },
      { title: "as", sub: "assembler", tone: "tool" },
      { title: "ld", sub: "linker + .ld script", tone: "tool" },
      { title: "objcopy", sub: "ELF → bin/hex", tone: "tool" },
      { title: "Flash", sub: "0x08000000", tone: "hw" },
    ],
    steps: [
      { from: 0, to: 1, label: "#include, #define", title: "Preprocess", detail: "<p>Headers are pasted in and macros replaced. <code>RCC-&gt;APB2ENR</code> becomes a pointer expression with a fixed address. Run <code>arm-none-eabi-gcc -E main.c</code> to see the result.</p>" },
      { from: 1, to: 2, label: "Thumb-2 assembly", title: "Compile", detail: "<p>The compiler turns C into Thumb-2 instructions for the Cortex-M3 (<code>-mcpu=cortex-m3 -mthumb</code>), optimising as told (<code>-Og</code> for debugging, <code>-Os</code> for size).</p>", analogy: "Translating a recipe into the exact hand movements of one particular cook." },
      { from: 2, to: 3, label: "main.o", title: "Assemble", detail: "<p>Each source file becomes an object file: machine code with <i>holes</i> where addresses of other functions and variables are not known yet.</p>" },
      { from: 3, to: 3, label: "place sections", title: "Link", detail: "<p>The linker combines all object files and libraries, decides the final address of every function and variable using the linker script (flash at <code>0x08000000</code>, RAM at <code>0x20000000</code>), fills the holes, and drops unused sections.</p>", analogy: "Typesetting a book: chapters written separately get page numbers, and every \"see page …\" is filled in." },
      { from: 3, to: 4, label: "app.elf", title: "ELF output", detail: "<p>The ELF holds code, data, symbol names and debug info. The debugger uses all of it.</p>" },
      { from: 4, to: 5, kind: "bus", label: "app.bin via SWD", title: "Program the chip", detail: "<p>Only the bytes that must be in flash are written: vector table, code, constants and the initial values of <code>.data</code>. Names and debug info never reach the chip.</p>" },
    ],
  });
})();
