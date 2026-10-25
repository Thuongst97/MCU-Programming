/* SPDX-License-Identifier: MIT
 * Startup code for the STM32G474 (NUCLEO-G474RE), written in C (CLAUDE.md rule 21).
 *
 * At reset the Cortex-M4 loads the stack pointer from the first word of the vector table and
 * jumps to the address in the second word, Reset_Handler. Reset_Handler switches the FPU on,
 * prepares memory the way the C language promises it (initialised globals have their values,
 * the rest are zero) and calls main().
 *
 * MISRA C:2012 deviations in this file (documented, intentional):
 *   Rule 11.1 / 11.6: the first vector-table entry is an address (the initial stack pointer)
 *   stored in a table of function pointers, which is what the hardware requires.
 *   Rule 8.4 / Dir 4.6: linker symbols are declared here, not in a header.
 */
#include <stdint.h>
#include "stm32g474xx.h"

/* Symbols defined by the linker script (stm32g474re.ld). Only their addresses matter. */
extern uint32_t _sidata[];   /* start of .data's initial values in flash (LMA) */
extern uint32_t _sdata[];    /* start of .data in RAM (VMA) */
extern uint32_t _edata[];    /* end of .data in RAM */
extern uint32_t _sbss[];     /* start of .bss */
extern uint32_t _ebss[];     /* end of .bss */
extern uint32_t _estack[];   /* top of SRAM1 + SRAM2: initial main stack pointer */

/* CPACR: coprocessors CP10 and CP11 are the FPU. Each has a 2-bit access field at bits
 * 2n+1:2n; 0b11 = full access (PM0214, "Coprocessor access control register"). CMSIS
 * names the register (SCB->CPACR) but not these fields. */
#define CPACR_CP10_FULL (3UL << (10U * 2U))
#define CPACR_CP11_FULL (3UL << (11U * 2U))

int main(void);
void SystemInit(void);
void Reset_Handler(void);
void Default_Handler(void);

