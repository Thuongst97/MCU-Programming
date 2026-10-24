/* SPDX-License-Identifier: MIT
 * Linker script for the STM32F103C8T6 "Blue Pill": 64 KB flash, 20 KB SRAM (DS5319).
 * Never 128 KB: the second 64 KB on many C8 dies is untested and undocumented.
 * Shared by every example from 01 on; example 00 carries an annotated copy of this file.
 */
ENTRY(Reset_Handler)                       /* «1» */

MEMORY                                     /* «2» */
{
  FLASH (rx)  : ORIGIN = 0x08000000, LENGTH = 64K
  RAM   (xrw) : ORIGIN = 0x20000000, LENGTH = 20K
}

/* Top of RAM. AAPCS wants an 8-byte aligned stack; ORIGIN + LENGTH is 0x20005000. */
_estack = ORIGIN(RAM) + LENGTH(RAM);       /* «3» */

/* The link fails if the static data plus these reserves do not fit into RAM. */
_Min_Heap_Size  = 0x000;                   /* no malloc in this course */
_Min_Stack_Size = 0x400;                   /* 1 KB main stack: checked, not enforced at run time */

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
