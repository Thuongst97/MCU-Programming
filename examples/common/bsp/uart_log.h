/* SPDX-License-Identifier: MIT
 * Minimal polling log on LPUART1 (TX = PA2, RX = PA3), 8N1: the NUCLEO's virtual COM port, so
 * the output arrives on the same USB cable as the debugger. No printf: small, predictable,
 * and it works before any heap or libc is set up (RM0440 "LPUART"). */
#ifndef BSP_UART_LOG_H
#define BSP_UART_LOG_H

#include <stdint.h>

void uart_log_init(uint32_t baud);   /* uses the current PCLK1; call again after a clock change */
void uart_putc(char c);
void uart_puts(const char *s);       /* "\n" is sent as "\r\n" for terminal programs */
void uart_put_dec(uint32_t v);
void uart_put_hex(uint32_t v);       /* always 0x + 8 digits */
int uart_getc_nonblocking(void);     /* -1 if nothing received */

#endif
