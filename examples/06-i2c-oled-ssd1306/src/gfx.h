/* SPDX-License-Identifier: MIT
 * A 128x64 monochrome framebuffer in the SSD1306 memory layout: 8 pages of 128 bytes, each byte
 * a vertical strip of 8 pixels with bit 0 at the top. Pure logic, unit-tested on the host. */
#ifndef EX06_GFX_H
#define EX06_GFX_H

#include <stdbool.h>
#include <stdint.h>

#define GFX_W 128U
#define GFX_H 64U
#define GFX_BYTES (GFX_W * GFX_H / 8U)

typedef struct
{
    uint8_t buf[GFX_BYTES];
} gfx_t;

void gfx_clear(gfx_t *g);
void gfx_pixel(gfx_t *g, uint32_t x, uint32_t y, bool on);
bool gfx_get(const gfx_t *g, uint32_t x, uint32_t y);
/* Draws text at pixel column x on text row 0..7 (one 8-pixel page per row). Lower-case letters are
 * shown as upper case; characters the font lacks are drawn as '?'. Returns the next x. */
uint32_t gfx_text(gfx_t *g, uint32_t x, uint32_t row, const char *s);
/* Horizontal bar on text row `row`: `percent` (0..100) of `width` pixels filled, with a frame. */
void gfx_bar(gfx_t *g, uint32_t x, uint32_t row, uint32_t width, uint32_t percent);

#endif
