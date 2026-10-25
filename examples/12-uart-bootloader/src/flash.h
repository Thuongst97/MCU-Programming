/* SPDX-License-Identifier: MIT
 * Programming the STM32G474's own flash (RM0440 "Embedded flash memory"): unlock, erase pages,
 * program 64-bit double words. */
#ifndef FLASH_H
#define FLASH_H

#include <stdbool.h>
#include <stdint.h>

void flash_unlock(void);
void flash_lock(void);
uint32_t flash_page_size(void);                    /* 2048 (dual bank) or 4096 (single bank) */
bool flash_erase_page(uint32_t addr);              /* erases the page that contains addr */
bool flash_program(uint32_t addr, const uint8_t *data, uint32_t len);   /* addr and len multiples of 8 */

#endif
