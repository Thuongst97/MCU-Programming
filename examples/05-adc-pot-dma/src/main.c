/* SPDX-License-Identifier: MIT
 * Example 05: read a potentiometer on PA1 (Arduino A1) with ADC1. Part 1 converts single
 * samples by polling; part 2 lets the ADC scan PA1 and the internal reference continuously
 * while DMA1 channel 1 copies every result into a circular buffer, and main() only averages it.
 * RM0440 chapters ADC, DMA and DMAMUX.
 */
#include <stdbool.h>
#include <stdint.h>
#include "stm32g474xx.h"
#include "adcmath.h"
#include "clock.h"
#include "gpio.h"
#include "systick.h"
#include "uart_log.h"

#define WAIT_LOOPS 100000U
#define SAMPLES    32U                  /* pairs of (PA1, Vrefint) in the DMA buffer */
#define CH_POT     2U                   /* PA1 = ADC1_IN2 (DS12288 pinout; ST's pin data) */
#define CH_VREFINT 18U                  /* internal reference on ADC1 (RM0440 "ADC") */
#define DMAMUX_REQ_ADC1 5U              /* DMAMUX request ID of ADC1 (RM0440 "DMAMUX" table) */
/* Factory Vrefint reading, 16 bits in system memory (RM0440/DS12288; same address as ST's LL). */
#define VREFINT_CAL_ADDR ((const volatile uint16_t *)0x1FFF75AAUL)

static volatile uint16_t s_buf[2U * SAMPLES];

static bool wait_flag(volatile const uint32_t *reg, uint32_t mask, uint32_t want)
{
    for (uint32_t n = 0U; n < WAIT_LOOPS; ++n)
    {
        if ((*reg & mask) == want)
        {
            return true;
        }
    }
    return false;
}

// [region:init]
static bool adc_init(void)
{
    RCC->AHB2ENR |= RCC_AHB2ENR_ADC12EN;                              /* ADC1 and ADC2 share a clock */   // «1»
    (void)RCC->AHB2ENR;
    gpio_clock_on(GPIOA);
    gpio_mode(GPIOA, 1U, BSP_GPIO_ANALOG);                            /* PA1: analog (also the reset state) */ // «2»
    ADC12_COMMON->CCR = ADC_CCR_CKMODE_1 | ADC_CCR_CKMODE_0           /* clock = HCLK / 4 = 42.5 MHz */
                      | ADC_CCR_VREFEN;                               /* switch Vrefint on */

    ADC1->CR &= ~ADC_CR_DEEPPWD;                                      /* 1. leave deep power-down */      // «3»
    ADC1->CR |= ADC_CR_ADVREGEN;                                      /* 2. start the ADC's regulator */
    delay_ms(1U);                                                     /*    needs 20 us; 1 ms is plenty */
    ADC1->CR &= ~ADC_CR_ADCALDIF;                                     /* 3. calibrate, single-ended */     // «4»
    ADC1->CR |= ADC_CR_ADCAL;
    if (!wait_flag(&ADC1->CR, ADC_CR_ADCAL, 0U))
    {
        return false;
    }
    ADC1->SMPR1 = 7U << ADC_SMPR1_SMP2_Pos;                           /* 640.5 cycles for PA1 */           // «5»
    ADC1->SMPR2 = 7U << ADC_SMPR2_SMP18_Pos;                          /* and for Vrefint */
    ADC1->ISR = ADC_ISR_ADRDY;                                        /* write 1 to clear */
    ADC1->CR |= ADC_CR_ADEN;                                          /* 4. enable, wait until ready */
    return wait_flag(&ADC1->ISR, ADC_ISR_ADRDY, ADC_ISR_ADRDY);
}
// [endregion]

// [region:single]
static uint32_t adc_read(uint32_t channel)
{
    ADC1->SQR1 = (0U << ADC_SQR1_L_Pos)                               /* L = 0: one conversion */
               | (channel << ADC_SQR1_SQ1_Pos);                       /* SQ1 = channel */                  // «6»
    ADC1->CR |= ADC_CR_ADSTART;                                                                            // «7»
    for (uint32_t n = 0U; n < WAIT_LOOPS; ++n)
    {
        if ((ADC1->ISR & ADC_ISR_EOC) != 0U)
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
    RCC->AHB1ENR |= RCC_AHB1ENR_DMA1EN | RCC_AHB1ENR_DMAMUX1EN;
    (void)RCC->AHB1ENR;
    DMAMUX1_Channel0->CCR = DMAMUX_REQ_ADC1 << DMAMUX_CxCR_DMAREQ_ID_Pos; /* DMA1 ch1 <- ADC1 requests */  // «9»
    DMA1_Channel1->CCR = 0U;                                          /* channel off while configuring */
    DMA1_Channel1->CPAR = (uint32_t)&ADC1->DR;                        /* from: the ADC data register */
    DMA1_Channel1->CMAR = (uint32_t)s_buf;                            /* to: our buffer (in SRAM1, not CCM) */
    DMA1_Channel1->CNDTR = 2U * SAMPLES;                              /* items before wrapping */
    DMA1_Channel1->CCR = DMA_CCR_MINC | DMA_CCR_CIRC                  /* memory++, circular */            // «10»
                       | DMA_CCR_PSIZE_0 | DMA_CCR_MSIZE_0            /* 16-bit both sides */
                       | DMA_CCR_EN;

    ADC1->SQR1 = (1U << ADC_SQR1_L_Pos)                               /* L = 1: two conversions */         // «11»
               | (CH_POT << ADC_SQR1_SQ1_Pos) | (CH_VREFINT << ADC_SQR1_SQ2_Pos);
    ADC1->CFGR = ADC_CFGR_CONT                                        /* forever */                       // «12»
               | ADC_CFGR_DMAEN | ADC_CFGR_DMACFG                     /* one DMA request each, circular */
               | ADC_CFGR_OVRMOD;                                     /* keep the newest on overrun */
    ADC1->CR |= ADC_CR_ADSTART;
}
// [endregion]

int main(void)
{
    (void)clock_init_170mhz();
    systick_init_1ms();
    uart_log_init(115200U);
    uart_puts("Example 05: ADC1 on PA1 (A1, pot), Vrefint, DMA\n");
    if (!adc_init())
    {
        uart_puts("ADC calibration timed out\n");
    }

    const uint32_t cal = *VREFINT_CAL_ADDR;   /* factory Vrefint reading at VDDA = 3.0 V */

    /* Part 1: single conversions, polled. */
    for (uint32_t i = 0U; i < 3U; ++i)
    {
        const uint32_t vref = adc_read(CH_VREFINT);
        const uint32_t raw = adc_read(CH_POT);
        uart_puts("single: PA1 raw ");
        uart_put_dec(raw);
        uart_puts(", ");
        uart_put_dec(adc_pin_mv(raw, vref, cal));
        uart_puts(" mV (VDDA ");
        uart_put_dec(adc_vdda_mv(vref, cal));
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
        uart_put_dec(adc_pin_mv(pot, vref, cal));
        uart_puts(" mV over ");
        uart_put_dec(SAMPLES);
        uart_puts(" samples\n");
    }
    // [endregion]
}
