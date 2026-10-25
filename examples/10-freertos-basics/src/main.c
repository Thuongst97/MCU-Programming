/* SPDX-License-Identifier: MIT
 * Example 10: FreeRTOS on the Blue Pill. Five tasks, a queue, a mutex around the UART, a binary
 * semaphore given from an interrupt, stack high-water marks and overflow detection.
 * Every kernel object is allocated statically. RM0008 for the peripherals, FreeRTOS reference
 * manual for the kernel API.
 */
#include <stdint.h>
#include "stm32f103xb.h"
#include "FreeRTOS.h"
#include "queue.h"
#include "semphr.h"
#include "task.h"
#include "timers.h"
#include "clock.h"
#include "led.h"
#include "uart_log.h"

#define STACK_WORDS 192U

typedef struct
{
    StaticTask_t tcb;
    StackType_t stack[STACK_WORDS];
    TaskHandle_t handle;
} task_slot_t;

static task_slot_t s_sensor, s_logger, s_blink, s_monitor, s_button;

static StaticQueue_t s_queue_cb;
static uint16_t s_queue_storage[16];
static QueueHandle_t s_samples;

static StaticSemaphore_t s_uart_mutex_cb, s_button_sem_cb;
static SemaphoreHandle_t s_uart_mutex, s_button_sem;

// [region:print]
/* Several tasks print. The mutex makes each line atomic; without it, lines interleave
 * character by character when a higher-priority task preempts a lower one mid-line. */
static void log_line(const char *a, uint32_t v, const char *b)
{
    if (xSemaphoreTake(s_uart_mutex, pdMS_TO_TICKS(100)) == pdTRUE)                               // «1»
    {
        uart_puts(a);
        uart_put_dec(v);
        uart_puts(b);
        xSemaphoreGive(s_uart_mutex);
    }
}
// [endregion]

// [region:tasks]
static void sensor_task(void *arg)
{
    (void)arg;
    TickType_t wake = xTaskGetTickCount();
    uint16_t sample = 0U;
    for (;;)
    {
        vTaskDelayUntil(&wake, pdMS_TO_TICKS(10));          /* exactly every 10 ms, no drift */    // «2»
        sample = (uint16_t)((sample + 37U) % 1000U);        /* stand-in for an ADC reading */
        (void)xQueueSend(s_samples, &sample, 0);            /* never block a periodic task */      // «3»
    }
}

static void logger_task(void *arg)
{
    (void)arg;
    uint32_t sum = 0U, n = 0U;
    for (;;)
    {
        uint16_t s;
        if (xQueueReceive(s_samples, &s, portMAX_DELAY) == pdTRUE)   /* sleeps until data */      // «4»
        {
            sum += s;
            if (++n == 100U)
            {
                log_line("logger: mean of 100 samples = ", sum / n, "\n");
                sum = 0U;
                n = 0U;
            }
        }
    }
}

static void blink_task(void *arg)
{
    (void)arg;
    for (;;)
    {
        led_toggle();
        vTaskDelay(pdMS_TO_TICKS(500));                                                             // «5»
    }
}

static void button_task(void *arg)
{
    (void)arg;
    uint32_t presses = 0U;
    for (;;)
    {
        if (xSemaphoreTake(s_button_sem, portMAX_DELAY) == pdTRUE)   /* woken by the ISR */        // «6»
        {
            log_line("button: press ", ++presses, " (semaphore given from EXTI0 ISR)\n");
        }
    }
}

static void monitor_task(void *arg)
{
    (void)arg;
    for (;;)
    {
        vTaskDelay(pdMS_TO_TICKS(2000));
        if (xSemaphoreTake(s_uart_mutex, pdMS_TO_TICKS(100)) == pdTRUE)   /* one line, one lock */
        {
            uart_puts("monitor: free stack words: sensor ");
            uart_put_dec((uint32_t)uxTaskGetStackHighWaterMark(s_sensor.handle));                  // «7»
            uart_puts(", logger ");
            uart_put_dec((uint32_t)uxTaskGetStackHighWaterMark(s_logger.handle));
            uart_puts(", monitor ");
            uart_put_dec((uint32_t)uxTaskGetStackHighWaterMark(NULL));
            uart_puts("\n");
            xSemaphoreGive(s_uart_mutex);
        }
    }
}
// [endregion]

// [region:isr]
void EXTI0_IRQHandler(void);
void EXTI0_IRQHandler(void)
{
    EXTI->PR = EXTI_PR_PR0;
    BaseType_t woken = pdFALSE;
    xSemaphoreGiveFromISR(s_button_sem, &woken);            /* only FromISR APIs in an ISR */     // «8»
    portYIELD_FROM_ISR(woken);                              /* switch now if a task got ready */   // «9»
}
// [endregion]

static void button_init(void)
{
    RCC->APB2ENR |= RCC_APB2ENR_IOPAEN | RCC_APB2ENR_AFIOEN;
    GPIOA->CRL = (GPIOA->CRL & ~(GPIO_CRL_CNF0 | GPIO_CRL_MODE0)) | GPIO_CRL_CNF0_1;
    GPIOA->BSRR = GPIO_BSRR_BS0;
    AFIO->EXTICR[0] = (AFIO->EXTICR[0] & ~AFIO_EXTICR1_EXTI0) | AFIO_EXTICR1_EXTI0_PA;
    EXTI->FTSR |= EXTI_FTSR_TR0;
    EXTI->PR = EXTI_PR_PR0;
    EXTI->IMR |= EXTI_IMR_MR0;
    NVIC_SetPriority(EXTI0_IRQn, 6U);                       /* 6 >= configMAX_SYSCALL (5): may use FromISR */ // «10»
    NVIC_EnableIRQ(EXTI0_IRQn);
}

static void start(task_slot_t *t, TaskFunction_t fn, const char *name, UBaseType_t prio)
{
    t->handle = xTaskCreateStatic(fn, name, STACK_WORDS, NULL, prio, t->stack, &t->tcb);
}

// [region:main]
int main(void)
{
    (void)clock_init_72mhz();
    uart_log_init(115200U);
    led_init();
    NVIC_SetPriorityGrouping(0U);                           /* all 4 bits = preemption priority */ // «11»
    uart_puts("Example 10: FreeRTOS, 5 tasks, static allocation\n");

    s_samples = xQueueCreateStatic(16U, sizeof(uint16_t), (uint8_t *)s_queue_storage, &s_queue_cb);
    s_uart_mutex = xSemaphoreCreateMutexStatic(&s_uart_mutex_cb);
    s_button_sem = xSemaphoreCreateBinaryStatic(&s_button_sem_cb);
    start(&s_sensor, sensor_task, "sensor", 3U);            /* highest: hard 10 ms period */       // «12»
    start(&s_button, button_task, "button", 2U);
    start(&s_logger, logger_task, "logger", 1U);
    start(&s_blink, blink_task, "blink", 1U);
    start(&s_monitor, monitor_task, "monitor", 1U);
    button_init();

    vTaskStartScheduler();                                  /* never returns */                   // «13»
    for (;;)
    {
    }
}
// [endregion]

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

// [region:hooks]
void vApplicationStackOverflowHook(TaskHandle_t task, char *name)
{
    (void)task;
    taskDISABLE_INTERRUPTS();
    uart_puts("\n*** stack overflow in task ");                                                    // «14»
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
// [endregion]
