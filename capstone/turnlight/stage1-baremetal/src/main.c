/* SPDX-License-Identifier: MIT
 * TurnLight capstone, stage 1: bare metal. Example 02's cooperative scheduler runs six periodic
 * jobs; the state machine, lamp monitor and message packing come from ../logic, the drivers from
 * examples 01 (debounce), 11 (bxCAN) and ../hw. Requirements: ../docs/requirements.md.
 */
#include <stdbool.h>
#include <stdint.h>

#include "can.h"
#include "clock.h"
#include "debounce.h"
#include "lampmon.h"
#include "led.h"
#include "scheduler.h"
#include "stm32f103xb.h"
#include "systick.h"
#include "tl_hw.h"
#include "tl_msg.h"
#include "turnlight_sm.h"
#include "uart_log.h"

static const char SIDE[TL_SIDES] = {'L', 'R'};

static debounce_t s_btn[TL_BTN_COUNT];
static turnlight_t s_tl;
static tl_inputs_t s_in;
static tl_outputs_t s_out;
static lampmon_t s_mon;
static tl_comm_t s_comm;
static tl_status_t s_status;
static bool s_status_changed;
static uint32_t s_alive;               /* one bit per supervised job (TL-REQ-009) */

enum { ALIVE_INPUT = 1U, ALIVE_LOGIC = 2U, ALIVE_LAMP = 4U, ALIVE_CAN = 8U, ALIVE_ALL = 15U };

static void log_lamp(tl_side_t s, bool on)
{
    uart_puts("lamp ");
    uart_putc(SIDE[s]);
    uart_puts(on ? " 1\n" : " 0\n");
}

// [region:input]
static void job_input(void)            /* 10 ms: debounce the three buttons (TL-REQ-001) */
{
    const uint32_t now = millis();
    for (uint32_t b = 0U; b < (uint32_t)TL_BTN_COUNT; ++b)
    {
        const debounce_event_t ev = debounce_update(&s_btn[b], tl_hw_button_pressed((tl_button_t)b), now);
        if (b == (uint32_t)TL_BTN_HAZARD)
        {
            s_in.hazard_pressed = s_in.hazard_pressed || (ev == DEBOUNCE_PRESSED);   /* latched edge */
        }
        else
        {
            s_in.stalk[b] = s_btn[b].stable_pressed;
        }
    }
    s_alive |= ALIVE_INPUT;
}
// [endregion]

// [region:logic]
static void job_logic(void)            /* 10 ms: the state machine */
{
    const tl_outputs_t before = s_out;
    if (tl_step(&s_tl, &s_in, 10U, &s_out))
    {
        s_status_changed = true;       /* TL-REQ-006: send on change */
        for (uint32_t i = 0U; i < (uint32_t)TL_SIDES; ++i)
        {
            if (before.lamp[i] != s_out.lamp[i])
            {
                log_lamp((tl_side_t)i, s_out.lamp[i]);
            }
        }
        if (before.hazard != s_out.hazard)
        {
            uart_puts(s_out.hazard ? "tl: hazard on\n" : "tl: hazard off\n");
        }
    }
    s_in.hazard_pressed = false;       /* the edge has been consumed */
    s_alive |= ALIVE_LOGIC;
}
// [endregion]

static void job_lamp(void)             /* 5 ms: soft PWM ramp (TL-REQ-008) */
{
    tl_hw_lamp_ramp(s_out.lamp, 5U);
    s_alive |= ALIVE_LAMP;
}

static void job_monitor(void)          /* 10 ms: lamp-out detection (TL-REQ-005) */
{
    lampmon_event_t ev[TL_SIDES];
    lampmon_step(&s_mon, s_out.lamp, tl_hw_lamp_current(), 10U, ev);
    for (uint32_t i = 0U; i < (uint32_t)TL_SIDES; ++i)
    {
        if (ev[i] != LAMPMON_NO_CHANGE)
        {
            s_in.lamp_failed[i] = s_mon.failed[i];
            s_status_changed = true;
            uart_puts("dem: TL_E_LAMP_OUT_");
            uart_putc(SIDE[i]);
            uart_puts((ev[i] == LAMPMON_FAILED) ? " failed\n" : " passed\n");
        }
    }
}

