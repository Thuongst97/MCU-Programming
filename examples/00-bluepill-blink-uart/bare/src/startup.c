/* SPDX-License-Identifier: MIT
 * Startup code for the STM32F103 (medium density), written in C (CLAUDE.md rule 21).
 *
 * At reset the Cortex-M3 loads the stack pointer from the first word of the vector table and
 * jumps to the address in the second word, Reset_Handler. Reset_Handler then prepares memory
 * the way the C language promises it (initialised globals have their values, the rest are zero)
 * and calls main().
 *
 * MISRA C:2012 deviations in this file (documented, intentional):
 *   Rule 11.1 / 11.6: the first vector-table entry is an address (the initial stack pointer)
 *   stored in a table of function pointers, which is what the hardware requires.
 *   Rule 8.4 / Dir 4.6: linker symbols are declared here, not in a header.
 */
#include <stdint.h>
#include "stm32f103xb.h"

/* Symbols defined by the linker script (stm32f103c8_64k.ld). Only their addresses matter. */
extern uint32_t _sidata[];   /* start of .data's initial values in flash (LMA) */
extern uint32_t _sdata[];    /* start of .data in RAM (VMA) */
extern uint32_t _edata[];    /* end of .data in RAM */
extern uint32_t _sbss[];     /* start of .bss */
extern uint32_t _ebss[];     /* end of .bss */
extern uint32_t _estack[];   /* top of RAM: initial main stack pointer */

int main(void);
void SystemInit(void);
void Reset_Handler(void);
void Default_Handler(void);

// [region:reset]
void Reset_Handler(void)
{
    /* 1. Copy initial values of .data from flash to RAM. */
    const uint32_t *src = _sidata;                         // «1»
    for (uint32_t *dst = _sdata; dst < _edata; ++dst, ++src)
    {
        *dst = *src;
    }
    /* 2. Zero .bss. */
    for (uint32_t *dst = _sbss; dst < _ebss; ++dst)        // «2»
    {
        *dst = 0U;
    }
    /* 3. Minimal system setup (vector table location, SystemCoreClock). */
    SystemInit();                                          // «3»
    /* 4. Run the application. main() is not expected to return. */
    (void)main();                                          // «4»
    for (;;)
    {
    }
}
// [endregion]

/* Any interrupt without its own handler ends up here. Stopping (instead of returning) makes a
 * missing handler visible in the debugger: the PC sits in Default_Handler. */
void Default_Handler(void)
{
    for (;;)
    {
    }
}

/* Every handler is a weak alias of Default_Handler: define a function with the same name
 * anywhere in your program and the linker uses yours instead. */
// [region:weak]
#define WEAK_ALIAS __attribute__((weak, alias("Default_Handler")))   // «5»
void NMI_Handler(void) WEAK_ALIAS;
void HardFault_Handler(void) WEAK_ALIAS;
void MemManage_Handler(void) WEAK_ALIAS;
void BusFault_Handler(void) WEAK_ALIAS;
void UsageFault_Handler(void) WEAK_ALIAS;
void SVC_Handler(void) WEAK_ALIAS;
void DebugMon_Handler(void) WEAK_ALIAS;
void PendSV_Handler(void) WEAK_ALIAS;
void SysTick_Handler(void) WEAK_ALIAS;
// [endregion]
void WWDG_IRQHandler(void) WEAK_ALIAS;
void PVD_IRQHandler(void) WEAK_ALIAS;
void TAMPER_IRQHandler(void) WEAK_ALIAS;
void RTC_IRQHandler(void) WEAK_ALIAS;
void FLASH_IRQHandler(void) WEAK_ALIAS;
void RCC_IRQHandler(void) WEAK_ALIAS;
void EXTI0_IRQHandler(void) WEAK_ALIAS;
void EXTI1_IRQHandler(void) WEAK_ALIAS;
void EXTI2_IRQHandler(void) WEAK_ALIAS;
void EXTI3_IRQHandler(void) WEAK_ALIAS;
void EXTI4_IRQHandler(void) WEAK_ALIAS;
void DMA1_Channel1_IRQHandler(void) WEAK_ALIAS;
void DMA1_Channel2_IRQHandler(void) WEAK_ALIAS;
void DMA1_Channel3_IRQHandler(void) WEAK_ALIAS;
void DMA1_Channel4_IRQHandler(void) WEAK_ALIAS;
void DMA1_Channel5_IRQHandler(void) WEAK_ALIAS;
void DMA1_Channel6_IRQHandler(void) WEAK_ALIAS;
void DMA1_Channel7_IRQHandler(void) WEAK_ALIAS;
void ADC1_2_IRQHandler(void) WEAK_ALIAS;
void USB_HP_CAN1_TX_IRQHandler(void) WEAK_ALIAS;
void USB_LP_CAN1_RX0_IRQHandler(void) WEAK_ALIAS;
void CAN1_RX1_IRQHandler(void) WEAK_ALIAS;
void CAN1_SCE_IRQHandler(void) WEAK_ALIAS;
void EXTI9_5_IRQHandler(void) WEAK_ALIAS;
void TIM1_BRK_IRQHandler(void) WEAK_ALIAS;
void TIM1_UP_IRQHandler(void) WEAK_ALIAS;
void TIM1_TRG_COM_IRQHandler(void) WEAK_ALIAS;
void TIM1_CC_IRQHandler(void) WEAK_ALIAS;
void TIM2_IRQHandler(void) WEAK_ALIAS;
void TIM3_IRQHandler(void) WEAK_ALIAS;
void TIM4_IRQHandler(void) WEAK_ALIAS;
void I2C1_EV_IRQHandler(void) WEAK_ALIAS;
void I2C1_ER_IRQHandler(void) WEAK_ALIAS;
void I2C2_EV_IRQHandler(void) WEAK_ALIAS;
void I2C2_ER_IRQHandler(void) WEAK_ALIAS;
void SPI1_IRQHandler(void) WEAK_ALIAS;
void SPI2_IRQHandler(void) WEAK_ALIAS;
void USART1_IRQHandler(void) WEAK_ALIAS;
void USART2_IRQHandler(void) WEAK_ALIAS;
void USART3_IRQHandler(void) WEAK_ALIAS;
void EXTI15_10_IRQHandler(void) WEAK_ALIAS;
void RTC_Alarm_IRQHandler(void) WEAK_ALIAS;
void USBWakeUp_IRQHandler(void) WEAK_ALIAS;

