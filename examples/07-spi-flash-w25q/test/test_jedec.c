/* SPDX-License-Identifier: MIT
 * Host tests for JEDEC ID decoding and command framing (example 07). */
#include "jedec.h"
#include "unity.h"

void setUp(void) {}
void tearDown(void) {}

static void test_vendors(void)
{
    TEST_ASSERT_EQUAL_STRING("Winbond", jedec_vendor(0xEFU));
    TEST_ASSERT_EQUAL_STRING("Micron", jedec_vendor(0x20U));
    TEST_ASSERT_EQUAL_STRING("unknown", jedec_vendor(0x00U));
}

static void test_capacity(void)
{
    TEST_ASSERT_EQUAL_UINT32(4UL * 1024UL * 1024UL, jedec_capacity_bytes(0x16U));   /* W25Q32 */
    TEST_ASSERT_EQUAL_UINT32(8UL * 1024UL * 1024UL, jedec_capacity_bytes(0x17U));   /* W25Q64 */
    TEST_ASSERT_EQUAL_UINT32(0U, jedec_capacity_bytes(0xFFU));
}

static void test_address_is_msb_first(void)
{
    uint8_t out[4];
    flash_cmd_addr(0x20U, 0x123456UL, out);
    TEST_ASSERT_EQUAL_HEX8(0x20U, out[0]);
    TEST_ASSERT_EQUAL_HEX8(0x12U, out[1]);
    TEST_ASSERT_EQUAL_HEX8(0x34U, out[2]);
    TEST_ASSERT_EQUAL_HEX8(0x56U, out[3]);
}

int main(void)
{
    UNITY_BEGIN();
    RUN_TEST(test_vendors);
    RUN_TEST(test_capacity);
    RUN_TEST(test_address_is_msb_first);
    return UNITY_END();
}
