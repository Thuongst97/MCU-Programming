/* SPDX-License-Identifier: MIT
   Module 02 · Setting Up and Running a Program on STM32F103C8T6 Blue Pill:
   wiring view, annotated code, register views, memory maps, the flashing sequence and the checklist. */
(function () {
  "use strict";
  const { $, renderCodeExplorer, embedded, SequenceDiagram, Pinout, Register, MemoryMap, Checklist } = window.MCU;
  const explore = (host, id, notes) => renderCodeExplorer($(host), { ...embedded(id), notes });

  Pinout($("#po-wiring"), { board: "bluepill", mode: "wiring", ...window.MCU_DATA.wiring["00"] });

  /* ---------------------------------------------------------- example 00, bare metal */
  const MAIN = {
    1: ["Clock the port first", "Every peripheral starts with its clock gated off to save power. Until <code>IOPCEN</code> is set in <code>RCC_APB2ENR</code>, writes to GPIOC are ignored and reads return 0 (RM0008 §7.3.7)."],
    2: ["Clear the old configuration", "<code>CRH</code> holds 4 bits for each of pins 8–15. Mask out pin 13's MODE and CNF bits first so leftover bits cannot combine with the new ones. This is a read-modify-write: the other seven pins keep their settings."],
    3: ["Output, 2 MHz, push-pull", "<code>MODE13 = 10</code> means output with a 2 MHz edge rate; <code>CNF13 = 00</code> means push-pull. 2 MHz is the fastest PC13 is allowed to switch (DS5319)."],
    4: ["BSRR: set or reset in one write", "Writing 1 to bit 29 (<code>BR13</code>) drives PC13 low and touches nothing else. No read-modify-write, so an interrupt cannot corrupt the other pins in between (RM0008 §9.2.5). Low = LED on, because the LED's other leg is at 3.3 V."],
    5: ["Why volatile here", "Without <code>volatile</code> the optimizer sees a loop with no effect and deletes it. With it, every iteration really reads and writes <code>i</code>, so the delay scales with the CPU clock, which is the point of this demo."],
    6: ["Start the crystal", "<code>HSEON</code> starts the 8 MHz crystal oscillator. A crystal needs time to start oscillating stably; hardware raises <code>HSERDY</code> when it has."],
    7: ["Wait states before speed", "Flash cannot be read in one 72 MHz cycle. <code>LATENCY</code> = 2 inserts two wait states, the value required above 48 MHz, and it must be set <i>before</i> the clock goes up. <code>PRFTBE</code> keeps the prefetch buffer on, which hides most of the wait states for straight-line code."],
    8: ["APB1 must stay ≤ 36 MHz", "TIM2–4, USART2/3, I2C, SPI2, CAN and USB sit on APB1, whose maximum is 36 MHz. Dividing by 2 keeps it legal at 72 MHz. APB2 may run at the full 72 MHz."],
    9: ["8 MHz × 9", "<code>PLLSRC</code> selects HSE as the PLL input and <code>PLLMULL9</code> multiplies by 9. These bits may only change while the PLL is off, which it still is."],
    10: ["Request the switch", "Writing <code>SW = PLL</code> asks the clock controller to move SYSCLK to the PLL. Clear the old SW bits first so the value is exactly 10."],
    11: ["Confirm in SWS, with a timeout", "The switch takes a few cycles. <code>SWS</code> is the hardware's answer. Every wait on a hardware flag has an upper bound: if the crystal is missing, the program keeps running on HSI and reports a status code instead of hanging."],
    12: ["Two clocks for one job", "The USART needs its own clock and so does GPIOA, whose pins it uses. Both live on APB2."],
    13: ["PA9 to the USART, PA10 as input", "<code>CNF9 = 10</code> (alternate-function push-pull) gives control of PA9 to USART1's transmitter. <code>MODE9 = 11</code> allows fast edges. PA10 stays a floating input; the receiver reads it directly (RM0008 §9.1.11)."],
    14: ["Baud rate divider", "<code>BRR</code> holds f<sub>PCLK2</sub> ÷ baud as a fixed-point number with 4 fraction bits. Computing it as one integer division with rounding gives the same bits: 72 000 000 ÷ 115 200 = 625 = <code>0x271</code> (mantissa 39, fraction 1)."],
    15: ["Enable last", "Set the transmitter (<code>TE</code>), receiver (<code>RE</code>) and the USART itself (<code>UE</code>) after the baud rate and pins are ready."],
    16: ["Wait until the data register is free", "<code>TXE</code> means the previous byte has moved into the shift register, so <code>DR</code> may take the next one. The loop is bounded, like every hardware wait in this course."],
    17: ["Phase 1: 8 MHz", "Five blinks on HSI with the busy-wait delay."],
    18: ["Phase 2: 72 MHz", "The same loop after the clock switch. On hardware it blinks visibly faster. The status is printed later, once the UART works."],
    19: ["Phase 3: real timing", "<code>SysTick_Config()</code> (CMSIS) loads the core's 24-bit SysTick timer to wrap every 72 000 cycles, that is every 1 ms, and enables its interrupt. <code>SysTick_Handler</code> counts milliseconds in <code>s_ms</code>."],
    20: ["Hello!", "The greeting includes the measured clock, so a failed switch is obvious in the output: it would say 8 MHz and a non-zero status."],
    21: ["Timing from the tick, not from loops", "From here on, timing depends on the millisecond counter only. Changing the clock or the optimizer no longer changes how fast the LED blinks."],
  };
  explore("#ex-led", "src-00-led", MAIN);
  explore("#ex-delay", "src-00-delay", MAIN);
  explore("#ex-clock", "src-00-clock", MAIN);
  explore("#ex-uart", "src-00-uart", MAIN);
  explore("#ex-main", "src-00-main", MAIN);

  Register($("#reg-crh"), { reg: "GPIOx_CRH", port: "GPIOC", value: 0x44244444, show: ["MODE13", "CNF13", "MODE14", "CNF14"] });
  Register($("#reg-cfgr"), { reg: "RCC_CFGR", value: 0x001d040a, show: ["SW", "SWS", "HPRE", "PPRE1", "PPRE2", "PLLSRC", "PLLXTPRE", "PLLMUL", "ADCPRE"] });

  /* ---------------------------------------------------------- HAL path */
  explore("#ex-hal", "src-00-hal-main", {
    1: ["HAL_Init()", "Sets up SysTick for a 1 ms tick (HAL needs it for its timeouts and <code>HAL_Delay</code>) and the NVIC priority grouping. Without it, every HAL timeout would hang."],
    2: ["SystemClock_Config()", "Generated by CubeMX from the clock configuration tab. It does the same HSE → PLL × 9 → 72 MHz steps as the register version, through <code>HAL_RCC_OscConfig</code> and <code>HAL_RCC_ClockConfig</code>."],
    3: ["HAL_GPIO_WritePin", "Ends up as one write to <code>GPIOC-&gt;BSRR</code>, after a parameter check and a branch. Still active-low: <code>GPIO_PIN_RESET</code> turns the LED on."],
    4: ["HAL_Delay", "Busy-waits on the millisecond counter that SysTick increments. Simple, but the CPU can do nothing else meanwhile; <a href=\"interrupts.html#scheduler\">module 06</a> shows a non-blocking alternative."],
  });

  /* ---------------------------------------------------------- startup + linker */
  const STARTUP = {
    1: ["Copy .data", "Initialised globals (<code>uint32_t x = 5;</code>) live in RAM, but RAM is empty at power-on. The linker stored their initial values in flash, starting at <code>_sidata</code>; this loop copies them to their RAM addresses <code>_sdata</code>…<code>_edata</code>."],
    2: ["Zero .bss", "C guarantees that globals without an initialiser start at 0. They are grouped in <code>.bss</code>, which takes no flash at all: the startup code simply writes zeros over <code>_sbss</code>…<code>_ebss</code>."],
    3: ["SystemInit()", "The CMSIS hook for early hardware setup. Ours only points <code>SCB-&gt;VTOR</code> at the vector table in flash and sets <code>SystemCoreClock</code> to 8 MHz; clocks are configured by the application so you see every step."],
    4: ["main()", "Your program. On a microcontroller there is nothing to return to, so if <code>main()</code> ever returns, the CPU spins in the loop below where a debugger can see it."],
    5: ["Weak aliases", "Each handler name is a weak alias for <code>Default_Handler</code>. Define <code>void SysTick_Handler(void)</code> anywhere and the linker picks yours; otherwise an unexpected interrupt lands in the visible endless loop."],
    6: ["A section of its own", "The table goes into <code>.isr_vector</code>, which the linker script places first in flash at <code>0x08000000</code>. <code>used</code> stops the compiler from discarding a table nothing refers to."],
    7: ["Word 0: the stack pointer", "The Cortex-M3 loads word 0 into SP before running a single instruction (ARM DDI 0403). <code>_estack</code> is the top of RAM, <code>0x20005000</code>; the stack grows downwards from there."],
    8: ["Word 1: where to start", "Word 1 is the reset vector: the address of <code>Reset_Handler</code>. The CPU jumps there. Its lowest bit is 1 to mark Thumb code, which the compiler takes care of."],
  };
  explore("#ex-reset", "src-00-reset", STARTUP);
  explore("#ex-vectors", "src-00-vectors", STARTUP);
  explore("#ex-ld", "src-00-ld", {
    1: ["ENTRY", "Names the program's entry point for the ELF header and for debuggers. The hardware itself uses the reset vector."],
    2: ["MEMORY", "The two regions the chip really has: 64 KB of flash at <code>0x08000000</code> and 20 KB of SRAM at <code>0x20000000</code> (DS5319 memory map). Nothing above 64 KB is used."],
    3: ["_estack", "The initial stack pointer, computed from the RAM region, so it is always the true end of RAM: <code>0x20005000</code>. It is 8-byte aligned, as the Arm calling convention requires."],
    4: [".isr_vector first", "The vector table must sit at the start of flash, because that is where the core looks after reset (with BOOT0 = 0, flash is aliased at address 0)."],
    5: ["_sidata = LOADADDR(.data)", "Where in flash the initial values of <code>.data</code> are stored: the address the startup code copies from."],
    6: [">RAM AT> FLASH", "The key line: <code>.data</code> <i>runs</i> in RAM (its VMA) but is <i>stored</i> in flash (its LMA). The memory map below shows both copies."],
    7: ["Reserve heap and stack", "A NOLOAD section that only checks there is room left for a minimum stack and heap. If globals grow too big, the link fails instead of the stack silently overwriting them at run time."],
  });
  MemoryMap($("#mm-00"), { map: "00-bluepill-blink-uart" });
  MemoryMap($("#mm-00-hal"), { map: "00-bluepill-blink-uart-hal" });

  /* ---------------------------------------------------------- CMake */
  const CMAKE = {
    1: ["CMAKE_SYSTEM_NAME Generic", "Tells CMake there is no operating system on the target: no shared libraries, no host system headers."],
    2: ["Test as a static library", "CMake test-compiles a tiny program to check the compiler works. Linking it would need our linker script, so it builds a static library instead."],
    3: ["Find the compiler", "Looks for <code>arm-none-eabi-gcc</code> on <code>PATH</code>, or in <code>ARM_TOOLCHAIN_DIR</code> if you set it. The objcopy and size tools come from the same folder."],
    4: ["The cross compiler", "From here on, every compile uses the Arm compiler, never your host's <code>gcc</code> or <code>cl.exe</code>."],
    5: ["Which CPU", "<code>-mcpu=cortex-m3 -mthumb</code> selects the ARMv7-M Thumb-2 instruction set. The Cortex-M3 has no FPU, so no float ABI flags are needed."],
    6: ["Strict warnings", "<code>-Werror</code> turns every warning into an error. <code>-ffunction-sections -fdata-sections</code> put each function and variable in its own section so the linker can drop unused ones. <code>-g3</code> keeps full debug info; it does not go into flash."],
    7: ["Linker script and C library", "<code>-T</code> passes our linker script. <code>nano.specs</code> selects newlib-nano, a small C library; <code>nosys.specs</code> provides stubs for system calls that do not exist without an OS."],
    8: ["Drop unused code, write a map", "<code>--gc-sections</code> removes every section nothing refers to. <code>-Map</code> writes the map file, and <code>--print-memory-usage</code> prints the flash/RAM table after every build."],
    9: ["Images for programmers", "The ELF contains debug info and addresses. <code>objcopy</code> extracts the bytes to program as Intel HEX and raw binary, for tools that cannot read ELF."],
    10: ["flash-&lt;name&gt;", "A custom target that runs OpenOCD with the course's configuration and programs, verifies and resets in one go."],
  };
  explore("#ex-toolchain", "src-cmake-toolchain", CMAKE);
  explore("#ex-flags", "src-cmake-flags", CMAKE);
  explore("#ex-link", "src-cmake-link", CMAKE);

  /* ---------------------------------------------------------- OpenOCD + flashing sequence */
  explore("#ex-ocd", "src-ocd-cfg", {
    1: ["The probe", "Loads OpenOCD's driver for ST-Link probes."],
    2: ["SWD", "The ST-Link speaks SWD through its own high-level firmware interface (hla). JTAG would need more pins."],
    3: ["64 KB, explicitly", "OpenOCD normally asks the chip for its flash size, and many C8 chips answer 128 KB. Setting <code>FLASH_SIZE</code> before loading the target script makes OpenOCD use the specified 64 KB."],
    4: ["The target", "OpenOCD's STM32F1 target script: the Cortex-M3 core, the SW-DP ID it expects, and the flash driver."],
    5: ["1 MHz SWD clock", "Conservative and reliable with long jumper wires. Faster works with short wires, but it saves little time on a 64 KB chip."],
  });
  SequenceDiagram($("#seq-flash"), {
    ariaLabel: "Sequence of flashing the Blue Pill through OpenOCD and the ST-Link",
    lanes: [
      { title: "CMake / Ninja", sub: "your PC", tone: "tool" },
      { title: "OpenOCD", sub: "bluepill.cfg", tone: "tool" },
      { title: "ST-Link V2", sub: "USB ↔ SWD", tone: "hw" },
      { title: "Debug port", sub: "SW-DP + core", tone: "hw" },
      { title: "Flash", sub: "FPEC, 64 KB", tone: "hw" },
    ],
    steps: [
      { from: 0, to: 1, kind: "call", label: "openocd -f bluepill.cfg", title: "The flash target starts OpenOCD",
        detail: "<p>Ninja rebuilds the ELF if needed, then runs OpenOCD with the course configuration and the command <code>program … verify reset exit</code>.</p>",
        analogy: "Handing a parcel and a delivery note to a courier." },
      { from: 1, to: 2, kind: "bus", label: "USB: open probe", title: "OpenOCD opens the ST-Link over USB",
        detail: "<p>The probe reports its firmware version and the target voltage it measures on its 3.3 V pin. A reading near 0 V means the board is not powered.</p>" },
      { from: 2, to: 3, kind: "bus", label: "SWD: read IDCODE", title: "The probe wakes the debug port",
        detail: "<p>The ST-Link sends the SWD line-reset sequence on SWDIO/SWCLK and reads the debug port's ID. A genuine STM32F1 answers <code>0x1ba01477</code>; clone chips answer <code>0x2ba01477</code> and need <code>bluepill-clone.cfg</code>.</p>",
        analogy: "Knocking on the door and checking the name plate." },
      { from: 1, to: 3, kind: "bus", label: "halt the core", title: "The CPU is stopped",
        detail: "<p>OpenOCD writes the core's debug halting control register. The CPU freezes between two instructions; your program is not running while its own flash is rewritten.</p>" },
      { from: 1, to: 4, kind: "bus", label: "unlock + erase pages", title: "Unlock and erase",
        detail: "<p>The flash controller is locked after reset. Writing the two key values to <code>FLASH_KEYR</code> unlocks it (PM0075). Then each 1 KB page that will hold the program is erased to all 1s.</p>" },
      { from: 1, to: 4, kind: "bus", label: "program half-words", title: "Program",
        detail: "<p>The F1 flash is written 16 bits at a time. To be fast, OpenOCD loads a small helper routine into SRAM and lets the Cortex-M3 itself copy the data into flash, instead of sending every half-word over SWD.</p>",
        analogy: "Instead of carrying bricks one by one, the courier brings a helper who builds the wall on site." },
      { from: 4, to: 1, kind: "ret", label: "verify", title: "Verify",
        detail: "<p>OpenOCD reads the flash back (or a checksum of it) and compares it with the ELF. Any difference fails the command.</p>" },
      { from: 1, to: 3, kind: "irq", label: "reset", title: "Reset and run",
        detail: "<p>A system reset request makes the core start again from the vector table at <code>0x08000000</code>: load SP, jump to <code>Reset_Handler</code>, and your program runs. OpenOCD exits.</p>" },
    ],
  });

  Checklist($("#ck-setup"), [
    "<code>openocd -f examples/common/openocd/bluepill.cfg -c \"init; reset halt; exit\"</code> finds a Cortex-M3 (or you switched to <code>bluepill-clone.cfg</code>).",
    "<code>cmake --build --preset bluepill-debug</code> finishes and prints the memory-usage table.",
    "After flashing, PC13 blinks five times slowly, five times fast, then steadily at 1 Hz.",
    "Your terminal shows <code>Hello from Blue Pill @ 72 MHz</code> and <code>clock status: 0</code>.",
    "You stopped at a breakpoint in <code>clock_72mhz()</code> and saw <code>RCC_CFGR.SWS</code> change in the peripheral view.",
    "The Renode test <code>00.robot</code> passes on your machine (optional).",
    "You can explain why the LED is on when PC13 is low, and why <code>FLASH_ACR</code> is written before the PLL is selected.",
  ], { key: "setup" });
})();
