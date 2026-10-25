/* SPDX-License-Identifier: MIT
 * Host tests for the LIN helpers: known PIDs and checksums. */
#include "lin.h"
#include "unity.h"

void setUp(void)
{
}

void tearDown(void)
{
}

static void test_pid_known_values(void)
{
    TEST_ASSERT_EQUAL_HEX8(0x3CU, lin_pid(0x3CU));   /* master request frame */
    TEST_ASSERT_EQUAL_HEX8(0x7DU, lin_pid(0x3DU));   /* slave response frame */
    TEST_ASSERT_EQUAL_HEX8(0x50U, lin_pid(0x10U));
    TEST_ASSERT_EQUAL_HEX8(0x80U, lin_pid(0x00U));
    TEST_ASSERT_TRUE(lin_pid_ok(0x50U));
    TEST_ASSERT_FALSE(lin_pid_ok(0x10U));            /* parity bits missing */
}

static void test_checksum_classic_and_enhanced(void)
{
    const uint8_t d[2] = {0x01U, 0x02U};
    TEST_ASSERT_EQUAL_HEX8(0xFCU, lin_checksum(d, 2U, 0x50U, false));
    TEST_ASSERT_EQUAL_HEX8(0xACU, lin_checksum(d, 2U, 0x50U, true));    /* ~(0x50 + 3) */
    const uint8_t c[2] = {0xFFU, 0x01U};
    TEST_ASSERT_EQUAL_HEX8(0xFEU, lin_checksum(c, 2U, 0U, false));      /* 0x100 -> 0x01 with carry */
}

int main(void)
{
    UNITY_BEGIN();
    RUN_TEST(test_pid_known_values);
    RUN_TEST(test_checksum_classic_and_enhanced);
    return UNITY_END();
}
