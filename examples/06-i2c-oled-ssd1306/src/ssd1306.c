/* SPDX-License-Identifier: MIT
 * SSD1306 driver: an initialisation sequence for a 128x64 panel with the internal charge pump,
 * and a full-frame flush. Command meanings are paraphrased from the SSD1306 datasheet. */
#include "ssd1306.h"

#include <stddef.h>

#define CTRL_CMD  0x00U   /* control byte: the following bytes are commands */
#define CTRL_DATA 0x40U   /* control byte: the following bytes go to display RAM */

// [region:init]
static const uint8_t s_init[] = {
    0xAE,         /* display off while configuring */                                         // «1»
    0xD5, 0x80,   /* display clock divider / oscillator frequency */
    0xA8, 0x3F,   /* multiplex ratio: 64 rows */
    0xD3, 0x00,   /* no vertical display offset */
    0x40,         /* start line 0 */
    0x8D, 0x14,   /* charge pump on: the module has no separate panel supply */                // «2»
    0x20, 0x00,   /* horizontal addressing: one flush writes all 8 pages in order */            // «3»
    0xA1,         /* column 127 is SEG0: mirror horizontally so text reads left to right */
    0xC8,         /* scan COM63 to COM0: mirror vertically */
    0xDA, 0x12,   /* COM pin configuration for 128x64 */
    0x81, 0xCF,   /* contrast */
    0xD9, 0xF1,   /* pre-charge period */
    0xDB, 0x40,   /* VCOMH deselect level */
    0xA4,         /* display follows RAM content */
    0xA6,         /* normal (not inverted) */
    0xAF,         /* display on */                                                             // «4»
};
// [endregion]

i2c_status_t ssd1306_init(void)
{
    return i2c_write(SSD1306_ADDR, CTRL_CMD, s_init, sizeof s_init);
}

// [region:flush]
i2c_status_t ssd1306_flush(const gfx_t *g)
{
    static const uint8_t window[] = {0x21, 0x00, 0x7F, 0x22, 0x00, 0x07};   /* columns 0-127, pages 0-7 */ // «5»
    const i2c_status_t st = i2c_write(SSD1306_ADDR, CTRL_CMD, window, sizeof window);
    if (st != I2C_OK)
    {
        return st;
    }
    return i2c_write(SSD1306_ADDR, CTRL_DATA, g->buf, GFX_BYTES);           /* 1024 bytes */        // «6»
}
// [endregion]
