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
      desc: "MCU vs MPU, the Cortex-M3 core, buses, memory map, registers and how C becomes bits on a pin.",
      sections: [
        ["mcu-vs-mpu", "MCU vs MPU vs SoC", "microcontroller microprocessor soc ecu linux bare metal"],
        ["inside-f103", "Inside the STM32F103C8T6", "cortex-m3 72 mhz 64 kb flash 20 kb sram ahb apb bus matrix"],
        ["memory-map", "The memory map", "0x08000000 0x20000000 0x40000000 peripheral region system memory bit-band"],
        ["registers", "Registers and volatile", "register volatile memory-mapped io read-modify-write bit mask"],
        ["cortex-m3", "The Cortex-M3 core", "thumb-2 r0-r15 msp psp xpsr nvic systick armv7-m"],
        ["toolchain", "From C to flash", "compiler assembler linker elf hex bin objcopy arm-none-eabi-gcc"],
        ["takeaways", "Key takeaways", "summary"],
      ] },
    { id: "setup", status: "ready", phase: 2, file: "setup.html", num: "02", group: "Start here",
      title: "Setting Up and Running a Program on STM32F103C8T6 Blue Pill", short: "Setup & First Program", icon: "🔌", accent: "#3fb68b",
      desc: "Wire an ST-Link, install the toolchain on Windows/Linux/macOS, build two ways, blink PC13, switch to 72 MHz, print over UART, debug, and run it in Renode.",
      sections: [
        ["bom", "Bill of materials", "blue pill st-link v2 jumper wires usb uart adapter ch340 cp2102"],
        ["wiring", "Wiring SWD and BOOT jumpers", "swdio swclk 3.3v gnd boot0 boot1 pa13 pa14 jumper"],
        ["install", "Install the environment", "arm gnu toolchain cmake ninja openocd vs code cortex-debug st-link driver udev"],
        ["verify", "Verify every tool", "version check arm-none-eabi-gcc --version openocd -v st-info"],
        ["paths", "Two build paths compared", "stm32cubeide cubemx hal bare metal cmake registers"],
        ["path-cube", "Path A: STM32CubeIDE + HAL", "cubemx ioc hal_gpio_togglepin generated code"],
        ["path-bare", "Path B: bare-metal CMake from scratch", "startup vector table linker script systeminit reset_handler"],
        ["cmake-under-hood", "What CMake generates under the hood", "cmake ninja build.ninja toolchain file compile_commands.json gcc flags"],
        ["blink", "Blink PC13 (active-low)", "pc13 led active low gpioc crh odr bsrr"],
        ["clock-72", "From HSI 8 MHz to PLL 72 MHz", "hse pll x9 flash latency wait states rcc_cfgr sws"],
        ["uart-hello", "\"Hello from Blue Pill\" over USART1", "usart1 pa9 pa10 brr 115200 usb uart"],
        ["flash", "Flash with OpenOCD and CubeProgrammer", "openocd program verify reset stm32cubeprogrammer cli"],
        ["debug", "Debug: breakpoints, stepping, SVD", "cortex-debug gdb breakpoint step watch svd peripheral registers"],
        ["renode", "Run without hardware in Renode", "renode simulation resc repl uart analyzer robot"],
        ["done", "You are done when…", "checklist"],
      ] },
  
    /* ───────────── Group: From reset to main ───────────── */
    { id: "boot", status: "ready", phase: 3, file: "boot.html", num: "03", group: "From reset to main",
      title: "Startup Code, Vector Table & Linker Scripts", short: "Startup & Linker", icon: "🚀", accent: "#e8a36b",
      desc: "What happens between reset and main(): boot modes, vector table, .data/.bss init, linker script sections and map files.",
      sections: [
        ["boot-modes", "Boot modes: BOOT0 and BOOT1", "boot0 boot1 pb2 system memory bootloader sram boot"],
        ["reset-sequence", "The reset sequence", "initial sp reset vector reset_handler msp"],
        ["vector-table", "The vector table", "isr_vector weak alias default_handler vtor"],
        ["sections", ".text, .data, .bss, stack and heap", "text rodata data bss stack heap lma vma"],
        ["linker-script", "Writing the linker script", "memory sections origin length > at> provide _estack align"],
        ["memmap-viz", "Memory-map visualizer", "map file size readelf nm"],
        ["c-vs-asm", "Startup in C vs ST's assembly", "startup_stm32f103xb.s c startup comparison"],
        ["pitfalls", "Pitfalls", "64k vs 128k estack alignment 8-byte aapcs"],
      ] },
    { id: "clocks", status: "ready", phase: 3, file: "clocks.html", num: "04", group: "From reset to main",
      title: "Clocks: RCC, HSE, PLL and Flash Wait States", short: "Clock Tree", icon: "⏱️", accent: "#fbbf24",
      desc: "The STM32F1 clock tree end to end, why 72 MHz needs two flash wait states, and how every peripheral clock is derived.",
      sections: [
        ["why-clocks", "Why clocks matter", "clock frequency power timing"],
        ["sources", "Clock sources", "hsi hse lsi lse 8 mhz crystal css"],
        ["clock-tree", "Interactive clock tree", "pll pllmul pllsrc ahb apb1 apb2 prescaler adcpre usbpre"],
        ["flash-latency", "Flash wait states and prefetch", "flash_acr latency prftbe 48 mhz 72 mhz"],
        ["switching", "Switching clocks safely", "hserdy pllrdy sw sws timeout"],
        ["peripheral-clocks", "Peripheral clock enables", "rcc_apb2enr rcc_apb1enr rcc_ahbenr"],
        ["mco", "Measuring the clock (MCO on PA8)", "mco pa8 oscilloscope"],
      ] },
    { id: "gpio", status: "ready", phase: 3, file: "gpio.html", num: "05", group: "From reset to main",
      title: "GPIO and Alternate Functions", short: "GPIO & AFIO", icon: "📍", accent: "#3fb68b",
      desc: "CRL/CRH modes, ODR vs BSRR, pull-ups, 5 V tolerance, AFIO remapping and how not to lock yourself out of SWD.",
      sections: [
        ["model", "The F1 GPIO model", "crl crh mode cnf input output analog floating pull-up"],
        ["reg-viewer", "Configure a pin bit by bit", "register viewer gpiox_crl gpiox_crh"],
        ["write-read", "ODR, BSRR, BRR and IDR", "atomic set reset bsrr brr idr odr"],
        ["electrical", "Electrical limits", "5v tolerant ft sink source pc13 pc14 pc15 3 ma"],
        ["afio", "AFIO and remapping", "afio mapr remap alternate function"],
        ["swj", "SWJ_CFG: keeping SWD alive", "swj_cfg jtag disable pa13 pa14 pa15 pb3 pb4 lockout"],
        ["debounce", "Buttons and debouncing", "button bounce debounce pull-up"],
      ] },
    { id: "interrupts", status: "ready", phase: 3, file: "interrupts.html", num: "06", group: "From reset to main",
      title: "Interrupts, NVIC, EXTI and SysTick", short: "Interrupts & NVIC", icon: "⚡", accent: "#60a5fa",
      desc: "Exception model, NVIC priorities with 4 priority bits, EXTI line mapping, SysTick time base and safe sharing with main().",
      sections: [
        ["exceptions", "Exceptions vs interrupts", "exception irq hardfault nmi pendsv svc systick"],
        ["entry-exit", "What the core does on entry", "stacking exc_return tail chaining late arrival"],
        ["nvic", "NVIC priorities and grouping", "nvic priority grouping preemption subpriority 4 bits"],
        ["exti", "EXTI and AFIO_EXTICR", "exti line afio exticr rising falling edge pending"],
        ["systick", "SysTick time base", "systick reload 1 ms tick"],
        ["shared-data", "Sharing data with an ISR", "volatile atomic critical section primask race"],
        ["scheduler", "A non-blocking cooperative scheduler", "super loop cooperative scheduler tasks millis"],
      ] },
    { id: "timers", status: "ready", phase: 3, file: "timers.html", num: "07", group: "From reset to main",
      title: "Timers, PWM and Input Capture", short: "Timers & PWM", icon: "〰️", accent: "#a78bfa",
      desc: "General-purpose timers, prescaler/ARR math, PWM output compare, input capture and the APB1 ×2 timer-clock rule.",
      sections: [
        ["timebase", "Prescaler, ARR and update events", "psc arr cnt update uev"],
        ["timer-clock", "The ×2 timer clock rule", "apb1 prescaler timer clock 72 mhz x2"],
        ["pwm", "PWM with output compare", "pwm ccr ccmr oc mode duty"],
        ["pwm-wave", "Interactive PWM waveform", "duty cycle frequency waveform"],
        ["capture", "Input capture", "input capture period measure"],
        ["remap", "Timer pins and remaps", "tim2 tim3 tim4 partial remap pins"],
      ] },
  
    /* ───────────── Group: Peripherals ───────────── */
    { id: "uart", status: "ready", phase: 4, file: "uart.html", num: "08", group: "Peripherals",
      title: "USART: Frames, Interrupts and a Command Shell", short: "UART", icon: "💬", accent: "#60a5fa",
      desc: "UART framing, BRR math, interrupt-driven RX/TX with a lock-free ring buffer, and the USART LIN mode.",
      sections: [
        ["frame", "Anatomy of a UART frame", "start bit stop bit parity 8n1 waveform"],
        ["baud", "Baud rate and BRR", "brr mantissa fraction baud error calculator"],
        ["polling-irq", "Polling vs interrupts", "txe rxne tc interrupt"],
        ["ring-buffer", "A lock-free ring buffer", "ring buffer spsc head tail power of two"],
        ["shell", "A tiny command shell", "command line parser shell"],
        ["lin-mode", "LIN mode on the F1 USART", "lin break lbd lbdl linen"],
      ] },
    { id: "adc-dma", status: "ready", phase: 4, file: "adc-dma.html", num: "09", group: "Peripherals",
      title: "ADC and DMA", short: "ADC & DMA", icon: "🎚️", accent: "#e8a36b",
      desc: "12-bit SAR ADC, calibration, sampling time, scan mode, then DMA circular transfers that free the CPU.",
      sections: [
        ["sar", "How a SAR ADC works", "sar adc 12 bit successive approximation"],
        ["config", "Configuring ADC1", "adcpre 14 mhz smpr sqr calibration cal rstcal"],
        ["single", "Single conversion, polling", "swstart eoc dr"],
        ["dma", "DMA basics", "dma channel cpar cmar cndtr circular mem2mem"],
        ["adc-dma", "Scan + DMA circular", "scan mode dma circular half transfer"],
        ["noise", "Noise, averaging and Vrefint", "oversampling average vrefint temperature sensor"],
      ] },
    { id: "i2c", status: "ready", phase: 4, file: "i2c.html", num: "10", group: "Peripherals",
      title: "I2C and an SSD1306 OLED", short: "I2C", icon: "🖥️", accent: "#3fb68b",
      desc: "I2C protocol on the wire, the F1 I2C peripheral and its errata, then drawing on an SSD1306 OLED.",
      sections: [
        ["protocol", "I2C on the wire", "start stop ack nack address sda scl open drain pull-up"],
        ["waveform", "Interactive I2C transaction", "waveform start ack stop"],
        ["f1-i2c", "The F1 I2C peripheral", "i2c_cr1 cr2 ccr trise sr1 sr2 event sequence"],
        ["errata", "Errata you must know", "busy flag analog filter errata workaround"],
        ["ssd1306", "Driving the SSD1306", "ssd1306 oled framebuffer page addressing"],
      ] },
    { id: "spi", status: "ready", phase: 4, file: "spi.html", num: "11", group: "Peripherals",
      title: "SPI and a W25Qxx Flash", short: "SPI", icon: "🔁", accent: "#a78bfa",
      desc: "SPI modes (CPOL/CPHA), chip select discipline, and reading/writing a W25Qxx NOR flash.",
      sections: [
        ["modes", "SPI modes CPOL/CPHA", "cpol cpha mode 0 mode 3 waveform"],
        ["f1-spi", "The F1 SPI peripheral", "spi_cr1 br mstr ssm ssi txe rxne bsy"],
        ["cs", "Chip select discipline", "nss chip select gpio"],
        ["w25q", "Talking to a W25Qxx", "jedec id 0x9f read 0x03 page program erase status busy"],
        ["dma-spi", "SPI with DMA", "spi dma"],
      ] },
    { id: "can", status: "ready", phase: 4, file: "can.html", num: "12", group: "Peripherals",
      title: "CAN with bxCAN (and CAN FD, LIN in Theory)", short: "CAN & LIN", icon: "🚗", accent: "#fbbf24",
      desc: "CAN physical layer, frame format, arbitration, bit timing and filters, two Blue Pills over SN65HVD230, plus CAN FD and LIN concepts.",
      sections: [
        ["physical", "Physical layer and transceivers", "can_h can_l differential sn65hvd230 120 ohm termination"],
        ["frame", "The CAN frame", "sof id rtr ide dlc data crc ack eof bit stuffing"],
        ["arbitration", "Arbitration and errors", "arbitration dominant recessive error active passive bus off tec rec"],
        ["bit-timing", "Bit timing calculator", "can_btr brp ts1 ts2 sjw sample point 500 kbit"],
        ["bxcan", "The bxCAN peripheral", "bxcan init mode mailbox fifo inrq inak"],
        ["filters", "Acceptance filters", "filter bank mask list 32 bit"],
        ["usb-conflict", "Why CAN and USB can't run together", "usb can shared sram 512 byte"],
        ["two-nodes", "Two nodes on a real bus", "two blue pills loopback silent mode ack"],
        ["can-fd", "CAN FD in theory", "can fd brs edl 64 byte not supported bxcan"],
        ["lin", "LIN in theory", "lin master slave schedule table break sync pid checksum"],
      ] },
    { id: "power-wdg", status: "ready", phase: 4, file: "power-wdg.html", num: "13", group: "Peripherals",
      title: "Watchdogs, Reset Sources and Low Power", short: "Watchdog & Power", icon: "🔋", accent: "#3fb68b",
      desc: "IWDG vs WWDG, reading reset causes, Sleep/Stop/Standby modes and waking up correctly.",
      sections: [
        ["reset-causes", "Who reset me?", "rcc_csr porrstf pinrstf iwdgrstf sftrstf"],
        ["iwdg", "Independent watchdog", "iwdg lsi kr pr rlr 0xaaaa 0xcccc 0x5555"],
        ["wwdg", "Window watchdog", "wwdg window early wakeup"],
        ["modes", "Sleep, Stop, Standby", "wfi wfe sleepdeep pdds lpds"],
        ["wakeup", "Wake-up sources", "exti rtc alarm wkup pa0"],
        ["after-stop", "Restoring clocks after Stop", "hsi after stop pll reconfigure"],
        ["debug-lowpower", "Debugging low-power code", "dbgmcu_cr dbg_stop dbg_sleep"],
      ] },
  
    /* ───────────── Group: Embedded engineering ───────────── */
    { id: "rtos", status: "ready", phase: 5, file: "rtos.html", num: "14", group: "Embedded engineering",
      title: "Bare Metal vs RTOS: FreeRTOS on Cortex-M3", short: "FreeRTOS", icon: "🧵", accent: "#60a5fa",
      desc: "When a super-loop stops scaling, how a context switch really works (PendSV), and tasks, queues, mutexes and priorities in FreeRTOS.",
      sections: [
        ["why-rtos", "When you need an RTOS", "super loop rtos determinism"],
        ["context-switch", "A context switch, step by step", "pendsv systick psp stack frame"],
        ["task-states", "Task states (interactive)", "running ready blocked suspended"],
        ["port", "Porting FreeRTOS to the Blue Pill", "freertosconfig configmax_syscall_interrupt_priority port.c cm3"],
        ["ipc", "Queues, semaphores, mutexes", "queue semaphore mutex priority inheritance"],
        ["isr-rules", "ISR rules: FromISR APIs", "fromisr portyield_from_isr priority"],
        ["stack", "Stack sizing and overflow detection", "stack high water mark configcheck_for_stack_overflow"],
      ] },
    { id: "faults-debug", status: "ready", phase: 5, file: "faults-debug.html", num: "15", group: "Embedded engineering",
      title: "Fault Handling and Debugging", short: "Faults & Debugging", icon: "🐞", accent: "#f87171",
      desc: "HardFault anatomy, decoding CFSR/HFSR/MMFAR/BFAR, a fault handler that logs and survives, and a debugging toolbox.",
      sections: [
        ["fault-types", "Fault types on Cortex-M3", "hardfault memmanage busfault usagefault escalation"],
        ["decode", "Decoding CFSR and HFSR", "cfsr hfsr mmfar bfar forced precise imprecise"],
        ["stack-frame", "Recovering the faulting PC", "exception stack frame pc lr"],
        ["handler", "A fault handler that logs", "fault log noinit ram reset reason"],
        ["gdb", "GDB and Cortex-Debug techniques", "gdb watchpoint backtrace x/ registers"],
        ["semihosting-swo", "printf: UART, semihosting, SWO", "semihosting swo itm st-link clone limitation"],
      ] },
    { id: "bootloader", status: "ready", phase: 5, file: "bootloader.html", num: "16", group: "Embedded engineering",
      title: "Bootloaders and Flash Programming", short: "Bootloaders", icon: "🧰", accent: "#e8a36b",
      desc: "ST's system bootloader, writing your own UART bootloader, splitting flash, VTOR relocation and safe jump to application.",
      sections: [
        ["system-bl", "The built-in system bootloader", "system memory usart1 an2606 stm32flash boot0"],
        ["flash-prog", "Programming the F1 flash", "flash_keyr unlock pg per page erase 1 kb"],
        ["layout", "Splitting flash: bootloader + app", "linker split partition 0x08000000 0x08004000"],
        ["vtor", "Relocating the vector table", "scb vtor alignment"],
        ["jump", "Jumping to the application safely", "msp reset handler deinit peripherals"],
        ["protocol", "A tiny update protocol", "crc32 packet ack nack"],
        ["protection", "Read-out and write protection", "rdp wrp option bytes"],
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
        ["on-bluepill", "How we do AUTOSAR on a Blue Pill", "hand-written mcal honest limitations"],
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
      desc: "Std_Types, compiler abstraction, MemMap, config structures, DET error reporting and naming rules, applied to Port, Dio, Pwm, Adc, Gpt, Wdg and Can on the F1.",
      sections: [
        ["file-layout", "Module file layout", "module.h module.c cfg.h pbcfg.c lcfg"],
        ["std-types", "Std_Types and Platform_Types", "std_returntype e_ok e_not_ok uint8 boolean"],
        ["naming", "API naming: <Ma>_<Api>", "module abbreviation api name dio_writechannel"],
        ["config", "Configuration structures and Init", "configtype init configptr post-build pre-compile"],
        ["memmap", "MemMap and compiler abstraction", "start_sec stop_sec code var_cleared func p2var p2const"],
        ["det", "Development errors with DET", "det_reporterror module id api id error id"],
        ["dio-port", "Port and Dio on the F1", "port_init dio_writechannel dio_readchannel channel group"],
        ["pwm-adc-gpt", "Pwm, Adc and Gpt on the F1", "pwm_setdutycycle adc_startgroupconversion gpt"],
        ["can-wdg", "Can and Wdg on the F1", "can_write can_mainfunction_read wdg_setmode"],
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
      desc: "UDS services, DTCs and event debouncing in DEM, the DCM request path, and storing data with NvM over Fee on the F1 flash.",
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
    { id: "capstone-baremetal", status: "planned", phase: 7, file: "capstone-baremetal.html", num: "24", group: "Capstone",
      title: "Capstone 1: Turn-Signal ECU, Bare Metal", short: "Capstone: Bare Metal", icon: "🚦", accent: "#fbbf24",
      desc: "Requirements, state machine and a bare-metal implementation of a turn-signal / hazard ECU talking CAN to a cluster node.",
      sections: [
        ["requirements", "Requirements", "requirements turn signal hazard flash rate lamp out"],
        ["architecture", "Architecture", "block diagram can cluster node"],
        ["state-machine", "Turn-signal state machine", "state machine hazard left right comfort blink"],
        ["implementation", "Implementation walkthrough", "super loop scheduler"],
        ["acceptance", "Acceptance tests", "acceptance test robot renode"],
      ] },
    { id: "capstone-rtos", status: "planned", phase: 7, file: "capstone-rtos.html", num: "25", group: "Capstone",
      title: "Capstone 2: The Same ECU on FreeRTOS", short: "Capstone: FreeRTOS", icon: "🚦", accent: "#60a5fa",
      desc: "Splitting the ECU into tasks and queues, timing analysis and what changed vs bare metal.",
      sections: [
        ["task-design", "Task design", "task priorities periods"],
        ["comms", "Queues and events", "queue event group"],
        ["timing", "Timing and watchdog supervision", "deadline watchdog supervision"],
        ["diff", "What changed", "comparison"],
      ] },
    { id: "capstone-autosar", status: "planned", phase: 7, file: "capstone-autosar.html", num: "26", group: "Capstone",
      title: "Capstone 3: Refactoring into AUTOSAR Layers", short: "Capstone: AUTOSAR", icon: "🚦", accent: "#a78bfa",
      desc: "Turning the ECU into an application SWC with runnables over a hand-written RTE, BSW-lite and MCAL on the STM32F103.",
      sections: [
        ["target-arch", "Target architecture", "swc rte bsw mcal layers"],
        ["swc", "The TurnLight SWC", "swc runnables ports"],
        ["rte", "The RTE layer", "rte hand-written mirrors generated"],
        ["bsw", "BSW-lite and MCAL", "com canif can dio pwm adc wdg"],
        ["review", "Self-review against the checklist", "review checklist"],
        ["next", "Where to go next", "real tools davinci tresos s32k aurix"],
      ] },
  
    /* ───────────── Group: Reference ───────────── */
    { id: "board", status: "ready", phase: 2, file: "board.html", num: "A", group: "Reference",
      title: "Blue Pill Board Reference", short: "Board Reference", icon: "🗺️", accent: "#94a3b8",
      desc: "Interactive pinout, alternate functions, 5 V tolerance, on-board parts and known hardware quirks.",
      sections: [
        ["pinout", "Interactive pinout", "pinout pins alternate function ft"],
        ["onboard", "On-board components", "8 mhz crystal 32.768 khz led pc13 r10 boot jumpers regulator"],
        ["quirks", "Known quirks", "clone cks32 gd32 r10 usb 64k 128k"],
        ["modules", "Common modules", "sn65hvd230 ssd1306 w25q usb uart"],
      ] },
    { id: "troubleshooting", status: "ready", phase: 2, file: "troubleshooting.html", num: "B", group: "Reference",
      title: "Troubleshooting", short: "Troubleshooting", icon: "🧯", accent: "#94a3b8",
      desc: "Symptom-first fixes: no ST-Link, wrong IDCODE, cannot halt, inverted LED, garbage UART, flash size mismatch and more.",
      sections: [
        ["no-stlink", "No ST-Link detected", "st-link not found libusb driver udev permission"],
        ["idcode", "UNEXPECTED idcode on clone chips", "idcode 0x2ba01477 cks32 cs32 gd32 cputapid"],
        ["cannot-halt", "Cannot halt target / SWD locked out", "connect under reset swj_cfg boot0 mass erase"],
        ["led", "LED inverted or dim", "pc13 active low"],
        ["uart-garbage", "Garbage on the UART", "baud mismatch clock brr wrong pll"],
        ["flash-size", "Flash size mismatch", "64k 128k flash size register 0x1ffff7e0"],
        ["hangs-at-clock", "Hangs during clock setup", "hse not ready crystal timeout renode rcc"],
        ["usb", "USB not enumerating", "r10 1.5k pull-up d+"],
        ["can-silent", "CAN sends nothing", "no ack termination transceiver silent loopback"],
      ] },
    { id: "automotive-mcus", status: "planned", phase: 8, file: "automotive-mcus.html", num: "C", group: "Reference",
      title: "From Blue Pill to Automotive-Grade MCUs", short: "Automotive MCUs", icon: "🏭", accent: "#94a3b8",
      desc: "How each lesson maps to NXP S32K1xx, Infineon AURIX TC3xx and Renesas RH850: qualification, safety, vendor MCAL and tooling.",
      sections: [
        ["why-not-f103", "Why the F103 isn't automotive", "aec-q100 iso 26262 lockstep ecc"],
        ["mapping", "Lesson mapping table", "s32k aurix rh850 mapping"],
        ["vendor-mcal", "Vendor MCAL and tools", "rtd mcal tresos davinci"],
      ] },
    { id: "ll-drivers", status: "planned", phase: 8, file: "ll-drivers.html", num: "D", group: "Reference",
      title: "Appendix: ST's LL Drivers", short: "LL Drivers", icon: "📚", accent: "#94a3b8",
      desc: "What ST's Low-Layer drivers are, how they map onto the registers you already know, and when a team picks registers, LL or HAL.",
      sections: [
        ["what-ll", "What LL is (and isn't)", "ll low layer drivers stm32f1xx_ll inline functions"],
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
    f103Docs: { t: "STM32F103C8 product page — all documents", url: "https://www.st.com/en/microcontrollers-microprocessors/stm32f103c8.html#documentation", kind: "st" },
    ds5319: { t: "STM32F103x8/xB datasheet", url: ST + "datasheet/stm32f103c8.pdf", doc: "DS5319", kind: "st" },
    rm0008: { t: "Reference manual: STM32F101/102/103/105/107", url: ST + "reference_manual/rm0008-stm32f101xx-stm32f102xx-stm32f103xx-stm32f105xx-and-stm32f107xx-advanced-armbased-32bit-mcus-stmicroelectronics.pdf", doc: "RM0008", kind: "st" },
    pm0056: { t: "STM32F10xxx Cortex-M3 programming manual", url: ST + "programming_manual/pm0056-stm32f10xxx20xxx21xxxl1xxxx-cortexm3-programming-manual-stmicroelectronics.pdf", doc: "PM0056", kind: "st" },
    ddi0403: { t: "ARMv7-M Architecture Reference Manual", url: "https://developer.arm.com/documentation/ddi0403/latest/", doc: "ARM DDI 0403", kind: "arm" },
    ddi0337: { t: "Cortex-M3 Technical Reference Manual", url: "https://developer.arm.com/documentation/ddi0337/latest/", doc: "ARM DDI 0337", kind: "arm" },
    autosarRelease: { t: "AUTOSAR Classic Platform R25-11 — Release Overview", url: "https://www.autosar.org/fileadmin/standards/R25-11/CP/AUTOSAR_CP_TR_ReleaseOverview.pdf", doc: "AUTOSAR_CP_TR_ReleaseOverview", rev: "R25-11", kind: "autosar" },
    cmsisDeviceF1: { t: "cmsis-device-f1 — STM32F1 CMSIS device headers", url: "https://github.com/STMicroelectronics/cmsis-device-f1", kind: "tool" },
    renodeDocs: { t: "Renode documentation", url: "https://renode.readthedocs.io/en/latest/", kind: "tool" },
    openocdManual: { t: "OpenOCD User's Guide", url: "https://openocd.org/doc/html/index.html", kind: "tool" },
    ds5319Pins: { t: "STM32F103x8/xB datasheet — pin definitions and I/O levels", url: ST + "datasheet/stm32f103c8.pdf", doc: "DS5319", sec: "3, Table 5", kind: "st" },
    ds5319Elec: { t: "STM32F103x8/xB datasheet — electrical characteristics", url: ST + "datasheet/stm32f103c8.pdf", doc: "DS5319", sec: "5", kind: "st" },
    rm0008Boot: { t: "RM0008 — memory map and boot configuration", url: ST + "reference_manual/rm0008-stm32f101xx-stm32f102xx-stm32f103xx-stm32f105xx-and-stm32f107xx-advanced-armbased-32bit-mcus-stmicroelectronics.pdf", doc: "RM0008", sec: "3.3–3.4", kind: "st" },
    rm0008Rcc: { t: "RM0008 — reset and clock control (RCC)", url: ST + "reference_manual/rm0008-stm32f101xx-stm32f102xx-stm32f103xx-stm32f105xx-and-stm32f107xx-advanced-armbased-32bit-mcus-stmicroelectronics.pdf", doc: "RM0008", sec: "7", kind: "st" },
    rm0008Gpio: { t: "RM0008 — GPIO and AFIO", url: ST + "reference_manual/rm0008-stm32f101xx-stm32f102xx-stm32f103xx-stm32f105xx-and-stm32f107xx-advanced-armbased-32bit-mcus-stmicroelectronics.pdf", doc: "RM0008", sec: "9", kind: "st" },
    rm0008Usart: { t: "RM0008 — USART", url: ST + "reference_manual/rm0008-stm32f101xx-stm32f102xx-stm32f103xx-stm32f105xx-and-stm32f107xx-advanced-armbased-32bit-mcus-stmicroelectronics.pdf", doc: "RM0008", sec: "27", kind: "st" },
    rm0008Sig: { t: "RM0008 — device electronic signature (flash size, unique ID)", url: ST + "reference_manual/rm0008-stm32f101xx-stm32f102xx-stm32f103xx-stm32f105xx-and-stm32f107xx-advanced-armbased-32bit-mcus-stmicroelectronics.pdf", doc: "RM0008", sec: "30", kind: "st" },
    rm0008Debug: { t: "RM0008 — debug support (SWJ-DP, DBGMCU)", url: ST + "reference_manual/rm0008-stm32f101xx-stm32f102xx-stm32f103xx-stm32f105xx-and-stm32f107xx-advanced-armbased-32bit-mcus-stmicroelectronics.pdf", doc: "RM0008", sec: "31", kind: "st" },
    pm0075: { t: "STM32F10xxx Flash memory programming manual", url: ST + "programming_manual/pm0075-stm32f10xxx-flash-memory-microcontrollers-stmicroelectronics.pdf", doc: "PM0075", kind: "st" },
    es096: { t: "STM32F101x8/B, F102x8/B, F103x8/B errata sheet", url: "https://www.st.com/en/microcontrollers-microprocessors/stm32f103c8.html#documentation", doc: "ES096", kind: "st" },
    an2606: { t: "AN2606 — STM32 microcontroller system memory boot mode", url: ST + "application_note/an2606-stm32-microcontroller-system-memory-boot-mode-stmicroelectronics.pdf", doc: "AN2606", kind: "st" },
    an3155: { t: "AN3155 — USART protocol used in the STM32 bootloader", url: ST + "application_note/an3155-usart-protocol-used-in-the-stm32-bootloader-stmicroelectronics.pdf", doc: "AN3155", kind: "st" },
    um1075: { t: "UM1075 — ST-LINK/V2 in-circuit debugger/programmer user manual", url: ST + "user_manual/um1075-stlinkv2-incircuit-debuggerprogrammer-for-stm8-and-stm32-stmicroelectronics.pdf", doc: "UM1075", kind: "st" },
    um2237: { t: "UM2237 — STM32CubeProgrammer software description", url: ST + "user_manual/um2237-stm32cubeprogrammer-software-description-stmicroelectronics.pdf", doc: "UM2237", kind: "st" },
    ddi0403Reset: { t: "ARMv7-M ARM — reset behaviour and the vector table", url: "https://developer.arm.com/documentation/ddi0403/latest/", doc: "ARM DDI 0403", sec: "B1.5", kind: "arm" },
    cmakeToolchains: { t: "cmake-toolchains(7) — cross compiling", url: "https://cmake.org/cmake/help/latest/manual/cmake-toolchains.7.html", kind: "tool" },
    cmakePresets: { t: "cmake-presets(7)", url: "https://cmake.org/cmake/help/latest/manual/cmake-presets.7.html", kind: "tool" },
    gccArm: { t: "GCC manual — ARM options", url: "https://gcc.gnu.org/onlinedocs/gcc/ARM-Options.html", kind: "tool" },
    ldManual: { t: "GNU ld manual — linker scripts", url: "https://sourceware.org/binutils/docs/ld/Scripts.html", kind: "tool" },
    cortexDebug: { t: "Cortex-Debug for VS Code — wiki", url: "https://github.com/Marus/cortex-debug/wiki", kind: "tool" },
    armGnu: { t: "Arm GNU Toolchain downloads", url: "https://developer.arm.com/downloads/-/arm-gnu-toolchain-downloads", kind: "tool" },
    rm0008Exti: { t: "RM0008 — interrupts and events (NVIC vector table, EXTI)", url: ST + "reference_manual/rm0008-stm32f101xx-stm32f102xx-stm32f103xx-stm32f105xx-and-stm32f107xx-advanced-armbased-32bit-mcus-stmicroelectronics.pdf", doc: "RM0008", sec: "10", kind: "st" },
    rm0008Tim: { t: "RM0008 — general-purpose timers TIM2 to TIM5", url: ST + "reference_manual/rm0008-stm32f101xx-stm32f102xx-stm32f103xx-stm32f105xx-and-stm32f107xx-advanced-armbased-32bit-mcus-stmicroelectronics.pdf", doc: "RM0008", sec: "15", kind: "st" },
    pm0056Nvic: { t: "PM0056 — NVIC, SCB and SysTick", url: ST + "programming_manual/pm0056-stm32f10xxx20xxx21xxxl1xxxx-cortexm3-programming-manual-stmicroelectronics.pdf", doc: "PM0056", sec: "4.3–4.5", kind: "st" },
    ddi0403Exc: { t: "ARMv7-M ARM — exception model", url: "https://developer.arm.com/documentation/ddi0403/latest/", doc: "ARM DDI 0403", sec: "B1.5", kind: "arm" },
    ddi0337Lat: { t: "Cortex-M3 TRM — exception latency and tail-chaining", url: "https://developer.arm.com/documentation/ddi0337/latest/", doc: "ARM DDI 0337", sec: "5", kind: "arm" },
    cmsisCore: { t: "CMSIS-Core (Cortex-M) documentation", url: "https://arm-software.github.io/CMSIS_6/latest/Core/index.html", kind: "tool" },
    rm0008Pwr: { t: "RM0008 — power control (low-power modes)", url: ST + "reference_manual/rm0008-stm32f101xx-stm32f102xx-stm32f103xx-stm32f105xx-and-stm32f107xx-advanced-armbased-32bit-mcus-stmicroelectronics.pdf", doc: "RM0008", sec: "5", kind: "st" },
    rm0008Adc: { t: "RM0008 — analog-to-digital converter (ADC)", url: ST + "reference_manual/rm0008-stm32f101xx-stm32f102xx-stm32f103xx-stm32f105xx-and-stm32f107xx-advanced-armbased-32bit-mcus-stmicroelectronics.pdf", doc: "RM0008", sec: "11", kind: "st" },
    rm0008Dma: { t: "RM0008 — direct memory access controller (DMA)", url: ST + "reference_manual/rm0008-stm32f101xx-stm32f102xx-stm32f103xx-stm32f105xx-and-stm32f107xx-advanced-armbased-32bit-mcus-stmicroelectronics.pdf", doc: "RM0008", sec: "13", kind: "st" },
    rm0008Iwdg: { t: "RM0008 — independent watchdog (IWDG)", url: ST + "reference_manual/rm0008-stm32f101xx-stm32f102xx-stm32f103xx-stm32f105xx-and-stm32f107xx-advanced-armbased-32bit-mcus-stmicroelectronics.pdf", doc: "RM0008", sec: "19", kind: "st" },
    rm0008Wwdg: { t: "RM0008 — window watchdog (WWDG)", url: ST + "reference_manual/rm0008-stm32f101xx-stm32f102xx-stm32f103xx-stm32f105xx-and-stm32f107xx-advanced-armbased-32bit-mcus-stmicroelectronics.pdf", doc: "RM0008", sec: "20", kind: "st" },
    rm0008Can: { t: "RM0008 — controller area network (bxCAN)", url: ST + "reference_manual/rm0008-stm32f101xx-stm32f102xx-stm32f103xx-stm32f105xx-and-stm32f107xx-advanced-armbased-32bit-mcus-stmicroelectronics.pdf", doc: "RM0008", sec: "24", kind: "st" },
    rm0008Spi: { t: "RM0008 — serial peripheral interface (SPI)", url: ST + "reference_manual/rm0008-stm32f101xx-stm32f102xx-stm32f103xx-stm32f105xx-and-stm32f107xx-advanced-armbased-32bit-mcus-stmicroelectronics.pdf", doc: "RM0008", sec: "25", kind: "st" },
    rm0008I2c: { t: "RM0008 — inter-integrated circuit interface (I2C)", url: ST + "reference_manual/rm0008-stm32f101xx-stm32f102xx-stm32f103xx-stm32f105xx-and-stm32f107xx-advanced-armbased-32bit-mcus-stmicroelectronics.pdf", doc: "RM0008", sec: "26", kind: "st" },
    um10204: { t: "UM10204 — I2C-bus specification and user manual (NXP)", url: "https://www.nxp.com/docs/en/user-guide/UM10204.pdf", doc: "UM10204", kind: "spec" },
    iso11898: { t: "ISO 11898-1 — CAN data link layer and physical signalling (summary)", url: "https://www.iso.org/standard/63648.html", doc: "ISO 11898-1:2015", kind: "iso" },
    iso11898p2: { t: "ISO 11898-2 — CAN high-speed physical medium attachment (summary)", url: "https://www.iso.org/standard/67244.html", doc: "ISO 11898-2:2016", kind: "iso" },
    iso17987: { t: "ISO 17987 — Local Interconnect Network (LIN) (summary)", url: "https://www.iso.org/standard/61222.html", doc: "ISO 17987-1:2016", kind: "iso" },
    tiSn65: { t: "SN65HVD230 3.3 V CAN transceiver datasheet (TI)", url: "https://www.ti.com/lit/ds/symlink/sn65hvd230.pdf", doc: "SLOS346", kind: "datasheet" },
    winbondW25q: { t: "Winbond W25Q serial NOR flash (product family and datasheets)", url: "https://www.winbond.com/hq/product/code-storage-flash-memory/serial-nor-flash/", kind: "datasheet" },
    ssd1306: { t: "SSD1306 OLED controller datasheet (Solomon Systech, copy hosted by Adafruit)", url: "https://cdn-shop.adafruit.com/datasheets/SSD1306.pdf", kind: "community" },
    freertosCm3: { t: "FreeRTOS — running the RTOS on ARM Cortex-M (interrupt priorities)", url: "https://www.freertos.org/RTOS-Cortex-M3-M4.html", kind: "tool" },
    freertosConfig: { t: "FreeRTOS — FreeRTOSConfig.h customisation", url: "https://www.freertos.org/a00110.html", kind: "tool" },
    freertosStack: { t: "FreeRTOS — stack usage and stack overflow checking", url: "https://www.freertos.org/Stacks-and-stack-overflow-checking.html", kind: "tool" },
    freertosMutex: { t: "FreeRTOS — mutexes and priority inheritance", url: "https://www.freertos.org/Real-time-embedded-RTOS-mutexes.html", kind: "tool" },
    freertosKernel: { t: "FreeRTOS-Kernel source (Cortex-M3 port: portable/GCC/ARM_CM3/port.c)", url: "https://github.com/FreeRTOS/FreeRTOS-Kernel", kind: "tool" },
    pm0056Exc: { t: "PM0056 — Cortex-M3 processor: stacks, exception model, PendSV and SVCall", url: ST + "programming_manual/pm0056-stm32f10xxx20xxx21xxxl1xxxx-cortexm3-programming-manual-stmicroelectronics.pdf", doc: "PM0056", sec: "2.1.2, 2.3", kind: "st" },
    ddi0403Stack: { t: "ARMv7-M ARM — exception entry stacking and EXC_RETURN", url: "https://developer.arm.com/documentation/ddi0403/latest/", doc: "ARM DDI 0403", sec: "B1.5.6–B1.5.8", kind: "arm" },
    pm0056Fault: { t: "PM0056 — fault handling, SHCSR, CFSR, HFSR, MMFAR, BFAR", url: ST + "programming_manual/pm0056-stm32f10xxx20xxx21xxxl1xxxx-cortexm3-programming-manual-stmicroelectronics.pdf", doc: "PM0056", sec: "2.4, 4.4.9–4.4.17", kind: "st" },
    ddi0403Fault: { t: "ARMv7-M ARM — fault handling, escalation and lockup", url: "https://developer.arm.com/documentation/ddi0403/latest/", doc: "ARM DDI 0403", sec: "B1.5.6, B1.5.15", kind: "arm" },
    ddi0337Debug: { t: "Cortex-M3 TRM — ACTLR, FPB, DWT and ITM", url: "https://developer.arm.com/documentation/ddi0337/latest/", doc: "ARM DDI 0337", sec: "4.3, 8, 11", kind: "arm" },
    gdbManual: { t: "Debugging with GDB — breakpoints, watchpoints, examining memory", url: "https://sourceware.org/gdb/current/onlinedocs/gdb.html/", kind: "tool" },
    armSemihosting: { t: "Arm semihosting specification", url: "https://github.com/ARM-software/abi-aa/blob/main/semihosting/semihosting.rst", kind: "arm" },
    pm0075Prog: { t: "PM0075 — flash program/erase controller: unlock, page erase, programming, option bytes", url: ST + "programming_manual/pm0075-stm32f10xxx-flash-memory-microcontrollers-stmicroelectronics.pdf", doc: "PM0075", kind: "st" },
    pm0056Vtor: { t: "PM0056 — vector table offset register (VTOR)", url: ST + "programming_manual/pm0056-stm32f10xxx20xxx21xxxl1xxxx-cortexm3-programming-manual-stmicroelectronics.pdf", doc: "PM0056", sec: "4.4.4", kind: "st" },
    ds5319Flash: { t: "STM32F103x8/xB datasheet — flash memory characteristics (erase/program time, endurance)", url: ST + "datasheet/stm32f103c8.pdf", doc: "DS5319", kind: "st" },
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
    stm32Base: { t: "STM32-base — Blue Pill board page and schematic notes", url: "https://stm32-base.org/boards/STM32F103C8T6-Blue-Pill.html", kind: "community" },
  };
  const REFS = {
    "autosar-review": [],
    "autosar-diag-nvm": [],
    "autosar-os-com": [],
                                "autosar-mcal": ["arSrsBswGeneral", "arModuleList", "arStdTypes", "arPlatformTypes", "arCompilerAbs", "arMemMap", "arDet", "arPort", "arDio", "arPwm", "arAdc", "arCan", "arWdg", "rm0008Gpio"],
    "autosar-swc": ["arRte", "arSwcTemplate", "arLayered", "arCom", "arDem"],
    "autosar-arch": ["arLayered", "arMethodology", "arModuleList", "arSrsBswGeneral", "autosarRelease", "arEcuM"],
    "quality": ["misraC", "misraCompliance", "cppcheckManual", "unity", "cmock", "ctest", "gccAnalyzer", "gccArm"],
    "bootloader": ["an2606", "an3155", "pm0075Prog", "pm0056Vtor", "ddi0403Reset", "ds5319Flash", "rm0008Boot", "ldManual"],
    "faults-debug": ["pm0056Fault", "ddi0403Fault", "ddi0403Stack", "ddi0337Debug", "rm0008Debug", "gdbManual", "armSemihosting", "um1075"],
    "rtos": ["pm0056Exc", "ddi0403Stack", "pm0056Nvic", "freertosCm3", "freertosConfig", "freertosStack", "freertosMutex", "freertosKernel"],
    "power-wdg": ["rm0008Pwr", "rm0008Iwdg", "rm0008Wwdg", "rm0008Rcc", "rm0008Debug", "ds5319Elec", "pm0056"],
    "can": ["rm0008Can", "iso11898", "iso11898p2", "iso17987", "rm0008Gpio", "tiSn65"],
    "spi": ["rm0008Spi", "rm0008Dma", "ds5319Elec", "winbondW25q"],
    "i2c": ["rm0008I2c", "es096", "um10204", "ds5319Pins", "ssd1306"],
    "adc-dma": ["rm0008Adc", "rm0008Dma", "ds5319Elec", "ds5319Pins", "rm0008Rcc"],
    "uart": ["rm0008Usart", "rm0008Rcc", "pm0056Nvic", "iso17987", "ds5319Pins"],
    "timers": ["rm0008Tim", "rm0008Rcc", "rm0008Gpio", "ds5319Pins", "pm0056"],
    "interrupts": ["pm0056Nvic", "ddi0403Exc", "ddi0337Lat", "rm0008Exti", "rm0008Usart", "cmsisCore"],
    "gpio": ["rm0008Gpio", "ds5319Pins", "ds5319Elec", "rm0008Exti", "es096", "stm32Base"],
    "clocks": ["rm0008Rcc", "ds5319Elec", "pm0075", "ds5319", "rm0008Gpio"],
    "boot": ["rm0008Boot", "pm0056", "ddi0403Reset", "ldManual", "gccArm", "an2606", "cmsisDeviceF1"],
    "fundamentals": ["ds5319", "rm0008Boot", "rm0008Rcc", "pm0056", "ddi0403", "ddi0337", "cmsisDeviceF1", "gccArm", "ldManual"],
    "troubleshooting": ["openocdManual", "rm0008Debug", "rm0008Gpio", "rm0008Sig", "ds5319Pins", "es096", "an2606", "um1075", "stm32Base"],
    "board": ["ds5319Pins", "ds5319Elec", "rm0008Gpio", "rm0008Boot", "rm0008Sig", "es096", "stm32Base"],
    "setup": ["ds5319", "ds5319Pins", "rm0008Boot", "rm0008Rcc", "rm0008Gpio", "rm0008Usart", "pm0075", "pm0056", "ddi0403Reset", "an3155", "um1075", "um2237", "openocdManual", "cmakeToolchains", "cmakePresets", "gccArm", "ldManual", "cortexDebug", "armGnu", "renodeDocs"],
    glossary: ["f103Docs", "ds5319", "rm0008", "pm0056", "ddi0403", "autosarRelease", "openocdManual", "renodeDocs"],
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

    let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.ariaLabel || T.ariaDefault)}"><defs>`;
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
        main.innerHTML = `<h4>${esc(T.ready)}</h4><p class="muted">${opts.intro || T.intro}</p>`;
        side.innerHTML = opts.introSide || `<p class="muted small">${esc(T.introSide)}</p>`;
      } else {
        main.innerHTML = `<div class="seq-tags"><span class="badge gray">${esc(T.step(cur + 1))}</span>${(s.tags || []).map((t) => `<span class="badge ${t[1] || ""}">${esc(t[0])}</span>`).join("")}</div>
          <h4>${esc(s.title || s.label)}</h4><div>${s.detail || ""}</div>`;
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
