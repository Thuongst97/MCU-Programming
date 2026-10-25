/* SPDX-License-Identifier: MIT
 * Host tests for the SSD1306 framebuffer layout and text rendering (example 06). */
#include <string.h>
#include "gfx.h"
#include "unity.h"

static gfx_t g;

void setUp(void) { gfx_clear(&g); }
void tearDown(void) {}

static void test_pixel_layout_matches_ssd1306_pages(void)
{
    gfx_pixel(&g, 0U, 0U, true);
    TEST_ASSERT_EQUAL_HEX8(0x01U, g.buf[0]);
    gfx_pixel(&g, 3U, 9U, true);                 /* page 1, bit 1 */
    TEST_ASSERT_EQUAL_HEX8(0x02U, g.buf[128U + 3U]);
    TEST_ASSERT_TRUE(gfx_get(&g, 3U, 9U));
    gfx_pixel(&g, 3U, 9U, false);
    TEST_ASSERT_FALSE(gfx_get(&g, 3U, 9U));
}

static void test_out_of_range_is_clipped(void)
{
    gfx_pixel(&g, 128U, 0U, true);
    gfx_pixel(&g, 0U, 64U, true);
    static const gfx_t empty;
    TEST_ASSERT_EQUAL_MEMORY(empty.buf, g.buf, GFX_BYTES);
}

static void test_text_advances_six_pixels_and_draws_glyphs(void)
{
    TEST_ASSERT_EQUAL_UINT32(12U, gfx_text(&g, 0U, 0U, "10"));
    TEST_ASSERT_EQUAL_HEX8(0x7FU, g.buf[2]);     /* the stem of '1' is a full 7-pixel column */
    TEST_ASSERT_EQUAL_HEX8(0x00U, g.buf[5]);     /* the gap column stays empty */
}

static void test_lower_case_and_unknown_characters(void)
{
    gfx_t up;
    gfx_clear(&up);
    (void)gfx_text(&up, 0U, 0U, "AB");
    (void)gfx_text(&g, 0U, 0U, "ab");
    TEST_ASSERT_EQUAL_MEMORY(up.buf, g.buf, 12U);
    gfx_clear(&g);
    gfx_clear(&up);
    (void)gfx_text(&g, 0U, 0U, "~");
    (void)gfx_text(&up, 0U, 0U, "?");
    TEST_ASSERT_EQUAL_MEMORY(up.buf, g.buf, 6U);
}

static void test_bar_fill(void)
{
    gfx_bar(&g, 0U, 7U, 102U, 50U);
    TEST_ASSERT_EQUAL_HEX8(0xFFU, g.buf[7U * 128U + 0U]);    /* left end */
    TEST_ASSERT_EQUAL_HEX8(0xBDU, g.buf[7U * 128U + 50U]);   /* filled */
    TEST_ASSERT_EQUAL_HEX8(0x81U, g.buf[7U * 128U + 51U]);   /* empty */
    TEST_ASSERT_EQUAL_HEX8(0xFFU, g.buf[7U * 128U + 101U]);  /* right end */
}

int main(void)
{
    UNITY_BEGIN();
    RUN_TEST(test_pixel_layout_matches_ssd1306_pages);
    RUN_TEST(test_out_of_range_is_clipped);
    RUN_TEST(test_text_advances_six_pixels_and_draws_glyphs);
    RUN_TEST(test_lower_case_and_unknown_characters);
    RUN_TEST(test_bar_fill);
    return UNITY_END();
}
