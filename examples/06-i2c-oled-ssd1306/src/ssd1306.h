/* SPDX-License-Identifier: MIT
 * SSD1306 128x64 OLED over I2C (address 0x3C on most modules; check yours). */
#ifndef SSD1306_H
#define SSD1306_H

#include "gfx.h"
#include "i2c.h"

#define SSD1306_ADDR 0x3CU

i2c_status_t ssd1306_init(void);
i2c_status_t ssd1306_flush(const gfx_t *g);

#endif
