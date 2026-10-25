/* SPDX-License-Identifier: MIT
 * Host tests for the ADC arithmetic of example 05. */
#include "adcmath.h"
#include "unity.h"

void setUp(void) {}
void tearDown(void) {}

static void test_vdda_from_vrefint(void)
{
    /* 1.20 V at VDDA = 3.30 V reads 1.2 / 3.3 * 4095 = 1489 */
    TEST_ASSERT_UINT32_WITHIN(2U, 3300U, adc_vdda_mv(1489U));
    TEST_ASSERT_UINT32_WITHIN(2U, 3000U, adc_vdda_mv(1638U));
    TEST_ASSERT_EQUAL_UINT32(0U, adc_vdda_mv(0U));
}

static void test_pin_millivolts(void)
{
    TEST_ASSERT_UINT32_WITHIN(2U, 1650U, adc_pin_mv(2048U, 1489U));   /* half scale at 3.3 V */
    TEST_ASSERT_EQUAL_UINT32(0U, adc_pin_mv(0U, 1489U));
    TEST_ASSERT_UINT32_WITHIN(2U, 3300U, adc_pin_mv(4095U, 1489U));
    TEST_ASSERT_EQUAL_UINT32(0U, adc_pin_mv(100U, 0U));
}

static void test_mean_of_interleaved_channel(void)
{
    static const uint16_t buf[6] = {100U, 1489U, 200U, 1490U, 300U, 1488U};
    TEST_ASSERT_EQUAL_UINT32(200U, adc_mean(buf, 6U, 0U, 2U));
    TEST_ASSERT_EQUAL_UINT32(1489U, adc_mean(buf, 6U, 1U, 2U));
    TEST_ASSERT_EQUAL_UINT32(0U, adc_mean(buf, 6U, 6U, 2U));
    TEST_ASSERT_EQUAL_UINT32(0U, adc_mean(buf, 6U, 0U, 0U));
}

int main(void)
{
    UNITY_BEGIN();
    RUN_TEST(test_vdda_from_vrefint);
    RUN_TEST(test_pin_millivolts);
    RUN_TEST(test_mean_of_interleaved_channel);
    return UNITY_END();
}
