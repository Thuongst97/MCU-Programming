/* SPDX-License-Identifier: MIT
 * Example 12, bootloader image: the first 15 KB of flash. The last 1 KB page of the 16 KB
 * bootloader slot (0x08003C00) holds the image record written after a verified update. */
ENTRY(Reset_Handler)

MEMORY
{
  FLASH (rx)  : ORIGIN = 0x08000000, LENGTH = 15K   /* «1» */
  RAM   (xrw) : ORIGIN = 0x20000000, LENGTH = 20K
}

INCLUDE stm32f103_sections.ld
