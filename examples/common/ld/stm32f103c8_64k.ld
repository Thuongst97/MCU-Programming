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

/* Sections, stack and heap reserve: shared with the bootloader/application split of example 12. */
INCLUDE stm32f103_sections.ld