void Reset_Handler(void)
{
    // [region:fpu]
    /* 0. Enable the FPU before any code that might use a floating-point register. The build
     *    uses -mfloat-abi=hard, so the compiler may emit FPU instructions anywhere in C code;
     *    one before this line would raise a UsageFault (NOCP). */
    SCB->CPACR |= CPACR_CP10_FULL | CPACR_CP11_FULL;   // «1»
    __DSB();
    __ISB();                                           /* the next instruction sees the change */
    // [endregion]
    /* 1. Copy initial values of .data from flash to RAM. */
    const uint32_t *src = _sidata;
    for (uint32_t *dst = _sdata; dst < _edata; ++dst, ++src)
    {
        *dst = *src;
    }
    /* 2. Zero .bss. */
    for (uint32_t *dst = _sbss; dst < _ebss; ++dst)
    {
        *dst = 0U;
    }
    /* 3. Minimal system setup (vector table location, SystemCoreClock). */
    SystemInit();
    /* 4. Run the application. main() is not expected to return. */
    (void)main();
    for (;;)
    {
    }
}

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
#define WEAK_ALIAS __attribute__((weak, alias("Default_Handler")))
void NMI_Handler(void) WEAK_ALIAS;
void HardFault_Handler(void) WEAK_ALIAS;
void MemManage_Handler(void) WEAK_ALIAS;
void BusFault_Handler(void) WEAK_ALIAS;
void UsageFault_Handler(void) WEAK_ALIAS;
void SVC_Handler(void) WEAK_ALIAS;
void DebugMon_Handler(void) WEAK_ALIAS;
void PendSV_Handler(void) WEAK_ALIAS;
void SysTick_Handler(void) WEAK_ALIAS;
void WWDG_IRQHandler(void) WEAK_ALIAS;
void PVD_PVM_IRQHandler(void) WEAK_ALIAS;
void RTC_TAMP_LSECSS_IRQHandler(void) WEAK_ALIAS;
void RTC_WKUP_IRQHandler(void) WEAK_ALIAS;
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
void USB_HP_IRQHandler(void) WEAK_ALIAS;
void USB_LP_IRQHandler(void) WEAK_ALIAS;
void FDCAN1_IT0_IRQHandler(void) WEAK_ALIAS;
void FDCAN1_IT1_IRQHandler(void) WEAK_ALIAS;
void EXTI9_5_IRQHandler(void) WEAK_ALIAS;
void TIM1_BRK_TIM15_IRQHandler(void) WEAK_ALIAS;
void TIM1_UP_TIM16_IRQHandler(void) WEAK_ALIAS;
void TIM1_TRG_COM_TIM17_IRQHandler(void) WEAK_ALIAS;
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
void TIM8_BRK_IRQHandler(void) WEAK_ALIAS;
void TIM8_UP_IRQHandler(void) WEAK_ALIAS;
void TIM8_TRG_COM_IRQHandler(void) WEAK_ALIAS;
void TIM8_CC_IRQHandler(void) WEAK_ALIAS;
void ADC3_IRQHandler(void) WEAK_ALIAS;
void FMC_IRQHandler(void) WEAK_ALIAS;
void LPTIM1_IRQHandler(void) WEAK_ALIAS;
void TIM5_IRQHandler(void) WEAK_ALIAS;
void SPI3_IRQHandler(void) WEAK_ALIAS;
void UART4_IRQHandler(void) WEAK_ALIAS;
void UART5_IRQHandler(void) WEAK_ALIAS;
void TIM6_DAC_IRQHandler(void) WEAK_ALIAS;
void TIM7_DAC_IRQHandler(void) WEAK_ALIAS;
void DMA2_Channel1_IRQHandler(void) WEAK_ALIAS;
void DMA2_Channel2_IRQHandler(void) WEAK_ALIAS;
void DMA2_Channel3_IRQHandler(void) WEAK_ALIAS;
void DMA2_Channel4_IRQHandler(void) WEAK_ALIAS;
void DMA2_Channel5_IRQHandler(void) WEAK_ALIAS;
void ADC4_IRQHandler(void) WEAK_ALIAS;
void ADC5_IRQHandler(void) WEAK_ALIAS;
void UCPD1_IRQHandler(void) WEAK_ALIAS;
void COMP1_2_3_IRQHandler(void) WEAK_ALIAS;
void COMP4_5_6_IRQHandler(void) WEAK_ALIAS;
void COMP7_IRQHandler(void) WEAK_ALIAS;
void HRTIM1_Master_IRQHandler(void) WEAK_ALIAS;
void HRTIM1_TIMA_IRQHandler(void) WEAK_ALIAS;
void HRTIM1_TIMB_IRQHandler(void) WEAK_ALIAS;
void HRTIM1_TIMC_IRQHandler(void) WEAK_ALIAS;
void HRTIM1_TIMD_IRQHandler(void) WEAK_ALIAS;
void HRTIM1_TIME_IRQHandler(void) WEAK_ALIAS;
void HRTIM1_FLT_IRQHandler(void) WEAK_ALIAS;
void HRTIM1_TIMF_IRQHandler(void) WEAK_ALIAS;
void CRS_IRQHandler(void) WEAK_ALIAS;
void SAI1_IRQHandler(void) WEAK_ALIAS;
void TIM20_BRK_IRQHandler(void) WEAK_ALIAS;
void TIM20_UP_IRQHandler(void) WEAK_ALIAS;
void TIM20_TRG_COM_IRQHandler(void) WEAK_ALIAS;
void TIM20_CC_IRQHandler(void) WEAK_ALIAS;
void FPU_IRQHandler(void) WEAK_ALIAS;
void I2C4_EV_IRQHandler(void) WEAK_ALIAS;
void I2C4_ER_IRQHandler(void) WEAK_ALIAS;
void SPI4_IRQHandler(void) WEAK_ALIAS;
void FDCAN2_IT0_IRQHandler(void) WEAK_ALIAS;
void FDCAN2_IT1_IRQHandler(void) WEAK_ALIAS;
void FDCAN3_IT0_IRQHandler(void) WEAK_ALIAS;
void FDCAN3_IT1_IRQHandler(void) WEAK_ALIAS;
void RNG_IRQHandler(void) WEAK_ALIAS;
void LPUART1_IRQHandler(void) WEAK_ALIAS;
void I2C3_EV_IRQHandler(void) WEAK_ALIAS;
void I2C3_ER_IRQHandler(void) WEAK_ALIAS;
void DMAMUX_OVR_IRQHandler(void) WEAK_ALIAS;
void QUADSPI_IRQHandler(void) WEAK_ALIAS;
void DMA1_Channel8_IRQHandler(void) WEAK_ALIAS;
void DMA2_Channel6_IRQHandler(void) WEAK_ALIAS;
void DMA2_Channel7_IRQHandler(void) WEAK_ALIAS;
void DMA2_Channel8_IRQHandler(void) WEAK_ALIAS;
void CORDIC_IRQHandler(void) WEAK_ALIAS;
void FMAC_IRQHandler(void) WEAK_ALIAS;


