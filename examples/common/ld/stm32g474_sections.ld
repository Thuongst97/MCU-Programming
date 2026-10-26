/* SPDX-License-Identifier: MIT
 * Section placement shared by every NUCLEO-G474RE image. Included by a script that defines the
 * FLASH, RAM and CCMRAM regions: stm32g474re.ld (the whole chip) or the split scripts of
 * example 12 (bootloader + application). Kept separate so the sections are written down once.
 */
/* Top of RAM. AAPCS wants an 8-byte aligned stack; ORIGIN + LENGTH is 0x20018000. */
_estack = ORIGIN(RAM) + LENGTH(RAM);       /* «3» */

/* The link fails if the static data plus these reserves do not fit into RAM. */
_Min_Heap_Size  = 0x000;                   /* no malloc in this course */
_Min_Stack_Size = 0x800;                   /* 2 KB main stack (FPU frames are bigger): checked, not enforced */

SECTIONS
{
  /* The vector table must be first: the core reads SP and PC from 0x08000000 at reset. */
  .isr_vector :                            /* «4» */
  {
    . = ALIGN(4);
    KEEP(*(.isr_vector))
    . = ALIGN(4);
  } >FLASH

  .text :
  {
    . = ALIGN(4);
    *(.text)
    *(.text*)
    *(.rodata)
    *(.rodata*)
    KEEP(*(.init))
    KEEP(*(.fini))
    . = ALIGN(4);
    _etext = .;
  } >FLASH

  .ARM.exidx :
  {
    *(.ARM.exidx* .gnu.linkonce.armexidx.*)
  } >FLASH

  /* Initialised variables live in RAM (VMA) but their start values are stored in flash (LMA). */
  _sidata = LOADADDR(.data);               /* «5» */
  .data :
  {
    . = ALIGN(4);
    _sdata = .;
    *(.data)
    *(.data*)
    . = ALIGN(4);
    _edata = .;
  } >RAM AT> FLASH                         /* «6» */

  /* Zero-initialised variables: no image in flash, the startup code clears them. */
  .bss (NOLOAD) :
  {
    . = ALIGN(4);
    _sbss = .;
    __bss_start__ = _sbss;
    *(.bss)
    *(.bss*)
    *(COMMON)
    . = ALIGN(4);
    _ebss = .;
    __bss_end__ = _ebss;
  } >RAM

  /* Not touched by the startup code: survives a reset (not a power cycle). Example 08 keeps its
     fault record here so the next boot can report what crashed. */
  .noinit (NOLOAD) :
  {
    . = ALIGN(4);
    *(.noinit)
    *(.noinit*)
    . = ALIGN(4);
  } >RAM

  /* CCM SRAM: zero-wait-state RAM on the core's own bus, invisible to DMA. Variables go here
     only when tagged __attribute__((section(".ccmram"))); this course keeps it empty and
     the startup code does not clear it. */
  .ccmram (NOLOAD) :
  {
    . = ALIGN(4);
    *(.ccmram)
    *(.ccmram*)
    . = ALIGN(4);
  } >CCMRAM

  /* Reserve heap + stack so the link fails early when RAM runs out. */
  ._user_heap_stack (NOLOAD) :             /* «7» */
  {
    . = ALIGN(8);
    PROVIDE(end = .);
    PROVIDE(_end = .);
    . = . + _Min_Heap_Size;
    . = . + _Min_Stack_Size;
    . = ALIGN(8);
  } >RAM

  .ARM.attributes 0 : { *(.ARM.attributes) }
}
