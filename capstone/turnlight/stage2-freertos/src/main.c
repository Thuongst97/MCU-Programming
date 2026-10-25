/* SPDX-License-Identifier: MIT
 * TurnLight capstone, stage 2: the same ECU on FreeRTOS. The logic files and drivers are the
 * ones stage 1 uses; only the integration changed: five tasks, a queue for button events, a
 * one-element "mailbox" queue for the latest outputs, and event groups for "status changed" and
 * for the watchdog supervisor's check-ins. Every object is allocated statically.
 */
#include <stdbool.h>
#include <stdint.h>

#include "FreeRTOS.h"
#include "event_groups.h"
#include "queue.h"
#include "semphr.h"
#include "task.h"
#include "timers.h"

#include "can.h"
#include "clock.h"
#include "debounce.h"
#include "lampmon.h"
#include "led.h"
#include "stm32f103xb.h"
#include "tl_hw.h"
#include "tl_msg.h"
#include "turnlight_sm.h"
#include "uart_log.h"

#define STACK_WORDS 256U

typedef struct
{
    StaticTask_t tcb;
    StackType_t stack[STACK_WORDS];
} task_mem_t;

typedef struct
{
    uint8_t button;     /* tl_button_t */
    bool pressed;
} input_event_t;

typedef struct
{
    tl_outputs_t out;
    bool failed[TL_SIDES];
} snapshot_t;           /* what the logic publishes for the lamp and CAN tasks */

enum
{
    EV_STATUS_CHANGED = 1U << 0,
    ALIVE_INPUT = 1U << 1, ALIVE_LOGIC = 1U << 2, ALIVE_LAMP = 1U << 3, ALIVE_CAN = 1U << 4,
    ALIVE_ALL = ALIVE_INPUT | ALIVE_LOGIC | ALIVE_LAMP | ALIVE_CAN
};

static const char SIDE[TL_SIDES] = {'L', 'R'};
static task_mem_t s_input_mem, s_logic_mem, s_lamp_mem, s_can_mem, s_sup_mem;
static StaticQueue_t s_events_cb, s_mailbox_cb;
static uint8_t s_events_buf[8U * sizeof(input_event_t)];
static uint8_t s_mailbox_buf[sizeof(snapshot_t)];
static QueueHandle_t s_events, s_mailbox;
static StaticEventGroup_t s_flags_cb, s_alive_cb;
static EventGroupHandle_t s_flags, s_alive;
static StaticSemaphore_t s_log_cb;
static SemaphoreHandle_t s_log;
static uint8_t s_reset_cause;

static uint32_t now_ms(void)
{
    return (uint32_t)xTaskGetTickCount();                  /* 1 kHz tick: ticks are milliseconds */
}

static void log3(const char *a, char c, const char *b)     /* one line, one lock */
{
    if (xSemaphoreTake(s_log, pdMS_TO_TICKS(20)) == pdTRUE)
    {
        uart_puts(a);
        if (c != '\0')
        {
            uart_putc(c);
        }
        uart_puts(b);
        xSemaphoreGive(s_log);
    }
}

// [region:input]
static void input_task(void *arg)      /* 10 ms, priority 3: debounce, send edges as events */
{
    (void)arg;
    debounce_t btn[TL_BTN_COUNT];
    for (uint32_t b = 0U; b < (uint32_t)TL_BTN_COUNT; ++b)
    {
        debounce_init(&btn[b], 20U, false, now_ms());
    }
    TickType_t wake = xTaskGetTickCount();
    for (;;)
    {
        vTaskDelayUntil(&wake, pdMS_TO_TICKS(10));
        for (uint32_t b = 0U; b < (uint32_t)TL_BTN_COUNT; ++b)
        {
            const debounce_event_t ev = debounce_update(&btn[b], tl_hw_button_pressed((tl_button_t)b), now_ms());
            if (ev != DEBOUNCE_NONE)
            {
                const input_event_t e = {(uint8_t)b, ev == DEBOUNCE_PRESSED};
                (void)xQueueSend(s_events, &e, 0);         /* never block the sampling loop */
            }
        }
        (void)xEventGroupSetBits(s_alive, ALIVE_INPUT);
    }
}
// [endregion]

