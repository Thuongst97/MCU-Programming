/* SPDX-License-Identifier: MIT */
#include "uart_log.h"
#include "clock.h"
#include "board.h"
#include "gpio.h"
#include "stm32g474xx.h"

#define UART_WAIT_LOOPS 100000U   /* a byte at 9600 baud takes ~1 ms; this is far longer */

void uart_log_init(uint32_t baud)
{
    RCC->APB1ENR2 |= RCC_APB1ENR2_LPUART1EN;      /* kernel clock: PCLK1 (RCC_CCIPR reset value) */
    (void)RCC->APB1ENR2;
    gpio_clock_on(BOARD_VCP_PORT);
    gpio_af(BOARD_VCP_PORT, BOARD_VCP_TX_PIN, AF_PA2_LPUART1_TX);
    gpio_af(BOARD_VCP_PORT, BOARD_VCP_RX_PIN, AF_PA3_LPUART1_RX);
    gpio_pull(BOARD_VCP_PORT, BOARD_VCP_RX_PIN, BSP_GPIO_PULLUP);   /* idle-high when unplugged */
    /* LPUART: BRR = 256 x f_ck / baud, rounded, 20 bits (RM0440 "LPUART baud rate").
     * 170 MHz at 115200 baud gives 377778, inside the allowed 0x300..0xFFFFF. */
    LPUART1->BRR = (uint32_t)((256ULL * clock_pclk1() + (baud / 2U)) / baud);
    LPUART1->CR1 = USART_CR1_UE | USART_CR1_TE | USART_CR1_RE;
}

void uart_putc(char c)
{
    for (uint32_t n = 0U; ((LPUART1->ISR & USART_ISR_TXE_TXFNF) == 0U) && (n < UART_WAIT_LOOPS); ++n)
    {
    }
    LPUART1->TDR = (uint8_t)c;
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
    if ((LPUART1->ISR & USART_ISR_RXNE_RXFNE) != 0U)
    {
        return (int)(LPUART1->RDR & 0xFFU);
    }
    return -1;
}
