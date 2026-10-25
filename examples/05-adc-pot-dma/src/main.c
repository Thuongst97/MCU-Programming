/* SPDX-License-Identifier: MIT
 * Example 05: read a potentiometer on PA1 with ADC1. Part 1 converts single samples by polling;
 * part 2 lets the ADC scan PA1 and the internal reference continuously while DMA1 channel 1
 * copies every result into a circular buffer, and main() only averages it.
 * RM0008 chapter 11 (ADC) and chapter 13 (DMA).
 */
#include <stdbool.h>
#include <stdint.h>
#include "stm32f103xb.h"
#include "adcmath.h"
#include "clock.h"
#include "systick.h"
#include "uart_log.h"

#define WAIT_LOOPS 100000U
#define SAMPLES    32U                  /* pairs of (PA1, Vrefint) in the DMA buffer */

static volatile uint16_t s_buf[2U * SAMPLES];

static bool wait_clear(volatile uint32_t *reg, uint32_t mask)
{
    for (uint32_t n = 0U; n < WAIT_LOOPS; ++n)
    {
        if ((*reg & mask) == 0U)
        {
            return true;
        }
    }
    return false;
}

// [region:init]
static bool adc_init(void)
{
    RCC->APB2ENR |= RCC_APB2ENR_IOPAEN | RCC_APB2ENR_ADC1EN;          /* ADC clock = PCLK2 / 6 = 12 MHz */ // «1»
    GPIOA->CRL &= ~(GPIO_CRL_MODE1 | GPIO_CRL_CNF1);                  /* PA1: analog input (0000) */       // «2»
    ADC1->SMPR2 = 7U << ADC_SMPR2_SMP1_Pos;                           /* 239.5 cycles for PA1 */           // «3»
    ADC1->SMPR1 = 7U << ADC_SMPR1_SMP17_Pos;                          /* and for Vrefint */
    ADC1->CR2 = ADC_CR2_ADON | ADC_CR2_TSVREFE                        /* power up, enable Vrefint */      // «4»
              | (7U << ADC_CR2_EXTSEL_Pos) | ADC_CR2_EXTTRIG;         /* trigger: SWSTART bit */
    delay_ms(1U);                                                     /* tSTAB, plus 2 ADC clocks before CAL */
    ADC1->CR2 |= ADC_CR2_RSTCAL;                                                                           // «5»
    if (!wait_clear(&ADC1->CR2, ADC_CR2_RSTCAL))
    {
        return false;
    }
    ADC1->CR2 |= ADC_CR2_CAL;                                         /* self-calibration */
    return wait_clear(&ADC1->CR2, ADC_CR2_CAL);
}
// [endregion]

// [region:single]
static uint32_t adc_read(uint32_t channel)
{
    ADC1->SQR1 = 0U;                                                  /* sequence length 1 */
    ADC1->SQR3 = channel;                                             /* SQ1 = channel */                  // «6»
    ADC1->CR2 |= ADC_CR2_SWSTART;                                                                          // «7»
    for (uint32_t n = 0U; n < WAIT_LOOPS; ++n)
    {
        if ((ADC1->SR & ADC_SR_EOC) != 0U)
        {
            return ADC1->DR & 0xFFFU;                                 /* reading DR clears EOC */          // «8»
        }
    }
    return 0U;
}
// [endregion]

// [region:dma]
static void adc_dma_start(void)
{
    RCC->AHBENR |= RCC_AHBENR_DMA1EN;
    DMA1_Channel1->CCR = 0U;                                          /* channel off while configuring */
    DMA1_Channel1->CPAR = (uint32_t)&ADC1->DR;                        /* from: the ADC data register */   // «9»
    DMA1_Channel1->CMAR = (uint32_t)s_buf;                            /* to: our buffer */
    DMA1_Channel1->CNDTR = 2U * SAMPLES;                              /* items before wrapping */
    DMA1_Channel1->CCR = DMA_CCR_MINC | DMA_CCR_CIRC                  /* memory++, circular */            // «10»
                       | DMA_CCR_PSIZE_0 | DMA_CCR_MSIZE_0            /* 16-bit both sides */
                       | DMA_CCR_EN;

    ADC1->CR1 = ADC_CR1_SCAN;                                         /* convert the whole sequence */    // «11»
    ADC1->SQR1 = 1U << ADC_SQR1_L_Pos;                                /* L = 1: two conversions */
    ADC1->SQR3 = (1U << ADC_SQR3_SQ1_Pos) | (17U << ADC_SQR3_SQ2_Pos); /* PA1, then Vrefint */
    ADC1->CR2 |= ADC_CR2_CONT | ADC_CR2_DMA;                          /* forever, one DMA request each */ // «12»
    ADC1->CR2 |= ADC_CR2_SWSTART;
}
// [endregion]

int main(void)
{
    (void)clock_init_72mhz();
    systick_init_1ms();
    uart_log_init(115200U);
    uart_puts("Example 05: ADC1 on PA1 (pot), Vrefint, DMA\n");
    if (!adc_init())
    {
        uart_puts("ADC calibration timed out\n");
    }

    /* Part 1: single conversions, polled. */
    for (uint32_t i = 0U; i < 3U; ++i)
    {
        const uint32_t vref = adc_read(17U);
        const uint32_t raw = adc_read(1U);
        uart_puts("single: PA1 raw ");
        uart_put_dec(raw);
        uart_puts(", ");
        uart_put_dec(adc_pin_mv(raw, vref));
        uart_puts(" mV (VDDA ");
        uart_put_dec(adc_vdda_mv(vref));
        uart_puts(" mV)\n");
        delay_ms(200U);
    }

    /* Part 2: continuous scan + circular DMA; the CPU only averages. */
    adc_dma_start();
    // [region:main]
    for (;;)
    {
        delay_ms(500U);
        const uint32_t pot = adc_mean(s_buf, 2U * SAMPLES, 0U, 2U);   /* even slots: PA1 */                // «13»
        const uint32_t vref = adc_mean(s_buf, 2U * SAMPLES, 1U, 2U);  /* odd slots: Vrefint */
        if (vref == 0U)
        {
            uart_puts("dma: no samples yet (no DMA transfers)\n");                                         // «14»
            continue;
        }
        uart_puts("dma: PA1 mean ");
        uart_put_dec(pot);
        uart_puts(" = ");
        uart_put_dec(adc_pin_mv(pot, vref));
        uart_puts(" mV over ");
        uart_put_dec(SAMPLES);
        uart_puts(" samples\n");
    }
    // [endregion]
}