// [region:logic]
static void logic_task(void *arg)      /* 10 ms, priority 3: lamp monitor + state machine */
{
    (void)arg;
    turnlight_t tl;
    tl_inputs_t in = {0};
    lampmon_t mon;
    snapshot_t snap = {0};
    tl_init(&tl);
    lampmon_init(&mon);
    TickType_t wake = xTaskGetTickCount();
    for (;;)
    {
        vTaskDelayUntil(&wake, pdMS_TO_TICKS(10));
        input_event_t e;
        while (xQueueReceive(s_events, &e, 0) == pdTRUE)  /* drain every edge since last time */
        {
            if (e.button == (uint8_t)TL_BTN_HAZARD)
            {
                in.hazard_pressed = in.hazard_pressed || e.pressed;
            }
            else
            {
                in.stalk[e.button] = e.pressed;
            }
        }
        lampmon_event_t mev[TL_SIDES];
        lampmon_step(&mon, snap.out.lamp, tl_hw_lamp_current(), 10U, mev);
        bool changed = false;
        for (uint32_t i = 0U; i < (uint32_t)TL_SIDES; ++i)
        {
            if (mev[i] != LAMPMON_NO_CHANGE)
            {
                in.lamp_failed[i] = mon.failed[i];
                snap.failed[i] = mon.failed[i];
                changed = true;
                log3("dem: TL_E_LAMP_OUT_", SIDE[i], (mev[i] == LAMPMON_FAILED) ? " failed\n" : " passed\n");
            }
        }
        const tl_outputs_t before = snap.out;
        if (tl_step(&tl, &in, 10U, &snap.out))
        {
            changed = true;
            for (uint32_t i = 0U; i < (uint32_t)TL_SIDES; ++i)
            {
                if (before.lamp[i] != snap.out.lamp[i])
                {
                    log3("lamp ", SIDE[i], snap.out.lamp[i] ? " 1\n" : " 0\n");
                }
            }
            if (before.hazard != snap.out.hazard)
            {
                log3(snap.out.hazard ? "tl: hazard on\n" : "tl: hazard off\n", '\0', "");
            }
        }
        in.hazard_pressed = false;
        (void)xQueueOverwrite(s_mailbox, &snap);           /* the newest outputs replace the old */
        if (changed)
        {
            (void)xEventGroupSetBits(s_flags, EV_STATUS_CHANGED);
        }
        (void)xEventGroupSetBits(s_alive, ALIVE_LOGIC);
    }
}
// [endregion]

static void lamp_task(void *arg)       /* 5 ms, priority 4 (highest): smooth PWM ramps */
{
    (void)arg;
    TickType_t wake = xTaskGetTickCount();
    snapshot_t snap = {0};
    for (;;)
    {
        vTaskDelayUntil(&wake, pdMS_TO_TICKS(5));
        (void)xQueuePeek(s_mailbox, &snap, 0);             /* keep the last value if none yet */
        tl_hw_lamp_ramp(snap.out.lamp, 5U);
        (void)xEventGroupSetBits(s_alive, ALIVE_LAMP);
    }
}

// [region:can]
static void can_task(void *arg)        /* priority 2: on change, or every 10 ms for RX + the 100 ms cycle */
{
    (void)arg;
    tl_comm_t comm;
    tl_status_t st = {0};
    snapshot_t snap = {0};
    tl_comm_init(&comm);
    st.reset_cause = s_reset_cause;
    TickType_t last_tick = xTaskGetTickCount();
    uint32_t since_tx_ms = 0U;
    for (;;)
    {
        const EventBits_t ev = xEventGroupWaitBits(s_flags, EV_STATUS_CHANGED, pdTRUE, pdFALSE, pdMS_TO_TICKS(10));
        const TickType_t now = xTaskGetTickCount();
        const uint32_t dt = (uint32_t)(now - last_tick);
        last_tick = now;
        bool ack = false;
        can_frame_t rx;
        while (can_receive(&rx))
        {
            ack = ack || ((rx.id == TL_CAN_ID_ACK) && (rx.dlc >= 1U));
        }
        bool send = (ev & EV_STATUS_CHANGED) != 0U;
        if (tl_comm_step(&comm, ack, dt))
        {
            send = true;
            log3(comm.lost ? "dem: TL_E_CLUSTER_LOST failed\n" : "dem: TL_E_CLUSTER_LOST passed\n", '\0', "");
        }
        since_tx_ms += dt;
        if (send || (since_tx_ms >= TL_STATUS_CYCLE_MS))
        {
            (void)xQueuePeek(s_mailbox, &snap, 0);
            st.lamp_left = snap.out.lamp[TL_LEFT];
            st.lamp_right = snap.out.lamp[TL_RIGHT];
            st.ind_left = snap.out.indicating[TL_LEFT];
            st.ind_right = snap.out.indicating[TL_RIGHT];
            st.hazard = snap.out.hazard;
            st.out_left = snap.failed[TL_LEFT];
            st.out_right = snap.failed[TL_RIGHT];
            st.cluster_lost = comm.lost;
            st.alive++;
            can_frame_t tx = {.id = TL_CAN_ID_STATUS, .dlc = TL_STATUS_DLC, .data = {0}};
            tl_status_pack(&st, tx.data);
            (void)can_send(&tx);
            since_tx_ms = 0U;
        }
        (void)xEventGroupSetBits(s_alive, ALIVE_CAN);
    }
}
// [endregion]

