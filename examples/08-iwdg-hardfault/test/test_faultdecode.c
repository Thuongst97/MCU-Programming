/* SPDX-License-Identifier: MIT
 * Host tests for fault and reset-cause decoding (example 08). */
#include "faultdecode.h"
#include "unity.h"

void setUp(void) {}
void tearDown(void) {}

static void test_usage_fault_escalated(void)
{
    char buf[64];
    TEST_ASSERT_EQUAL_STRING("DIVBYZERO FORCED", fault_describe(1UL << 25, 1UL << 30, buf, sizeof buf));
    TEST_ASSERT_EQUAL_STRING("UNDEFINSTR FORCED", fault_describe(1UL << 16, 1UL << 30, buf, sizeof buf));
}

static void test_bus_fault_with_address(void)
{
    char buf[64];
    TEST_ASSERT_EQUAL_STRING("BFARVALID PRECISERR", fault_describe((1UL << 15) | (1UL << 9), 0U, buf, sizeof buf));
}

static void test_nothing_set_and_small_buffer(void)
{
    char buf[64];
    TEST_ASSERT_EQUAL_STRING("none", fault_describe(0U, 0U, buf, sizeof buf));
    char tiny[8];
    TEST_ASSERT_EQUAL_STRING("", fault_describe(1UL << 25, 0U, tiny, sizeof tiny));   /* never overflows */
}

static void test_reset_cause_priority(void)
{
    TEST_ASSERT_EQUAL_STRING("independent watchdog", reset_cause((1UL << 29) | (1UL << 26)));
    TEST_ASSERT_EQUAL_STRING("power-on", reset_cause(0x0C000000UL));
    TEST_ASSERT_EQUAL_STRING("software (SYSRESETREQ)", reset_cause((1UL << 28) | (1UL << 26)));
    TEST_ASSERT_EQUAL_STRING("reset pin", reset_cause(1UL << 26));
    TEST_ASSERT_EQUAL_STRING("unknown", reset_cause(0U));
}

int main(void)
{
    UNITY_BEGIN();
    RUN_TEST(test_usage_fault_escalated);
    RUN_TEST(test_bus_fault_with_address);
    RUN_TEST(test_nothing_set_and_small_buffer);
    RUN_TEST(test_reset_cause_priority);
    return UNITY_END();
}
