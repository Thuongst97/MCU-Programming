/* SPDX-License-Identifier: MIT
 * Winbond W25Qxx SPI NOR flash: the handful of standard commands this course needs. */
#ifndef W25Q_H
#define W25Q_H

#include <stdbool.h>
#include <stdint.h>

#define W25Q_PAGE   256U    /* program at most one page per command */
#define W25Q_SECTOR 4096U   /* smallest erasable unit */

void w25q_read_id(uint8_t id[3]);
bool w25q_erase_sector(uint32_t addr);
bool w25q_program_page(uint32_t addr, const uint8_t *data, uint32_t len);
void w25q_read(uint32_t addr, uint8_t *data, uint32_t len);
bool w25q_read_dma(uint32_t addr, uint8_t *data, uint32_t len);

#endif
