/* SPDX-License-Identifier: MIT
 * Host unit tests for scheduler.c (Unity). */
#include "unity.h"
#include "scheduler.h"

static uint32_t a_runs, b_runs;
static void task_a(void) { a_runs++; }
static void task_b(void) { b_runs++; }

static task_t tasks[2];

void setUp(void)
{
    a_runs = b_runs = 0U;
    tasks[0] = (task_t){"a", task_a, 10U, 0U, 0U, 0U};
    tasks[1] = (task_t){"b", task_b, 25U, 0U, 0U, 0U};
    sched_init(tasks, 2U, 0U);
}

void tearDown(void)
{
}

static void test_nothing_runs_before_first_period(void)
{
    TEST_ASSERT_EQUAL_UINT32(0U, sched_run_due(tasks, 2U, 9U));
}

static void test_tasks_run_at_their_rates_over_one_second(void)
{
    for (uint32_t t = 0U; t <= 1000U; ++t)
    {
        (void)sched_run_due(tasks, 2U, t);
    }
    TEST_ASSERT_EQUAL_UINT32(100U, a_runs);
    TEST_ASSERT_EQUAL_UINT32(40U, b_runs);
    TEST_ASSERT_EQUAL_UINT32(0U, tasks[0].overruns);
}

static void test_late_call_counts_an_overrun_and_resynchronises(void)
{
    (void)sched_run_due(tasks, 2U, 10U);    /* a on time */
    (void)sched_run_due(tasks, 2U, 45U);    /* a is 25 ms late: > one period */
    TEST_ASSERT_EQUAL_UINT32(1U, tasks[0].overruns);
    TEST_ASSERT_EQUAL_UINT32(55U, tasks[0].next_ms);   /* next deadline counted from now */
}

static void test_fixed_rate_does_not_drift(void)
{
    (void)sched_run_due(tasks, 2U, 13U);    /* 3 ms late, but within the period */
    TEST_ASSERT_EQUAL_UINT32(20U, tasks[0].next_ms);   /* still on the 10 ms grid */
}

static void test_survives_32bit_wraparound(void)
{
    sched_init(tasks, 2U, 0xFFFFFFF0U);     /* a due at 0xFFFFFFFA */
    TEST_ASSERT_EQUAL_UINT32(0U, sched_run_due(tasks, 2U, 0xFFFFFFF9U));
    TEST_ASSERT_EQUAL_UINT32(1U, sched_run_due(tasks, 2U, 0xFFFFFFFAU));
    TEST_ASSERT_EQUAL_UINT32(1U, sched_run_due(tasks, 2U, 0x00000004U));   /* next one after the wrap */
}

int main(void)
{
    UNITY_BEGIN();
    RUN_TEST(test_nothing_runs_before_first_period);
    RUN_TEST(test_tasks_run_at_their_rates_over_one_second);
    RUN_TEST(test_late_call_counts_an_overrun_and_resynchronises);
    RUN_TEST(test_fixed_rate_does_not_drift);
    RUN_TEST(test_survives_32bit_wraparound);
    return UNITY_END();
}
