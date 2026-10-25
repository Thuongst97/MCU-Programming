/* SPDX-License-Identifier: MIT
 * SPI1 master (PA5 SCK, PA6 MISO, PA7 MOSI) with a GPIO chip select on PA4. RM0008 chapter 25. */
#ifndef SPI_H
#define SPI_H

#include <stdbool.h>
#include <stdint.h>

void spi_init(void);
void spi_select(void);
void spi_deselect(void);
uint8_t spi_xfer(uint8_t out);                       /* full duplex: send one byte, return the one received */
bool spi_read_dma(uint8_t *buf, uint32_t len);       /* clock in len bytes (sending 0xFF) with DMA1 ch2/ch3 */

#endif