// [region:can]
static void job_can(void)              /* 10 ms: ClusterAck supervision, TurnLightStatus TX */
{
    static uint32_t since_tx_ms;
    bool ack = false;
    can_frame_t rx;
    while (can_receive(&rx))
    {
        ack = ack || ((rx.id == TL_CAN_ID_ACK) && (rx.dlc >= 1U));
    }
    if (tl_comm_step(&s_comm, ack, 10U))                                  /* TL-REQ-007 */
    {
        s_status_changed = true;
        uart_puts(s_comm.lost ? "dem: TL_E_CLUSTER_LOST failed\n" : "dem: TL_E_CLUSTER_LOST passed\n");
    }
    since_tx_ms += 10U;
    if (s_status_changed || (since_tx_ms >= TL_STATUS_CYCLE_MS))         /* TL-REQ-006 */
    {
        s_status.lamp_left = s_out.lamp[TL_LEFT];
        s_status.lamp_right = s_out.lamp[TL_RIGHT];
        s_status.ind_left = s_out.indicating[TL_LEFT];
        s_status.ind_right = s_out.indicating[TL_RIGHT];
        s_status.hazard = s_out.hazard;
        s_status.out_left = s_mon.failed[TL_LEFT];
        s_status.out_right = s_mon.failed[TL_RIGHT];
        s_status.cluster_lost = s_comm.lost;
        s_status.alive++;
        can_frame_t tx = {.id = TL_CAN_ID_STATUS, .dlc = TL_STATUS_DLC, .data = {0}};
        tl_status_pack(&s_status, tx.data);
        (void)can_send(&tx);           /* a full mailbox drops this frame; the next cycle repeats it */
        s_status_changed = false;
        since_tx_ms = 0U;
    }
    s_alive |= ALIVE_CAN;
}
// [endregion]

// [region:supervisor]
static void job_supervisor(void)       /* 50 ms: feed the watchdog only if every job ran (TL-REQ-009) */
{
    if (s_alive == ALIVE_ALL)
    {
        tl_hw_wdg_feed();
    }
    s_alive = 0U;
}
// [endregion]

static void job_heartbeat(void)
{
    led_toggle();
}

static task_t s_jobs[] = {
    {"lamp", job_lamp, 5U, 0U, 0U, 0U},
    {"input", job_input, 10U, 0U, 0U, 0U},
    {"logic", job_logic, 10U, 0U, 0U, 0U},
    {"monitor", job_monitor, 10U, 0U, 0U, 0U},
    {"can", job_can, 10U, 0U, 0U, 0U},
    {"supervisor", job_supervisor, 50U, 0U, 0U, 0U},
    {"heartbeat", job_heartbeat, 500U, 0U, 0U, 0U},
};

int main(void)
{
    const clock_status_t clk = clock_init_72mhz();
    systick_init_1ms();
    uart_log_init(115200U);
    led_init();
    s_status.reset_code = tl_hw_reset_code();                             /* TL-REQ-010 */
    uart_puts("\nTurnLight stage 1 (bare metal), reset cause: ");
    uart_puts(tl_reset_name(s_status.reset_code));
    uart_puts((clk == CLOCK_OK) ? "\n" : ", clock fault\n");
    if (!tl_hw_init())
    {
        uart_puts("dem: TL_E_ADC_INIT failed\n");
    }
    if (!can_init(CAN_BTR_500K_36MHZ, CAN_MODE_NORMAL))
    {
        uart_puts("dem: TL_E_CAN_INIT failed\n");
    }
    const uint32_t now = millis();
    for (uint32_t b = 0U; b < (uint32_t)TL_BTN_COUNT; ++b)
    {
        debounce_init(&s_btn[b], 20U, false, now);                         /* TL-REQ-001: 20 ms */
    }
    tl_init(&s_tl);
    lampmon_init(&s_mon);
    tl_comm_init(&s_comm);
    tl_hw_wdg_start();
    sched_init(s_jobs, sizeof s_jobs / sizeof s_jobs[0], millis());
    for (;;)
    {
        (void)sched_run_due(s_jobs, sizeof s_jobs / sizeof s_jobs[0], millis());
        __WFI();                                                           /* until the next SysTick */
    }
}
