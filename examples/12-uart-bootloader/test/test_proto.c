/* SPDX-License-Identifier: MIT
 * Host tests for the example 12 frame parser and CRC-32 (Unity). */
#include <string.h>

#include "proto.h"
#include "unity.h"

static proto_parser_t p;

void setUp(void)
{
    proto_reset(&p);
}

void tearDown(void)
{
}

static proto_event_t feed(const uint8_t *b, uint32_t n)
{
    proto_event_t ev = PROTO_NONE;
    for (uint32_t i = 0U; i < n; ++i)
    {
        ev = proto_feed(&p, b[i]);
        if ((ev != PROTO_NONE) && (i != (n - 1U)))
        {
            return (proto_event_t)99;   /* an event before the last byte is a bug */
        }
    }
    return ev;
}

static void test_crc32_check_value(void)
{
    const uint8_t s[] = "123456789";
    TEST_ASSERT_EQUAL_HEX32(0xCBF43926UL, crc32_update(0U, s, 9U));   /* the standard check value */
    TEST_ASSERT_EQUAL_HEX32(0xCBF43926UL, crc32_update(crc32_update(0U, s, 4U), &s[4], 5U));
}

static void test_hello_frame(void)
{
    /* same bytes as host/blproto.py frame(HELLO) */
    const uint8_t f[] = {0xA5, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00};
    uint8_t buf[8];
    memcpy(buf, f, sizeof buf);
    const uint8_t hdr[3] = {0x01, 0x00, 0x00};
    const uint32_t crc = crc32_update(0U, hdr, 3U);
    buf[4] = (uint8_t)crc;
    buf[5] = (uint8_t)(crc >> 8);
    buf[6] = (uint8_t)(crc >> 16);
    buf[7] = (uint8_t)(crc >> 24);
    TEST_ASSERT_EQUAL(PROTO_FRAME, feed(buf, 8U));
    TEST_ASSERT_EQUAL_UINT8(CMD_HELLO, p.frame.cmd);
    TEST_ASSERT_EQUAL_UINT16(0U, p.frame.len);
}

static void test_garbage_before_frame_is_skipped(void)
{
    const uint8_t junk[] = {'b', 'o', 'o', 't', '\n', 0x00};
    TEST_ASSERT_EQUAL(PROTO_NONE, feed(junk, sizeof junk));
    test_hello_frame();
}

static void test_payload_and_bad_crc(void)
{
    uint8_t f[4 + 6 + 4] = {0xA5, CMD_WRITE, 6, 0, 0x10, 0, 0, 0, 0xAA, 0xBB};
    const uint32_t crc = crc32_update(0U, &f[1], 9U);
    f[10] = (uint8_t)crc;
    f[11] = (uint8_t)(crc >> 8);
    f[12] = (uint8_t)(crc >> 16);
    f[13] = (uint8_t)(crc >> 24);
    TEST_ASSERT_EQUAL(PROTO_FRAME, feed(f, sizeof f));
    TEST_ASSERT_EQUAL_UINT32(0x10U, get_u32le(p.frame.data));
    TEST_ASSERT_EQUAL_HEX8(0xBB, p.frame.data[5]);
    f[9] ^= 0x01U;                                   /* one flipped bit */
    TEST_ASSERT_EQUAL(PROTO_BAD_CRC, feed(f, sizeof f));
}

static void test_too_long_is_refused(void)
{
    const uint8_t f[] = {0xA5, CMD_WRITE, 0xFF, 0x7F};   /* 32767 bytes would overflow */
    TEST_ASSERT_EQUAL(PROTO_TOO_LONG, feed(f, sizeof f));
    test_hello_frame();                              /* the parser recovers */
}

int main(void)
{
    UNITY_BEGIN();
    RUN_TEST(test_crc32_check_value);
    RUN_TEST(test_hello_frame);
    RUN_TEST(test_garbage_before_frame_is_skipped);
    RUN_TEST(test_payload_and_bad_crc);
    RUN_TEST(test_too_long_is_refused);
    return UNITY_END();
}
