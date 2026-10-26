/* SPDX-License-Identifier: MIT
   =========================================================================
   MCU Academy — core runtime
   Shared layout (header, sidebar, pager, footer), global search, scrollspy,
   tabs, references, tooltips, syntax highlighting, annotated code viewer and
   the sequence-diagram engine. Ported from aaos14-academy; UI text comes from
   strings.js (window.MCU_STRINGS), code utilities from lib/code.js.
   ========================================================================= */
(function () {
  "use strict";

  const S = window.MCU_STRINGS;
  const CODE = window.MCU_CODE;
  const CONFIG = {
    repo: "https://github.com/Thuongst97/MCU-Programming",
    branch: "main",
    themeKey: "mcu-theme",
    langKey: "mcu-code-lang",
  };

  /* ------------------------------------------------------------ Site map
     status: "ready" pages exist and are linked everywhere; "planned" pages are
     shown greyed out with their roadmap phase (PLAN.md §11) and never linked. */
  const SITE = [
    /* ───────────── Group: Start here ───────────── */
    { id: "fundamentals", status: "ready", phase: 3, file: "fundamentals.html", num: "01", group: "Start here",
      title: "What Is a Microcontroller?", short: "MCU Fundamentals", icon: "🧠", accent: "#e8a36b",
      desc: "MCU vs MPU, the Cortex-M4 core with its FPU, buses, memory map, registers and how C becomes bits on a pin.",
      sections: [
        ["mcu-vs-mpu", "MCU vs MPU vs SoC", "microcontroller microprocessor soc ecu linux bare metal"],
        ["inside-g474", "Inside the STM32G474RE", "cortex-m4 fpu 170 mhz 512 kb flash 128 kb sram ccm ahb apb bus matrix vet6 ret6"],
        ["memory-map", "The memory map", "0x08000000 0x20000000 0x10000000 ccm sram 0x40000000 0x48000000 peripheral region system memory"],
        ["registers", "Registers and volatile", "register volatile memory-mapped io read-modify-write bit mask cmsis"],
        ["cortex-m4", "The Cortex-M4 core", "thumb-2 r0-r15 msp psp xpsr nvic systick armv7e-m fpu dsp cpacr"],
        ["toolchain", "From C to flash", "compiler assembler linker elf hex bin objcopy arm-none-eabi-gcc mfloat-abi hard"],
        ["takeaways", "Key takeaways", "summary"],
      ] },
    { id: "setup", status: "ready", phase: 2, file: "setup.html", num: "02", group: "Start here",
      title: "Setting Up and Running a Program on the NUCLEO-G474RE", short: "Setup & First Program", icon: "🔌", accent: "#3fb68b",
      desc: "Plug in the NUCLEO, install the toolchain on Windows/Linux/macOS, build two ways, blink LD2, switch to 170 MHz, print over the virtual COM port and debug.",
      sections: [
        ["bom", "What you need", "nucleo-g474re usb cable st-link v3e stm32g474ret6 vet6"],
        ["board-tour", "The board: ST-LINK, LD2, B1 and jumpers", "st-link/v3e virtual com port ld2 pa5 b1 pc13 b2 reset jumpers swd"],
        ["install", "Install the environment", "arm gnu toolchain cmake ninja openocd vs code cortex-debug st-link driver udev"],
        ["verify", "Verify every tool", "version check arm-none-eabi-gcc --version openocd -v"],
        ["paths", "Two build paths compared", "stm32cubeide cubemx hal bare metal cmake registers"],
        ["path-cube", "Path A: STM32CubeIDE + HAL", "cubemx ioc hal_gpio_togglepin generated code"],
        ["path-bare", "Path B: bare-metal CMake from scratch", "startup vector table linker script systeminit reset_handler fpu cpacr"],
        ["cmake-under-hood", "What CMake generates under the hood", "cmake ninja build.ninja toolchain file compile_commands.json gcc flags"],
        ["blink", "Blink LD2 on PA5 (active-high)", "pa5 ld2 led active high gpioa moder bsrr ahb2enr"],
        ["clock-170", "From HSI16 to the PLL at 170 MHz", "hsi16 pll pllm plln pllr boost r1mode flash latency 4 wait states ahb divide by 2"],
        ["uart-hello", "\"Hello from NUCLEO-G474RE\" over LPUART1", "lpuart1 pa2 pa3 brr 256 115200 virtual com port st-link"],
        ["flash", "Flash with OpenOCD and CubeProgrammer", "openocd program verify reset stm32cubeprogrammer cli"],
        ["debug", "Debug: breakpoints, stepping, SVD", "cortex-debug gdb breakpoint step watch svd peripheral registers"],
        ["no-sim", "Working without the board", "no simulator renode host tests unity what you can do without hardware"],
        ["done", "You are done when…", "checklist"],
      ] },
  
    /* ───────────── Group: From reset to main ───────────── */
    { id: "boot", status: "ready", phase: 3, file: "boot.html", num: "03", group: "From reset to main",
      title: "Startup Code, Vector Table & Linker Scripts", short: "Startup & Linker", icon: "🚀", accent: "#e8a36b",
      desc: "What happens between reset and main(): boot modes and option bytes, vector table, FPU enable, .data/.bss init, linker script sections and map files.",
      sections: [
        ["boot-modes", "Boot modes: PB8-BOOT0 and option bytes", "boot0 pb8 nswboot0 nboot0 nboot1 option bytes system memory bootloader sram"],
        ["reset-sequence", "The reset sequence", "initial sp reset vector reset_handler msp fpu cpacr"],
        ["vector-table", "The vector table", "isr_vector weak alias default_handler vtor 102 interrupts"],
        ["sections", ".text, .data, .bss, stack and heap", "text rodata data bss stack heap lma vma ccmram"],
        ["linker-script", "Writing the linker script", "memory sections origin length > at> provide _estack align ccmram"],
        ["memmap-viz", "Memory-map visualizer", "map file size readelf nm"],
        ["c-vs-asm", "Startup in C vs ST's assembly", "startup_stm32g474xx.s c startup comparison"],
        ["pitfalls", "Pitfalls", "estack alignment 8-byte aapcs fpu before float ccm dma"],
      ] },
    { id: "clocks", status: "ready", phase: 3, file: "clocks.html", num: "04", group: "From reset to main",
      title: "Clocks: RCC, PLL, Boost Mode and Flash Wait States", short: "Clock Tree", icon: "⏱️", accent: "#fbbf24",
      desc: "The STM32G4 clock tree end to end, why 170 MHz needs boost mode, four flash wait states and an AHB ÷ 2 step, and how every peripheral clock is derived.",
      sections: [
        ["why-clocks", "Why clocks matter", "clock frequency power timing"],
        ["sources", "Clock sources", "hsi16 hse 24 mhz lsi lse hsi48 crystal css"],
        ["clock-tree", "Interactive clock tree", "pll pllm plln pllr pllsrc vco ahb apb1 apb2 prescaler rcc_pllcfgr"],
        ["flash-latency", "Flash wait states, caches and boost mode", "flash_acr latency 4ws prften icen dcen pwr_cr5 r1mode boost range 1"],
        ["switching", "Switching clocks safely", "pllrdy sw sws hpre divide by 2 1 us timeout"],
        ["peripheral-clocks", "Peripheral and kernel clocks", "rcc_ahb2enr rcc_apb1enr1 rcc_apb2enr ccipr kernel clock"],
        ["mco", "Measuring the clock (MCO on PA8)", "mco mcosel mcopre pa8 d7 oscilloscope"],
      ] },
    { id: "gpio", status: "ready", phase: 3, file: "gpio.html", num: "05", group: "From reset to main",
      title: "GPIO and Alternate Functions", short: "GPIO & AF", icon: "📍", accent: "#3fb68b",
      desc: "MODER, OTYPER, OSPEEDR and PUPDR, ODR vs BSRR, the AFR alternate-function mux, electrical limits, and how not to lock yourself out of SWD.",
      sections: [
        ["model", "The G4 GPIO model", "moder otyper ospeedr pupdr input output analog alternate function pull-up"],
        ["reg-viewer", "Configure a pin bit by bit", "register viewer gpiox_moder pupdr"],
        ["write-read", "ODR, BSRR, BRR and IDR", "atomic set reset bsrr brr idr odr"],
        ["electrical", "Electrical limits", "5v tolerant ft analog mode sink source speed ospeedr"],
        ["af", "Alternate functions (AFR)", "afrl afrh afsel af number datasheet table af_ constants check-pins"],
        ["swd", "Keeping SWD alive", "pa13 pa14 swdio swclk af0 lockout connect under reset"],
        ["debounce", "Buttons and debouncing", "button bounce debounce b1 pc13 pull-down"],
      ] },
    { id: "interrupts", status: "ready", phase: 3, file: "interrupts.html", num: "06", group: "From reset to main",
      title: "Interrupts, NVIC, EXTI and SysTick", short: "Interrupts & NVIC", icon: "⚡", accent: "#60a5fa",
      desc: "Exception model, NVIC priorities with 4 priority bits, EXTI lines routed through SYSCFG, SysTick time base and safe sharing with main().",
      sections: [
        ["exceptions", "Exceptions vs interrupts", "exception irq hardfault nmi pendsv svc systick"],
        ["entry-exit", "What the core does on entry", "stacking exc_return tail chaining late arrival lazy fp stacking"],
        ["nvic", "NVIC priorities and grouping", "nvic priority grouping preemption subpriority 4 bits"],
        ["exti", "EXTI and SYSCFG_EXTICR", "exti line syscfg exticr rising falling edge pending pr1 imr1 rtsr1"],
        ["systick", "SysTick time base", "systick reload 1 ms tick"],
        ["shared-data", "Sharing data with an ISR", "volatile atomic critical section primask race"],
        ["scheduler", "A non-blocking cooperative scheduler", "super loop cooperative scheduler tasks millis"],
      ] },
    { id: "timers", status: "ready", phase: 3, file: "timers.html", num: "07", group: "From reset to main",
      title: "Timers, PWM and Input Capture", short: "Timers & PWM", icon: "〰️", accent: "#a78bfa",
      desc: "General-purpose timers, prescaler/ARR math, PWM output compare, input capture and the ×2 timer-clock rule.",
      sections: [
        ["timebase", "Prescaler, ARR and update events", "psc arr cnt update uev"],
        ["timer-clock", "The ×2 timer clock rule", "apb prescaler timer clock 170 mhz x2"],
        ["pwm", "PWM with output compare", "pwm ccr ccmr oc mode duty"],
        ["pwm-wave", "Interactive PWM waveform", "duty cycle frequency waveform"],
        ["capture", "Input capture", "input capture period measure tim2 32 bit"],
        ["timer-pins", "Timer pins and AF numbers", "tim2 tim3 tim4 af1 af2 pins alternate function"],
      ] },
  
    /* ───────────── Group: Peripherals ───────────── */
    { id: "uart", status: "ready", phase: 4, file: "uart.html", num: "08", group: "Peripherals",
      title: "USART and LPUART: Frames, Interrupts and a Command Shell", short: "UART", icon: "💬", accent: "#60a5fa",
      desc: "UART framing, BRR math for USART and LPUART, interrupt-driven RX/TX with a lock-free ring buffer, and the USART LIN mode.",
      sections: [
        ["frame", "Anatomy of a UART frame", "start bit stop bit parity 8n1 waveform"],
        ["baud", "Baud rate and BRR", "brr lpuart 256 oversampling baud error calculator"],
        ["polling-irq", "Polling vs interrupts", "txe rxne tc isr icr interrupt"],
        ["ring-buffer", "A lock-free ring buffer", "ring buffer spsc head tail power of two"],
        ["shell", "A tiny command shell", "command line parser shell"],
        ["lin-mode", "LIN mode on the G4 USART", "lin break lbdf lbdl linen icr"],
      ] },
    { id: "adc-dma", status: "ready", phase: 4, file: "adc-dma.html", num: "09", group: "Peripherals",
      title: "ADC and DMA", short: "ADC & DMA", icon: "🎚️", accent: "#e8a36b",
      desc: "12-bit SAR ADC, its power-up and calibration sequence, sampling time and Vrefint, then DMA through DMAMUX in circular mode.",
      sections: [
        ["sar", "How a SAR ADC works", "sar adc 12 bit successive approximation"],
        ["config", "Bringing up ADC1", "deeppwd advregen adcal aden adrdy ckmode smpr calibration"],
        ["single", "Single conversion, polling", "adstart eoc dr sqr1"],
        ["dma", "DMA and DMAMUX", "dma dmamux request id channel cpar cmar cndtr circular"],
        ["adc-dma", "Scan + DMA circular", "sequence dma circular half transfer dmaen dmacfg"],
        ["noise", "Noise, averaging and Vrefint", "oversampling average vrefint vrefint_cal temperature sensor"],
      ] },
    { id: "i2c", status: "ready", phase: 4, file: "i2c.html", num: "10", group: "Peripherals",
      title: "I2C and an SSD1306 OLED", short: "I2C", icon: "🖥️", accent: "#3fb68b",
      desc: "I2C on the wire, the G4 I2C peripheral (TIMINGR, NBYTES, AUTOEND), then drawing on an SSD1306 OLED.",
      sections: [
        ["protocol", "I2C on the wire", "start stop ack nack address sda scl open drain pull-up"],
        ["waveform", "Interactive I2C transaction", "waveform start ack stop"],
        ["g4-i2c", "The G4 I2C peripheral", "i2c_cr2 timingr nbytes autoend reload isr icr txis"],
        ["pitfalls", "Pitfalls: BOOT0, bus recovery and errata", "pb8 boot0 pull-up stuck bus nine clocks errata"],
        ["ssd1306", "Driving the SSD1306", "ssd1306 oled framebuffer page addressing"],
      ] },
    { id: "spi", status: "ready", phase: 4, file: "spi.html", num: "11", group: "Peripherals",
      title: "SPI and a W25Qxx Flash", short: "SPI", icon: "🔁", accent: "#a78bfa",
      desc: "SPI modes (CPOL/CPHA), chip select discipline, and reading/writing a W25Qxx NOR flash.",
      sections: [
        ["modes", "SPI modes CPOL/CPHA", "cpol cpha mode 0 mode 3 waveform"],
        ["g4-spi", "The G4 SPI peripheral", "spi_cr1 spi_cr2 ds frxth fifo br mstr ssm ssi txe rxne bsy"],
        ["cs", "Chip select discipline", "nss chip select gpio"],
        ["w25q", "Talking to a W25Qxx", "jedec id 0x9f read 0x03 page program erase status busy"],
        ["dma-spi", "SPI with DMA", "spi dma dmamux"],
      ] },
    { id: "can", status: "ready", phase: 4, file: "can.html", num: "12", group: "Peripherals",
      title: "CAN and CAN FD with FDCAN (and LIN in Theory)", short: "CAN, CAN FD & LIN", icon: "🚗", accent: "#fbbf24",
      desc: "CAN physical layer, frame format, arbitration, bit timing and the FDCAN controller, two NUCLEOs over CAN FD transceivers, plus LIN concepts.",
      sections: [
        ["physical", "Physical layer and transceivers", "can_h can_l differential transceiver 120 ohm termination can fd rated"],
        ["frame", "The CAN frame", "sof id rtr ide dlc data crc ack eof bit stuffing"],
        ["arbitration", "Arbitration and errors", "arbitration dominant recessive error active passive bus off tec rec"],
        ["bit-timing", "Bit timing calculator", "fdcan_nbtp nbrp ntseg1 ntseg2 nsjw sample point 500 kbit dbtp"],
        ["fdcan", "The FDCAN peripheral", "fdcan cccr init cce txbar txfqs rxf0s rxf0a kernel clock fdcansel"],
        ["message-ram", "Message RAM and filters", "message ram sramcan elements rx fifo tx fifo rxgfc filter"],
        ["two-nodes", "Two nodes on a real bus", "two nucleo transceiver loopback mon lbck ack"],
        ["can-fd", "CAN FD in practice", "can fd fdf brs edl esi 64 byte dlc data phase dbtp"],
        ["lin", "LIN in theory", "lin master slave schedule table break sync pid checksum"],
      ] },
    { id: "power-wdg", status: "ready", phase: 4, file: "power-wdg.html", num: "13", group: "Peripherals",
      title: "Watchdogs, Reset Sources and Low Power", short: "Watchdog & Power", icon: "🔋", accent: "#3fb68b",
      desc: "IWDG vs WWDG, reading reset causes, Sleep/Stop/Standby/Shutdown and waking up correctly.",
      sections: [
        ["reset-causes", "Who reset me?", "rcc_csr borrstf pinrstf iwdgrstf sftrstf rmvf"],
        ["iwdg", "Independent watchdog", "iwdg lsi kr pr rlr 0xaaaa 0xcccc 0x5555 pvu rvu"],
        ["wwdg", "Window watchdog", "wwdg window early wakeup"],
        ["modes", "Sleep, Stop, Standby, Shutdown", "wfi wfe sleepdeep lpms stop0 stop1 pwr_cr1"],
        ["wakeup", "Wake-up sources", "exti rtc alarm wkup b1 pc13"],
        ["after-stop", "Restoring 170 MHz after Stop", "hsi16 after stop pll reconfigure boost"],
        ["debug-lowpower", "Debugging low-power code", "dbgmcu_cr dbg_stop dbg_sleep apb1fzr1"],
      ] },
  
    /* ───────────── Group: Embedded engineering ───────────── */
    { id: "rtos", status: "ready", phase: 5, file: "rtos.html", num: "14", group: "Embedded engineering",
      title: "Bare Metal vs RTOS: FreeRTOS on Cortex-M4", short: "FreeRTOS", icon: "🧵", accent: "#60a5fa",
      desc: "When a super-loop stops scaling, how a context switch really works (PendSV), and tasks, queues, mutexes and priorities in FreeRTOS.",
      sections: [
        ["why-rtos", "When you need an RTOS", "super loop rtos determinism"],
        ["context-switch", "A context switch, step by step", "pendsv systick psp stack frame fpu lazy stacking"],
        ["task-states", "Task states (interactive)", "running ready blocked suspended"],
        ["port", "Porting FreeRTOS to the G474", "freertosconfig configmax_syscall_interrupt_priority port.c cm4f fpu"],
        ["ipc", "Queues, semaphores, mutexes", "queue semaphore mutex priority inheritance"],
        ["isr-rules", "ISR rules: FromISR APIs", "fromisr portyield_from_isr priority"],
        ["stack", "Stack sizing and overflow detection", "stack high water mark configcheck_for_stack_overflow"],
      ] },
    { id: "faults-debug", status: "ready", phase: 5, file: "faults-debug.html", num: "15", group: "Embedded engineering",
      title: "Fault Handling and Debugging", short: "Faults & Debugging", icon: "🐞", accent: "#f87171",
      desc: "HardFault anatomy, decoding CFSR/HFSR/MMFAR/BFAR, a fault handler that logs and survives, and a debugging toolbox.",
      sections: [
        ["fault-types", "Fault types on Cortex-M4", "hardfault memmanage busfault usagefault escalation nocp"],
        ["decode", "Decoding CFSR and HFSR", "cfsr hfsr mmfar bfar forced precise imprecise lsperr"],
        ["stack-frame", "Recovering the faulting PC", "exception stack frame pc lr fp frame"],
        ["handler", "A fault handler that logs", "fault log noinit ram reset reason"],
        ["gdb", "GDB and Cortex-Debug techniques", "gdb watchpoint backtrace x/ registers"],
        ["semihosting-swo", "printf: UART, semihosting, SWO", "semihosting swo itm st-link v3 virtual com port pb3"],
      ] },
    { id: "bootloader", status: "ready", phase: 5, file: "bootloader.html", num: "16", group: "Embedded engineering",
      title: "Bootloaders and Flash Programming", short: "Bootloaders", icon: "🧰", accent: "#e8a36b",
      desc: "ST's system bootloader, writing your own UART bootloader, splitting flash, VTOR relocation and safe jump to application.",
      sections: [
        ["system-bl", "The built-in system bootloader", "system memory usart1 an2606 stm32flash boot0 nboot1"],
        ["flash-prog", "Programming the G4 flash", "flash_keyr unlock pg per pnb page erase double word 2 kb dbank"],
        ["layout", "Splitting flash: bootloader + app", "linker split partition 0x08000000 0x08004000"],
        ["vtor", "Relocating the vector table", "scb vtor alignment"],
        ["jump", "Jumping to the application safely", "msp reset handler deinit peripherals"],
        ["protocol", "A tiny update protocol", "crc32 packet ack nack"],
        ["protection", "Read-out and write protection", "rdp wrp option bytes level 2"],
      ] },
    { id: "quality", status: "ready", phase: 5, file: "quality.html", num: "17", group: "Embedded engineering",
      title: "Testing, Static Analysis and MISRA C", short: "Quality & MISRA", icon: "✅", accent: "#3fb68b",
      desc: "Unit tests on the host with Unity, hardware abstraction for testability, cppcheck with the MISRA addon, and what MISRA rules are for.",
      sections: [
        ["testable", "Designing for testability", "hal abstraction dependency injection link seam"],
        ["unity", "Host unit tests with Unity", "unity cmock host gcc ctest"],
        ["static", "Static analysis", "cppcheck gcc -fanalyzer clang-tidy warnings"],
        ["misra", "MISRA C in practice", "misra c 2012 mandatory required advisory deviation"],
        ["bad-good", "Bad vs good: common findings", "essential type implicit conversion side effects"],
        ["deviations", "Writing a deviation record", "deviation permit justification"],
      ] },
  
    /* ───────────── Group: AUTOSAR Classic ───────────── */
    { id: "autosar-arch", status: "ready", phase: 6, file: "autosar-arch.html", num: "18", group: "AUTOSAR Classic",
      title: "AUTOSAR Classic: Layered Architecture", short: "AUTOSAR Architecture", icon: "🏛️", accent: "#a78bfa",
      desc: "Why AUTOSAR exists, ASW / RTE / BSW / MCAL, the methodology and ARXML, and what is generated vs hand-written in a real project.",
      sections: [
        ["why", "Why AUTOSAR exists", "autosar classic adaptive oem tier1 reuse"],
        ["layers", "Layered architecture explorer", "asw rte bsw services ecu abstraction mcal complex driver"],
        ["methodology", "Methodology and ARXML", "arxml system description ecu extract ecuc configuration"],
        ["generated", "Generated vs hand-written", "generator davinci tresos configuration rte generation"],
        ["release", "Releases and documents", "r25-11 sws srs tr document naming"],
        ["on-nucleo", "How we do AUTOSAR on a NUCLEO", "hand-written mcal honest limitations"],
      ] },
    { id: "autosar-swc", status: "ready", phase: 6, file: "autosar-swc.html", num: "19", group: "AUTOSAR Classic",
      title: "Software Components, Ports and the RTE", short: "SWCs & RTE", icon: "🧩", accent: "#a78bfa",
      desc: "Atomic SWCs, sender-receiver and client-server interfaces, runnables and events, and the RTE API a SWC actually calls.",
      sections: [
        ["swc-types", "SWC types", "application sensor actuator composition atomic"],
        ["interfaces", "Ports and interfaces", "sender receiver client server mode switch port prototype"],
        ["runnables", "Runnables and RTE events", "runnable timing event data received event init"],
        ["rte-api", "The RTE API", "rte_read rte_write rte_call rte_iread rte_irv"],
        ["rte-code", "What generated RTE code looks like", "rte_swc.h rte.c contract header"],
        ["mini-gen", "A tiny RTE generator", "rte generator arxml python"],
      ] },
    { id: "autosar-mcal", status: "ready", phase: 6, file: "autosar-mcal.html", num: "20", group: "AUTOSAR Classic",
      title: "Writing MCAL Drivers the AUTOSAR Way", short: "MCAL Conventions", icon: "🔧", accent: "#a78bfa",
      desc: "Std_Types, compiler abstraction, MemMap, config structures, DET error reporting and naming rules, applied to Mcu, Port, Dio, Pwm, Adc, Wdg and Can on the G474.",
      sections: [
        ["file-layout", "Module file layout", "module.h module.c cfg.h pbcfg.c lcfg"],
        ["std-types", "Std_Types and Platform_Types", "std_returntype e_ok e_not_ok uint8 boolean"],
        ["naming", "API naming: <Ma>_<Api>", "module abbreviation api name dio_writechannel"],
        ["config", "Configuration structures and Init", "configtype init configptr post-build pre-compile"],
        ["memmap", "MemMap and compiler abstraction", "start_sec stop_sec code var_cleared func p2var p2const"],
        ["det", "Development errors with DET", "det_reporterror module id api id error id"],
        ["dio-port", "Port and Dio on the G4", "port_init dio_writechannel dio_readchannel channel group"],
        ["pwm-adc-gpt", "Pwm, Adc and Gpt on the G4", "pwm_setdutycycle adc_startgroupconversion gpt"],
        ["can-wdg", "Can and Wdg on the G4", "can_write can_mainfunction_read fdcan wdg_setmode"],
      ] },
    { id: "autosar-os-com", status: "ready", phase: 6, file: "autosar-os-com.html", num: "21", group: "AUTOSAR Classic",
      title: "OS, Scheduling and the COM Stack", short: "OS & COM Stack", icon: "📡", accent: "#a78bfa",
      desc: "OSEK/AUTOSAR OS concepts, mapping runnables to tasks, and a signal's journey through Com, PduR, CanIf and Can.",
      sections: [
        ["os-concepts", "AUTOSAR OS concepts", "osek tasks basic extended alarms counters events scalability class"],
        ["mapping", "Mapping runnables to tasks", "task mapping 10 ms 100 ms schm bsw main functions"],
        ["com-stack", "The COM stack", "com pdur canif can pdu signal i-pdu"],
        ["signal-flow", "End-to-end signal flow", "adc ioHwab rte swc com pdur canif can bus walkthrough"],
        ["can-matrix", "The CAN matrix", "dbc can matrix signal packing endianness"],
        ["ecum", "EcuM and BswM", "ecum startup shutdown bswm mode"],
      ] },
    { id: "autosar-diag-nvm", status: "ready", phase: 6, file: "autosar-diag-nvm.html", num: "22", group: "AUTOSAR Classic",
      title: "Diagnostics (DCM/DEM, UDS) and NvM", short: "Diagnostics & NvM", icon: "🩺", accent: "#a78bfa",
      desc: "UDS services, DTCs and event debouncing in DEM, the DCM request path, and storing data with NvM over Fee on the G4 flash.",
      sections: [
        ["uds", "UDS in one page", "iso 14229 0x10 0x22 0x2e 0x19 0x14 0x3e session nrc"],
        ["dem", "DEM: events and DTCs", "dem_seteventstatus debounce dtc status byte"],
        ["dcm", "DCM: request to response", "dcm dsl dsd dsp did routine"],
        ["iso-tp", "Transport: ISO-TP on CAN", "iso 15765 single frame first frame flow control"],
        ["nvm", "NvM, MemIf, Fee, Fls", "nvm block fee flash emulation wear"],
      ] },
    { id: "autosar-review", status: "ready", phase: 6, file: "autosar-review.html", num: "23", group: "AUTOSAR Classic",
      title: "Code That Passes an OEM / Tier-1 Review", short: "Review-Ready Code", icon: "📝", accent: "#f87171",
      desc: "The checklist reviewers actually use: naming, types, MemMap, error handling, MISRA deviations, traceability and the bad-vs-good gallery.",
      sections: [
        ["checklist", "The review checklist", "review checklist oem tier1"],
        ["gallery", "Bad vs good gallery", "bad good comparison"],
        ["traceability", "Requirements traceability", "requirement id trace test"],
        ["safety", "A word on ISO 26262", "iso 26262 asil freedom from interference"],
      ] },
  
    /* ───────────── Group: Capstone ───────────── */
    { id: "capstone-baremetal", status: "ready", phase: 7, file: "capstone-baremetal.html", num: "24", group: "Capstone",
      title: "Capstone 1: Turn-Signal ECU, Bare Metal", short: "Capstone: Bare Metal", icon: "🚦", accent: "#fbbf24",
      desc: "Requirements, state machine and a bare-metal implementation of a turn-signal / hazard ECU talking CAN to a cluster node.",
      sections: [
        ["requirements", "Requirements", "requirements turn signal hazard flash rate lamp out"],
        ["architecture", "Architecture", "block diagram can cluster node"],
        ["state-machine", "Turn-signal state machine", "state machine hazard left right comfort blink"],
        ["implementation", "Implementation walkthrough", "super loop scheduler"],
        ["acceptance", "Acceptance tests", "acceptance test host hardware"],
      ] },
    { id: "capstone-rtos", status: "ready", phase: 7, file: "capstone-rtos.html", num: "25", group: "Capstone",
      title: "Capstone 2: The Same ECU on FreeRTOS", short: "Capstone: FreeRTOS", icon: "🚦", accent: "#60a5fa",
      desc: "Splitting the ECU into tasks and queues, timing analysis and what changed vs bare metal.",
      sections: [
        ["task-design", "Task design", "task priorities periods"],
        ["comms", "Queues and events", "queue event group"],
        ["timing", "Timing and watchdog supervision", "deadline watchdog supervision"],
        ["diff", "What changed", "comparison"],
      ] },
    { id: "capstone-autosar", status: "ready", phase: 7, file: "capstone-autosar.html", num: "26", group: "Capstone",
      title: "Capstone 3: Refactoring into AUTOSAR Layers", short: "Capstone: AUTOSAR", icon: "🚦", accent: "#a78bfa",
      desc: "Turning the ECU into an application SWC with runnables over a hand-written RTE, BSW-lite and MCAL on the STM32G474.",
      sections: [
        ["target-arch", "Target architecture", "swc rte bsw mcal layers"],
        ["swc", "The TurnLight SWC", "swc runnables ports"],
        ["rte", "The RTE layer", "rte hand-written mirrors generated"],
        ["bsw", "BSW-lite and MCAL", "com canif can dio pwm adc wdg"],
        ["can-fd", "Upgrade path: CAN FD", "can fd fdcan 64 bytes dlc padding brs data phase bit rate transceiver"],
        ["review", "Self-review against the checklist", "review checklist"],
        ["next", "Where to go next", "real tools davinci tresos s32k aurix"],
      ] },
  
    /* ───────────── Group: Reference ───────────── */
    { id: "board", status: "ready", phase: 2, file: "board.html", num: "A", group: "Reference",
      title: "NUCLEO-G474RE Board Reference", short: "Board Reference", icon: "🗺️", accent: "#94a3b8",
      desc: "Interactive pinout with AF numbers, Arduino and Morpho headers, on-board parts, the RET6 vs VET6 packages and known traps.",
      sections: [
        ["pinout", "Interactive pinout", "pinout pins alternate function af number arduino morpho"],
        ["onboard", "On-board components", "st-link v3e ld2 b1 b2 24 mhz x3 32.768 khz jumpers virtual com port"],
        ["quirks", "Known quirks", "pb8 boot0 b1 polarity pa5 spi1 vet6 lqfp100 ret6 solder bridges"],
        ["modules", "Common modules", "can fd transceiver ssd1306 w25q"],
      ] },
    { id: "troubleshooting", status: "ready", phase: 2, file: "troubleshooting.html", num: "B", group: "Reference",
      title: "Troubleshooting", short: "Troubleshooting", icon: "🧯", accent: "#94a3b8",
      desc: "Symptom-first fixes: no ST-LINK, cannot halt, a board that starts ST's bootloader, dark LD2, garbage UART, clock hangs, flash errors and a silent CAN bus.",
      sections: [
        ["no-stlink", "ST-LINK not detected", "st-link not found libusb driver udev permission usb cable"],
        ["stlink-fw", "Old ST-LINK firmware or wrong OpenOCD target", "st-link v3 firmware upgrade stm32cubeprogrammer openocd stlink-dap target stm32g4x"],
        ["cannot-halt", "Cannot halt target / SWD locked out", "connect under reset pa13 pa14 moder rdp boot0"],
        ["boots-bootloader", "The board starts ST's bootloader", "pb8 boot0 nswboot0 pull-up i2c system memory"],
        ["led", "LD2 does not light", "pa5 active high ahb2enr gpioaen moder"],
        ["uart-garbage", "Garbage on the UART", "baud mismatch clock brr lpuart 256 wrong pll"],
        ["hangs-at-clock", "Hangs during clock setup", "pllrdy timeout boost latency wait states"],
        ["flash-errors", "Flash programming errors", "pgserr pgaerr progerr sizerr double word lock"],
        ["can-silent", "CAN sends nothing", "no ack termination transceiver loopback init bus off"],
      ] },
    { id: "automotive-mcus", status: "ready", phase: 8, file: "automotive-mcus.html", num: "C", group: "Reference",
      title: "From the STM32G474 to Automotive-Grade MCUs", short: "Automotive MCUs", icon: "🏭", accent: "#94a3b8",
      desc: "How each lesson maps to NXP S32K1xx, Infineon AURIX TC3xx and Renesas RH850: qualification, safety, vendor MCAL and tooling.",
      sections: [
        ["why-not-g474", "Why the G474 isn't automotive", "aec-q100 iso 26262 lockstep ecc"],
        ["mapping", "Lesson mapping table", "s32k aurix rh850 mapping"],
        ["vendor-mcal", "Vendor MCAL and tools", "rtd mcal tresos davinci"],
      ] },
    { id: "ll-drivers", status: "ready", phase: 8, file: "ll-drivers.html", num: "D", group: "Reference",
      title: "Appendix: ST's LL Drivers", short: "LL Drivers", icon: "📚", accent: "#94a3b8",
      desc: "What ST's Low-Layer drivers are, how they map onto the registers you already know, and when a team picks registers, LL or HAL.",
      sections: [
        ["what-ll", "What LL is (and isn't)", "ll low layer drivers stm32g4xx_ll inline functions"],
        ["side-by-side", "Registers vs LL side by side", "ll_gpio_setpinmode ll_rcc ll_usart registers comparison"],
        ["choosing", "Registers, LL or HAL?", "hal ll registers trade-off portability code size"],
      ] },
    { id: "glossary", status: "ready", phase: 1, file: "glossary.html", num: "E", group: "Reference",
      title: "Glossary", short: "Glossary", icon: "📖", accent: "#94a3b8",
      desc: "Quick reference for MCU, toolchain, bus and AUTOSAR terms.",
      sections: [["glossary", "Glossary of terms", "glossary terms"]] },
  ];

  /* --------------------------------------------- Official references
     { t: title, url, doc: document ID, rev: revision, sec: section, kind }
     kind: st | arm | autosar | iso | tool | community (community gets a visible badge).
     Revisions are filled in when the PDF is checked (PLAN.md Phase 0). */
  const ST = "https://www.st.com/resource/en/";
  const R = {
    g474Docs: { t: "STM32G474RE product page — all documents", url: "https://www.st.com/en/microcontrollers-microprocessors/stm32g474re.html#documentation", kind: "st" },
    nucleoG474: { t: "NUCLEO-G474RE board page — schematics and documents", url: "https://www.st.com/en/evaluation-tools/nucleo-g474re.html#documentation", kind: "st" },
    ds12288: { t: "STM32G473xB/xC/xE, STM32G474xB/xC/xE datasheet", url: ST + "datasheet/stm32g474re.pdf", doc: "DS12288", kind: "st" },
    rm0440: { t: "Reference manual: STM32G4 series", url: ST + "reference_manual/rm0440-stm32g4-series-advanced-armbased-32bit-mcus-stmicroelectronics.pdf", doc: "RM0440", kind: "st" },
    pm0214: { t: "STM32 Cortex-M4 MCUs and MPUs programming manual", url: ST + "programming_manual/pm0214-stm32-cortexm4-mcus-and-mpus-programming-manual-stmicroelectronics.pdf", doc: "PM0214", kind: "st" },
    um2505: { t: "UM2505 — STM32G4 Nucleo-64 boards (MB1367) user manual", url: ST + "user_manual/um2505-stm32g4-nucleo64-boards-mb1367-stmicroelectronics.pdf", doc: "UM2505", kind: "st" },
    es0430: { t: "STM32G471/473/474/483/484 device errata (find ES0430 under Documentation)", url: "https://www.st.com/en/microcontrollers-microprocessors/stm32g474re.html#documentation", doc: "ES0430", kind: "st" },
    ds12288Pins: { t: "DS12288 — pinouts, pin descriptions and alternate functions", url: ST + "datasheet/stm32g474re.pdf", doc: "DS12288", sec: "Pinouts and pin description", kind: "st" },
    ds12288Elec: { t: "DS12288 — electrical characteristics", url: ST + "datasheet/stm32g474re.pdf", doc: "DS12288", sec: "Electrical characteristics", kind: "st" },
    rm0440Mem: { t: "RM0440 — memory and bus architecture, boot configuration", url: ST + "reference_manual/rm0440-stm32g4-series-advanced-armbased-32bit-mcus-stmicroelectronics.pdf", doc: "RM0440", sec: "Memory and bus architecture", kind: "st" },
    rm0440Flash: { t: "RM0440 — embedded flash memory (FLASH): latency, programming, option bytes", url: ST + "reference_manual/rm0440-stm32g4-series-advanced-armbased-32bit-mcus-stmicroelectronics.pdf", doc: "RM0440", sec: "FLASH", kind: "st" },
    rm0440Pwr: { t: "RM0440 — power control (PWR): voltage ranges, boost mode, low-power modes", url: ST + "reference_manual/rm0440-stm32g4-series-advanced-armbased-32bit-mcus-stmicroelectronics.pdf", doc: "RM0440", sec: "PWR", kind: "st" },
    rm0440Rcc: { t: "RM0440 — reset and clock control (RCC)", url: ST + "reference_manual/rm0440-stm32g4-series-advanced-armbased-32bit-mcus-stmicroelectronics.pdf", doc: "RM0440", sec: "RCC", kind: "st" },
    rm0440Gpio: { t: "RM0440 — general-purpose I/Os (GPIO)", url: ST + "reference_manual/rm0440-stm32g4-series-advanced-armbased-32bit-mcus-stmicroelectronics.pdf", doc: "RM0440", sec: "GPIO", kind: "st" },
    rm0440Syscfg: { t: "RM0440 — system configuration controller (SYSCFG)", url: ST + "reference_manual/rm0440-stm32g4-series-advanced-armbased-32bit-mcus-stmicroelectronics.pdf", doc: "RM0440", sec: "SYSCFG", kind: "st" },
    rm0440Dma: { t: "RM0440 — direct memory access controller (DMA)", url: ST + "reference_manual/rm0440-stm32g4-series-advanced-armbased-32bit-mcus-stmicroelectronics.pdf", doc: "RM0440", sec: "DMA", kind: "st" },
    rm0440Dmamux: { t: "RM0440 — DMA request multiplexer (DMAMUX)", url: ST + "reference_manual/rm0440-stm32g4-series-advanced-armbased-32bit-mcus-stmicroelectronics.pdf", doc: "RM0440", sec: "DMAMUX", kind: "st" },
    rm0440Exti: { t: "RM0440 — NVIC and extended interrupts and events controller (EXTI)", url: ST + "reference_manual/rm0440-stm32g4-series-advanced-armbased-32bit-mcus-stmicroelectronics.pdf", doc: "RM0440", sec: "NVIC, EXTI", kind: "st" },
    rm0440Adc: { t: "RM0440 — analog-to-digital converters (ADC)", url: ST + "reference_manual/rm0440-stm32g4-series-advanced-armbased-32bit-mcus-stmicroelectronics.pdf", doc: "RM0440", sec: "ADC", kind: "st" },
    rm0440Tim: { t: "RM0440 — general-purpose timers (TIM2/TIM3/TIM4/TIM5)", url: ST + "reference_manual/rm0440-stm32g4-series-advanced-armbased-32bit-mcus-stmicroelectronics.pdf", doc: "RM0440", sec: "TIM2/TIM3/TIM4/TIM5", kind: "st" },
    rm0440Iwdg: { t: "RM0440 — independent watchdog (IWDG)", url: ST + "reference_manual/rm0440-stm32g4-series-advanced-armbased-32bit-mcus-stmicroelectronics.pdf", doc: "RM0440", sec: "IWDG", kind: "st" },
    rm0440Wwdg: { t: "RM0440 — system window watchdog (WWDG)", url: ST + "reference_manual/rm0440-stm32g4-series-advanced-armbased-32bit-mcus-stmicroelectronics.pdf", doc: "RM0440", sec: "WWDG", kind: "st" },
    rm0440I2c: { t: "RM0440 — inter-integrated circuit interface (I2C)", url: ST + "reference_manual/rm0440-stm32g4-series-advanced-armbased-32bit-mcus-stmicroelectronics.pdf", doc: "RM0440", sec: "I2C", kind: "st" },
    rm0440Usart: { t: "RM0440 — USART/UART and LPUART", url: ST + "reference_manual/rm0440-stm32g4-series-advanced-armbased-32bit-mcus-stmicroelectronics.pdf", doc: "RM0440", sec: "USART, LPUART", kind: "st" },
    rm0440Spi: { t: "RM0440 — serial peripheral interface (SPI)", url: ST + "reference_manual/rm0440-stm32g4-series-advanced-armbased-32bit-mcus-stmicroelectronics.pdf", doc: "RM0440", sec: "SPI", kind: "st" },
    rm0440Fdcan: { t: "RM0440 — controller area network with flexible data rate (FDCAN)", url: ST + "reference_manual/rm0440-stm32g4-series-advanced-armbased-32bit-mcus-stmicroelectronics.pdf", doc: "RM0440", sec: "FDCAN", kind: "st" },
    rm0440Debug: { t: "RM0440 — debug support (DBG, DBGMCU)", url: ST + "reference_manual/rm0440-stm32g4-series-advanced-armbased-32bit-mcus-stmicroelectronics.pdf", doc: "RM0440", sec: "Debug support", kind: "st" },
    rm0440Sig: { t: "RM0440 — device electronic signature (flash size, unique ID)", url: ST + "reference_manual/rm0440-stm32g4-series-advanced-armbased-32bit-mcus-stmicroelectronics.pdf", doc: "RM0440", sec: "Device electronic signature", kind: "st" },
    pm0214Nvic: { t: "PM0214 — NVIC, SCB, SysTick and the FPU (CPACR)", url: ST + "programming_manual/pm0214-stm32-cortexm4-mcus-and-mpus-programming-manual-stmicroelectronics.pdf", doc: "PM0214", sec: "Core peripherals", kind: "st" },
    pm0214Exc: { t: "PM0214 — stacks, exception model, PendSV and SVCall, lazy FP stacking", url: ST + "programming_manual/pm0214-stm32-cortexm4-mcus-and-mpus-programming-manual-stmicroelectronics.pdf", doc: "PM0214", sec: "The Cortex-M4 processor", kind: "st" },
    pm0214Fault: { t: "PM0214 — fault handling, SHCSR, CFSR, HFSR, MMFAR, BFAR", url: ST + "programming_manual/pm0214-stm32-cortexm4-mcus-and-mpus-programming-manual-stmicroelectronics.pdf", doc: "PM0214", sec: "Fault handling; System control block", kind: "st" },
    pm0214Vtor: { t: "PM0214 — vector table offset register (VTOR)", url: ST + "programming_manual/pm0214-stm32-cortexm4-mcus-and-mpus-programming-manual-stmicroelectronics.pdf", doc: "PM0214", sec: "System control block", kind: "st" },
    ddi0439: { t: "Cortex-M4 Technical Reference Manual", url: "https://developer.arm.com/documentation/ddi0439/latest/", doc: "ARM DDI 0439", kind: "arm" },
    an5348: { t: "AN5348 — Introduction to FDCAN peripherals for STM32 MCUs", url: ST + "application_note/an5348-introduction-to-fdcan-peripherals-for-stm32-mcus-stmicroelectronics.pdf", doc: "AN5348", kind: "st" },
    um2570: { t: "UM2570 — Description of STM32G4 HAL and low-layer drivers", url: ST + "user_manual/um2570-description-of-stm32g4-hal-and-lowlayer-drivers-stmicroelectronics.pdf", doc: "UM2570", kind: "st" },
    cmsisDeviceG4: { t: "cmsis-device-g4 — STM32G4 CMSIS device headers (ST)", url: "https://github.com/STMicroelectronics/cmsis-device-g4", kind: "tool" },
    halG4: { t: "stm32g4xx-hal-driver — HAL and LL drivers (ST)", url: "https://github.com/STMicroelectronics/stm32g4xx_hal_driver", kind: "st" },
    nucleoBsp: { t: "stm32g4xx-nucleo-bsp — NUCLEO-G474RE board support (ST)", url: "https://github.com/STMicroelectronics/stm32g4xx-nucleo-bsp", kind: "st" },
    openPinData: { t: "STM32_open_pin_data — ST's pin and alternate-function database", url: "https://github.com/STMicroelectronics/STM32_open_pin_data", kind: "st" },
    zephyrNucleo: { t: "Zephyr board files for nucleo_g474re (community)", url: "https://github.com/zephyrproject-rtos/zephyr/tree/main/boards/st/nucleo_g474re", kind: "community" },
    ddi0403: { t: "ARMv7-M Architecture Reference Manual", url: "https://developer.arm.com/documentation/ddi0403/latest/", doc: "ARM DDI 0403", kind: "arm" },
    uneceR48: { t: "UN Regulation No. 48 — installation of lighting and light-signalling devices (UNECE)", url: "https://unece.org/transport/vehicle-regulations-wp29/standards/addenda-1958-agreement-regulations-41-60", doc: "UN R48", kind: "spec" },
    autosarRelease: { t: "AUTOSAR Classic Platform R25-11 — Release Overview", url: "https://www.autosar.org/fileadmin/standards/R25-11/CP/AUTOSAR_CP_TR_ReleaseOverview.pdf", doc: "AUTOSAR_CP_TR_ReleaseOverview", rev: "R25-11", kind: "autosar" },
    openocdManual: { t: "OpenOCD User's Guide", url: "https://openocd.org/doc/html/index.html", kind: "tool" },
    an2606: { t: "AN2606 — STM32 microcontroller system memory boot mode", url: ST + "application_note/an2606-stm32-microcontroller-system-memory-boot-mode-stmicroelectronics.pdf", doc: "AN2606", kind: "st" },
    an3155: { t: "AN3155 — USART protocol used in the STM32 bootloader", url: ST + "application_note/an3155-usart-protocol-used-in-the-stm32-bootloader-stmicroelectronics.pdf", doc: "AN3155", kind: "st" },
    um2237: { t: "UM2237 — STM32CubeProgrammer software description", url: ST + "user_manual/um2237-stm32cubeprogrammer-software-description-stmicroelectronics.pdf", doc: "UM2237", kind: "st" },
    ddi0403Reset: { t: "ARMv7-M ARM — reset behaviour and the vector table", url: "https://developer.arm.com/documentation/ddi0403/latest/", doc: "ARM DDI 0403", sec: "B1.5", kind: "arm" },
    cmakeToolchains: { t: "cmake-toolchains(7) — cross compiling", url: "https://cmake.org/cmake/help/latest/manual/cmake-toolchains.7.html", kind: "tool" },
    cmakePresets: { t: "cmake-presets(7)", url: "https://cmake.org/cmake/help/latest/manual/cmake-presets.7.html", kind: "tool" },
    gccArm: { t: "GCC manual — ARM options", url: "https://gcc.gnu.org/onlinedocs/gcc/ARM-Options.html", kind: "tool" },
    ldManual: { t: "GNU ld manual — linker scripts", url: "https://sourceware.org/binutils/docs/ld/Scripts.html", kind: "tool" },
    cortexDebug: { t: "Cortex-Debug for VS Code — wiki", url: "https://github.com/Marus/cortex-debug/wiki", kind: "tool" },
    armGnu: { t: "Arm GNU Toolchain downloads", url: "https://developer.arm.com/downloads/-/arm-gnu-toolchain-downloads", kind: "tool" },
    ddi0403Exc: { t: "ARMv7-M ARM — exception model", url: "https://developer.arm.com/documentation/ddi0403/latest/", doc: "ARM DDI 0403", sec: "B1.5", kind: "arm" },
    cmsisCore: { t: "CMSIS-Core (Cortex-M) documentation", url: "https://arm-software.github.io/CMSIS_6/latest/Core/index.html", kind: "tool" },
    um10204: { t: "UM10204 — I2C-bus specification and user manual (NXP)", url: "https://www.nxp.com/docs/en/user-guide/UM10204.pdf", doc: "UM10204", kind: "spec" },
    iso11898: { t: "ISO 11898-1 — CAN data link layer and physical signalling (summary)", url: "https://www.iso.org/standard/63648.html", doc: "ISO 11898-1:2015", kind: "iso" },
    iso11898p2: { t: "ISO 11898-2 — CAN high-speed physical medium attachment (summary)", url: "https://www.iso.org/standard/67244.html", doc: "ISO 11898-2:2016", kind: "iso" },
    iso17987: { t: "ISO 17987 — Local Interconnect Network (LIN) (summary)", url: "https://www.iso.org/standard/61222.html", doc: "ISO 17987-1:2016", kind: "iso" },
    tiSn65: { t: "SN65HVD230 3.3 V CAN transceiver datasheet (TI; classic CAN up to 1 Mbit/s)", url: "https://www.ti.com/lit/ds/symlink/sn65hvd230.pdf", doc: "SLOS346", kind: "datasheet" },
    winbondW25q: { t: "Winbond W25Q serial NOR flash (product family and datasheets)", url: "https://www.winbond.com/hq/product/code-storage-flash-memory/serial-nor-flash/", kind: "datasheet" },
    ssd1306: { t: "SSD1306 OLED controller datasheet (Solomon Systech, copy hosted by Adafruit)", url: "https://cdn-shop.adafruit.com/datasheets/SSD1306.pdf", kind: "community" },
    freertosCm4: { t: "FreeRTOS — running the RTOS on ARM Cortex-M (interrupt priorities)", url: "https://www.freertos.org/RTOS-Cortex-M3-M4.html", kind: "tool" },
    freertosConfig: { t: "FreeRTOS — FreeRTOSConfig.h customisation", url: "https://www.freertos.org/a00110.html", kind: "tool" },
    freertosStack: { t: "FreeRTOS — stack usage and stack overflow checking", url: "https://www.freertos.org/Stacks-and-stack-overflow-checking.html", kind: "tool" },
    freertosMutex: { t: "FreeRTOS — mutexes and priority inheritance", url: "https://www.freertos.org/Real-time-embedded-RTOS-mutexes.html", kind: "tool" },
    freertosKernel: { t: "FreeRTOS-Kernel source (Cortex-M4F port: portable/GCC/ARM_CM4F/port.c)", url: "https://github.com/FreeRTOS/FreeRTOS-Kernel", kind: "tool" },
    ddi0403Stack: { t: "ARMv7-M ARM — exception entry stacking and EXC_RETURN", url: "https://developer.arm.com/documentation/ddi0403/latest/", doc: "ARM DDI 0403", sec: "B1.5.6–B1.5.8", kind: "arm" },
    ddi0403Fault: { t: "ARMv7-M ARM — fault handling, escalation and lockup", url: "https://developer.arm.com/documentation/ddi0403/latest/", doc: "ARM DDI 0403", sec: "B1.5.6, B1.5.15", kind: "arm" },
    gdbManual: { t: "Debugging with GDB — breakpoints, watchpoints, examining memory", url: "https://sourceware.org/gdb/current/onlinedocs/gdb.html/", kind: "tool" },
    armSemihosting: { t: "Arm semihosting specification", url: "https://github.com/ARM-software/abi-aa/blob/main/semihosting/semihosting.rst", kind: "arm" },
    unity: { t: "Unity — unit testing for C (ThrowTheSwitch)", url: "https://www.throwtheswitch.org/unity", kind: "tool" },
    cmock: { t: "CMock — mock generation for C (ThrowTheSwitch)", url: "https://www.throwtheswitch.org/cmock", kind: "tool" },
    cppcheckManual: { t: "Cppcheck manual (including the MISRA addon)", url: "https://cppcheck.sourceforge.io/manual.pdf", kind: "tool" },
    misraC: { t: "MISRA C:2012 guidelines and amendments (MISRA, purchase required)", url: "https://misra.org.uk/product/misra-c2012-third-edition-first-revision/", doc: "MISRA C:2012", kind: "spec" },
    misraCompliance: { t: "MISRA Compliance:2020 — deviations and guideline re-categorisation (free download)", url: "https://misra.org.uk/app/uploads/2021/06/MISRA-Compliance-2020.pdf", doc: "MISRA Compliance:2020", kind: "spec" },
    ctest: { t: "ctest(1) — CMake test driver", url: "https://cmake.org/cmake/help/latest/manual/ctest.1.html", kind: "tool" },
    gccAnalyzer: { t: "GCC manual — static analyzer options (-fanalyzer)", url: "https://gcc.gnu.org/onlinedocs/gcc/Static-Analyzer-Options.html", kind: "tool" },
    arLayered: { t: "Layered Software Architecture (explanatory)", url: "https://www.autosar.org/fileadmin/standards/R25-11/CP/AUTOSAR_CP_EXP_LayeredSoftwareArchitecture.pdf", doc: "AUTOSAR_CP_EXP_LayeredSoftwareArchitecture", rev: "R25-11", kind: "autosar" },
    arMethodology: { t: "Methodology (technical report)", url: "https://www.autosar.org/fileadmin/standards/R25-11/CP/AUTOSAR_CP_TR_Methodology.pdf", doc: "AUTOSAR_CP_TR_Methodology", rev: "R25-11", kind: "autosar" },
    arModuleList: { t: "List of Basic Software Modules", url: "https://www.autosar.org/fileadmin/standards/R25-11/CP/AUTOSAR_CP_TR_BSWModuleList.pdf", doc: "AUTOSAR_CP_TR_BSWModuleList", rev: "R25-11", kind: "autosar" },
    arSrsBswGeneral: { t: "General Requirements on Basic Software Modules", url: "https://www.autosar.org/fileadmin/standards/R25-11/CP/AUTOSAR_CP_SRS_BSWGeneral.pdf", doc: "AUTOSAR_CP_SRS_BSWGeneral", rev: "R25-11", kind: "autosar" },
    arRte: { t: "Specification of RTE Software", url: "https://www.autosar.org/fileadmin/standards/R25-11/CP/AUTOSAR_CP_SWS_RTE.pdf", doc: "AUTOSAR_CP_SWS_RTE", rev: "R25-11", kind: "autosar" },
    arSwcTemplate: { t: "Software Component Template", url: "https://www.autosar.org/fileadmin/standards/R25-11/CP/AUTOSAR_CP_TPS_SoftwareComponentTemplate.pdf", doc: "AUTOSAR_CP_TPS_SoftwareComponentTemplate", rev: "R25-11", kind: "autosar" },
    arStdTypes: { t: "Specification of Standard Types", url: "https://www.autosar.org/fileadmin/standards/R25-11/CP/AUTOSAR_CP_SWS_StandardTypes.pdf", doc: "AUTOSAR_CP_SWS_StandardTypes", rev: "R25-11", kind: "autosar" },
    arPlatformTypes: { t: "Specification of Platform Types", url: "https://www.autosar.org/fileadmin/standards/R25-11/CP/AUTOSAR_CP_SWS_PlatformTypes.pdf", doc: "AUTOSAR_CP_SWS_PlatformTypes", rev: "R25-11", kind: "autosar" },
    arCompilerAbs: { t: "Specification of Compiler Abstraction", url: "https://www.autosar.org/fileadmin/standards/R25-11/CP/AUTOSAR_CP_SWS_CompilerAbstraction.pdf", doc: "AUTOSAR_CP_SWS_CompilerAbstraction", rev: "R25-11", kind: "autosar" },
    arMemMap: { t: "Specification of Memory Mapping", url: "https://www.autosar.org/fileadmin/standards/R25-11/CP/AUTOSAR_CP_SWS_MemoryMapping.pdf", doc: "AUTOSAR_CP_SWS_MemoryMapping", rev: "R25-11", kind: "autosar" },
    arDet: { t: "Specification of Default Error Tracer", url: "https://www.autosar.org/fileadmin/standards/R25-11/CP/AUTOSAR_CP_SWS_DefaultErrorTracer.pdf", doc: "AUTOSAR_CP_SWS_DefaultErrorTracer", rev: "R25-11", kind: "autosar" },
    arDio: { t: "Specification of DIO Driver", url: "https://www.autosar.org/fileadmin/standards/R25-11/CP/AUTOSAR_CP_SWS_DIODriver.pdf", doc: "AUTOSAR_CP_SWS_DIODriver", rev: "R25-11", kind: "autosar" },
    arPort: { t: "Specification of Port Driver", url: "https://www.autosar.org/fileadmin/standards/R25-11/CP/AUTOSAR_CP_SWS_PortDriver.pdf", doc: "AUTOSAR_CP_SWS_PortDriver", rev: "R25-11", kind: "autosar" },
    arPwm: { t: "Specification of PWM Driver", url: "https://www.autosar.org/fileadmin/standards/R25-11/CP/AUTOSAR_CP_SWS_PWMDriver.pdf", doc: "AUTOSAR_CP_SWS_PWMDriver", rev: "R25-11", kind: "autosar" },
    arAdc: { t: "Specification of ADC Driver", url: "https://www.autosar.org/fileadmin/standards/R25-11/CP/AUTOSAR_CP_SWS_ADCDriver.pdf", doc: "AUTOSAR_CP_SWS_ADCDriver", rev: "R25-11", kind: "autosar" },
    arCan: { t: "Specification of CAN Driver", url: "https://www.autosar.org/fileadmin/standards/R25-11/CP/AUTOSAR_CP_SWS_CANDriver.pdf", doc: "AUTOSAR_CP_SWS_CANDriver", rev: "R25-11", kind: "autosar" },
    arWdg: { t: "Specification of Watchdog Driver", url: "https://www.autosar.org/fileadmin/standards/R25-11/CP/AUTOSAR_CP_SWS_WatchdogDriver.pdf", doc: "AUTOSAR_CP_SWS_WatchdogDriver", rev: "R25-11", kind: "autosar" },
    arMcu: { t: "Specification of MCU Driver", url: "https://www.autosar.org/fileadmin/standards/R25-11/CP/AUTOSAR_CP_SWS_MCUDriver.pdf", doc: "AUTOSAR_CP_SWS_MCUDriver", rev: "R25-11", kind: "autosar" },
    arOs: { t: "Specification of Operating System", url: "https://www.autosar.org/fileadmin/standards/R25-11/CP/AUTOSAR_CP_SWS_OS.pdf", doc: "AUTOSAR_CP_SWS_OS", rev: "R25-11", kind: "autosar" },
    arCom: { t: "Specification of COM", url: "https://www.autosar.org/fileadmin/standards/R25-11/CP/AUTOSAR_CP_SWS_COM.pdf", doc: "AUTOSAR_CP_SWS_COM", rev: "R25-11", kind: "autosar" },
    arPduR: { t: "Specification of PDU Router", url: "https://www.autosar.org/fileadmin/standards/R25-11/CP/AUTOSAR_CP_SWS_PDURouter.pdf", doc: "AUTOSAR_CP_SWS_PDURouter", rev: "R25-11", kind: "autosar" },
    arCanIf: { t: "Specification of CAN Interface", url: "https://www.autosar.org/fileadmin/standards/R25-11/CP/AUTOSAR_CP_SWS_CANInterface.pdf", doc: "AUTOSAR_CP_SWS_CANInterface", rev: "R25-11", kind: "autosar" },
    arEcuM: { t: "Specification of ECU State Manager", url: "https://www.autosar.org/fileadmin/standards/R25-11/CP/AUTOSAR_CP_SWS_ECUStateManager.pdf", doc: "AUTOSAR_CP_SWS_ECUStateManager", rev: "R25-11", kind: "autosar" },
    arDem: { t: "Specification of Diagnostic Event Manager", url: "https://www.autosar.org/fileadmin/standards/R25-11/CP/AUTOSAR_CP_SWS_DiagnosticEventManager.pdf", doc: "AUTOSAR_CP_SWS_DiagnosticEventManager", rev: "R25-11", kind: "autosar" },
    arDcm: { t: "Specification of Diagnostic Communication Manager", url: "https://www.autosar.org/fileadmin/standards/R25-11/CP/AUTOSAR_CP_SWS_DiagnosticCommunicationManager.pdf", doc: "AUTOSAR_CP_SWS_DiagnosticCommunicationManager", rev: "R25-11", kind: "autosar" },
    arNvM: { t: "Specification of NVRAM Manager", url: "https://www.autosar.org/fileadmin/standards/R25-11/CP/AUTOSAR_CP_SWS_NVRAMManager.pdf", doc: "AUTOSAR_CP_SWS_NVRAMManager", rev: "R25-11", kind: "autosar" },
    arFee: { t: "Specification of Flash EEPROM Emulation", url: "https://www.autosar.org/fileadmin/standards/R25-11/CP/AUTOSAR_CP_SWS_FlashEEPROMEmulation.pdf", doc: "AUTOSAR_CP_SWS_FlashEEPROMEmulation", rev: "R25-11", kind: "autosar" },
    arWdgM: { t: "Specification of Watchdog Manager", url: "https://www.autosar.org/fileadmin/standards/R25-11/CP/AUTOSAR_CP_SWS_WatchdogManager.pdf", doc: "AUTOSAR_CP_SWS_WatchdogManager", rev: "R25-11", kind: "autosar" },
    arCanTp: { t: "Specification of CAN Transport Layer", url: "https://www.autosar.org/fileadmin/standards/R25-11/CP/AUTOSAR_CP_SWS_CANTransportLayer.pdf", doc: "AUTOSAR_CP_SWS_CANTransportLayer", rev: "R25-11", kind: "autosar" },
    iso14229: { t: "ISO 14229-1 — Unified diagnostic services (UDS), application layer (summary)", url: "https://www.iso.org/standard/72439.html", doc: "ISO 14229-1:2020", kind: "iso" },
    iso15765: { t: "ISO 15765-2 — Diagnostic communication over CAN, transport protocol (summary)", url: "https://www.iso.org/standard/84211.html", doc: "ISO 15765-2:2024", kind: "iso" },
    iso26262: { t: "ISO 26262 — Road vehicles, functional safety (overview)", url: "https://www.iso.org/standard/68383.html", doc: "ISO 26262-1:2018", kind: "iso" },
    iso17356: { t: "ISO 17356-3 — OSEK/VDX operating system (summary)", url: "https://www.iso.org/standard/40079.html", doc: "ISO 17356-3:2005", kind: "iso" },
    nxpS32k: { t: "NXP S32K automotive microcontrollers (product family)", url: "https://www.nxp.com/products/processors-and-microcontrollers/s32-automotive-platform/s32k-auto-general-purpose-mcus:S32K-MCUS", kind: "datasheet" },
    infineonAurix: { t: "Infineon AURIX TC3xx microcontrollers (product family)", url: "https://www.infineon.com/cms/en/product/microcontroller/32-bit-tricore-microcontroller/32-bit-tricore-aurix-tc3xx/", kind: "datasheet" },
    renesasRh850: { t: "Renesas RH850 automotive microcontrollers (product family)", url: "https://www.renesas.com/en/products/microcontrollers-microprocessors/rh850-automotive-mcus", kind: "datasheet" },
    aecQ100: { t: "AEC-Q100 — failure mechanism based stress test qualification for integrated circuits", url: "http://www.aecouncil.com/AECDocuments.html", doc: "AEC-Q100", kind: "spec" },
  };
  const REFS = {
    "automotive-mcus": ["aecQ100", "iso26262", "nxpS32k", "infineonAurix", "renesasRh850", "ds12288", "arLayered"],
    "ll-drivers": ["um2570", "halG4", "rm0440Rcc", "rm0440Gpio", "cmsisDeviceG4"],
    "capstone-autosar": ["arLayered", "arRte", "arCom", "arWdgM", "arDem", "arEcuM", "arOs", "arModuleList", "arCanIf", "arCan", "rm0440Fdcan", "an5348", "iso11898"],
    "capstone-rtos": ["freertosCm4", "freertosConfig", "freertosStack", "freertosKernel", "rm0440Iwdg", "pm0214Exc"],
    "capstone-baremetal": ["uneceR48", "rm0440Tim", "rm0440Fdcan", "rm0440Adc", "rm0440Iwdg", "iso11898", "um2505"],
    "autosar-review": ["arSrsBswGeneral", "arLayered", "misraC", "misraCompliance", "iso26262", "arMcu"],
    "autosar-diag-nvm": ["iso14229", "iso15765", "arDem", "arDcm", "arCanTp", "arNvM", "arFee", "rm0440Flash"],
    "autosar-os-com": ["arOs", "iso17356", "arRte", "arCom", "arPduR", "arCanIf", "arCan", "arEcuM", "iso11898"],
    "autosar-mcal": ["arSrsBswGeneral", "arModuleList", "arStdTypes", "arPlatformTypes", "arCompilerAbs", "arMemMap", "arDet", "arPort", "arDio", "arPwm", "arAdc", "arCan", "arWdg", "arMcu", "rm0440Gpio", "rm0440Fdcan"],
    "autosar-swc": ["arRte", "arSwcTemplate", "arLayered", "arCom", "arDem"],
    "autosar-arch": ["arLayered", "arMethodology", "arModuleList", "arSrsBswGeneral", "autosarRelease", "arEcuM"],
    "quality": ["misraC", "misraCompliance", "cppcheckManual", "unity", "cmock", "ctest", "gccAnalyzer", "gccArm"],
    "bootloader": ["an2606", "an3155", "rm0440Flash", "pm0214Vtor", "ddi0403Reset", "ds12288Elec", "rm0440Mem", "ldManual"],
    "faults-debug": ["pm0214Fault", "ddi0403Fault", "ddi0403Stack", "ddi0439", "rm0440Debug", "gdbManual", "armSemihosting", "um2505"],
    "rtos": ["pm0214Exc", "ddi0403Stack", "pm0214Nvic", "freertosCm4", "freertosConfig", "freertosStack", "freertosMutex", "freertosKernel"],
    "power-wdg": ["rm0440Pwr", "rm0440Iwdg", "rm0440Wwdg", "rm0440Rcc", "rm0440Debug", "ds12288Elec", "pm0214"],
    "can": ["rm0440Fdcan", "an5348", "iso11898", "iso11898p2", "iso17987", "ds12288Pins", "tiSn65"],
    "spi": ["rm0440Spi", "rm0440Dma", "rm0440Dmamux", "ds12288Elec", "winbondW25q"],
    "i2c": ["rm0440I2c", "es0430", "um10204", "ds12288Pins", "rm0440Mem", "ssd1306"],
    "adc-dma": ["rm0440Adc", "rm0440Dma", "rm0440Dmamux", "ds12288Elec", "ds12288Pins", "rm0440Rcc"],
    "uart": ["rm0440Usart", "rm0440Rcc", "pm0214Nvic", "iso17987", "ds12288Pins", "um2505"],
    "timers": ["rm0440Tim", "rm0440Rcc", "rm0440Gpio", "ds12288Pins", "pm0214"],
    "interrupts": ["pm0214Nvic", "ddi0403Exc", "ddi0439", "rm0440Exti", "rm0440Syscfg", "cmsisCore", "nucleoBsp"],
    "gpio": ["rm0440Gpio", "ds12288Pins", "ds12288Elec", "rm0440Syscfg", "openPinData", "um2505", "nucleoBsp"],
    "clocks": ["rm0440Rcc", "rm0440Pwr", "rm0440Flash", "ds12288Elec", "halG4", "pm0214Nvic"],
    "boot": ["rm0440Mem", "rm0440Flash", "pm0214", "ddi0403Reset", "ldManual", "gccArm", "an2606", "cmsisDeviceG4"],
    "fundamentals": ["ds12288", "rm0440Mem", "rm0440Rcc", "pm0214", "ddi0403", "ddi0439", "cmsisDeviceG4", "gccArm", "ldManual"],
    "troubleshooting": ["openocdManual", "um2505", "rm0440Debug", "rm0440Gpio", "rm0440Mem", "rm0440Flash", "es0430", "an2606"],
    "board": ["um2505", "nucleoG474", "ds12288Pins", "ds12288Elec", "openPinData", "nucleoBsp", "rm0440Mem", "es0430", "zephyrNucleo"],
    "setup": ["um2505", "ds12288", "rm0440Mem", "rm0440Rcc", "rm0440Pwr", "rm0440Flash", "rm0440Gpio", "rm0440Usart", "pm0214", "ddi0403Reset", "um2237", "openocdManual", "cmakeToolchains", "cmakePresets", "gccArm", "ldManual", "cortexDebug", "armGnu"],
    glossary: ["g474Docs", "ds12288", "rm0440", "pm0214", "um2505", "ddi0403", "autosarRelease", "openocdManual"],
  };


  const { esc } = CODE;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const isReady = (p) => !!p && p.status === "ready";
  const byId = (id) => SITE.find((p) => p.id === id);
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } },
  };

  const pageId = document.body.dataset.page || "home";
  const currentPage = byId(pageId);
  const readyPages = SITE.filter(isReady);

  const ICON_SEARCH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';

  /* --------------------------------------------------------------- Header */
  function pageLink(p, inner, cls = "") {
    return isReady(p)
      ? `<a class="${cls}" href="${p.file}">${inner}</a>`
      : `<span class="${cls} is-planned" aria-disabled="true" data-tip="${esc(p.short + S.tooltipSep + S.sidebar.plannedTip(p.phase))}" tabindex="0">${inner}</span>`;
  }
  function renderHeader() {
    const host = $("#site-header");
    if (!host) return;
    const modLinks = SITE.filter((p) => p.group !== "Reference")
      .map((p) => pageLink(p, `<span class="dm-num">${p.num}</span><span><b>${esc(p.short)}${isReady(p) ? "" : ` <em class="soon">${esc(S.status.planned(p.phase))}</em>`}</b><i>${esc(p.desc)}</i></span>`))
      .join("");
    const links = S.nav.links.map((l) => byId(l.id)).filter(isReady)
      .map((p) => `<a href="${p.file}" class="${pageId === p.id ? "active" : ""}">${esc(S.nav.links.find((l) => l.id === p.id).label)}</a>`).join("");
    host.outerHTML = `
      <header class="site-header">
        <button class="menu-btn" id="menu-btn" type="button" aria-label="${esc(S.nav.openToc)}">☰</button>
        <a class="brand" href="index.html" aria-label="${esc(S.brand.homeLabel)}">
          <div class="brand-mark" aria-hidden="true">${esc(S.brand.mark)}</div>
          <span>${esc(S.brand.name)}<small>${esc(S.brand.tagline)}</small></span>
        </a>
        <nav class="main-nav" aria-label="${esc(S.nav.mainNav)}">
          <a href="index.html" class="${pageId === "home" ? "active" : ""}">${esc(S.nav.home)}</a>
          <div class="nav-drop ${currentPage && currentPage.group !== "Reference" ? "active" : ""}">
            <button type="button" aria-haspopup="true">${esc(S.nav.modules)} ▾</button>
            <div class="nav-drop-menu">${modLinks}</div>
          </div>
          ${links}
        </nav>
        <div class="header-spacer"></div>
        <div class="global-search" role="search">
          <span class="s-icon">${ICON_SEARCH}</span>
          <input id="gs-input" type="search" placeholder="${esc(S.search.placeholder)}" autocomplete="off" aria-label="${esc(S.search.label)}">
          <kbd>${esc(S.search.shortcut)}</kbd>
          <div class="search-results" id="gs-results" role="listbox"></div>
        </div>
        <button class="theme-btn" id="theme-btn" type="button"></button>
      </header>`;
  }

  /* ---------------------------------------------------------- Theme */
  function initTheme() {
    const btn = $("#theme-btn");
    if (!btn) return;
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const effective = () => root.getAttribute("data-theme") || (media.matches ? "light" : "dark");
    const paint = () => {
      const light = effective() === "light";
      btn.textContent = light ? "🌙" : "☀️";
      btn.setAttribute("aria-label", light ? S.theme.toDark : S.theme.toLight);
      btn.title = btn.getAttribute("aria-label");
    };
    btn.addEventListener("click", () => {
      const next = effective() === "light" ? "dark" : "light";
      root.setAttribute("data-theme", next);
      store.set(CONFIG.themeKey, next);
      paint();
    });
    media.addEventListener("change", paint);
    paint();
  }

  /* ------------------------------------------------------- Global search */
  function slug(s) { return norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  function buildIndex() {
    const idx = [];
    readyPages.forEach((p) => {
      idx.push({ title: p.title, sub: p.desc, page: p.short, href: p.file, hay: norm(p.title + " " + p.desc + " " + p.short) });
      p.sections.forEach(([id, t, kw]) => idx.push({ title: t, sub: p.short, page: p.num, href: `${p.file}#${id}`, hay: norm(t + " " + kw + " " + p.short) }));
    });
    if (isReady(byId("glossary"))) {
      (window.GLOSSARY || []).forEach((g) => idx.push({ title: g.term, sub: g.full, page: S.search.glossary, href: `glossary.html#g-${slug(g.term)}`, hay: norm(g.term + " " + g.full + " " + g.desc) }));
    }
    return idx;
  }
  function hilite(text, q) {
    if (!q) return esc(text);
    const n = norm(text), i = n.indexOf(q);
    if (i < 0) return esc(text);
    return esc(text.slice(0, i)) + "<mark>" + esc(text.slice(i, i + q.length)) + "</mark>" + esc(text.slice(i + q.length));
  }
  function initGlobalSearch() {
    const input = $("#gs-input"), box = $("#gs-results");
    if (!input) return;
    let index = null, sel = -1;
    const run = () => {
      index = index || buildIndex();
      const q = norm(input.value.trim());
      if (!q) { box.classList.remove("open"); return; }
      const terms = q.split(/\s+/);
      const hits = index.filter((e) => terms.every((t) => e.hay.includes(t))).slice(0, 12);
      sel = -1;
      box.innerHTML = hits.length
        ? hits.map((h) => `<a href="${h.href}" role="option"><span class="sr-page">${esc(h.page)}</span><br><b>${hilite(h.title, q)}</b><small>${esc(h.sub)}</small></a>`).join("")
        : `<div class="sr-empty">${esc(S.search.noResults(input.value))}</div>`;
      box.classList.add("open");
    };
    input.addEventListener("input", run);
    input.addEventListener("focus", () => input.value && run());
    input.addEventListener("keydown", (e) => {
      const items = $$("a", box);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!items.length) return;
        sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
        items.forEach((a, i) => a.classList.toggle("sel", i === sel));
        items[sel].scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter") {
        const t = items[sel >= 0 ? sel : 0];
        if (t) location.href = t.getAttribute("href");
      } else if (e.key === "Escape") {
        box.classList.remove("open"); input.blur();
      }
    });
    document.addEventListener("click", (e) => { if (!e.target.closest(".global-search")) box.classList.remove("open"); });
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); input.focus(); input.select(); }
      else if (e.key === "/" && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); input.focus(); }
    });
  }

  /* --------------------------------------------------------------- Sidebar */
  function renderSidebar() {
    const host = $("#sidebar");
    if (!host) return;
    const domSections = $$("section.doc-section[id]");
    const groups = {};
    SITE.forEach((p) => (groups[p.group] = groups[p.group] || []).push(p));
    let html = `
      <div class="sb-progress">
        <div class="sb-progress-label"><span>${esc(S.sidebar.progress)}</span><span id="sb-pct">0%</span></div>
        <div class="sb-progress-bar"><div id="sb-bar"></div></div>
      </div>
      <div class="sb-filter">${ICON_SEARCH}
        <input id="sb-filter" type="search" placeholder="${esc(S.sidebar.filter)}" aria-label="${esc(S.sidebar.filterLabel)}">
        <div class="sb-filter-info" id="sb-filter-info"></div>
      </div>
      <nav aria-label="${esc(S.sidebar.toc)}">`;
    Object.entries(groups).forEach(([g, pages]) => {
      html += `<div class="sb-group"><div class="sb-group-title">${esc(g)}</div>`;
      pages.forEach((p) => {
        const cur = p.id === pageId;
        const hay = esc(norm(p.title + " " + p.desc + " " + p.sections.map((s) => s[1] + " " + s[2]).join(" ")));
        if (isReady(p)) {
          html += `<a class="sb-page ${cur ? "current" : ""}" href="${p.file}" data-hay="${hay}"><span class="sb-num">${p.num}</span>${esc(p.short)}</a>`;
        } else {
          html += `<span class="sb-page is-planned" data-hay="${hay}" data-tip="${esc(p.short + S.tooltipSep + S.sidebar.plannedTip(p.phase))}" tabindex="0"><span class="sb-num">${p.num}</span>${esc(p.short)}<em class="soon">${esc(S.sidebar.planned)}</em></span>`;
        }
        if (cur && domSections.length) {
          html += `<ul class="sb-sections">` + domSections.map((s) => {
            const title = s.dataset.title || ($("h2", s) || {}).textContent || s.id;
            const num = (($(".sec-num", s) || {}).textContent || "").trim();
            return `<li><a href="#${s.id}" data-target="${s.id}">${/^[\dA-Z]/.test(num) ? `<span class="sb-snum">${esc(num)}</span>` : ""}<span>${esc(title)}</span></a></li>`;
          }).join("") + `</ul>`;
        }
      });
      html += `</div>`;
    });
    html += `</nav>`;
    host.innerHTML = html;

    // Filter: matches page titles/keywords and the full text of in-page sections
    const sectionText = new Map(domSections.map((s) => [s.id, norm(s.textContent)]));
    const input = $("#sb-filter"), info = $("#sb-filter-info");
    input.addEventListener("input", () => {
      const q = norm(input.value.trim());
      let hitsSec = 0, hitsPage = 0;
      $$(".sb-sections a", host).forEach((a) => {
        const ok = !q || sectionText.get(a.dataset.target).includes(q) || norm(a.textContent).includes(q);
        a.parentElement.classList.toggle("sb-hidden", !ok);
        if (ok && q) hitsSec++;
      });
      $$(".sb-page", host).forEach((a) => {
        const ok = !q || a.dataset.hay.includes(q) || a.classList.contains("current");
        a.classList.toggle("sb-hidden", !ok);
        if (ok && q && !a.classList.contains("current")) hitsPage++;
      });
      $$(".sb-group", host).forEach((g) => g.classList.toggle("sb-hidden", !$$(".sb-page:not(.sb-hidden)", g).length));
      info.textContent = q ? S.sidebar.filterInfo(hitsSec, hitsPage) : "";
    });

    const btn = $("#menu-btn");
    if (btn) {
      btn.addEventListener("click", () => host.classList.toggle("open"));
      host.addEventListener("click", (e) => { if (e.target.closest("a")) host.classList.remove("open"); });
    }
  }

  /* --------------------------------------------- Scrollspy & progress */
  function initScrollspy() {
    const links = $$(".sb-sections a");
    const bar = $("#sb-bar"), pct = $("#sb-pct");
    const sections = $$("section.doc-section[id]");
    const onScroll = () => {
      const h = document.documentElement;
      const p = Math.min(100, Math.max(0, (h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)) * 100));
      if (bar) bar.style.width = p + "%";
      if (pct) pct.textContent = Math.round(p) + "%";
      let active = sections[0];
      sections.forEach((s) => { if (s.getBoundingClientRect().top - 140 <= 0) active = s; });
      links.forEach((a) => a.classList.toggle("active", !!active && a.dataset.target === active.id));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  function decorateSections() {
    $$("section.doc-section[id]").forEach((s) => {
      const head = $(".sec-head h2", s);
      if (head && !$(".anchor", head)) head.insertAdjacentHTML("beforeend", `<a class="anchor" href="#${s.id}" aria-label="Link to section">#</a>`);
    });
  }

  /* ------------------------------------------------- References */
  function renderReferences() {
    const keys = REFS[pageId];
    const pager = $("#pager");
    if (!keys || !pager) return;
    const sec = document.createElement("section");
    sec.className = "doc-section";
    sec.id = "references";
    sec.dataset.title = S.refs.title;
    // numbered as the page's last section (e.g. 3.9), like every other section
    const count = $$("section.doc-section .sec-num").filter((e) => /^\d|^[A-Z]\./.test(e.textContent.trim())).length;
    const num = currentPage ? `${/^\d+$/.test(currentPage.num) ? +currentPage.num : currentPage.num}.${count + 1}` : "📚";
    sec.innerHTML = `<div class="sec-head"><h2><span class="sec-num">${esc(num)}</span>${esc(S.refs.title)}</h2></div>
      <p class="small muted">${esc(S.refs.intro)}</p>
      <div class="ref-list">${keys.map((k) => {
        const r = R[k];
        if (!r) throw new Error(`Unknown reference key "${k}" on page "${pageId}"`);
        const badges = [r.doc && `<span class="badge gray mono">${esc(r.doc)}</span>`, r.rev && `<span class="badge gray">${esc(S.refs.rev(r.rev))}</span>`,
          r.sec && `<span class="badge gray">${esc(S.refs.sec(r.sec))}</span>`, r.kind === "community" && `<span class="badge amber">${esc(S.refs.community)}</span>`].filter(Boolean).join("");
        return `<a class="ref-item glass kind-${esc(r.kind || "other")}" href="${r.url}" target="_blank" rel="noopener"><b>${esc(r.t)}</b>${badges ? `<span class="ref-badges">${badges}</span>` : ""}<small>${esc(r.url.replace(/^https:\/\//, "")).replace(/([/_.+-])(?=[^/_.+-])/g, "$1<wbr>")}</small></a>`;
      }).join("")}</div>`;
    pager.parentNode.insertBefore(sec, pager);
  }

  /* ----------------------------------------------------------- Pager */
  function renderPager() {
    const host = $("#pager");
    if (!host || !currentPage) return;
    const i = readyPages.indexOf(currentPage);
    const prev = readyPages[i - 1], next = readyPages[i + 1];
    host.className = "pager";
    host.innerHTML =
      (prev ? `<a href="${prev.file}"><small>${esc(S.pager.prev)}</small><b>${esc(prev.short)}</b></a>` : `<a href="index.html"><small>${esc(S.pager.back)}</small><b>${esc(S.pager.home)}</b></a>`) +
      (next ? `<a class="next" href="${next.file}"><small>${esc(S.pager.next)}</small><b>${esc(next.short)}</b></a>` : "");
  }

  /* ----------------------------------------------------------- Footer */
  function renderFooter() {
    const host = $("#site-footer");
    if (!host) return;
    const blob = `${CONFIG.repo}/blob/${CONFIG.branch}/`;
    host.outerHTML = `
      <footer class="site-footer">
        <div class="footer-inner">
          <div class="footer-about"><b>${esc(S.brand.name)}</b> — ${esc(S.footer.about)}<br>
            <span class="small">${esc(S.footer.disclaimer)}</span></div>
          <div class="footer-links">
            ${readyPages.map((p) => `<a href="${p.file}">${esc(p.short)}</a>`).join("")}
            <a href="${CONFIG.repo}" target="_blank" rel="noopener">${esc(S.footer.repo)}</a>
            <a href="${blob}LICENSE" target="_blank" rel="noopener">${esc(S.footer.licence)}</a>
          </div>
        </div>
      </footer>`;
  }

  /* ------------------------------------------------------------- Tabs
     <div data-tabs data-remember="mcu-os" data-detect="os"> remembers the choice;
     data-detect="os" picks windows/macos/linux on the first visit. */
  function detectOs() {
    const p = ((navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || navigator.userAgent || "").toLowerCase();
    return /win/.test(p) ? "windows" : /mac|iphone|ipad/.test(p) ? "macos" : "linux";
  }
  function initTabs(root = document) {
    $$("[data-tabs]", root).forEach((tabs) => {
      if (tabs.dataset.ready) return;
      tabs.dataset.ready = "1";
      const btns = $$(":scope > .tab-list > button", tabs);
      const panels = $$(":scope > .tab-panel", tabs);
      const key = tabs.dataset.remember;
      const select = (k, focus) => {
        btns.forEach((b) => {
          const on = b.dataset.tab === k;
          b.setAttribute("aria-selected", on);
          b.tabIndex = on ? 0 : -1;
          if (on && focus) b.focus();
        });
        panels.forEach((p) => p.classList.toggle("active", p.dataset.panel === k));
      };
      btns.forEach((b, i) => {
        b.setAttribute("role", "tab");
        b.addEventListener("click", () => { select(b.dataset.tab); if (key) store.set(key, b.dataset.tab); });
        b.addEventListener("keydown", (e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            const n = btns[(i + (e.key === "ArrowRight" ? 1 : -1) + btns.length) % btns.length];
            select(n.dataset.tab, true);
            if (key) store.set(key, n.dataset.tab);
          }
        });
      });
      tabs.selectTab = select;
      const has = (k) => k && btns.some((b) => b.dataset.tab === k);
      const saved = key && store.get(key);
      const auto = tabs.dataset.detect === "os" ? detectOs() : null;
      const marked = btns.find((b) => b.getAttribute("aria-selected") === "true");
      const initial = has(saved) ? saved : has(auto) ? auto : (marked || btns[0] || {}).dataset && (marked || btns[0]).dataset.tab;
      if (initial) select(initial);
    });
  }

  /* ---------------------------------------------------- Code blocks */
  function sourceLink(src, start, end) {
    if (!src) return "";
    const lines = start && end ? `#L${start}-L${end}` : "";
    const tip = start && end ? S.code.linesTip(start, end) : S.code.sourceTip;
    return `<a class="src-link" href="${CONFIG.repo}/blob/${CONFIG.branch}/${esc(src)}${lines}" target="_blank" rel="noopener" title="${esc(tip)}">${esc(S.code.viewSource)} ↗</a>`;
  }
  function codeBlockHTML({ code, lang, file, marks = {}, label, src, start, end, skip }) {
    const lines = CODE.toLines(CODE.tokenize(code, lang));
    const lnos = CODE.lineNumbers(lines.length, start, skip);
    const body = lines.map((l, i) => {
      const n = marks[i];
      return `<div class="cl${n ? " ann" : ""}" ${n ? `data-ann="${n}"` : ""}><span class="lno">${lnos[i]}</span><span class="lc">${l || " "}</span>${n ? `<span class="abadge">${n}</span>` : ""}</div>`;
    }).join("");
    return `<div class="code-block">
      <div class="code-head"><div class="dots" aria-hidden="true"><i></i><i></i><i></i></div><span class="fname">${esc(file || "")}</span>
      <span class="lang badge gray">${esc(label || lang || "")}</span>${sourceLink(src, start, end)}<button class="copy-btn" type="button">${esc(S.code.copy)}</button></div>
      <pre class="code" tabindex="0">${body}</pre></div>`;
  }
  function wireCopy(root) {
    $$(".copy-btn", root).forEach((b) => {
      if (b.dataset.wired) return;
      b.dataset.wired = "1";
      b.addEventListener("click", () => {
        const pre = b.closest(".code-block").querySelector("pre");
        const text = $$(".lc", pre).map((x) => x.textContent).join("\n");
        const done = () => { b.textContent = S.code.copied; setTimeout(() => (b.textContent = S.code.copy), 1500); };
        if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
        else fallbackCopy(text, done);
      });
    });
  }
  function fallbackCopy(text, done) {
    const ta = document.createElement("textarea");
    ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); done(); } catch (e) { /* ignore */ }
    ta.remove();
  }
  const specOf = (s) => ({ lang: s.dataset.lang, file: s.dataset.file, label: s.dataset.label, src: s.dataset.src, start: s.dataset.start, end: s.dataset.end, skip: s.dataset.skip });
  /** Highlighted block from <script type="text/plain" data-code data-lang data-file [data-src data-start data-end]> */
  function renderStaticCode(root = document) {
    $$("script[type='text/plain'][data-code]", root).forEach((s) => {
      const { code } = CODE.parseMarks(s.textContent);
      const wrap = document.createElement("div");
      wrap.innerHTML = codeBlockHTML({ code, ...specOf(s) });
      s.replaceWith(wrap.firstElementChild);
    });
    wireCopy(root);
  }

  /** <div class="lang-switch"> holding several code blocks (e.g. Registers + HAL) becomes a small tab bar.
      Picking a variant switches every such block on the page and is remembered. */
  function selectLang(group, lang) {
    $$(":scope > .tab-list > button", group).forEach((b) => {
      const on = b.dataset.tab === lang;
      b.setAttribute("aria-selected", on);
      b.tabIndex = on ? 0 : -1;
    });
    $$(":scope > .tab-panel", group).forEach((p) => p.classList.toggle("active", p.dataset.panel === lang));
  }
  const hasLang = (group, lang) => !!(lang && $(`:scope > .tab-panel[data-panel="${lang}"]`, group));
  function initLangSwitch(root = document) {
    const saved = store.get(CONFIG.langKey);
    $$(".lang-switch", root).forEach((g) => {
      if (g.dataset.ready) return;
      g.dataset.ready = "1";
      const blocks = $$(":scope > .code-block", g);
      const langs = blocks.map((b) => $(".lang", b).textContent.trim());
      const bar = document.createElement("div");
      bar.className = "tab-list";
      bar.setAttribute("role", "tablist");
      bar.innerHTML = langs.map((l) => `<button type="button" role="tab" data-tab="${esc(l.toLowerCase())}">${esc(l)}</button>`).join("");
      g.prepend(bar);
      blocks.forEach((b, i) => {
        const panel = document.createElement("div");
        panel.className = "tab-panel";
        panel.dataset.panel = langs[i].toLowerCase();
        b.replaceWith(panel);
        panel.appendChild(b);
      });
      const btns = $$("button", bar);
      btns.forEach((b, i) => {
        b.addEventListener("click", () => {
          $$(".lang-switch[data-ready]").forEach((o) => hasLang(o, b.dataset.tab) && selectLang(o, b.dataset.tab));
          store.set(CONFIG.langKey, b.dataset.tab);
        });
        b.addEventListener("keydown", (e) => {
          if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
          const n = btns[(i + (e.key === "ArrowRight" ? 1 : -1) + btns.length) % btns.length];
          n.click();
          n.focus();
        });
      });
      selectLang(g, hasLang(g, saved) ? saved : btns[0].dataset.tab);
    });
  }

  /** Annotated explorer: code on the left, explanations on the right.
      spec: { src (code text), lang, file, label, notes: {n: [title, html]}, source, start, end, skip }
      Usually: renderCodeExplorer(host, { ...MCU.embedded("src-00-clock"), notes }) */
  function renderCodeExplorer(host, spec) {
    const { code, marks } = CODE.parseMarks(spec.src);
    const notes = spec.notes;
    host.innerHTML = `<div class="code-explorer">
      ${codeBlockHTML({ code, lang: spec.lang, file: spec.file, marks, label: spec.label, src: spec.source, start: spec.start, end: spec.end, skip: spec.skip })}
      <div class="ann-list glass">${Object.keys(notes).map((n) => `<div class="ann-item" data-ann="${n}" tabindex="0"><span class="an">${n}</span><div><b>${esc(notes[n][0])}</b><p>${notes[n][1]}</p></div></div>`).join("")}</div>
    </div>`;
    const pre = $("pre", host), list = $(".ann-list", host);
    const select = (n, from) => {
      $$(".cl.hl", pre).forEach((x) => x.classList.remove("hl"));
      $$(".ann-item", list).forEach((x) => x.classList.toggle("sel", x.dataset.ann === String(n)));
      const line = $(`.cl[data-ann="${n}"]`, pre);
      if (line) {
        line.classList.add("hl");
        if (from === "list") pre.scrollTo({ top: line.offsetTop - pre.clientHeight / 3, behavior: "smooth" });
      }
      const item = $(`.ann-item[data-ann="${n}"]`, list);
      if (item && from === "code") list.scrollTo({ top: item.offsetTop - 10, behavior: "smooth" });
    };
    $$(".cl.ann", pre).forEach((l) => l.addEventListener("click", () => select(l.dataset.ann, "code")));
    $$(".ann-item", list).forEach((it) => {
      it.addEventListener("click", () => select(it.dataset.ann, "list"));
      it.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(it.dataset.ann, "list"); } });
    });
    wireCopy(host);
  }

  /** Spec for renderCodeExplorer from an embedded <script type="text/plain" id="…" data-src …> block. */
  function embedded(id) {
    const s = document.getElementById(id);
    if (!s) throw new Error(`No embedded source #${id}`);
    const sp = specOf(s);
    return { src: s.textContent, lang: sp.lang, file: sp.file, label: sp.label, source: sp.src, start: sp.start, end: sp.end, skip: sp.skip };
  }

  /* -------------------------------------------------- Sequence engine */
  /**
   * lanes: [{title, sub, tone?: 'asw'|'rte'|'svc'|'ecual'|'mcal'|'cdd'|'hw'|'tool', tip?}]
   * steps: [{from, to, kind: 'call'|'irq'|'dma'|'bus'|'rte'|'pdu'|'ret', label, svg, title, detail, code, codeLang, codeFile, analogy, tags}]
   * opts: { ariaLabel, laneW, intro, introSide, legend: [kinds], onStep }
   */
  const SEQ_KINDS = ["call", "irq", "dma", "bus", "rte", "pdu", "ret", "self"];
  function SequenceDiagram(host, opts) {
    const { lanes, steps } = opts;
    const T = S.seq;
    const laneW = opts.laneW || 172, padX = 16, headH = 64, rowH = 46, top = headH + 26;
    const W = padX * 2 + lanes.length * laneW;
    const H = top + steps.length * rowH + 20;
    const lx = (i) => padX + laneW * i + laneW / 2;
    let cur = -1, timer = null;
    const D = window.MCU && window.MCU.Diagram;

    let svg = `<svg viewBox="0 0 ${W} ${H}" role="group" aria-label="${esc(opts.ariaLabel || T.ariaDefault)}"><defs>`;
    SEQ_KINDS.forEach((k) => {
      svg += `<marker id="${host.id}-ah-${k}" class="k-${k}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker>`;
    });
    svg += `</defs>`;
    lanes.forEach((l, i) => {
      const x = padX + laneW * i + 6;
      svg += `<line class="seq-lifeline" x1="${lx(i)}" y1="${headH}" x2="${lx(i)}" y2="${H - 8}"/>`;
      const tip = l.tip || (D ? D.termTip(l.title) || D.termTip(l.sub) : "");
      svg += `<g class="seq-lane${l.tone ? " tn-" + l.tone : ""}"${tip ? ` data-tip="${esc(tip)}"` : ""}><rect class="seq-lane-box" data-lane="${i}" x="${x}" y="8" width="${laneW - 12}" height="${headH - 14}" rx="9"/>`;
      svg += `<text class="seq-lane-title" x="${lx(i)}" y="30" text-anchor="middle">${esc(l.title)}</text>`;
      svg += `<text class="seq-lane-sub" x="${lx(i)}" y="46" text-anchor="middle">${esc(l.sub || "")}</text></g>`;
    });
    steps.forEach((s, i) => {
      const y = top + i * rowH;
      const self = s.from === s.to;
      const k = self ? "self" : s.kind || "call";
      const colorKind = self ? (s.kind && s.kind !== "call" ? s.kind : "self") : k;
      svg += `<g class="seq-msg k-${colorKind}${k === "ret" ? " ret" : ""}" data-step="${i}">`;
      if (self) {
        const x = lx(s.from);
        svg += `<path class="seq-line" d="M${x},${y - 6} h34 v18 h-30" marker-end="url(#${host.id}-ah-self)"/>`;
        svg += `<text class="seq-label" x="${x + 40}" y="${y + 6}">${esc(s.svg || s.label)}</text>`;
      } else {
        const x1 = lx(s.from), x2 = lx(s.to);
        const dir = x2 > x1 ? 1 : -1;
        svg += `<line class="seq-line" x1="${x1 + dir * 4}" y1="${y}" x2="${x2 - dir * 4}" y2="${y}" marker-end="url(#${host.id}-ah-${k})"/>`;
        svg += `<text class="seq-label" x="${(x1 + x2) / 2}" y="${y - 7}" text-anchor="middle">${esc(s.svg || s.label)}</text>`;
      }
      const ix = Math.max(12, lx(Math.min(s.from, s.to)) - 26);
      svg += `<circle class="seq-idx-bg" cx="${ix}" cy="${y}" r="10"/><text class="seq-idx" x="${ix}" y="${y + 3.5}" text-anchor="middle">${i + 1}</text>`;
      svg += `</g>`;
    });
    svg += `</svg>`;

    const used = opts.legend || [...new Set(steps.map((s) => (s.from === s.to ? null : s.kind || "call")).filter(Boolean))];
    host.classList.add("seq", "glass");
    host.innerHTML = `
      <div class="seq-toolbar">
        <button class="btn sm" type="button" data-act="reset" title="${esc(T.resetTip)}">${esc(T.reset)}</button>
        <button class="btn sm" type="button" data-act="prev" title="${esc(T.prevTip)}">${esc(T.prev)}</button>
        <button class="btn sm primary" type="button" data-act="next" title="${esc(T.nextTip)}">${esc(T.next)}</button>
        <button class="btn sm" type="button" data-act="play" title="${esc(T.playTip)}">${esc(T.play)}</button>
        <label class="seq-speed">${esc(T.speed)} <select data-act="speed"><option value="3200">${esc(T.slow)}</option><option value="2200" selected>${esc(T.normal)}</option><option value="1300">${esc(T.fast)}</option></select></label>
        <span class="seq-count">0 / ${steps.length}</span>
      </div>
      <div class="seq-progress"><div></div></div>
      <div class="seq-canvas" tabindex="0" aria-label="${esc(T.keys)}">${svg}</div>
      <div class="seq-legend">${used.map((k) => `<span class="k-${k}">${esc(T.legend[k] || k)}</span>`).join("")}</div>
      <div class="seq-detail">
        <div class="sd-main"></div>
        <div class="sd-side"></div>
      </div>`;

    const main = $(".sd-main", host), side = $(".sd-side", host);
    const count = $(".seq-count", host), prog = $(".seq-progress > div", host);
    const playBtn = $('[data-act="play"]', host);
    const speedSel = $('[data-act="speed"]', host);

    function render() {
      $$(".seq-msg", host).forEach((g) => {
        const i = +g.dataset.step;
        g.classList.toggle("cur", i === cur);
        g.classList.toggle("done", i < cur);
      });
      const s = steps[cur];
      $$(".seq-lane-box", host).forEach((r) => r.classList.toggle("on", !!s && (+r.dataset.lane === s.from || +r.dataset.lane === s.to)));
      $$(".hd-pulse.live", host).forEach((n) => n.remove());
      if (s && D) D.attachPulse($(`.seq-msg[data-step="${cur}"] .seq-line`, host), "", s.from === s.to ? 1.2 : 1.1);
      count.textContent = `${cur + 1} / ${steps.length}`;
      prog.style.width = ((cur + 1) / steps.length) * 100 + "%";
      if (!s) {
        main.innerHTML = `<h3 class="w-title">${esc(T.ready)}</h3><p class="muted">${opts.intro || T.intro}</p>`;
        side.innerHTML = opts.introSide || `<p class="muted small">${esc(T.introSide)}</p>`;
      } else {
        main.innerHTML = `<div class="seq-tags"><span class="badge gray">${esc(T.step(cur + 1))}</span>${(s.tags || []).map((t) => `<span class="badge ${t[1] || ""}">${esc(t[0])}</span>`).join("")}</div>
          <h3 class="w-title">${esc(s.title || s.label)}</h3><div>${s.detail || ""}</div>`;
        side.innerHTML = (s.code ? codeBlockHTML({ code: s.code, lang: s.codeLang || "c", file: s.codeFile || "", label: s.codeLang || "c" }) : "") +
          (s.analogy ? `<div class="callout analogy"><div class="ci">🎭</div><div><span class="ct">${esc(S.callout.analogy)}</span>${s.analogy}</div></div>` : "");
        wireCopy(side);
      }
      if (opts.onStep) opts.onStep(cur, s);
    }
    const go = (i) => { cur = Math.max(-1, Math.min(steps.length - 1, i)); render(); };
    const stop = () => { clearInterval(timer); timer = null; playBtn.textContent = T.play; };
    const play = () => {
      if (timer) return stop();
      if (cur >= steps.length - 1) go(-1);
      playBtn.textContent = T.pause;
      go(cur + 1);
      timer = setInterval(() => { if (cur >= steps.length - 1) stop(); else go(cur + 1); }, +speedSel.value);
    };
    host.addEventListener("click", (e) => {
      const a = e.target.closest("[data-act]");
      if (a && a.tagName === "BUTTON") {
        const act = a.dataset.act;
        if (act !== "play") stop();
        if (act === "next") go(cur + 1);
        if (act === "prev") go(cur - 1);
        if (act === "reset") go(-1);
        if (act === "play") play();
      }
      const g = e.target.closest(".seq-msg");
      if (g) { stop(); go(+g.dataset.step); }
    });
    speedSel.addEventListener("change", () => { if (timer) { stop(); play(); } });
    host.addEventListener("keydown", (e) => {
      if (/select|input/i.test(e.target.tagName)) return;
      if (e.key === "ArrowRight") { e.preventDefault(); stop(); go(cur + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); stop(); go(cur - 1); }
      if (e.key === " ") { e.preventDefault(); play(); }
      if (e.key.toLowerCase() === "r") { stop(); go(-1); }
    });
    render();
    return { go, play, stop, get index() { return cur; } };
  }

  /* ------------------------------------------------------ Tooltips */
  /** Any element (HTML or SVG) with data-tip="Term — explanation" gets a styled tooltip on hover and keyboard focus. */
  function initTooltips() {
    const tt = document.createElement("div");
    tt.className = "tt";
    tt.id = "mcu-tt";
    tt.setAttribute("role", "tooltip");
    tt.setAttribute("aria-hidden", "true");
    document.body.appendChild(tt);
    let owner = null;
    const render = (el) => {
      const raw = el.getAttribute("data-tip");
      const i = raw.indexOf(S.tooltipSep);
      tt.innerHTML = i > 0 ? `<b>${esc(raw.slice(0, i))}</b>${esc(S.tooltipSep)}${esc(raw.slice(i + S.tooltipSep.length))}` : esc(raw);
    };
    const place = (x, y) => {
      const r = tt.getBoundingClientRect();
      let left = x + 14, top = y + 16;
      if (left + r.width > innerWidth - 8) left = x - r.width - 14;
      if (top + r.height > innerHeight - 8) top = y - r.height - 12;
      tt.style.left = Math.max(8, left) + "px";
      tt.style.top = Math.max(8, top) + "px";
    };
    const show = (el, x, y) => {
      if (!el.getAttribute("data-tip")) return;
      if (owner && owner !== el) owner.removeAttribute("aria-describedby");
      owner = el; render(el); tt.classList.add("show"); tt.removeAttribute("aria-hidden"); place(x, y);
      el.setAttribute("aria-describedby", tt.id);
    };
    const hide = () => {
      if (owner) owner.removeAttribute("aria-describedby");
      owner = null; tt.classList.remove("show"); tt.setAttribute("aria-hidden", "true");
    };
    document.addEventListener("pointerover", (e) => {
      const el = e.target.closest && e.target.closest("[data-tip]");
      if (el && el !== owner) show(el, e.clientX, e.clientY);
      else if (!el) hide();
    });
    document.addEventListener("pointermove", (e) => { if (owner) place(e.clientX, e.clientY); });
    document.addEventListener("focusin", (e) => {
      const el = e.target.closest && e.target.closest("[data-tip]");
      if (el) { const r = el.getBoundingClientRect(); show(el, r.left + r.width / 2, r.bottom); } else hide();
    });
    document.addEventListener("focusout", hide);
    window.addEventListener("scroll", hide, { passive: true });
  }

  /* ------------------------------------------- Soft breaks in inline code */
  /** Long identifiers (RCC_APB2ENR_IOPCEN, a/very/long/path) may only wrap after "_", ".", "/", "(" or "::". */
  function softBreak(root) {
    const list = root.matches && root.matches(":not(pre) > code") ? [root] : $$(":not(pre) > code", root);
    list.forEach((c) => {
      if (c.dataset.soft || c.children.length) return;
      c.dataset.soft = "1";
      if (c.closest("td:first-child, th:first-child") && c.textContent.length <= 26) { c.classList.add("nowrap"); return; }
      if (c.textContent.length < 14) return;
      c.innerHTML = esc(c.textContent).replace(/([_./(]|::)(?=[^_./(:\s])/g, "$1<wbr>");
    });
  }
  function initSoftBreaks() {
    softBreak(document.body);
    new MutationObserver((muts) => muts.forEach((m) => m.addedNodes.forEach((n) => { if (n.nodeType === 1) softBreak(n); })))
      .observe(document.body, { childList: true, subtree: true });
  }

  /* ------------------------------------------------- Tool versions
     <span data-version="cmake"></span> → "4.4.4"; <span data-version="renode" data-version-field="name"></span>.
     <div data-versions-table="arm-gnu-toolchain cmake …"></div> → a table. Data: data/versions.js,
     generated from tools/versions.json, the only place a version is written (CLAUDE.md rule 4). */
  function renderVersions(root = document) {
    const els = $$("[data-version], [data-versions-table]", root);
    if (!els.length) return;
    const V = window.MCU_DATA && window.MCU_DATA.versions;
    if (!V) throw new Error("This page uses data-version but does not load assets/js/data/versions.js");
    const get = (k) => {
      const t = V.tools[k] || V.third_party[k];
      if (!t) throw new Error(`Unknown tool "${k}" in data-version (tools/versions.json)`);
      return t;
    };
    els.forEach((el) => {
      if (el.dataset.versionsTable !== undefined) {
        const keys = el.dataset.versionsTable.split(/\s+/).filter(Boolean);
        el.innerHTML = `<div class="table-wrap"><table class="t"><thead><tr><th>${esc(S.versions.tool)}</th><th>${esc(S.versions.version)}</th><th>${esc(S.versions.notes)}</th></tr></thead><tbody>${keys.map((k) => {
          const t = get(k);
          return `<tr><td><a href="${t.url}" target="_blank" rel="noopener">${esc(t.name)}</a></td><td><code>${esc(t.version)}</code></td><td class="small">${t.alt ? esc(S.versions.alt(t.alt)) : ""}${t.min ? esc(S.versions.min(t.min)) : ""}</td></tr>`;
        }).join("")}</tbody></table></div><p class="small muted">${esc(S.versions.checked(V.checked))}</p>`;
      } else {
        el.textContent = get(el.dataset.version)[el.dataset.versionField || "version"] || "";
      }
    });
  }

  /* --------------------------------------------------------- Boot */
  function boot() {
    initTooltips();
    renderHeader();
    initTheme();
    renderReferences();
    renderSidebar();
    decorateSections();
    renderPager();
    renderFooter();
    initGlobalSearch();
    initScrollspy();
    initTabs();
    renderStaticCode();
    renderVersions();
    initLangSwitch();
    initSoftBreaks();
    if (location.hash) {
      const jump = () => {
        const t = document.getElementById(decodeURIComponent(location.hash.slice(1)));
        if (t) t.scrollIntoView({ behavior: "instant", block: "start" });
      };
      if (document.readyState === "complete") setTimeout(jump, 0);
      else window.addEventListener("load", () => setTimeout(jump, 0), { once: true });
    }
  }

  window.MCU = Object.assign(window.MCU || {}, {
    CONFIG, SITE, R, REFS, STRINGS: S, $, $$, esc, norm, slug, store, isReady, byId,
    initTabs, codeBlockHTML, embedded, renderVersions, renderCodeExplorer, renderStaticCode, wireCopy, SequenceDiagram,
    tokenize: CODE.tokenize, toLines: CODE.toLines, parseMarks: CODE.parseMarks,
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
