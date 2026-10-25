/* SPDX-License-Identifier: MIT
 * FreeRTOS configuration for TurnLight stage 2 (same settings as example 10).
 * Static allocation only: no heap. */
#ifndef FREERTOS_CONFIG_H
#define FREERTOS_CONFIG_H

#include <stdint.h>
extern uint32_t SystemCoreClock;
void rtos_assert_failed(const char *file, int line);


#define configCPU_CLOCK_HZ                      (SystemCoreClock)   /* SysTick runs from HCLK */
#define configTICK_RATE_HZ                      1000U               /* 1 ms tick */
#define configUSE_PREEMPTION                    1                   /* higher priority runs at once */
#define configUSE_TIME_SLICING                  1
#define configMAX_PRIORITIES                    5
#define configMINIMAL_STACK_SIZE                128U                /* words, not bytes */
#define configMAX_TASK_NAME_LEN                 12
#define configUSE_16_BIT_TICKS                  0
#define configIDLE_SHOULD_YIELD                 1

#define configSUPPORT_STATIC_ALLOCATION         1                   /* every object in our own arrays */
#define configSUPPORT_DYNAMIC_ALLOCATION        0                   /* no heap at all */

#define configUSE_MUTEXES                       1
#define configUSE_COUNTING_SEMAPHORES           1
#define configQUEUE_REGISTRY_SIZE               0
#define configUSE_TIMERS                        1
#define configTIMER_TASK_PRIORITY               (configMAX_PRIORITIES - 1)
#define configTIMER_QUEUE_LENGTH                4
#define configTIMER_TASK_STACK_DEPTH            configMINIMAL_STACK_SIZE

#define configCHECK_FOR_STACK_OVERFLOW          2                   /* check a pattern at every switch */
#define configUSE_IDLE_HOOK                     0
#define configUSE_TICK_HOOK                     0
#define configUSE_MALLOC_FAILED_HOOK            0

/* Cortex-M interrupt priorities: the F103 implements 4 priority bits (stm32f103xb.h). */
#define configPRIO_BITS                         4
#define configKERNEL_INTERRUPT_PRIORITY         (15U << (8U - configPRIO_BITS))   /* lowest */
#define configMAX_SYSCALL_INTERRUPT_PRIORITY    (5U << (8U - configPRIO_BITS))    /* 0..4: never masked, no FreeRTOS API */

#define configASSERT(x) do { if ((x) == 0) { rtos_assert_failed(__FILE__, __LINE__); } } while (0)

/* The port's handlers get the CMSIS names, so they fill the vector table directly. */
#define vPortSVCHandler     SVC_Handler
#define xPortPendSVHandler  PendSV_Handler
#define xPortSysTickHandler SysTick_Handler


#define INCLUDE_vTaskDelay                      1
#define INCLUDE_xTaskDelayUntil                 1
#define INCLUDE_uxTaskGetStackHighWaterMark     1
#define INCLUDE_xTaskGetSchedulerState          1
#define INCLUDE_vTaskSuspend                    1

#endif
