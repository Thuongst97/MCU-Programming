/* SPDX-License-Identifier: MIT
 * Host tests for CAN bit timing and CAN FD lengths (example 11). */
#include "canfd.h"
#include "unity.h"

void setUp(void) {}
void tearDown(void) {}

static void check_bitrate(uint32_t fclk, uint32_t rate, const can_timing_t *t)
{
    const uint32_t tq = 1U + t->tseg1 + t->tseg2;
    TEST_ASSERT_EQUAL_UINT32(fclk, t->brp * tq * rate);   /* exact, no rounding */
}

static void test_nominal_500k_at_170mhz(void)
{
    can_timing_t t;
    TEST_ASSERT_EQUAL_INT(0, can_timing_calc(170000000U, 500000U, 875U, &CAN_NOMINAL_LIMITS, &t));
    check_bitrate(170000000U, 500000U, &t);
    TEST_ASSERT_EQUAL_UINT32(17U, t.brp);                  /* 10 MHz quanta, 20 per bit */
    TEST_ASSERT_EQUAL_UINT32(16U, t.tseg1);                /* sample point 17/20 = 85 % */
    TEST_ASSERT_EQUAL_UINT32(3U, t.tseg2);
    TEST_ASSERT_EQUAL_UINT32(3U, t.sjw);
}

static void test_data_1m_at_170mhz(void)
{
    can_timing_t t;
    TEST_ASSERT_EQUAL_INT(0, can_timing_calc(170000000U, 1000000U, 800U, &CAN_DATA_LIMITS, &t));
    check_bitrate(170000000U, 1000000U, &t);
    TEST_ASSERT_TRUE(t.tseg1 <= 32U && t.tseg2 <= 16U && t.brp <= 32U);
}

static void test_impossible_rate(void)
{
    can_timing_t t;
    TEST_ASSERT_EQUAL_INT(-1, can_timing_calc(170000000U, 333333U, 875U, &CAN_NOMINAL_LIMITS, &t));
}

static void test_dlc_mapping(void)
{
    TEST_ASSERT_EQUAL_UINT32(8U, can_dlc_to_len(8U));
    TEST_ASSERT_EQUAL_UINT32(12U, can_dlc_to_len(9U));
    TEST_ASSERT_EQUAL_UINT32(64U, can_dlc_to_len(15U));
    TEST_ASSERT_EQUAL_UINT32(10U, can_len_to_dlc(16U));
    TEST_ASSERT_EQUAL_UINT32(11U, can_len_to_dlc(17U));    /* 17 bytes go in a 20-byte frame */
    TEST_ASSERT_EQUAL_UINT32(15U, can_len_to_dlc(64U));
    TEST_ASSERT_EQUAL_UINT32(0U, can_len_to_dlc(0U));
}

int main(void)
{
    UNITY_BEGIN();
    RUN_TEST(test_nominal_500k_at_170mhz);
    RUN_TEST(test_data_1m_at_170mhz);
    RUN_TEST(test_impossible_rate);
    RUN_TEST(test_dlc_mapping);
    return UNITY_END();
}
