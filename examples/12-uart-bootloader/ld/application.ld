/* SPDX-License-Identifier: MIT
 * Example 12, application image: starts after the 16 KB bootloader slot and gets the remaining
 * 48 KB. Everything else (sections, stack) is the same as any other example. */
ENTRY(Reset_Handler)

MEMORY
{
  FLASH (rx)  : ORIGIN = 0x08004000, LENGTH = 48K   /* «2» */
  RAM   (xrw) : ORIGIN = 0x20000000, LENGTH = 20K
}

INCLUDE stm32f103_sections.ld
