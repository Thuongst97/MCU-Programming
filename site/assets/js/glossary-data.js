/* SPDX-License-Identifier: MIT
   Shared glossary — used by global search (every page), diagram tooltips and glossary.html.
   { term, cat, full, desc }  ·  cat ∈ strings.js glossary.cats  ·  `backticks` render as code.
   Definitions are written in our own words; sources are listed on glossary.html. */
window.GLOSSARY = [
  /* ---------------------------------------------------------------- Cortex-M core */
  { term: "MCU", cat: "core", full: "Microcontroller unit", desc: "A complete small computer on one chip: CPU core, flash for the program, SRAM for data and peripherals (timers, UART, ADC, CAN…). The STM32F103C8T6 has a Cortex-M3 core, 64 KB flash and 20 KB SRAM." },
  { term: "Cortex-M3", cat: "core", full: "Arm Cortex-M3 processor (ARMv7-M)", desc: "The 32-bit core inside the STM32F103. It runs the Thumb-2 instruction set and contains the NVIC, SysTick and the debug logic. Defined by the ARMv7-M Architecture Reference Manual." },
  { term: "Thumb-2", cat: "core", full: "Mixed 16/32-bit instruction set", desc: "The only instruction set a Cortex-M3 executes. Function addresses therefore have bit 0 set (the Thumb bit) — which is why vector-table entries look odd, e.g. `0x08000131`." },
  { term: "NVIC", cat: "core", full: "Nested Vectored Interrupt Controller", desc: "Part of the Cortex-M core. Enables, prioritises and dispatches interrupts. The STM32F103 implements 4 priority bits, so priorities run from 0 (highest) to 15." },
  { term: "Vector table", cat: "core", full: "Table of exception handler addresses", desc: "Starts with the initial stack pointer, followed by the address of `Reset_Handler` and every other exception and interrupt handler. At reset the core reads it from address 0, which is aliased to flash at `0x08000000` in the default boot mode." },
  { term: "Exception", cat: "core", full: "Event that makes the core run a handler", desc: "Covers both system exceptions (Reset, NMI, HardFault, SVCall, PendSV, SysTick…) and peripheral interrupts. On entry the core stacks eight registers automatically, so handlers can be plain C functions." },
  { term: "HardFault", cat: "core", full: "Catch-all fault exception", desc: "Raised when the core cannot continue (bad memory access, invalid instruction, escalated faults). The fault status registers `CFSR` and `HFSR` tell you why." },
  { term: "SysTick", cat: "core", full: "System tick timer", desc: "A 24-bit down-counter inside the Cortex-M core. Usually set up to interrupt every 1 ms and used as the time base for delays, schedulers and RTOS ticks." },
  { term: "PendSV", cat: "core", full: "Pendable service call exception", desc: "A low-priority exception that software can request. RTOS kernels such as FreeRTOS perform the context switch inside it, after all other interrupts have finished." },
  { term: "MSP / PSP", cat: "core", full: "Main and process stack pointers", desc: "The Cortex-M3 has two stack pointers. Handlers always use MSP; an RTOS runs tasks on PSP so each task has its own stack." },
  { term: "volatile", cat: "core", full: "C qualifier: every access really happens", desc: "Tells the compiler that a variable can change outside normal program flow (a hardware register, or a variable shared with an interrupt), so it must not cache or remove reads and writes." },

  /* ---------------------------------------------------------------- Memory & boot */
  { term: "Memory map", cat: "memory", full: "Address layout of the chip", desc: "Every resource has a fixed address range: flash from `0x08000000`, SRAM from `0x20000000`, peripherals from `0x40000000`, Cortex-M system registers from `0xE0000000`." },
  { term: "Flash", cat: "memory", full: "Non-volatile program memory", desc: "Holds code and constant data and survives power-off. The STM32F103C8 has 64 KB, organised in 1 KB pages for erasing." },
  { term: "SRAM", cat: "memory", full: "Static RAM", desc: "Working memory for variables, the stack and the heap. 20 KB on the STM32F103C8; lost at power-off." },
  { term: "Linker script", cat: "memory", full: "Instructions for placing code and data", desc: "Tells the linker how big flash and RAM are and which sections (`.text`, `.data`, `.bss`, stack, heap) go where. Ours declares 64 KB flash and 20 KB RAM." },
  { term: ".data / .bss", cat: "memory", full: "Initialised and zero-initialised variables", desc: "`.data` holds globals with initial values; its image is stored in flash and copied to RAM by the startup code. `.bss` holds globals that start at zero; the startup code clears it." },
  { term: "Startup code", cat: "memory", full: "Code that runs between reset and main()", desc: "Copies `.data` from flash to RAM, zeroes `.bss`, sets up the clock (optionally) and calls `main()`. This course writes it in C." },
  { term: "BOOT0 / BOOT1", cat: "memory", full: "Boot-mode selection pins", desc: "Sampled at reset to choose what is mapped at address 0: main flash (BOOT0 = 0), the built-in system bootloader (BOOT0 = 1, BOOT1 = 0) or SRAM (both 1). On the Blue Pill they are the two yellow jumpers; BOOT1 is pin PB2." },
  { term: "System bootloader", cat: "memory", full: "ST's built-in bootloader in system memory", desc: "Factory-programmed code that can load a program over USART1 (PA9/PA10) without a debug probe. Started by setting BOOT0 = 1 and resetting; tools such as stm32flash speak its protocol." },
  { term: "ELF", cat: "memory", full: "Executable and Linkable Format", desc: "The file the linker produces. Besides the machine code it contains section addresses and debug symbols, which is what GDB and Renode load." },

  /* ---------------------------------------------------------------- Toolchain */
  { term: "arm-none-eabi-gcc", cat: "toolchain", full: "GCC cross-compiler for bare-metal Arm", desc: "Runs on your PC and produces code for the Cortex-M. \"none\" means no operating system, \"eabi\" the embedded Arm ABI. Part of the Arm GNU Toolchain." },
  { term: "Cross-compiling", cat: "toolchain", full: "Building on one machine for another", desc: "Compiling on an x86 or Apple-silicon PC for an Arm Cortex-M target. The output cannot run on the PC itself (except in a simulator)." },
  { term: "CMake", cat: "toolchain", full: "Build-system generator", desc: "Reads `CMakeLists.txt` and generates the actual build files — here for Ninja. A toolchain file tells it to use the Arm cross-compiler." },
  { term: "Ninja", cat: "toolchain", full: "Small, fast build tool", desc: "Executes the compile and link commands that CMake generated, rebuilding only what changed." },
  { term: "CMSIS", cat: "toolchain", full: "Common Microcontroller Software Interface Standard", desc: "Arm's standard headers for Cortex-M cores (`core_cm3.h`) plus vendor device headers (`stm32f103xb.h`) that name every register, e.g. `RCC->CFGR`. This course uses them instead of hand-typed addresses." },
  { term: "HAL", cat: "toolchain", full: "ST's Hardware Abstraction Layer", desc: "ST's high-level driver library (`HAL_GPIO_TogglePin` and friends) generated by STM32CubeMX. Used only in the setup module's comparison; the rest of the course works with registers." },
  { term: "LL", cat: "toolchain", full: "ST's Low-Layer drivers", desc: "Thin inline functions that map almost one-to-one onto register accesses. Covered in a short appendix." },

  /* ---------------------------------------------------------------- Debug & simulation */
  { term: "SWD", cat: "debug", full: "Serial Wire Debug", desc: "Arm's 2-wire debug interface: SWDIO on PA13 and SWCLK on PA14, plus 3.3 V and GND. Lets a debugger halt the core, read registers and program flash." },
  { term: "ST-Link", cat: "debug", full: "ST's USB debug probe", desc: "Connects your PC's USB port to the target's SWD pins. The cheap ST-Link V2 clones work with OpenOCD; older firmware may need an update." },
  { term: "OpenOCD", cat: "debug", full: "Open On-Chip Debugger", desc: "Open-source program that drives the ST-Link, flashes the chip and runs a GDB server. This course uses its own config with the correct 64 KB flash size." },
  { term: "GDB", cat: "debug", full: "GNU debugger", desc: "Sets breakpoints, steps through code and inspects memory. VS Code's Cortex-Debug extension drives it for you." },
  { term: "SVD", cat: "debug", full: "System View Description", desc: "XML description of every peripheral register. Debuggers use it to show registers by name. Downloaded during setup rather than stored in this repository (its licence is unclear)." },
  { term: "Renode", cat: "debug", full: "Antmicro's open-source simulator", desc: "Runs the same ELF file without hardware and shows the UART output. Its STM32F103 model is incomplete (for example there is no clock-controller model), so each example states what is and isn't simulated." },
  { term: "Connect under reset", cat: "debug", full: "Attach the debugger while NRST is held low", desc: "Recovery trick when the running program disables the SWD pins or sleeps: the debugger takes control before your code runs." },
  { term: "IDCODE", cat: "debug", full: "Debug-port identification code", desc: "Value the debug port reports on connection. Genuine STM32F1 parts report `0x1ba01477`; some clone chips report `0x2ba01477`, which OpenOCD rejects unless told otherwise." },

  /* ---------------------------------------------------------------- Peripherals */
  { term: "GPIO", cat: "peripheral", full: "General-purpose input/output", desc: "A pin you control from software. On the STM32F1 each pin's mode is set by 4 bits in `GPIOx_CRL` (pins 0–7) or `GPIOx_CRH` (pins 8–15)." },
  { term: "BSRR", cat: "peripheral", full: "GPIO bit set/reset register", desc: "Writing a 1 to its lower half sets a pin, to its upper half clears it, without touching other pins — no read-modify-write needed." },
  { term: "AFIO", cat: "peripheral", full: "Alternate-function I/O", desc: "STM32F1 block that remaps peripheral pins (`AFIO_MAPR`) and selects which port drives each EXTI line. Its `SWJ_CFG` field can disable SWD, so handle with care." },
  { term: "RCC", cat: "peripheral", full: "Reset and clock control", desc: "Selects the clock source (HSI, HSE, PLL), sets bus prescalers and gates the clock of every peripheral (`RCC_APB2ENR` and friends)." },
  { term: "HSE / HSI", cat: "peripheral", full: "High-speed external / internal oscillator", desc: "HSI is the 8 MHz internal RC oscillator the chip starts on. HSE is the external 8 MHz crystal on the Blue Pill, more accurate and the usual PLL source." },
  { term: "PLL", cat: "peripheral", full: "Phase-locked loop", desc: "Multiplies its input clock. HSE 8 MHz × 9 = 72 MHz, the STM32F103's maximum system clock." },
  { term: "Wait state", cat: "peripheral", full: "Extra clock cycle for a flash read", desc: "Flash is slower than the core at high clock speeds. Above 48 MHz the F103 needs 2 wait states, set in `FLASH_ACR.LATENCY` before switching to 72 MHz." },
  { term: "EXTI", cat: "peripheral", full: "External interrupt/event controller", desc: "Turns rising or falling edges on pins into interrupts. Line n can be connected to pin n of one port at a time." },
  { term: "USART", cat: "peripheral", full: "Universal synchronous/asynchronous receiver-transmitter", desc: "Serial port. USART1 uses PA9 (TX) and PA10 (RX); the baud rate comes from the `USART_BRR` register and the bus clock." },
  { term: "Timer", cat: "peripheral", full: "General-purpose timer (TIM2–TIM4)", desc: "Counter with prescaler (`PSC`) and auto-reload (`ARR`) registers. Generates periodic interrupts, PWM outputs and input capture." },
  { term: "PWM", cat: "peripheral", full: "Pulse-width modulation", desc: "A square wave with adjustable duty cycle, used to dim LEDs or drive motors. Produced by a timer's output-compare channel." },
  { term: "ADC", cat: "peripheral", full: "Analog-to-digital converter", desc: "Converts a voltage into a 12-bit number (0–4095). Its clock must not exceed 14 MHz on the STM32F103." },
  { term: "DMA", cat: "peripheral", full: "Direct memory access", desc: "A controller that copies data between peripherals and memory without the CPU, e.g. ADC results into an array in circular mode." },
  { term: "IWDG", cat: "peripheral", full: "Independent watchdog", desc: "A timer clocked by its own oscillator (LSI) that resets the MCU unless software refreshes it in time. Protects against hangs." },

  /* ---------------------------------------------------------------- Buses */
  { term: "I2C", cat: "bus", full: "Inter-Integrated Circuit", desc: "Two-wire bus (SDA, SCL) with open-drain lines and pull-up resistors. Each device has an address (usually 7-bit) and the receiver acknowledges every byte. The SSD1306 OLED uses it." },
  { term: "SPI", cat: "bus", full: "Serial Peripheral Interface", desc: "Fast synchronous bus with clock, two data lines and a chip select per device. Four modes, set by CPOL and CPHA." },
  { term: "CAN", cat: "bus", full: "Controller Area Network", desc: "Differential two-wire bus (CAN_H, CAN_L) used between ECUs. Messages carry an identifier that also decides priority during arbitration. Needs a transceiver and 120 Ω termination at both ends." },
  { term: "bxCAN", cat: "bus", full: "Basic extended CAN controller", desc: "The STM32F103's CAN peripheral. It shares its 512-byte SRAM with the USB peripheral, so the two cannot be used at the same time." },
  { term: "CAN FD", cat: "bus", full: "CAN with flexible data-rate", desc: "Extension of CAN with up to 64 data bytes and a faster data phase. The STM32F103's bxCAN does not support it; the course covers it in theory." },
  { term: "LIN", cat: "bus", full: "Local Interconnect Network", desc: "Low-cost single-wire bus where one master polls slaves using a schedule table; used for mirrors, seats and switches. The F1 USART has a LIN mode." },
  { term: "Transceiver", cat: "bus", full: "Bus line driver", desc: "Chip that converts the controller's logic-level TX/RX into bus signals. The course uses the 3.3 V SN65HVD230 for CAN." },

  /* ---------------------------------------------------------------- RTOS */
  { term: "RTOS", cat: "rtos", full: "Real-time operating system", desc: "A small kernel that runs several tasks with priorities and deterministic timing. The course uses FreeRTOS from module 14." },
  { term: "Task", cat: "rtos", full: "Independent thread of execution", desc: "In FreeRTOS each task has its own stack and priority and is in one of the states Running, Ready, Blocked or Suspended." },
  { term: "Mutex", cat: "rtos", full: "Mutual-exclusion lock", desc: "Protects a shared resource such as the UART. FreeRTOS mutexes use priority inheritance to limit priority inversion." },
  { term: "Super loop", cat: "rtos", full: "Bare-metal main loop", desc: "The classic `while (1)` loop that calls each job in turn, often with timers or flags set by interrupts. Simple, but hard to scale." },

  /* ---------------------------------------------------------------- AUTOSAR */
  { term: "AUTOSAR", cat: "autosar", full: "AUTomotive Open System ARchitecture", desc: "Standardised software architecture for vehicle ECUs. The Classic Platform targets microcontrollers; the course cites release R25-11." },
  { term: "SWC", cat: "autosar", full: "Software component", desc: "Application logic in AUTOSAR. It communicates only through ports and the RTE and never touches hardware directly." },
  { term: "Runnable", cat: "autosar", full: "Runnable entity", desc: "A function inside a SWC that the RTE calls, e.g. every 10 ms or when data arrives." },
  { term: "RTE", cat: "autosar", full: "Runtime Environment", desc: "The layer between SWCs and basic software, normally generated by a tool from the configuration. SWCs call it as `Rte_Read_…`, `Rte_Write_…`, `Rte_Call_…`." },
  { term: "BSW", cat: "autosar", full: "Basic software", desc: "AUTOSAR's standardised modules below the RTE: services (Com, Dem, NvM…), ECU abstraction and the MCAL." },
  { term: "MCAL", cat: "autosar", full: "Microcontroller Abstraction Layer", desc: "The lowest BSW layer: drivers such as `Dio`, `Port`, `Adc`, `Pwm` and `Can` that access the registers. Normally supplied by the chip vendor; there is none for the STM32F103, so this course writes one." },
  { term: "ARXML", cat: "autosar", full: "AUTOSAR XML", desc: "The XML format for AUTOSAR models and configurations: software components, interfaces, ECU configuration." },
  { term: "Std_ReturnType", cat: "autosar", full: "AUTOSAR standard return type", desc: "Return type of most BSW APIs, with the values `E_OK` and `E_NOT_OK`. Defined in the Standard Types specification." },
  { term: "MemMap", cat: "autosar", full: "Memory mapping", desc: "AUTOSAR's mechanism for placing code and data into linker sections with `<MIP>_START_SEC_…` / `_STOP_SEC_…` macros and the module's `_MemMap.h` header." },
  { term: "DET", cat: "autosar", full: "Default Error Tracer", desc: "Collects development errors (wrong parameters, calls before init) reported with `Det_ReportError`." },

  /* ---------------------------------------------------------------- Diagnostics */
  { term: "UDS", cat: "diag", full: "Unified Diagnostic Services (ISO 14229)", desc: "The request/response protocol a workshop tester uses to read data, read and clear fault codes, and reprogram ECUs." },
  { term: "DTC", cat: "diag", full: "Diagnostic trouble code", desc: "A stored fault code with a status byte, managed by the Diagnostic Event Manager (DEM)." },
  { term: "DEM", cat: "diag", full: "Diagnostic Event Manager", desc: "AUTOSAR service that debounces diagnostic events and stores the resulting DTCs." },
  { term: "DCM", cat: "diag", full: "Diagnostic Communication Manager", desc: "AUTOSAR service that receives UDS requests and builds the responses." },

  /* ---------------------------------------------------------------- Safety & quality */
  { term: "ISO 26262", cat: "safety", full: "Road vehicles — functional safety", desc: "The standard for safety-related automotive electronics, with integrity levels ASIL A to D. The STM32F103 is not qualified for it; the course only gives an overview." },
  { term: "Watchdog", cat: "safety", full: "Supervision timer", desc: "Hardware that resets the system if software stops refreshing it, so a hang does not leave outputs stuck." },
  { term: "MISRA C", cat: "quality", full: "Guidelines for C in critical systems", desc: "Widely used rules that restrict risky C constructs. The course cites MISRA C:2012 rule numbers and explains the intent in its own words; the rule texts are copyrighted." },
  { term: "Static analysis", cat: "quality", full: "Checking code without running it", desc: "Tools such as cppcheck find bugs and rule violations by analysing source code. CI runs it on every example." },
  { term: "Unit test", cat: "quality", full: "Test of one small unit of logic", desc: "In this course written with Unity and run on your PC (host), not on the board, by separating logic from register access." },
];
