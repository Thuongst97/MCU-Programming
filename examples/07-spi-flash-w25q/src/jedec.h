/* SPDX-License-Identifier: MIT
 * Decoding the 3-byte JEDEC ID that SPI NOR flashes return for command 0x9F: manufacturer,
 * memory type, capacity code. Pure logic, unit-tested on the host. */
#ifndef JEDEC_H
#define JEDEC_H

#include <stdint.h>

const char *jedec_vendor(uint8_t manufacturer);   /* "Winbond", "Micron", … or "unknown" */
uint32_t jedec_capacity_bytes(uint8_t code);      /* 2^code bytes for codes 0x10..0x20, else 0 */
/* Command byte followed by a 24-bit address, most significant byte first. */
void flash_cmd_addr(uint8_t cmd, uint32_t addr, uint8_t out[4]);

#endif
