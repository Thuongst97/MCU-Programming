/* SPDX-License-Identifier: MIT */
#include "uart_log.h"
#include "clock.h"
#include "stm32f103xb.h"

#define UART_WAIT_LOOPS 100000U   /* a byte at 9600 baud takes ~1 ms; this is far longer */

void uart_log_init(uint32_t baud)
{
    RCC->APB2ENR |= RCC_APB2ENR_IOPAEN | RCC_APB2ENR_USART1EN;
    /* PA9  = TX: CNF 10 (alternate function push-pull), MODE 11 (50 MHz) -> 0xB
     * PA10 = RX: CNF 01 (floating input),             MODE 00            -> 0x4 */
    GPIOA->CRH = (GPIOA->CRH & ~(GPIO_CRH_CNF9 | GPIO_CRH_MODE9 | GPIO_CRH_CNF10 | GPIO_CRH_MODE10))
                 | GPIO_CRH_CNF9_1 | GPIO_CRH_MODE9 | GPIO_CRH_CNF10_0;
    /* USARTDIV = PCLK2 / baud, rounded; BRR holds it as 12.4 fixed point (RM0008 §27.3.4). */
    USART1->BRR = (clock_pclk2() + (baud / 2U)) / baud;
    USART1->CR1 = USART_CR1_UE | USART_CR1_TE | USART_CR1_RE;
}

void uart_putc(char c)
{
    for (uint32_t n = 0U; ((USART1->SR & USART_SR_TXE) == 0U) && (n < UART_WAIT_LOOPS); ++n)
    {
    }
    USART1->DR = (uint8_t)c;
}

void uart_puts(const char *s)
{
    while (*s != '\0')
    {
        if (*s == '\n')
        {
            uart_putc('\r');
        }
        uart_putc(*s);
        ++s;
    }
}

void uart_put_dec(uint32_t v)
{
    char buf[11];
    uint32_t i = 0U;
    do
    {
        buf[i] = (char)('0' + (v % 10U));
        ++i;
        v /= 10U;
    } while (v != 0U);
    while (i > 0U)
    {
        --i;
        uart_putc(buf[i]);
    }
}

void uart_put_hex(uint32_t v)
{
    static const char digits[] = "0123456789ABCDEF";
    uart_puts("0x");
    for (int shift = 28; shift >= 0; shift -= 4)
    {
        uart_putc(digits[(v >> (uint32_t)shift) & 0xFU]);
    }
}

int uart_getc_nonblocking(void)
{
    if ((USART1->SR & USART_SR_RXNE) != 0U)
    {
        return (int)(USART1->DR & 0xFFU);
    }
    return -1;
}
