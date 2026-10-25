/* SPDX-License-Identifier: MIT
 * Minimal polling log on USART1 (TX = PA9, RX = PA10), 8N1. No printf: small, predictable,
 * and it works before any heap or libc is set up (RM0008 §27). */
#ifndef BSP_UART_LOG_H
#define BSP_UART_LOG_H

#include <stdint.h>

void uart_log_init(uint32_t baud);   /* uses the current PCLK2; call again after a clock change */
void uart_putc(char c);
void uart_puts(const char *s);       /* "\n" is sent as "\r\n" for terminal programs */
void uart_put_dec(uint32_t v);
void uart_put_hex(uint32_t v);       /* always 0x + 8 digits */
int uart_getc_nonblocking(void);     /* -1 if nothing received */

#endif