// [region:supervisor]
static void supervisor_task(void *arg) /* priority 1 (lowest): feeds IWDG only when everyone checked in */
{
    (void)arg;
    for (;;)
    {
        const EventBits_t got = xEventGroupWaitBits(s_alive, ALIVE_ALL, pdTRUE, pdTRUE, pdMS_TO_TICKS(50));
        if ((got & ALIVE_ALL) == ALIVE_ALL)
        {
            tl_hw_wdg_feed();
            led_toggle();
            vTaskDelay(pdMS_TO_TICKS(40));                 /* a fresh round of check-ins */
        }
    }
}
// [endregion]

static void start(task_mem_t *m, TaskFunction_t fn, const char *name, UBaseType_t prio)
{
    (void)xTaskCreateStatic(fn, name, STACK_WORDS, NULL, prio, m->stack, &m->tcb);
}

int main(void)
{
    const clock_status_t clk = clock_init_72mhz();
    uart_log_init(115200U);
    led_init();
    NVIC_SetPriorityGrouping(0U);
    s_reset_cause = tl_hw_reset_cause();                    /* TL-REQ-010 */
    uart_puts("\nTurnLight stage 2 (FreeRTOS), reset cause: ");
    uart_puts(tl_reset_name(s_reset_cause));
    uart_puts((clk == CLOCK_OK) ? "\n" : ", clock fault\n");
    if (!tl_hw_init())
    {
        uart_puts("dem: TL_E_ADC_INIT failed\n");
    }
    if (!can_init(CAN_BTR_500K_36MHZ, CAN_MODE_NORMAL))    /* its RX interrupt runs at priority 5 */
    {
        uart_puts("dem: TL_E_CAN_INIT failed\n");
    }
    s_events = xQueueCreateStatic(8U, sizeof(input_event_t), s_events_buf, &s_events_cb);
    s_mailbox = xQueueCreateStatic(1U, sizeof(snapshot_t), s_mailbox_buf, &s_mailbox_cb);
    s_flags = xEventGroupCreateStatic(&s_flags_cb);
    s_alive = xEventGroupCreateStatic(&s_alive_cb);
    s_log = xSemaphoreCreateMutexStatic(&s_log_cb);
    start(&s_lamp_mem, lamp_task, "lamp", 4U);
    start(&s_input_mem, input_task, "input", 3U);
    start(&s_logic_mem, logic_task, "logic", 3U);
    start(&s_can_mem, can_task, "can", 2U);
    start(&s_sup_mem, supervisor_task, "supervisor", 1U);
    tl_hw_wdg_start();
    vTaskStartScheduler();
    for (;;)
    {
    }
}

/* ------------------------------------------------------------------ kernel hooks */
static StaticTask_t s_idle_tcb, s_timer_tcb;
static StackType_t s_idle_stack[configMINIMAL_STACK_SIZE], s_timer_stack[configTIMER_TASK_STACK_DEPTH];

void vApplicationGetIdleTaskMemory(StaticTask_t **tcb, StackType_t **stack, configSTACK_DEPTH_TYPE *words)
{
    *tcb = &s_idle_tcb;
    *stack = s_idle_stack;
    *words = configMINIMAL_STACK_SIZE;
}

void vApplicationGetTimerTaskMemory(StaticTask_t **tcb, StackType_t **stack, configSTACK_DEPTH_TYPE *words)
{
    *tcb = &s_timer_tcb;
    *stack = s_timer_stack;
    *words = configTIMER_TASK_STACK_DEPTH;
}

void vApplicationStackOverflowHook(TaskHandle_t task, char *name)
{
    (void)task;
    taskDISABLE_INTERRUPTS();
    uart_puts("\n*** stack overflow in task ");
    uart_puts(name);
    uart_puts("\n");
    for (;;)
    {
    }
}

void rtos_assert_failed(const char *file, int line)
{
    taskDISABLE_INTERRUPTS();
    uart_puts("\n*** configASSERT failed: ");
    uart_puts(file);
    uart_puts(":");
    uart_put_dec((uint32_t)line);
    uart_puts("\n");
    for (;;)
    {
    }
}
