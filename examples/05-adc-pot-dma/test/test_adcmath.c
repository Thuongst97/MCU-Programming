/* SPDX-License-Identifier: MIT
 * Host tests for the ADC arithmetic of example 05. */
#include "adcmath.h"
#include "unity.h"

void setUp(void) {}
void tearDown(void) {}

/* A chip whose Vrefint read 1655 at the factory (VDDA = 3.0 V): Vrefint is 1655/4095 x 3.0 = 1.212 V.
 * At VDDA = 3.3 V the same reference reads 1.212 / 3.3 x 4095 = 1504. */
#define CAL 1655U

static void test_vdda_from_vrefint(void)
{
    TEST_ASSERT_UINT32_WITHIN(2U, 3300U, adc_vdda_mv(1504U, CAL));
    TEST_ASSERT_EQUAL_UINT32(3000U, adc_vdda_mv(CAL, CAL));          /* same as at the factory */
    TEST_ASSERT_EQUAL_UINT32(0U, adc_vdda_mv(0U, CAL));
}

static void test_pin_millivolts(void)
{
    TEST_ASSERT_UINT32_WITHIN(2U, 1650U, adc_pin_mv(2048U, 1504U, CAL));   /* half scale at 3.3 V */
    TEST_ASSERT_EQUAL_UINT32(0U, adc_pin_mv(0U, 1504U, CAL));
    TEST_ASSERT_UINT32_WITHIN(2U, 3300U, adc_pin_mv(4095U, 1504U, CAL));
    TEST_ASSERT_EQUAL_UINT32(0U, adc_pin_mv(100U, 0U, CAL));
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
