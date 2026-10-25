/* SPDX-License-Identifier: MIT */
#include "spi.h"

#include "stm32f103xb.h"

#define SPI_WAIT 100000U

// [region:init]
void spi_init(void)
{
    RCC->APB2ENR |= RCC_APB2ENR_IOPAEN | RCC_APB2ENR_SPI1EN;
    GPIOA->BSRR = GPIO_BSRR_BS4;                                     /* CS idle high before it is an output */ // «1»
    GPIOA->CRL = (GPIOA->CRL & ~(GPIO_CRL_MODE4 | GPIO_CRL_CNF4 | GPIO_CRL_MODE5 | GPIO_CRL_CNF5
                                 | GPIO_CRL_MODE6 | GPIO_CRL_CNF6 | GPIO_CRL_MODE7 | GPIO_CRL_CNF7))
                 | GPIO_CRL_MODE4                                    /* PA4 CS: GPIO push-pull */
                 | GPIO_CRL_MODE5 | GPIO_CRL_CNF5_1                  /* PA5 SCK: AF push-pull */
                 | GPIO_CRL_CNF6_0                                   /* PA6 MISO: floating input */
                 | GPIO_CRL_MODE7 | GPIO_CRL_CNF7_1;                 /* PA7 MOSI: AF push-pull */      // «2»
    SPI1->CR1 = SPI_CR1_MSTR                                         /* master */                     // «3»
              | (3U << SPI_CR1_BR_Pos)                               /* fPCLK2 / 16 = 4.5 MHz */
              | SPI_CR1_SSM | SPI_CR1_SSI;                           /* software NSS, held "high" */  // «4»
              /* CPOL = 0, CPHA = 0: mode 0, which the W25Q supports (as well as mode 3) */
    SPI1->CR1 |= SPI_CR1_SPE;
}
// [endregion]

// [region:xfer]
uint8_t spi_xfer(uint8_t out)
{
    for (uint32_t n = 0U; ((SPI1->SR & SPI_SR_TXE) == 0U) && (n < SPI_WAIT); ++n)
    {
    }
    *(volatile uint8_t *)&SPI1->DR = out;                            /* 8-bit write: one frame */      // «5»
    for (uint32_t n = 0U; ((SPI1->SR & SPI_SR_RXNE) == 0U) && (n < SPI_WAIT); ++n)
    {
    }
    return (uint8_t)SPI1->DR;                                        /* every sent byte clocks one in */ // «6»
}

void spi_select(void)
{
    GPIOA->BSRR = GPIO_BSRR_BR4;
}

void spi_deselect(void)
{
    for (uint32_t n = 0U; ((SPI1->SR & SPI_SR_BSY) != 0U) && (n < SPI_WAIT); ++n)
    {
        /* the last byte may still be shifting out: raising CS now would cut it off */                // «7»
    }
    GPIOA->BSRR = GPIO_BSRR_BS4;
}
// [endregion]

// [region:dma]
bool spi_read_dma(uint8_t *buf, uint32_t len)
{
    static const uint8_t dummy = 0xFFU;
    RCC->AHBENR |= RCC_AHBENR_DMA1EN;
    DMA1_Channel2->CCR = 0U;                                         /* ch2 = SPI1_RX */               // «8»
    DMA1_Channel3->CCR = 0U;                                         /* ch3 = SPI1_TX */
    DMA1_Channel2->CPAR = (uint32_t)&SPI1->DR;
    DMA1_Channel2->CMAR = (uint32_t)buf;
    DMA1_Channel2->CNDTR = len;
    DMA1_Channel2->CCR = DMA_CCR_MINC | DMA_CCR_PL_1 | DMA_CCR_EN;   /* peripheral -> memory, 8-bit, high priority */
    DMA1_Channel3->CPAR = (uint32_t)&SPI1->DR;
    DMA1_Channel3->CMAR = (uint32_t)&dummy;
    DMA1_Channel3->CNDTR = len;
    DMA1_Channel3->CCR = DMA_CCR_DIR | DMA_CCR_EN;                   /* memory -> peripheral, no MINC */ // «9»
    SPI1->CR2 = SPI_CR2_RXDMAEN | SPI_CR2_TXDMAEN;                   /* RX first, then TX (RM0008) */  // «10»
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
    SPI1->CR2 = 0U;
    DMA1_Channel2->CCR = 0U;
    DMA1_Channel3->CCR = 0U;
    return ok;
}
// [endregion]
