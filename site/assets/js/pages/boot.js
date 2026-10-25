/* SPDX-License-Identifier: MIT
   Module 03 · Startup Code, Vector Table & Linker Scripts. */
(function () {
  "use strict";
  const { $, renderCodeExplorer, embedded, SequenceDiagram, MemoryMap, Checklist } = window.MCU;
  const explore = (host, id, notes) => renderCodeExplorer($(host), { ...embedded(id), notes });

  SequenceDiagram($("#seq-reset"), {
    ariaLabel: "What the Cortex-M3 does from reset to main()",
    laneW: 160,
    lanes: [
      { title: "Reset logic", sub: "power-on, NRST, watchdog", tone: "hw" },
      { title: "Cortex-M3", sub: "core registers", tone: "hw" },
      { title: "Flash", sub: "vector table @0x08000000", tone: "hw" },
      { title: "Reset_Handler", sub: "startup.c", tone: "asw" },
      { title: "main()", sub: "your program", tone: "asw" },
    ],
    steps: [
      { from: 0, to: 1, kind: "irq", label: "reset released", title: "Reset is released",
        detail: "<p>Power-on, the NRST pin, a watchdog or a software request all end the same way: the core starts from a known state, running on the 8 MHz HSI, in privileged Thread mode, with interrupts enabled but every peripheral interrupt disabled.</p>",
        analogy: "Pressing the start button of a machine: the operator begins with the first page of the manual, every time." },
      { from: 1, to: 2, kind: "bus", label: "read word 0", title: "Load the stack pointer",
        detail: "<p>The core reads the 32-bit word at address 0 (aliased to <code>0x08000000</code> when BOOT0 = 0) into the main stack pointer, MSP. For our program that is <code>_estack</code> = <code>0x20005000</code>, the top of RAM.</p>" },
      { from: 1, to: 2, kind: "bus", label: "read word 1", title: "Load the reset vector",
        detail: "<p>Word 1 is the address of <code>Reset_Handler</code>, with bit 0 set to mark Thumb code. The core loads it into PC. No instruction has run yet.</p>" },
      { from: 1, to: 3, kind: "call", label: "jump", title: "Reset_Handler runs",
        detail: "<p>From here on, it is ordinary compiled C. The stack already works, so function calls and local variables are fine; global variables are not initialised yet.</p>" },
      { from: 3, to: 3, label: "copy .data, zero .bss", title: "Prepare RAM",
        detail: "<p>Copies the initial values of <code>.data</code> from flash to RAM and fills <code>.bss</code> with zeros, using the addresses the linker script exported (<code>_sidata</code>, <code>_sdata</code>, <code>_edata</code>, <code>_sbss</code>, <code>_ebss</code>).</p>",
        analogy: "Unpacking the suitcase (flash) into the hotel room (RAM) and emptying the drawers you didn't bring anything for." },
      { from: 3, to: 3, label: "SystemInit()", title: "Early system setup",
        detail: "<p>Points <code>SCB-&gt;VTOR</code> at the vector table and sets <code>SystemCoreClock</code>. Clock changes happen later, in your code.</p>" },
      { from: 3, to: 4, kind: "call", label: "main()", title: "Your program starts",
        detail: "<p><code>main()</code> never returns on a microcontroller. If it did, <code>Reset_Handler</code> would park the CPU in an endless loop where the debugger can see it.</p>" },
    ],
  });

  const STARTUP = {
    1: ["Copy .data", "Reads from the load address in flash (<code>_sidata</code>) and writes to the run address in RAM (<code>_sdata</code> up to <code>_edata</code>), one 32-bit word at a time."],
    2: ["Zero .bss", "The C standard says objects without an initialiser start at zero. <code>.bss</code> has no bytes in flash at all; this loop creates the zeros."],
    3: ["SystemInit()", "CMSIS's hook for early hardware setup. It runs after the copy so it may use initialised globals."],
    4: ["main()", "Your program. The <code>(void)</code> cast says on purpose that the return value is ignored: there is no one to return it to."],
    5: ["Weak alias", "<code>weak</code>: a stronger definition elsewhere wins. <code>alias(\"Default_Handler\")</code>: until then, this name is just another name for <code>Default_Handler</code>."],
    6: [".isr_vector", "The section the linker script places first in flash. <code>used</code> keeps the array even though no code refers to it."],
    7: ["Initial SP", "Not a function at all: the address of the top of the stack, cast to the table's type because the hardware wants it in slot 0."],
    8: ["Reset vector", "Where the CPU jumps after loading SP."],
    10: ["Compile-time size check", "<code>USBWakeUp_IRQn</code> is the last IRQ number in ST's header (42). 16 system slots + 43 interrupts = 59 entries; any mismatch stops the build."],
  };
  explore("#ex-vectors", "src-boot-vectors", STARTUP);
  explore("#ex-weak", "src-boot-weak", STARTUP);
  explore("#ex-guard", "src-boot-guard", STARTUP);
  explore("#ex-reset", "src-boot-reset", STARTUP);
  const LD = {
    1: ["ENTRY", "Records the entry point in the ELF header. Debuggers use it; the chip uses the reset vector."],
    2: ["MEMORY", "Names the regions and their sizes. <code>rx</code> and <code>xrw</code> are attributes the linker uses to place sections that are not assigned explicitly."],
    3: ["_estack", "A symbol, not a variable: it has an address but no storage. The startup code uses its address as the initial stack pointer."],
    5: ["_sidata", "<code>LOADADDR(.data)</code> is where the initial values sit in flash."],
    6: ["VMA in RAM, LMA in flash", "<code>&gt;RAM</code>: addresses used by the code are in RAM. <code>AT&gt; FLASH</code>: the bytes are stored in flash, right after <code>.text</code>."],
  };
  explore("#ex-ldmem", "src-boot-ldmem", LD);
  explore("#ex-lddata", "src-boot-lddata", LD);
  MemoryMap($("#mm-boot"), { map: "00-bluepill-blink-uart" });

  Checklist($("#ck-boot"), [
    "You can say which two words the core reads before running any instruction, and from where.",
    "You found <code>_estack</code>, <code>_sidata</code> and <code>_ebss</code> in the output of <code>arm-none-eabi-nm</code> for example 00.",
    "You can explain why <code>uint32_t x = 5;</code> takes space in both flash and RAM, but <code>uint32_t y;</code> only in RAM.",
    "You stepped through <code>Reset_Handler</code> in the debugger and watched <code>SystemCoreClock</code> (a <code>.data</code> variable) receive its value 8000000 in the copy loop.",
    "You know what happens when an interrupt has no handler, and how to spot it in the debugger.",
  ], { key: "boot" });
})();