typedef void (*vector_t)(void);

/* The vector table: 16 Cortex-M3 system entries, then the 43 STM32F103 interrupts (IRQ 0..42),
 * in the order of IRQn_Type in stm32f103xb.h. Reserved slots are 0. */
// [region:vectors]
__attribute__((section(".isr_vector"), used))                 // «6»
const vector_t g_vector_table[16 + 43] = {
    (vector_t)(uintptr_t)_estack,   /* 0: initial main stack pointer (MSP) */   // «7»
    Reset_Handler,                  /* 1: reset */                               // «8»
    NMI_Handler,                    /* 2 */
    HardFault_Handler,              /* 3 */
    MemManage_Handler,              /* 4 */
    BusFault_Handler,               /* 5 */
    UsageFault_Handler,             /* 6 */
    0, 0, 0, 0,                     /* 7-10: reserved */
    SVC_Handler,                    /* 11 */
    DebugMon_Handler,               /* 12 */
    0,                              /* 13: reserved */
    PendSV_Handler,                 /* 14 */
    SysTick_Handler,                /* 15 */
// [endregion]
    WWDG_IRQHandler,                /* IRQ 0 */
    PVD_IRQHandler,
    TAMPER_IRQHandler,
    RTC_IRQHandler,
    FLASH_IRQHandler,
    RCC_IRQHandler,
    EXTI0_IRQHandler,               /* IRQ 6 */
    EXTI1_IRQHandler,
    EXTI2_IRQHandler,
    EXTI3_IRQHandler,
    EXTI4_IRQHandler,
    DMA1_Channel1_IRQHandler,       /* IRQ 11 */
    DMA1_Channel2_IRQHandler,
    DMA1_Channel3_IRQHandler,
    DMA1_Channel4_IRQHandler,
    DMA1_Channel5_IRQHandler,
    DMA1_Channel6_IRQHandler,
    DMA1_Channel7_IRQHandler,
    ADC1_2_IRQHandler,              /* IRQ 18 */
    USB_HP_CAN1_TX_IRQHandler,      /* IRQ 19: shared by USB and CAN */
    USB_LP_CAN1_RX0_IRQHandler,     /* IRQ 20: shared by USB and CAN */
    CAN1_RX1_IRQHandler,
    CAN1_SCE_IRQHandler,
    EXTI9_5_IRQHandler,             /* IRQ 23 */
    TIM1_BRK_IRQHandler,
    TIM1_UP_IRQHandler,
    TIM1_TRG_COM_IRQHandler,
    TIM1_CC_IRQHandler,
    TIM2_IRQHandler,                /* IRQ 28 */
    TIM3_IRQHandler,
    TIM4_IRQHandler,
    I2C1_EV_IRQHandler,             /* IRQ 31 */
    I2C1_ER_IRQHandler,
    I2C2_EV_IRQHandler,
    I2C2_ER_IRQHandler,
    SPI1_IRQHandler,                /* IRQ 35 */
    SPI2_IRQHandler,
    USART1_IRQHandler,              /* IRQ 37 */
    USART2_IRQHandler,
    USART3_IRQHandler,
    EXTI15_10_IRQHandler,           /* IRQ 40 */
    RTC_Alarm_IRQHandler,
    USBWakeUp_IRQHandler,           /* IRQ 42 */
};

/* Compile-time guard: if the table ever gets out of step with the header, the build fails. */
// [region:guard]
_Static_assert(sizeof(g_vector_table) / sizeof(g_vector_table[0]) == 16U + (uint32_t)USBWakeUp_IRQn + 1U,
               "vector table size must match IRQn_Type in stm32f103xb.h");   // «10»
// [endregion]
