/* SPDX-License-Identifier: MIT
 * Example 12, application image: starts after the 16 KB bootloader slot and may use up to the
 * end of flash bank 1 (240 KB; see src/layout.h). Everything else (sections, stack) is the same
 * as any other example. */
ENTRY(Reset_Handler)

MEMORY
{
  FLASH  (rx)  : ORIGIN = 0x08004000, LENGTH = 240K   /* «2» */
  RAM    (xrw) : ORIGIN = 0x20000000, LENGTH = 96K
  CCMRAM (xrw) : ORIGIN = 0x10000000, LENGTH = 32K
}

INCLUDE stm32g474_sections.ld
