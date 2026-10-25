/* SPDX-License-Identifier: MIT
 * Host unit tests for debounce.c (Unity). Run: cmake --preset host-tests && ctest --preset host-tests */
#include "unity.h"
#include "debounce.h"

static debounce_t db;

void setUp(void)
{
    debounce_init(&db, 20U, false, 0U);
}

void tearDown(void)
{
}

static void test_clean_press_is_reported_after_settle_time(void)
{
    TEST_ASSERT_EQUAL(DEBOUNCE_NONE, debounce_update(&db, true, 100U));     /* edge: start timing */
    TEST_ASSERT_EQUAL(DEBOUNCE_NONE, debounce_update(&db, true, 119U));     /* 19 ms: not yet */
    TEST_ASSERT_EQUAL(DEBOUNCE_PRESSED, debounce_update(&db, true, 120U));  /* 20 ms: accepted */
    TEST_ASSERT_EQUAL(DEBOUNCE_NONE, debounce_update(&db, true, 500U));     /* reported once */
}

static void test_bounce_restarts_the_timer(void)
{
    (void)debounce_update(&db, true, 100U);
    (void)debounce_update(&db, false, 105U);   /* bounce */
    (void)debounce_update(&db, true, 110U);    /* bounce back */
    TEST_ASSERT_EQUAL(DEBOUNCE_NONE, debounce_update(&db, true, 125U));     /* only 15 ms stable */
    TEST_ASSERT_EQUAL(DEBOUNCE_PRESSED, debounce_update(&db, true, 130U));
}

static void test_release_is_reported_too(void)
{
    (void)debounce_update(&db, true, 0U);
    (void)debounce_update(&db, true, 20U);
    TEST_ASSERT_EQUAL(DEBOUNCE_NONE, debounce_update(&db, false, 50U));
    TEST_ASSERT_EQUAL(DEBOUNCE_RELEASED, debounce_update(&db, false, 70U));
}

static void test_short_glitch_is_ignored(void)
{
    (void)debounce_update(&db, true, 10U);
    TEST_ASSERT_EQUAL(DEBOUNCE_NONE, debounce_update(&db, false, 15U));
    TEST_ASSERT_EQUAL(DEBOUNCE_NONE, debounce_update(&db, false, 100U));    /* never pressed */
}

static void test_timer_wraparound(void)
{
    debounce_init(&db, 20U, false, 0xFFFFFFF0U);
    (void)debounce_update(&db, true, 0xFFFFFFF8U);
    TEST_ASSERT_EQUAL(DEBOUNCE_NONE, debounce_update(&db, true, 0x00000008U));  /* 16 ms across wrap */
    TEST_ASSERT_EQUAL(DEBOUNCE_PRESSED, debounce_update(&db, true, 0x0000000CU)); /* 20 ms */
}

int main(void)
{
    UNITY_BEGIN();
    RUN_TEST(test_clean_press_is_reported_after_settle_time);
    RUN_TEST(test_bounce_restarts_the_timer);
    RUN_TEST(test_release_is_reported_too);
    RUN_TEST(test_short_glitch_is_ignored);
    RUN_TEST(test_timer_wraparound);
    return UNITY_END();
}
