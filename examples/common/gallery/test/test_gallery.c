/* SPDX-License-Identifier: MIT
 * The gallery's claims, tested: the good versions are right, the bad ones fail where the page
 * says they do. */
#include "gallery.h"
#include "unity.h"

void setUp(void)
{
}

void tearDown(void)
{
}

static void test_sign(void)
{
    TEST_ASSERT_TRUE(good_below_limit(-1, 10U));
    TEST_ASSERT_FALSE(good_below_limit(20, 10U));
    TEST_ASSERT_FALSE(bad_below_limit(-1, 10U));          /* the bug: -1 is "not below 10" */
    TEST_ASSERT_TRUE(bad_below_limit(5, 10U));            /* ... but positive values work, so it passes casual tests */
}

static void test_precedence(void)
{
    TEST_ASSERT_TRUE(good_txe_set(0x80U));
    TEST_ASSERT_FALSE(good_txe_set(0x01U));
    TEST_ASSERT_FALSE(bad_txe_set(0x80U));                /* the bug: TXE set, reported clear */
    TEST_ASSERT_TRUE(bad_txe_set(0x01U));                 /* ... and bit 0 reported as TXE */
}

static void test_narrowing(void)
{
    uint8_t n = 0U;
    TEST_ASSERT_TRUE(good_remaining(100U, 40U, &n));
    TEST_ASSERT_EQUAL_UINT8(60U, n);
    TEST_ASSERT_FALSE(good_remaining(300U, 0U, &n));
    TEST_ASSERT_EQUAL_UINT8(44U, bad_remaining(300U, 0U)); /* the bug: 300 mod 256 */
}

static void test_wrap(void)
{
    const uint32_t start = 0xFFFFFF00UL;
    TEST_ASSERT_FALSE(good_expired(0xFFFFFF10UL, start, 0x200U));   /* 16 ms elapsed */
    TEST_ASSERT_TRUE(good_expired(0x00000150UL, start, 0x200U));    /* 592 ms elapsed, across the wrap */
    TEST_ASSERT_TRUE(bad_expired(0xFFFFFF10UL, start, 0x200U));     /* the bug: expires after 16 ms */
}

int main(void)
{
    UNITY_BEGIN();
    RUN_TEST(test_sign);
    RUN_TEST(test_precedence);
    RUN_TEST(test_narrowing);
    RUN_TEST(test_wrap);
    return UNITY_END();
}
