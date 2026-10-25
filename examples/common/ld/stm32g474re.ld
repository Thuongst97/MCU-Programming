/* SPDX-License-Identifier: MIT
 * Linker script for the STM32G474RE (NUCLEO-G474RE): 512 KB flash, 128 KB SRAM (DS12288).
 * The SRAM is three blocks (stm32g474xx.h): SRAM1 80 KB at 0x20000000 and SRAM2 16 KB at
 * 0x20014000 form one contiguous 96 KB region; CCM SRAM (32 KB at 0x10000000) is separate,
 * reachable by the core only (not by DMA), and holds nothing unless code asks for it.
 * Shared by every example from 01 on; example 00 carries an annotated copy of this file.
 */
ENTRY(Reset_Handler)                       /* «1» */

MEMORY                                     /* «2» */
{
  FLASH  (rx)  : ORIGIN = 0x08000000, LENGTH = 512K
  RAM    (xrw) : ORIGIN = 0x20000000, LENGTH = 96K
  CCMRAM (xrw) : ORIGIN = 0x10000000, LENGTH = 32K
}

/* Sections, stack and heap reserve: shared with the bootloader/application split of example 12. */
INCLUDE stm32g474_sections.ld
