/* SPDX-License-Identifier: MIT
 * Example 13: LIN between two NUCLEO-G474RE boards, UART-level ("logic-level LIN", no 12 V
 * transceiver). USART1 (PA9 TX = D8, PA10 RX = D2) in LIN mode (RM0440 "USART LIN mode"): the
 * master sends a break, the sync byte 0x55 and a protected ID from its schedule table; the slave
 * answers or listens. (LPUART1 has no LIN mode, and it is busy as the log anyway.)
 *   ID 0x10: slave publishes its USER button (B1) state, 1 data byte
 *   ID 0x20: master publishes the LED command for the slave, 1 data byte
 * Build with -DNODE_MASTER or -DNODE_SLAVE (two targets). Log on LPUART1 (the virtual COM port).
 * LIN 2.x enhanced checksum.
 */
#include <stdbool.h>
#include <stdint.h>

#include "board.h"
#include "clock.h"
#include "gpio.h"
#include "led.h"
#include "lin.h"
#include "stm32g474xx.h"
#include "systick.h"
#include "uart_log.h"

#define LIN_BAUD    19200U
#define BYTE_WAIT   50000U          /* polling loops per byte: a timeout on every wait */
#define ID_BUTTON   0x10U
#define ID_LED      0x20U
#define AF_PA9_USART1_TX  7U        /* DS12288 alternate functions; checked by tools/check-pins.py */
#define AF_PA10_USART1_RX 7U

// [region:init]
static void lin_init(void)
{
    RCC->APB2ENR |= RCC_APB2ENR_USART1EN;                   /* kernel clock: PCLK2 (reset value) */
    (void)RCC->APB2ENR;
    gpio_clock_on(GPIOA);
    gpio_af(GPIOA, 9U, AF_PA9_USART1_TX);
    gpio_pull(GPIOA, 10U, BSP_GPIO_PULLUP);                 /* the bus idles recessive (high) */
    gpio_af(GPIOA, 10U, AF_PA10_USART1_RX);
    USART1->BRR = (clock_pclk2() + (LIN_BAUD / 2U)) / LIN_BAUD;   /* 170 MHz / 19200 = 8854 */
    USART1->CR2 = USART_CR2_LINEN | USART_CR2_LBDL;        /* LIN mode, 11-bit break detection */ // «1»
    USART1->CR3 = 0U;                                       /* no smartcard, half-duplex or IrDA */ // «2»
    USART1->CR1 = USART_CR1_UE | USART_CR1_TE | USART_CR1_RE;
}
// [endregion]

static bool tx_byte(uint8_t b)
{
    for (uint32_t n = 0U; n < BYTE_WAIT; ++n)
    {
        if ((USART1->ISR & USART_ISR_TXE_TXFNF) != 0U)
        {
            USART1->TDR = b;
            return true;
        }
    }
    return false;
}

static bool rx_byte(uint8_t *b)
{
    for (uint32_t n = 0U; n < BYTE_WAIT; ++n)
    {
        if ((USART1->ISR & USART_ISR_RXNE_RXFNE) != 0U)
        {
            *b = (uint8_t)USART1->RDR;
            return true;
        }
    }
    return false;
}

/* On a single-wire bus every node also receives what it sends: read it back and compare. */
static bool tx_checked(uint8_t b)
{
    uint8_t echo = 0U;
    return tx_byte(b) && rx_byte(&echo) && (echo == b);
}

#ifdef NODE_MASTER
// [region:master]
static bool header(uint8_t id)
{
    uint8_t dummy;
    while (rx_byte(&dummy))
    {
        /* drop anything left over */
    }
    USART1->RQR = USART_RQR_SBKRQ;                          /* 13 dominant bits: the break */   // «3»
    for (uint32_t n = 0U; (n < BYTE_WAIT) && ((USART1->ISR & USART_ISR_SBKF) != 0U); ++n)
    {
    }
    (void)rx_byte(&dummy);                                  /* the break reads back as 0x00 */
    USART1->ICR = USART_ICR_LBDCF;
    return tx_checked(LIN_SYNC) && tx_checked(lin_pid(id));                                    // «4»
}

