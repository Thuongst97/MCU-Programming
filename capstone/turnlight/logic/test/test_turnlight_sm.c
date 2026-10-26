/* SPDX-License-Identifier: MIT
 * Host tests for the TurnLight state machine: the requirements TL-REQ-001..005 as executable checks. */
#include <string.h>

#include "turnlight_sm.h"
#include "unity.h"

static turnlight_t t;
static tl_inputs_t in;
static tl_outputs_t out;
static uint32_t edges[TL_SIDES];   /* rising lamp edges counted by run() */

void setUp(void)
{
    tl_init(&t);
    memset(&in, 0, sizeof in);
    memset(&out, 0, sizeof out);
    memset(edges, 0, sizeof edges);
}

void tearDown(void)
{
}

static void run(uint32_t ms)
{
    for (uint32_t i = 0U; i < ms; i += 10U)
    {
        const bool before[TL_SIDES] = {out.lamp[TL_LEFT], out.lamp[TL_RIGHT]};
        (void)tl_step(&t, &in, 10U, &out);
        in.hazard_pressed = false;
        for (uint32_t s = 0U; s < (uint32_t)TL_SIDES; ++s)
        {
            edges[s] += (out.lamp[s] && !before[s]) ? 1U : 0U;
        }
    }
}

static void test_left_stalk_flashes_left_only(void)          /* TL-REQ-001 */
{
    in.stalk[TL_LEFT] = true;
    run(10U);
    TEST_ASSERT_TRUE(out.lamp[TL_LEFT]);                    /* on at once */
    TEST_ASSERT_FALSE(out.lamp[TL_RIGHT]);
    run(2000U);
    TEST_ASSERT_TRUE(out.indicating[TL_LEFT]);
    TEST_ASSERT_EQUAL_UINT32(0U, edges[TL_RIGHT]);
}

static void test_flash_rate_is_1_5_hz(void)                   /* TL-REQ-002 */
{
    in.stalk[TL_RIGHT] = true;
    run(10U);
    uint32_t on_ms = 0U;
    uint32_t start = edges[TL_RIGHT];
    for (uint32_t i = 0U; i < 6700U; i += 10U)              /* exactly 10 periods */
    {
        run(10U);
        on_ms += out.lamp[TL_RIGHT] ? 10U : 0U;
    }
    TEST_ASSERT_EQUAL_UINT32(10U, edges[TL_RIGHT] - start);
    TEST_ASSERT_UINT32_WITHIN(100U, 3300U, on_ms);          /* 50 % +- 10 % duty */
}

static void test_hazard_overrides_and_is_in_phase(void)       /* TL-REQ-003 */
{
    in.stalk[TL_LEFT] = true;
    run(200U);
    in.hazard_pressed = true;
    run(10U);
    for (uint32_t i = 0U; i < 2000U; i += 10U)
    {
        run(10U);
        TEST_ASSERT_EQUAL(out.lamp[TL_LEFT], out.lamp[TL_RIGHT]);
    }
    TEST_ASSERT_TRUE(out.hazard);
    in.hazard_pressed = true;                               /* off again: the held stalk takes over */
    run(10U);
    TEST_ASSERT_FALSE(out.hazard);
    TEST_ASSERT_TRUE(out.indicating[TL_LEFT]);
    TEST_ASSERT_FALSE(out.indicating[TL_RIGHT]);
}

// [region:tap]
static void test_tap_gives_exactly_three_flashes(void)        /* TL-REQ-004 */  // «1»
{
    in.stalk[TL_LEFT] = true;
    run(200U);
    in.stalk[TL_LEFT] = false;
    run(5000U);
    TEST_ASSERT_EQUAL_UINT32(3U, edges[TL_LEFT]);
    TEST_ASSERT_FALSE(out.indicating[TL_LEFT]);
}
// [endregion]

static void test_long_hold_stops_at_release(void)
{
    in.stalk[TL_LEFT] = true;
    run(800U);
    in.stalk[TL_LEFT] = false;
    run(10U);
    TEST_ASSERT_FALSE(out.lamp[TL_LEFT]);
    TEST_ASSERT_FALSE(out.indicating[TL_LEFT]);
}

static void test_opposite_side_cancels_comfort(void)
{
    in.stalk[TL_LEFT] = true;
    run(100U);
    in.stalk[TL_LEFT] = false;
    run(100U);
    in.stalk[TL_RIGHT] = true;
    run(10U);
    TEST_ASSERT_FALSE(out.indicating[TL_LEFT]);
    TEST_ASSERT_TRUE(out.lamp[TL_RIGHT]);
}

static void test_failed_lamp_flashes_twice_as_fast(void)      /* TL-REQ-005 */
{
    in.lamp_failed[TL_LEFT] = true;
    in.stalk[TL_LEFT] = true;
    run(10U);
    const uint32_t start = edges[TL_LEFT];
    run(3400U);                                             /* 10 fast periods */
    TEST_ASSERT_EQUAL_UINT32(10U, edges[TL_LEFT] - start);
}

int main(void)
{
    UNITY_BEGIN();
    RUN_TEST(test_left_stalk_flashes_left_only);
    RUN_TEST(test_flash_rate_is_1_5_hz);
    RUN_TEST(test_hazard_overrides_and_is_in_phase);
    RUN_TEST(test_tap_gives_exactly_three_flashes);
    RUN_TEST(test_long_hold_stops_at_release);
    RUN_TEST(test_opposite_side_cancels_comfort);
    RUN_TEST(test_failed_lamp_flashes_twice_as_fast);
    return UNITY_END();
}
