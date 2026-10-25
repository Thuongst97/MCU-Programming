/* SPDX-License-Identifier: MIT
 * Programming the STM32F1's own flash (PM0075): unlock, erase pages, program half-words. */
#ifndef FLASH_H
#define FLASH_H

#include <stdbool.h>
#include <stdint.h>

void flash_unlock(void);
void flash_lock(void);
bool flash_erase_page(uint32_t addr);
bool flash_program(uint32_t addr, const uint8_t *data, uint32_t len);   /* len even, addr half-word aligned */

#endif