typedef void (*vector_t)(void);

/* The vector table: 16 Cortex-M4 system entries, then the 102 STM32G474 interrupt slots
 * (IRQ 0..101), in the order of IRQn_Type in stm32g474xx.h. Reserved slots are 0. */
__attribute__((section(".isr_vector"), used))
const vector_t g_vector_table[16 + 102] = {
    (vector_t)(uintptr_t)_estack,   /* 0: initial main stack pointer (MSP) */
    Reset_Handler,                  /* 1: reset */
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

    WWDG_IRQHandler,                /* IRQ 0 */
    PVD_PVM_IRQHandler,             /* IRQ 1 */
    RTC_TAMP_LSECSS_IRQHandler,     /* IRQ 2 */
    RTC_WKUP_IRQHandler,            /* IRQ 3 */
    FLASH_IRQHandler,               /* IRQ 4 */
    RCC_IRQHandler,                 /* IRQ 5 */
    EXTI0_IRQHandler,               /* IRQ 6 */
    EXTI1_IRQHandler,               /* IRQ 7 */
    EXTI2_IRQHandler,               /* IRQ 8 */
    EXTI3_IRQHandler,               /* IRQ 9 */
    EXTI4_IRQHandler,               /* IRQ 10 */
    DMA1_Channel1_IRQHandler,       /* IRQ 11 */
    DMA1_Channel2_IRQHandler,       /* IRQ 12 */
    DMA1_Channel3_IRQHandler,       /* IRQ 13 */
    DMA1_Channel4_IRQHandler,       /* IRQ 14 */
    DMA1_Channel5_IRQHandler,       /* IRQ 15 */
    DMA1_Channel6_IRQHandler,       /* IRQ 16 */
    DMA1_Channel7_IRQHandler,       /* IRQ 17 */
    ADC1_2_IRQHandler,              /* IRQ 18 */
    USB_HP_IRQHandler,              /* IRQ 19 */
    USB_LP_IRQHandler,              /* IRQ 20 */
    FDCAN1_IT0_IRQHandler,          /* IRQ 21 */
    FDCAN1_IT1_IRQHandler,          /* IRQ 22 */
    EXTI9_5_IRQHandler,             /* IRQ 23 */
    TIM1_BRK_TIM15_IRQHandler,      /* IRQ 24 */
    TIM1_UP_TIM16_IRQHandler,       /* IRQ 25 */
    TIM1_TRG_COM_TIM17_IRQHandler,  /* IRQ 26 */
    TIM1_CC_IRQHandler,             /* IRQ 27 */
    TIM2_IRQHandler,                /* IRQ 28 */
    TIM3_IRQHandler,                /* IRQ 29 */
    TIM4_IRQHandler,                /* IRQ 30 */
    I2C1_EV_IRQHandler,             /* IRQ 31 */
    I2C1_ER_IRQHandler,             /* IRQ 32 */
    I2C2_EV_IRQHandler,             /* IRQ 33 */
    I2C2_ER_IRQHandler,             /* IRQ 34 */
    SPI1_IRQHandler,                /* IRQ 35 */
    SPI2_IRQHandler,                /* IRQ 36 */
    USART1_IRQHandler,              /* IRQ 37 */
    USART2_IRQHandler,              /* IRQ 38 */
    USART3_IRQHandler,              /* IRQ 39 */
    EXTI15_10_IRQHandler,           /* IRQ 40 */
    RTC_Alarm_IRQHandler,           /* IRQ 41 */
    USBWakeUp_IRQHandler,           /* IRQ 42 */
    TIM8_BRK_IRQHandler,            /* IRQ 43 */
    TIM8_UP_IRQHandler,             /* IRQ 44 */
    TIM8_TRG_COM_IRQHandler,        /* IRQ 45 */
    TIM8_CC_IRQHandler,             /* IRQ 46 */
    ADC3_IRQHandler,                /* IRQ 47 */
    FMC_IRQHandler,                 /* IRQ 48 */
    LPTIM1_IRQHandler,              /* IRQ 49 */
    TIM5_IRQHandler,                /* IRQ 50 */
    SPI3_IRQHandler,                /* IRQ 51 */
    UART4_IRQHandler,               /* IRQ 52 */
    UART5_IRQHandler,               /* IRQ 53 */
    TIM6_DAC_IRQHandler,            /* IRQ 54 */
    TIM7_DAC_IRQHandler,            /* IRQ 55 */
    DMA2_Channel1_IRQHandler,       /* IRQ 56 */
    DMA2_Channel2_IRQHandler,       /* IRQ 57 */
    DMA2_Channel3_IRQHandler,       /* IRQ 58 */
    DMA2_Channel4_IRQHandler,       /* IRQ 59 */
    DMA2_Channel5_IRQHandler,       /* IRQ 60 */
    ADC4_IRQHandler,                /* IRQ 61 */
    ADC5_IRQHandler,                /* IRQ 62 */
    UCPD1_IRQHandler,               /* IRQ 63 */
    COMP1_2_3_IRQHandler,           /* IRQ 64 */
    COMP4_5_6_IRQHandler,           /* IRQ 65 */
    COMP7_IRQHandler,               /* IRQ 66 */
    HRTIM1_Master_IRQHandler,       /* IRQ 67 */
    HRTIM1_TIMA_IRQHandler,         /* IRQ 68 */
    HRTIM1_TIMB_IRQHandler,         /* IRQ 69 */
    HRTIM1_TIMC_IRQHandler,         /* IRQ 70 */
    HRTIM1_TIMD_IRQHandler,         /* IRQ 71 */
    HRTIM1_TIME_IRQHandler,         /* IRQ 72 */
    HRTIM1_FLT_IRQHandler,          /* IRQ 73 */
    HRTIM1_TIMF_IRQHandler,         /* IRQ 74 */
    CRS_IRQHandler,                 /* IRQ 75 */
    SAI1_IRQHandler,                /* IRQ 76 */
    TIM20_BRK_IRQHandler,           /* IRQ 77 */
    TIM20_UP_IRQHandler,            /* IRQ 78 */
    TIM20_TRG_COM_IRQHandler,       /* IRQ 79 */
    TIM20_CC_IRQHandler,            /* IRQ 80 */
    FPU_IRQHandler,                 /* IRQ 81 */
    I2C4_EV_IRQHandler,             /* IRQ 82 */
    I2C4_ER_IRQHandler,             /* IRQ 83 */
    SPI4_IRQHandler,                /* IRQ 84 */
    0,                              /* IRQ 85: reserved */
    FDCAN2_IT0_IRQHandler,          /* IRQ 86 */
    FDCAN2_IT1_IRQHandler,          /* IRQ 87 */
    FDCAN3_IT0_IRQHandler,          /* IRQ 88 */
    FDCAN3_IT1_IRQHandler,          /* IRQ 89 */
    RNG_IRQHandler,                 /* IRQ 90 */
    LPUART1_IRQHandler,             /* IRQ 91 */
    I2C3_EV_IRQHandler,             /* IRQ 92 */
    I2C3_ER_IRQHandler,             /* IRQ 93 */
    DMAMUX_OVR_IRQHandler,          /* IRQ 94 */
    QUADSPI_IRQHandler,             /* IRQ 95 */
    DMA1_Channel8_IRQHandler,       /* IRQ 96 */
    DMA2_Channel6_IRQHandler,       /* IRQ 97 */
    DMA2_Channel7_IRQHandler,       /* IRQ 98 */
    DMA2_Channel8_IRQHandler,       /* IRQ 99 */
    CORDIC_IRQHandler,              /* IRQ 100 */
    FMAC_IRQHandler,                /* IRQ 101 */

};

/* Compile-time guard: if the table ever gets out of step with the header, the build fails. */
_Static_assert(sizeof(g_vector_table) / sizeof(g_vector_table[0]) == 16U + (uint32_t)FMAC_IRQn + 1U,
               "vector table size must match IRQn_Type in stm32g474xx.h");
