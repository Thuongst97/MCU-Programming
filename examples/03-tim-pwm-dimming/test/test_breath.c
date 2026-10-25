/* SPDX-License-Identifier: MIT
 * Host tests for the breathing curve (example 03). */
#include "breath.h"
#include "unity.h"

void setUp(void) {}
void tearDown(void) {}

static void test_starts_dark_and_peaks_at_half_period(void)
{
    TEST_ASSERT_EQUAL_UINT32(0U, breath_duty(0U, 200U, 1000U));
    TEST_ASSERT_EQUAL_UINT32(1000U, breath_duty(100U, 200U, 1000U));
}

static void test_is_symmetric(void)
{
    for (uint32_t s = 1U; s < 100U; ++s)
    {
        TEST_ASSERT_EQUAL_UINT32(breath_duty(s, 200U, 1000U), breath_duty(200U - s, 200U, 1000U));
    }
}

static void test_rises_monotonically_and_stays_in_range(void)
{
    uint32_t prev = 0U;
    for (uint32_t s = 0U; s <= 100U; ++s)
    {
        const uint32_t d = breath_duty(s, 200U, 1000U);
        TEST_ASSERT_TRUE(d >= prev);
        TEST_ASSERT_TRUE(d <= 1000U);
        prev = d;
    }
}

static void test_is_perceptual_not_linear(void)
{
    /* a quarter of the way up the ramp is a sixteenth of full duty, not a quarter */
    TEST_ASSERT_EQUAL_UINT32(62U, breath_duty(25U, 200U, 1000U));
}

static void test_degenerate_inputs(void)
{
    TEST_ASSERT_EQUAL_UINT32(0U, breath_duty(5U, 1U, 1000U));
    TEST_ASSERT_EQUAL_UINT32(0U, breath_duty(5U, 200U, 0U));
    TEST_ASSERT_EQUAL_UINT32(breath_duty(10U, 200U, 1000U), breath_duty(210U, 200U, 1000U));
}

int main(void)
{
    UNITY_BEGIN();
    RUN_TEST(test_starts_dark_and_peaks_at_half_period);
    RUN_TEST(test_is_symmetric);
    RUN_TEST(test_rises_monotonically_and_stays_in_range);
    RUN_TEST(test_is_perceptual_not_linear);
    RUN_TEST(test_degenerate_inputs);
    return UNITY_END();
}
