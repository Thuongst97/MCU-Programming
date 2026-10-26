/* SPDX-License-Identifier: MIT
   Module 01 · What Is a Microcontroller?: block diagram of the STM32G474, the 4 GB address space,
   memory-mapped registers and the toolchain pipeline. */
(function () {
  "use strict";
  const { $, esc, Diagram, renderCodeExplorer, embedded, SequenceDiagram, Register } = window.MCU;

  /* ------------------------------------------------ inside the chip (DS12288 block diagram, redrawn and simplified) */
  Diagram.layered($("#lg-g474"), {
    id: "g474",
    label: "Simplified block diagram of the STM32G474: core, AHB bus matrix with memories and AHB2, APB2 and APB1 peripherals",
    nodeH: 56,
    toneLabels: { hw: "Cortex-M4 core", tool: "AHB: memories, DMA, GPIO, ADC", ecual: "APB2 peripherals (≤ 170 MHz)", svc: "APB1 peripherals (≤ 170 MHz)" },
    bands: [
      { key: "core", tag: "Core", title: ["Cortex-M4F"], sub: ["Arm IP"], tone: "hw" },
      { key: "ahb", tag: "AHB", title: ["Bus matrix", "170 MHz max"], sub: ["memories, DMA, AHB2"], tone: "tool" },
      { key: "apb2", tag: "APB2", title: ["APB2 bridge"], sub: ["≤ 170 MHz"], tone: "ecual" },
      { key: "apb1", tag: "APB1", title: ["APB1 bridge"], sub: ["≤ 170 MHz"], tone: "svc" },
    ],
    nodes: [
      { id: "cpu", band: "core", title: "CPU + FPU", sub: "Thumb-2, ≤ 170 MHz", tip: "Cortex-M4 — ARMv7E-M core: Thumb-2, DSP instructions, single-precision FPU, MPU" },
      { id: "nvic", band: "core", title: "NVIC", sub: "102 IRQs, 16 levels" },
      { id: "systick", band: "core", title: "SysTick", sub: "24-bit timer" },
      { id: "dbg", band: "core", title: "SW-DP", sub: "debug port PA13/PA14", tip: "SW-DP — the Serial Wire Debug port the on-board ST-LINK talks to" },
      { id: "bus", band: "ahb", title: "Bus matrix", sub: "ICode · DCode · System", tip: "Bus matrix — arbitrates between the CPU and the DMA controllers for memories and peripherals" },
      { id: "flash", band: "ahb", title: "Flash 512 KB", sub: "0x08000000, caches", tip: "Flash — program memory, read with wait states hidden by the instruction and data caches" },
      { id: "sram", band: "ahb", title: "SRAM1+2 96 KB", sub: "0x20000000", tip: "SRAM1 (80 KB) + SRAM2 (16 KB), contiguous — data, stack and heap; reachable by DMA" },
      { id: "ccm", band: "ahb", title: "CCM SRAM 32 KB", sub: "0x10000000, no DMA", tip: "CCM SRAM — on the core's buses only: fast, but the DMA controllers cannot reach it" },
      { id: "dma", band: "ahb", title: "DMA1/2 + DMAMUX", sub: "2 × 8 channels" },
      { id: "rcc", band: "ahb", title: "RCC, FLASH", sub: "clocks, wait states" },
      { id: "gpio", band: "ahb", title: "GPIOA–G", sub: "AHB2, 0x48000000" },
      { id: "adc", band: "ahb", title: "ADC1–5", sub: "AHB2, 12-bit" },
      { id: "usart1", band: "apb2", title: "USART1", sub: "LIN in example 13" },
      { id: "spi1", band: "apb2", title: "SPI1/4", sub: "SPI1 SCK on PA5 = LD2" },
      { id: "tim1", band: "apb2", title: "TIM1/8/20, TIM15–17", sub: "advanced + small timers" },
      { id: "syscfg", band: "apb2", title: "SYSCFG", sub: "EXTI port selection" },
      { id: "tim", band: "apb1", title: "TIM2–7", sub: "TIM2/TIM5 32-bit" },
      { id: "lpuart", band: "apb1", title: "LPUART1", sub: "ST-LINK virtual COM" },
      { id: "i2c", band: "apb1", title: "I2C1–4, SPI2/3", sub: "" },
      { id: "can", band: "apb1", title: "FDCAN1–3", sub: "CAN FD, message RAM" },
      { id: "wdg", band: "apb1", title: "IWDG/WWDG", sub: "+ PWR, RTC, USB" },
    ],
    edges: [
      { from: "cpu", to: "bus", kind: "hw", label: "I/D/S buses" },
      { from: "dbg", to: "cpu", kind: "opt" },
      { from: "nvic", to: "cpu", kind: "opt" },
      { from: "cpu", to: "ccm", kind: "hw" },
      { from: "bus", to: "flash", kind: "hw" },
      { from: "bus", to: "sram", kind: "hw" },
      { from: "dma", to: "bus", kind: "hw" },
      { from: "bus", to: "rcc", kind: "hw" }, { from: "bus", to: "gpio", kind: "hw" }, { from: "bus", to: "adc", kind: "hw" },
      { from: "bus", to: "usart1", kind: "hw" }, { from: "bus", to: "spi1", kind: "hw" }, { from: "bus", to: "tim1", kind: "hw" }, { from: "bus", to: "syscfg", kind: "hw" },
      { from: "bus", to: "tim", kind: "hw" }, { from: "bus", to: "lpuart", kind: "hw" }, { from: "bus", to: "i2c", kind: "hw" },
      { from: "bus", to: "can", kind: "hw" }, { from: "bus", to: "wdg", kind: "hw" },
    ],
  });

  /* ------------------------------------------------ address space (RM0440 memory map, redrawn; not to scale) */
  const REGIONS = [
    { a: "0xE0000000", n: "Cortex-M4 internal peripherals", s: "NVIC, SysTick, SCB (with CPACR) at 0xE000E000; debug units", d: "Part of the core, the same on every Cortex-M4. CMSIS gives them names: <code>NVIC</code>, <code>SysTick</code>, <code>SCB</code>. <code>SCB-&gt;CPACR</code> switches the FPU on.", c: "hw" },
    { a: "0x50000000", n: "ADCs and DACs (AHB2)", s: "ADC1 at 0x50000000", d: "The analog blocks on AHB2: ADC1 <code>0x50000000</code>, ADC12 common registers just above it, DACs further up.", c: "ecual" },
    { a: "0x48000000", n: "GPIO ports (AHB2)", s: "GPIOA 0x48000000 … GPIOG 0x48001800", d: "Each port has 1 KB of address space: GPIOA <code>0x48000000</code>, GPIOB <code>0x48000400</code>, GPIOC <code>0x48000800</code>. Being on AHB2 makes pin access fast.", c: "ecual" },
    { a: "0x42000000", n: "Peripheral bit-band alias", s: "one word per peripheral bit", d: "Each bit of the APB/AHB1 peripheral region also appears as a whole 32-bit word here. Writing 1 or 0 to that word sets or clears just that bit, atomically. This course uses BSRR-style registers instead (ARM DDI 0403).", c: "tool" },
    { a: "0x40000000", n: "APB1, APB2, AHB1 peripherals", s: "APB1 0x40000000 · APB2 0x40010000 · AHB1 0x40020000", d: "Landmarks: TIM2 <code>0x40000000</code>, FDCAN1 <code>0x40006400</code>, LPUART1 <code>0x40008000</code>, SYSCFG <code>0x40010000</code>, USART1 <code>0x40013800</code>, DMA1 <code>0x40020000</code>, RCC <code>0x40021000</code>, flash interface <code>0x40022000</code>.", c: "ecual" },
    { a: "0x22000000", n: "SRAM1 bit-band alias", s: "one word per SRAM1 bit", d: "Same trick as above, for SRAM1.", c: "tool" },
    { a: "0x20000000", n: "SRAM1 80 KB + SRAM2 16 KB", s: "0x20000000–0x20017FFF, contiguous", d: "Global variables, the stack and the heap. SRAM2 starts at <code>0x20014000</code>, right after SRAM1, so the linker treats both as one 96 KB region. Content is random after power-on, which is why the startup code fills it.", c: "svc" },
    { a: "0x1FFF0000", n: "System memory and information block", s: "ST's bootloader, OTP, IDs, calibration", d: "ST's bootloader (AN2606) starts at <code>0x1FFF0000</code>. Above it: 1 KB of one-time-programmable memory at <code>0x1FFF7000</code>, the unique ID at <code>0x1FFF7590</code>, the flash size at <code>0x1FFF75E0</code> and the Vrefint calibration value used in <a href=\"adc-dma.html#noise\">module 09</a>.", c: "mcal" },
    { a: "0x10000000", n: "CCM SRAM, 32 KB", s: "0x10000000–0x10007FFF", d: "Core-coupled memory: on the core's own buses, so it is fast for code and data. DMA cannot reach it. The linker script calls it <code>CCMRAM</code>; nothing goes there unless you ask.", c: "svc" },
    { a: "0x08000000", n: "Flash, 512 KB", s: "0x08000000–0x0807FFFF", d: "Your program: vector table first, then code and constants. Survives power-off. Erased in 2 KB pages (two banks, the default) or 4 KB pages (single bank), programmed 64 bits at a time.", c: "asw" },
    { a: "0x00000000", n: "Boot alias", s: "flash, system memory or SRAM1", d: "Depending on the boot configuration, flash (normal), system memory or SRAM1 also appears here. The core reads its first stack pointer and reset vector from address 0.", c: "rte" },
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
  host.innerHTML = `<svg class="lg-svg" viewBox="0 0 ${W} ${10 + REGIONS.length * (RH + 6)}" role="group" aria-label="STM32G474 address space, highest addresses at the top">${svg}</svg><div class="sm-info" id="mm-space-info"></div>`;
  const info = $("#mm-space-info");
  const show = (i) => {
    const r = REGIONS[i];
    host.querySelectorAll("[data-r]").forEach((g) => g.classList.toggle("focus", +g.dataset.r === i));
    info.innerHTML = `<h3 class="w-title"><code>${esc(r.a)}</code> · ${esc(r.n)}</h3><p>${r.d}</p>`;
  };
  host.addEventListener("click", (e) => { const g = e.target.closest("[data-r]"); if (g) show(+g.dataset.r); });
  host.addEventListener("keydown", (e) => { const g = e.target.closest("[data-r]"); if (g && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); show(+g.dataset.r); } });
  show(9);

  /* ------------------------------------------------ registers */
  renderCodeExplorer($("#ex-led"), {
    ...embedded("src-00-led-f"),
    notes: {
      1: ["RCC-&gt;AHB2ENR", "<code>RCC</code> is a pointer to a struct laid over the RCC registers at <code>0x40021000</code>; <code>AHB2ENR</code> is the member at offset <code>0x4C</code>. Setting bit <code>GPIOAEN</code> switches on the clock of the GPIOA block. The read-back on the next line makes sure the write has reached the RCC before GPIOA is touched."],
      2: ["Read, clear, …", "Reads <code>GPIOA_MODER</code> and clears the two bits that belong to pin 5 with an inverted mask …"],
      3: ["… set, write back", "… ORs in <code>01</code> (general-purpose output) and writes all 32 bits back. The modes of the other 15 pins, including the SWD pins PA13/PA14, are untouched."],
      4: ["A write with a side effect", "Writing to <code>BSRR</code> changes the pin immediately. Reading <code>BSRR</code> back would not even return what you wrote: it is write-only. That is why registers are not ordinary memory."],
    },
  });
  Register($("#reg-ahb2enr"), { reg: "RCC_AHB2ENR", value: 0x00000001 });

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
      { from: 0, to: 1, label: "#include, #define", title: "Preprocess", detail: "<p>Headers are pasted in and macros replaced. <code>RCC-&gt;AHB2ENR</code> becomes a pointer expression with a fixed address. Run <code>arm-none-eabi-gcc -E main.c</code> to see the result.</p>" },
      { from: 1, to: 2, label: "Thumb-2 assembly", title: "Compile", detail: "<p>The compiler turns C into Thumb-2 and FPU instructions for the Cortex-M4 (<code>-mcpu=cortex-m4 -mthumb -mfpu=fpv4-sp-d16 -mfloat-abi=hard</code>), optimising as told (<code>-Og</code> for debugging, <code>-Os</code> for size).</p>", analogy: "Translating a recipe into the exact hand movements of one particular cook." },
      { from: 2, to: 3, label: "main.o", title: "Assemble", detail: "<p>Each source file becomes an object file: machine code with <i>holes</i> where addresses of other functions and variables are not known yet.</p>" },
      { from: 3, to: 3, label: "place sections", title: "Link", detail: "<p>The linker combines all object files and libraries, decides the final address of every function and variable using the linker script (flash at <code>0x08000000</code>, RAM at <code>0x20000000</code>), fills the holes, and drops unused sections.</p>", analogy: "Typesetting a book: chapters written separately get page numbers, and every \"see page …\" is filled in." },
      { from: 3, to: 4, label: "app.elf", title: "ELF output", detail: "<p>The ELF holds code, data, symbol names and debug info. The debugger uses all of it.</p>" },
      { from: 4, to: 5, kind: "bus", label: "app.bin via SWD", title: "Program the chip", detail: "<p>Only the bytes that must be in flash are written: vector table, code, constants and the initial values of <code>.data</code>. Names and debug info never reach the chip.</p>" },
    ],
  });
})();
