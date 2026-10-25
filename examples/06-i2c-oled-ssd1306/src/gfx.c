/* SPDX-License-Identifier: MIT */
#include "gfx.h"

#include <string.h>
#include "font5x7.h"

void gfx_clear(gfx_t *g)
{
    memset(g->buf, 0, sizeof g->buf);
}

// [region:pixel]
void gfx_pixel(gfx_t *g, uint32_t x, uint32_t y, bool on)
{
    if ((x >= GFX_W) || (y >= GFX_H))
    {
        return;                                            /* clip, never write outside the buffer */
    }
    const uint32_t i = (y / 8U) * GFX_W + x;               /* page = y / 8, then the column */  // «1»
    const uint8_t bit = (uint8_t)(1U << (y % 8U));         /* bit 0 = top pixel of the page */  // «2»
    g->buf[i] = on ? (uint8_t)(g->buf[i] | bit) : (uint8_t)(g->buf[i] & (uint8_t)~bit);
}
// [endregion]

bool gfx_get(const gfx_t *g, uint32_t x, uint32_t y)
{
    if ((x >= GFX_W) || (y >= GFX_H))
    {
        return false;
    }
    return (g->buf[(y / 8U) * GFX_W + x] & (1U << (y % 8U))) != 0U;
}

static const uint8_t *glyph(char c)
{
    if ((c >= 'a') && (c <= 'z'))
    {
        c = (char)(c - 'a' + 'A');
    }
    const char *p = strchr(font5x7_chars, c);
    if ((p == NULL) || (c == '\0'))
    {
        p = strchr(font5x7_chars, '?');
    }
    return font5x7[p - font5x7_chars];
}

// [region:text]
uint32_t gfx_text(gfx_t *g, uint32_t x, uint32_t row, const char *s)
{
    for (; (*s != '\0') && (row < 8U); ++s)
    {
        const uint8_t *cols = glyph(*s);
        for (uint32_t c = 0U; c < 5U; ++c)
        {
            if (x + c < GFX_W)
            {
                g->buf[row * GFX_W + x + c] = cols[c];     /* a whole column of the glyph per byte */ // «3»
            }
        }
        x += 6U;                                           /* 5 pixels + 1 pixel gap */
    }
    return x;
}
// [endregion]

void gfx_bar(gfx_t *g, uint32_t x, uint32_t row, uint32_t width, uint32_t percent)
{
    if (percent > 100U)
    {
        percent = 100U;
    }
    const uint32_t fill = (width - 2U) * percent / 100U;
    for (uint32_t i = 0U; i < width; ++i)
    {
        uint8_t col = 0x81U;                               /* top and bottom frame lines */
        if ((i == 0U) || (i == width - 1U))
        {
            col = 0xFFU;                                   /* left and right ends */
        }
        else if (i <= fill)
        {
            col = 0xBDU;                                   /* filled, with a 1-pixel inner margin */
        }
        if ((x + i < GFX_W) && (row < 8U))
        {
            g->buf[row * GFX_W + x + i] = col;
        }
    }
}
