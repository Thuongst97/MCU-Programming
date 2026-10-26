/* SPDX-License-Identifier: MIT
 * Host tests for the TIMINGR calculation of example 06: every result must meet the I2C-bus
 * minimums (UM10204) and fit the register fields. */
#include "i2c_timing.h"
#include "unity.h"

void setUp(void) {}
void tearDown(void) {}

static void check(uint32_t fclk, uint32_t fscl, uint32_t low_min_ns, uint32_t high_min_ns, uint32_t su_min_ns)
{
    i2c_timing_t t;
    TEST_ASSERT_EQUAL_INT(0, i2c_timing_calc(fclk, fscl, &t));
    const uint64_t tick = i2c_timing_tick_ps(fclk, &t);
    const uint64_t low = (t.scll + 1U) * tick, high = (t.sclh + 1U) * tick;
    TEST_ASSERT_TRUE(low >= (uint64_t)low_min_ns * 1000U);
    TEST_ASSERT_TRUE(high >= (uint64_t)high_min_ns * 1000U);
    TEST_ASSERT_TRUE(low + high >= 1000000000000ULL / fscl);          /* never faster than asked */
    TEST_ASSERT_TRUE(low + high <= 1000000000000ULL / (fscl - fscl / 5U));   /* and within 20 % */
    TEST_ASSERT_TRUE((t.scldel + 1U) * tick >= (uint64_t)su_min_ns * 1000U);
    TEST_ASSERT_TRUE(t.presc <= 15U && t.scldel <= 15U && t.sdadel <= 15U);
    TEST_ASSERT_TRUE(t.scll <= 255U && t.sclh <= 255U);
}

static void test_fast_mode_at_170mhz(void)
{
    check(170000000U, 400000U, 1300U, 600U, 100U);
}

static void test_standard_mode_at_16mhz(void)
{
    check(16000000U, 100000U, 4700U, 4000U, 250U);
}

static void test_register_layout(void)
{
    const i2c_timing_t t = {0xAU, 0x12U, 0x34U, 0x5U, 0x6U};
    TEST_ASSERT_EQUAL_HEX32(0xA0653412U, i2c_timing_reg(&t));
}

static void test_rejects_impossible(void)
{
    i2c_timing_t t;
    TEST_ASSERT_EQUAL_INT(-1, i2c_timing_calc(170000000U, 1000000U, &t));   /* fast-mode plus: not supported here */
    TEST_ASSERT_EQUAL_INT(-1, i2c_timing_calc(0U, 400000U, &t));
}

int main(void)
{
    UNITY_BEGIN();
    RUN_TEST(test_fast_mode_at_170mhz);
    RUN_TEST(test_standard_mode_at_16mhz);
    RUN_TEST(test_register_layout);
    RUN_TEST(test_rejects_impossible);
    return UNITY_END();
}
