/* SPDX-License-Identifier: MIT */
#include "spi.h"

#include "stm32g474xx.h"
#include "gpio.h"

/* SPI2 on the Morpho header. SPI1 is avoided on purpose: its usual SCK pin PA5 drives LD2, and
 * its other SCK pin PB3 is the debugger's SWO line. */
#define AF_PB13_SPI2_SCK  5U   /* DS12288 alternate functions; checked by tools/check-pins.py */
#define AF_PB14_SPI2_MISO 5U
#define AF_PB15_SPI2_MOSI 5U
#define CS_PIN            12U  /* PB12: plain GPIO, driven by software */
#define DMAMUX_REQ_SPI2_RX 12U /* DMAMUX request IDs (RM0440 "DMAMUX" table) */
#define DMAMUX_REQ_SPI2_TX 13U
#define SPI_WAIT 100000U

// [region:init]
void spi_init(void)
{
    gpio_clock_on(GPIOB);
    RCC->APB1ENR1 |= RCC_APB1ENR1_SPI2EN;
    (void)RCC->APB1ENR1;
    GPIOB->BSRR = GPIO_BSRR_BS12;                                    /* CS idle high before it is an output */ // «1»
    gpio_mode(GPIOB, CS_PIN, BSP_GPIO_OUTPUT);
    gpio_af(GPIOB, 13U, AF_PB13_SPI2_SCK);                                                          // «2»
    gpio_af(GPIOB, 14U, AF_PB14_SPI2_MISO);
    gpio_af(GPIOB, 15U, AF_PB15_SPI2_MOSI);
    SPI2->CR1 = SPI_CR1_MSTR                                         /* master */                     // «3»
              | (4U << SPI_CR1_BR_Pos)                               /* fPCLK1 / 32 = 5.3 MHz */
              | SPI_CR1_SSM | SPI_CR1_SSI;                           /* software NSS, held "high" */  // «4»
              /* CPOL = 0, CPHA = 0: mode 0, which the W25Q supports (as well as mode 3) */
    SPI2->CR2 = (7U << SPI_CR2_DS_Pos)                               /* 8-bit frames (DS = 0111) */
              | SPI_CR2_FRXTH;                                       /* RXNE as soon as 1 byte is in */
    SPI2->CR1 |= SPI_CR1_SPE;
}
// [endregion]

// [region:xfer]
uint8_t spi_xfer(uint8_t out)
{
    for (uint32_t n = 0U; ((SPI2->SR & SPI_SR_TXE) == 0U) && (n < SPI_WAIT); ++n)
    {
    }
    *(volatile uint8_t *)&SPI2->DR = out;      /* 8-bit write: one frame (a 16-bit write would queue two) */ // «5»
    for (uint32_t n = 0U; ((SPI2->SR & SPI_SR_RXNE) == 0U) && (n < SPI_WAIT); ++n)
    {
    }
    return *(volatile uint8_t *)&SPI2->DR;     /* every sent byte clocks one in */                   // «6»
}

void spi_select(void)
{
    GPIOB->BSRR = GPIO_BSRR_BR12;
}

void spi_deselect(void)
{
    for (uint32_t n = 0U; ((SPI2->SR & SPI_SR_BSY) != 0U) && (n < SPI_WAIT); ++n)
    {
        /* the last byte may still be shifting out: raising CS now would cut it off */                // «7»
    }
    GPIOB->BSRR = GPIO_BSRR_BS12;
}
// [endregion]

// [region:dma]
bool spi_read_dma(uint8_t *buf, uint32_t len)
{
    static const uint8_t dummy = 0xFFU;
    RCC->AHB1ENR |= RCC_AHB1ENR_DMA1EN | RCC_AHB1ENR_DMAMUX1EN;
    (void)RCC->AHB1ENR;
    DMA1_Channel2->CCR = 0U;
    DMA1_Channel3->CCR = 0U;
    DMAMUX1_Channel1->CCR = DMAMUX_REQ_SPI2_RX << DMAMUX_CxCR_DMAREQ_ID_Pos;   /* DMA1 ch2 <- SPI2_RX */ // «8»
    DMAMUX1_Channel2->CCR = DMAMUX_REQ_SPI2_TX << DMAMUX_CxCR_DMAREQ_ID_Pos;   /* DMA1 ch3 <- SPI2_TX */
    DMA1_Channel2->CPAR = (uint32_t)&SPI2->DR;
    DMA1_Channel2->CMAR = (uint32_t)buf;
    DMA1_Channel2->CNDTR = len;
    DMA1_Channel2->CCR = DMA_CCR_MINC | DMA_CCR_PL_1 | DMA_CCR_EN;   /* peripheral -> memory, 8-bit, high priority */
    DMA1_Channel3->CPAR = (uint32_t)&SPI2->DR;
    DMA1_Channel3->CMAR = (uint32_t)&dummy;
    DMA1_Channel3->CNDTR = len;
    DMA1_Channel3->CCR = DMA_CCR_DIR | DMA_CCR_EN;                   /* memory -> peripheral, no MINC */ // «9»
    SPI2->CR2 |= SPI_CR2_RXDMAEN;                                    /* RX first, then TX (RM0440) */  // «10»
    SPI2->CR2 |= SPI_CR2_TXDMAEN;
    bool ok = false;
    for (uint32_t n = 0U; n < SPI_WAIT * 10U; ++n)
    {
        if ((DMA1->ISR & DMA_ISR_TCIF2) != 0U)                       /* receive side complete */
        {
            ok = true;
            break;
        }
    }
    DMA1->IFCR = DMA_IFCR_CGIF2 | DMA_IFCR_CGIF3;
    SPI2->CR2 &= ~(SPI_CR2_RXDMAEN | SPI_CR2_TXDMAEN);
    DMA1_Channel2->CCR = 0U;
    DMA1_Channel3->CCR = 0U;
    return ok;
}
// [endregion]
