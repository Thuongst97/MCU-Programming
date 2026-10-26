/* SPDX-License-Identifier: MIT
   Module 02 · Setting Up and Running a Program on the NUCLEO-G474RE:
   board view, annotated code, register views, memory maps, the flashing sequence and the checklist. */
(function () {
  "use strict";
  const { $, renderCodeExplorer, embedded, SequenceDiagram, Pinout, Register, MemoryMap, Checklist } = window.MCU;
  const explore = (host, id, notes) => renderCodeExplorer($(host), { ...embedded(id), notes });

  Pinout($("#po-wiring"), { board: "nucleo", mode: "functions", highlight: ["PA5", "PC13", "PA2", "PA3", "PA13", "PA14"],
    labels: { PA5: "LD2", PC13: "B1", PA2: "LPUART1_TX", PA3: "LPUART1_RX", PA13: "SWDIO", PA14: "SWCLK" } });

  /* ---------------------------------------------------------- example 00, bare metal */
  const MAIN = {
    1: ["Clock the port first", "Every peripheral starts with its clock gated off to save power. Until <code>GPIOAEN</code> is set in <code>RCC_AHB2ENR</code>, writes to GPIOA are ignored (RM0440, RCC). The dummy read on the next line waits until the enable has really reached the RCC before GPIOA is touched."],
    2: ["Clear the old mode", "<code>MODER</code> holds 2 bits for each of the 16 pins of port A. Mask out pin 5's bits first so leftover bits cannot combine with the new ones. It is a read-modify-write: the other 15 pins, including the SWD pins PA13/PA14, keep their settings."],
    3: ["01 = general-purpose output", "After reset almost every pin is in analog mode (<code>11</code>), which saves power. <code>MODE5 = 01</code> makes PA5 an output; <code>OTYPER</code> and <code>OSPEEDR</code> keep their reset values: push-pull, low speed, which is plenty for an LED."],
    4: ["BSRR: set or reset in one write", "Writing 1 to bit 5 (<code>BS5</code>) drives PA5 high and touches nothing else. No read-modify-write, so an interrupt cannot corrupt the other pins in between (RM0440, GPIO). High = LD2 on: the LED's other leg goes to ground through a resistor."],
    5: ["Why volatile here", "Without <code>volatile</code> the optimiser sees a loop with no effect and deletes it. With it, every iteration really reads and writes <code>i</code>, so the delay scales with the CPU clock, which is the point of this demo."],
    6: ["Boost mode first", "Above 150 MHz the core regulator must run in range 1 <i>boost</i> mode: clear <code>PWR_CR5.R1MODE</code>. The PWR block needs its own clock (<code>PWREN</code>) before you can write it."],
    7: ["Wait states before speed", "Flash cannot be read in one 170 MHz cycle. <code>FLASH_ACR_LATENCY_4WS</code> inserts four wait states, the value required up to 170 MHz in boost mode, and it must be set <i>before</i> the clock goes up. The instruction and data caches and prefetch hide most of them."],
    8: ["PLL input: HSI16 ÷ 4", "<code>PLLSRC_HSI</code> feeds the PLL from HSI16; PLLM holds the divider minus one, so <code>4 − 1</code> gives 4 MHz, inside the PLL's allowed input range. These fields may only change while the PLL is off, which it still is."],
    9: ["× 85, ÷ 2", "PLLN = 85 gives a 340 MHz VCO; the R output divides by 2 (<code>PLLR = 00</code>) for 170 MHz. <code>PLLREN</code> enables that output: without it the PLL locks but nothing can use it."],
    10: ["Half speed for the jump", "When SYSCLK goes above 80 MHz, the AHB must run at ÷ 2 for at least 1 µs first, so the current drawn from the supply rises in two steps (RM0440, RCC). The code sets HPRE to ÷ 2, switches, waits, then goes to ÷ 1."],
    11: ["Confirm in SWS, with a timeout", "The switch takes a few cycles. <code>SWS</code> is the hardware's answer. Every wait on a hardware flag has an upper bound: if the PLL does not lock, the program keeps running on HSI16 and reports a status code instead of hanging."],
    12: ["LPUART1's clock", "LPUART1 sits on APB1, but in the second enable register, <code>RCC_APB1ENR2</code>. GPIOA's clock is already on from <code>led_init()</code>."],
    13: ["Hand PA2/PA3 to LPUART1", "Each pin's alternate function is a 4-bit number in <code>AFR[0]</code> (pins 0–7) or <code>AFR[1]</code> (8–15). AF12 connects PA2/PA3 to LPUART1 (DS12288). The next statement switches both pins to alternate-function mode (<code>10</code>)."],
    14: ["Baud rate divider", "LPUART divides differently from the USARTs: <code>BRR</code> = 256 × f<sub>ck</sub> ÷ baud, a 20-bit value. 256 × 170 000 000 ÷ 115 200 = 377 777.8, rounded to 377 778 (<code>0x5C3B2</code>)."],
    15: ["Enable", "Set the transmitter (<code>TE</code>), receiver (<code>RE</code>) and the LPUART itself (<code>UE</code>) after the baud rate and pins are ready."],
    16: ["Wait until the data register is free", "<code>TXE</code> (called <code>TXE_TXFNF</code> in the header because it doubles as \"FIFO not full\") means the previous byte has moved on, so <code>TDR</code> may take the next one. The loop is bounded, like every hardware wait in this course."],
    17: ["Phase 1: 16 MHz", "Five blinks on HSI16 with the busy-wait delay."],
    18: ["Phase 2: 170 MHz", "The same loop after the clock switch. On hardware it blinks visibly faster. The status is printed later, once the UART works."],
    19: ["Phase 3: real timing", "<code>SysTick_Config()</code> (CMSIS) loads the core's 24-bit SysTick timer to wrap every 170 000 cycles, that is every 1 ms, and enables its interrupt. <code>SysTick_Handler</code> counts milliseconds in <code>s_ms</code>."],
    20: ["Hello!", "The greeting includes the clock, so a failed switch is obvious in the output: it would say 16 MHz and a non-zero status."],
    21: ["Timing from the tick, not from loops", "From here on, timing depends on the millisecond counter only. Changing the clock or the optimiser no longer changes how fast the LED blinks."],
  };
  explore("#ex-led", "src-00-led", MAIN);
  explore("#ex-delay", "src-00-delay", MAIN);
  explore("#ex-clock", "src-00-clock", MAIN);
  explore("#ex-uart", "src-00-uart", MAIN);
  explore("#ex-main", "src-00-main", MAIN);

  Register($("#reg-moder"), { reg: "GPIOx_MODER", port: "GPIOA", value: 0xABFFF7FF, show: ["MODE5", "MODE2", "MODE3", "MODE13", "MODE14"] });
  Register($("#reg-pllcfgr"), { reg: "RCC_PLLCFGR", value: 0x01005532 });
  Register($("#reg-cfgr"), { reg: "RCC_CFGR", value: 0x0000000f, show: ["SW", "SWS", "HPRE", "PPRE1", "PPRE2"] });

  /* ---------------------------------------------------------- HAL path */
  explore("#ex-hal", "src-00-hal-main", {
    1: ["HAL_Init()", "Sets up SysTick for a 1 ms tick (HAL needs it for its timeouts and <code>HAL_Delay</code>) and the NVIC priority grouping. Without it, every HAL timeout would hang."],
    2: ["SystemClock_Config()", "Generated by CubeMX from the clock configuration tab. It does the same HSI16 → PLL → 170 MHz steps as the register version, through <code>HAL_RCC_OscConfig</code> and <code>HAL_RCC_ClockConfig</code>."],
    3: ["HAL_GPIO_WritePin", "Ends up as one write to <code>GPIOA-&gt;BSRR</code>, after a parameter check and a branch. Active-high: <code>GPIO_PIN_SET</code> turns LD2 on."],
    4: ["HAL_Delay", "Busy-waits on the millisecond counter that SysTick increments. Simple, but the CPU can do nothing else meanwhile; <a href=\"interrupts.html#scheduler\">module 06</a> shows a non-blocking alternative."],
    5: ["Boost mode", "The HAL's name for clearing <code>PWR_CR5.R1MODE</code>: range 1 boost, needed above 150 MHz."],
    6: ["HAL_RCC_OscConfig", "Starts HSI16, configures and starts the PLL and waits for it to lock, with the HAL's own timeouts."],
    7: ["APB prescalers", "Both APB buses at ÷ 1: on the G4 they may run at the full 170 MHz."],
    8: ["HAL_RCC_ClockConfig", "Sets the flash latency, performs the AHB ÷ 2 step itself when SYSCLK goes above 80 MHz, switches SYSCLK and sets the prescalers. <code>FLASH_LATENCY_4</code> is the HAL's name for four wait states."],
  });

  /* ---------------------------------------------------------- startup + linker */
  const STARTUP = {
    9: ["FPU on, first", "The FPU's coprocessors CP10 and CP11 are disabled after reset. Code built with <code>-mfloat-abi=hard</code> may use FPU registers anywhere, even in a struct copy, so they are enabled before any other C code runs. <code>__DSB</code>/<code>__ISB</code> make sure the next instructions see the change (PM0214)."],
    1: ["Copy .data", "Initialised globals (<code>uint32_t x = 5;</code>) live in RAM, but RAM is empty at power-on. The linker stored their initial values in flash, starting at <code>_sidata</code>; this loop copies them to their RAM addresses <code>_sdata</code>…<code>_edata</code>."],
    2: ["Zero .bss", "C guarantees that globals without an initialiser start at 0. They are grouped in <code>.bss</code>, which takes no flash at all: the startup code simply writes zeros over <code>_sbss</code>…<code>_ebss</code>."],
    3: ["SystemInit()", "The CMSIS hook for early hardware setup. Ours only points <code>SCB-&gt;VTOR</code> at the vector table in flash and sets <code>SystemCoreClock</code> to 16 MHz; clocks are configured by the application so you see every step."],
    4: ["main()", "Your program. On a microcontroller there is nothing to return to, so if <code>main()</code> ever returns, the CPU spins in the loop below where a debugger can see it."],
    5: ["Weak aliases", "Each handler name is a weak alias for <code>Default_Handler</code>. Define <code>void SysTick_Handler(void)</code> anywhere and the linker picks yours; otherwise an unexpected interrupt lands in the visible endless loop."],
    6: ["A section of its own", "The table goes into <code>.isr_vector</code>, which the linker script places first in flash at <code>0x08000000</code>. <code>used</code> stops the compiler from discarding a table nothing refers to. 16 core entries plus 102 interrupt lines on the G474."],
    7: ["Word 0: the stack pointer", "The Cortex-M4 loads word 0 into SP before running a single instruction (ARM DDI 0403). <code>_estack</code> is the top of SRAM1+SRAM2, <code>0x20018000</code>; the stack grows downwards from there."],
    8: ["Word 1: where to start", "Word 1 is the reset vector: the address of <code>Reset_Handler</code>. The CPU jumps there. Its lowest bit is 1 to mark Thumb code, which the compiler takes care of."],
  };
  explore("#ex-reset", "src-00-reset", STARTUP);
  explore("#ex-vectors", "src-00-vectors", STARTUP);
  explore("#ex-ld", "src-00-ld", {
    1: ["ENTRY", "Names the program's entry point for the ELF header and for debuggers. The hardware itself uses the reset vector."],
    2: ["MEMORY", "The regions the chip really has: 512 KB of flash at <code>0x08000000</code>, SRAM1+SRAM2 as one 96 KB region at <code>0x20000000</code>, and the 32 KB CCM SRAM at <code>0x10000000</code> (RM0440 memory map). Nothing is placed in CCM SRAM unless a section asks for it."],
    3: ["_estack", "The initial stack pointer, computed from the RAM region, so it is always the true end of SRAM2: <code>0x20018000</code>. It is 8-byte aligned, as the Arm calling convention requires."],
    4: [".isr_vector first", "The vector table must sit at the start of flash, because that is where the core looks after reset (flash is aliased at address 0 in the normal boot mode)."],
    5: ["_sidata = LOADADDR(.data)", "Where in flash the initial values of <code>.data</code> are stored: the address the startup code copies from."],
    6: [">RAM AT> FLASH", "The key line: <code>.data</code> <i>runs</i> in RAM (its VMA) but is <i>stored</i> in flash (its LMA). The memory map below shows both copies."],
    7: ["Reserve heap and stack", "A NOLOAD section that only checks there is room left for a minimum stack and heap. If globals grow too big, the link fails instead of the stack silently overwriting them at run time."],
  });
  MemoryMap($("#mm-00"), { map: "00-nucleo-blink-uart" });
  MemoryMap($("#mm-00-hal"), { map: "00-nucleo-blink-uart-hal" });

  /* ---------------------------------------------------------- CMake */
  const CMAKE = {
    1: ["CMAKE_SYSTEM_NAME Generic", "Tells CMake there is no operating system on the target: no shared libraries, no host system headers."],
    2: ["Test as a static library", "CMake test-compiles a tiny program to check the compiler works. Linking it would need our linker script, so it builds a static library instead."],
    3: ["Find the compiler", "Looks for <code>arm-none-eabi-gcc</code> on <code>PATH</code>, or in <code>ARM_TOOLCHAIN_DIR</code> if you set it. The objcopy and size tools come from the same folder."],
    4: ["The cross compiler", "From here on, every compile uses the Arm compiler, never your host's <code>gcc</code> or <code>cl.exe</code>."],
    5: ["Which CPU and FPU", "<code>-mcpu=cortex-m4 -mthumb</code> selects the ARMv7E-M Thumb-2 instruction set. <code>-mfpu=fpv4-sp-d16</code> names the Cortex-M4's single-precision FPU, and <code>-mfloat-abi=hard</code> passes <code>float</code> arguments in FPU registers. Every object file and library in a program must use the same float ABI, or the link fails."],
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
    1: ["The probe", "Loads OpenOCD's driver for ST-LINK probes; it covers the V2 and the V3 on the NUCLEO."],
    2: ["SWD", "The ST-LINK speaks SWD through its own high-level firmware interface (hla). JTAG would need more pins."],
    3: ["The target", "OpenOCD's STM32G4 target script: the Cortex-M4 core, the debug-port ID it expects, and the flash driver. The driver reads the flash size and bank mode from the chip."],
    4: ["Reset line", "The NUCLEO wires the ST-LINK's reset output to NRST, so OpenOCD can reset the chip in hardware. That also makes <i>connect under reset</i> possible when a program has locked the SWD pins."],
    5: ["4 MHz SWD clock", "The probe and the target sit centimetres apart on one PCB, so a fast clock is reliable."],
  });
  SequenceDiagram($("#seq-flash"), {
    ariaLabel: "Sequence of flashing the NUCLEO-G474RE through OpenOCD and the on-board ST-LINK",
    lanes: [
      { title: "CMake / Ninja", sub: "your PC", tone: "tool" },
      { title: "OpenOCD", sub: "nucleo-g474re.cfg", tone: "tool" },
      { title: "ST-LINK/V3E", sub: "USB ↔ SWD", tone: "hw" },
      { title: "Debug port", sub: "SW-DP + core", tone: "hw" },
      { title: "Flash", sub: "512 KB, 2 banks", tone: "hw" },
    ],
    steps: [
      { from: 0, to: 1, kind: "call", label: "openocd -f nucleo-g474re.cfg", title: "The flash target starts OpenOCD",
        detail: "<p>Ninja rebuilds the ELF if needed, then runs OpenOCD with the course configuration and the command <code>program … verify reset exit</code>.</p>",
        analogy: "Handing a parcel and a delivery note to a courier." },
      { from: 1, to: 2, kind: "bus", label: "USB: open probe", title: "OpenOCD opens the ST-LINK over USB",
        detail: "<p>The probe reports its firmware version and the target voltage it measures. A reading near 0 V means the target part of the board is not powered.</p>" },
      { from: 2, to: 3, kind: "bus", label: "SWD: read IDCODE", title: "The probe wakes the debug port",
        detail: "<p>The ST-LINK sends the SWD line-reset sequence on SWDIO/SWCLK and reads the debug port's ID, which identifies a Cortex-M4 debug port.</p>",
        analogy: "Knocking on the door and checking the name plate." },
      { from: 1, to: 3, kind: "bus", label: "halt the core", title: "The CPU is stopped",
        detail: "<p>OpenOCD writes the core's debug halting control register. The CPU freezes between two instructions; your program is not running while its own flash is rewritten.</p>" },
      { from: 1, to: 4, kind: "bus", label: "unlock + erase pages", title: "Unlock and erase",
        detail: "<p>The flash controller is locked after reset. Writing the two key values to <code>FLASH_KEYR</code> unlocks it (RM0440, FLASH). Then each page that will hold the program is erased to all 1s: 2 KB pages in the default dual-bank mode.</p>" },
      { from: 1, to: 4, kind: "bus", label: "program double words", title: "Program",
        detail: "<p>The G4 flash is written 64 bits at a time, and each double word carries its own error-correction code. To be fast, OpenOCD loads a small helper routine into SRAM and lets the Cortex-M4 itself copy the data into flash, instead of sending every word over SWD.</p>",
        analogy: "Instead of carrying bricks one by one, the courier brings a helper who builds the wall on site." },
      { from: 4, to: 1, kind: "ret", label: "verify", title: "Verify",
        detail: "<p>OpenOCD reads the flash back (or a checksum of it) and compares it with the ELF. Any difference fails the command.</p>" },
      { from: 1, to: 3, kind: "irq", label: "reset", title: "Reset and run",
        detail: "<p>A reset makes the core start again from the vector table at <code>0x08000000</code>: load SP, jump to <code>Reset_Handler</code>, and your program runs. OpenOCD exits.</p>" },
    ],
  });

  Checklist($("#ck-setup"), [
    "<code>openocd -f examples/common/openocd/nucleo-g474re.cfg -c \"init; reset halt; exit\"</code> finds a Cortex-M4.",
    "<code>cmake --build --preset nucleo-debug</code> finishes and prints the memory-usage table.",
    "After flashing, LD2 blinks five times slowly, five times fast, then steadily at 1 Hz.",
    "Your terminal on the ST-LINK's virtual COM port shows <code>Hello from NUCLEO-G474RE @ 170 MHz</code> and <code>clock status: 0</code>.",
    "You stopped at a breakpoint in <code>clock_170mhz()</code> and saw <code>RCC_CFGR.SWS</code> change in the peripheral view.",
    "<code>ctest --preset host-tests</code> passes on your machine.",
    "You can explain why the LED is on when PA5 is high, and why <code>FLASH_ACR</code> and <code>PWR_CR5</code> are written before the PLL is selected.",
  ], { key: "setup" });
})();
