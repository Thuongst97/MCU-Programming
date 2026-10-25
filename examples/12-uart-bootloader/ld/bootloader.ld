/* SPDX-License-Identifier: MIT
 * Example 12, bootloader image: the first 12 KB of flash. The last 4 KB of the 16 KB bootloader
 * slot (0x08003000) hold the image record written after a verified update: 4 KB so it is a whole
 * page whatever the DBANK option bit says (2 KB or 4 KB pages). */
ENTRY(Reset_Handler)

MEMORY
{
  FLASH  (rx)  : ORIGIN = 0x08000000, LENGTH = 12K   /* «1» */
  RAM    (xrw) : ORIGIN = 0x20000000, LENGTH = 96K
  CCMRAM (xrw) : ORIGIN = 0x10000000, LENGTH = 32K
}

INCLUDE stm32g474_sections.ld
