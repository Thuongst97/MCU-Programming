/* SPDX-License-Identifier: MIT
 * Host tests for lamp-out detection, the CAN message layout and ClusterAck supervision. */
#include <string.h>

#include "lampmon.h"
#include "tl_msg.h"
#include "unity.h"

void setUp(void)
{
}

void tearDown(void)
{
}

static void test_lamp_out_judged_once_per_phase_after_settling(void)
{
    lampmon_t m;
    lampmon_event_t ev[TL_SIDES];
    const bool on[TL_SIDES] = {true, false};
    lampmon_init(&m);
    lampmon_step(&m, on, 100U, 50U, ev);                    /* still ramping: no verdict */
    TEST_ASSERT_EQUAL(LAMPMON_NO_CHANGE, ev[TL_LEFT]);
    lampmon_step(&m, on, 100U, 10U, ev);                    /* 60 ms: judged, failed */
    TEST_ASSERT_EQUAL(LAMPMON_FAILED, ev[TL_LEFT]);
    TEST_ASSERT_EQUAL(LAMPMON_NO_CHANGE, ev[TL_RIGHT]);
    lampmon_step(&m, on, 3000U, 10U, ev);                   /* same phase: not judged again */
    TEST_ASSERT_EQUAL(LAMPMON_NO_CHANGE, ev[TL_LEFT]);
    const bool off[TL_SIDES] = {false, false};
    lampmon_step(&m, off, 0U, 300U, ev);
    lampmon_step(&m, on, 3000U, 60U, ev);                   /* next phase, good current: healed */
    TEST_ASSERT_EQUAL(LAMPMON_HEALED, ev[TL_LEFT]);
}

static void test_status_round_trip(void)
{
    tl_status_t s, r;
    memset(&s, 0, sizeof s);
    s.lamp_right = true;
    s.hazard = true;
    s.out_left = true;
    s.cluster_lost = true;
    s.reset_cause = (uint8_t)TL_RESET_IWDG;
    s.alive = 200U;
    uint8_t d[TL_STATUS_DLC];
    tl_status_pack(&s, d);
    TEST_ASSERT_EQUAL_HEX8(0xB2U, d[0]);
    TEST_ASSERT_EQUAL_HEX8(0x00U, d[3]);
    TEST_ASSERT_TRUE(tl_status_unpack(d, TL_STATUS_DLC, &r));
    TEST_ASSERT_EQUAL_MEMORY(&s, &r, sizeof s);
    TEST_ASSERT_FALSE(tl_status_unpack(d, 3U, &r));         /* wrong DLC is rejected */
    TEST_ASSERT_EQUAL_STRING("independent watchdog", tl_reset_name(r.reset_cause));
}

static void test_cluster_lost_after_500_ms(void)              /* TL-REQ-007 */
{
    tl_comm_t c;
    tl_comm_init(&c);
    for (uint32_t i = 0U; i < 49U; ++i)
    {
        TEST_ASSERT_FALSE(tl_comm_step(&c, false, 10U));
    }
    TEST_ASSERT_TRUE(tl_comm_step(&c, false, 10U));         /* 500 ms: lost */
    TEST_ASSERT_TRUE(c.lost);
    TEST_ASSERT_FALSE(tl_comm_step(&c, false, 10U));
    TEST_ASSERT_TRUE(tl_comm_step(&c, true, 10U));          /* ack again: recovered */
    TEST_ASSERT_FALSE(c.lost);
}

int main(void)
{
    UNITY_BEGIN();
    RUN_TEST(test_lamp_out_judged_once_per_phase_after_settling);
    RUN_TEST(test_status_round_trip);
    RUN_TEST(test_cluster_lost_after_500_ms);
    return UNITY_END();
}