int main(void)
{
    (void)clock_init_170mhz();
    systick_init_1ms();
    uart_log_init(115200U);
    led_init();
    lin_init();
    uart_puts("\nExample 13: LIN master, schedule: 0x10 (button) / 0x20 (LED), 50 ms slots\n");
    uint8_t led_cmd = 0U;
    uint8_t last_button = 0xFFU;
    for (uint32_t slot = 0U;; ++slot)
    {
        delay_ms(50U);                                      /* schedule table: one frame per slot */ // «5»
        if ((slot & 1U) == 0U)
        {
            uint8_t d = 0U;
            uint8_t cs = 0U;
            const uint8_t pid = lin_pid(ID_BUTTON);
            if (header(ID_BUTTON) && rx_byte(&d) && rx_byte(&cs) && (cs == lin_checksum(&d, 1U, pid, true)))   // «6»
            {
                if (d != last_button)
                {
                    last_button = d;
                    led_cmd = d;                            /* mirror the slave's button on its LED */
                    uart_puts(d ? "master: slave button pressed\n" : "master: slave button released\n");
                }
            }
            else
            {
                uart_puts("master: no response to 0x10\n");  /* slave missing or checksum wrong */
            }
        }
        else
        {
            const uint8_t pid = lin_pid(ID_LED);
            if (!(header(ID_LED) && tx_checked(led_cmd) && tx_checked(lin_checksum(&led_cmd, 1U, pid, true))))
            {
                uart_puts("master: bus error on 0x20\n");   /* echo differs: collision or short */
            }
        }
    }
}
// [endregion]
#endif

#ifdef NODE_SLAVE
// [region:slave]
int main(void)
{
    (void)clock_init_170mhz();
    systick_init_1ms();
    uart_log_init(115200U);
    led_init();
    lin_init();
    gpio_clock_on(BOARD_BTN_PORT);                          /* the USER button B1 */
    gpio_mode(BOARD_BTN_PORT, BOARD_BTN_PIN, BSP_GPIO_INPUT);
    gpio_pull(BOARD_BTN_PORT, BOARD_BTN_PIN, BSP_GPIO_PULLDOWN);
    uart_puts("\nExample 13: LIN slave, publishes 0x10, subscribes 0x20\n");
    for (;;)
    {
        if ((USART1->ISR & USART_ISR_LBDF) == 0U)           /* wait for a break */                // «7»
        {
            continue;
        }
        USART1->ICR = USART_ICR_LBDCF;                      /* G4: flags are cleared through ICR */
        uint8_t b = 0U;
        uint8_t pid = 0U;
        (void)rx_byte(&b);                                  /* the 0x00 of the break itself */
        if (!(rx_byte(&b) && (b == LIN_SYNC) && rx_byte(&pid) && lin_pid_ok(pid)))                  // «8»
        {
            continue;                                       /* not a valid header: wait for the next break */
        }
        if ((pid & 0x3FU) == ID_BUTTON)
        {
            const uint8_t d = (((BOARD_BTN_PORT->IDR >> BOARD_BTN_PIN) & 1U) == BOARD_BTN_PRESSED) ? 1U : 0U;
            (void)tx_checked(d);                            /* respond inside the frame slot */  // «9»
            (void)tx_checked(lin_checksum(&d, 1U, pid, true));
        }
        else if ((pid & 0x3FU) == ID_LED)
        {
            uint8_t d = 0U;
            uint8_t cs = 0U;
            if (rx_byte(&d) && rx_byte(&cs) && (cs == lin_checksum(&d, 1U, pid, true)))
            {
                if (d != 0U) { led_on(); } else { led_off(); }
            }
        }
        else
        {
            /* not ours: ignore the frame */
        }
    }
}
// [endregion]
#endif
