/* SPDX-License-Identifier: MIT
 * Example 13: LIN between two Blue Pills, UART-level ("logic-level LIN", no 12 V transceiver).
 * USART2 (PA2 TX, PA3 RX) in LIN mode (RM0008 §27.3.11): the master sends a break, the sync byte
 * 0x55 and a protected ID from its schedule table; the slave answers or listens.
 *   ID 0x10: slave publishes its button (PA0) state, 1 data byte
 *   ID 0x20: master publishes the LED command for the slave, 1 data byte
 * Build with -DNODE_MASTER or -DNODE_SLAVE (two targets). Log on USART1. LIN 2.x enhanced checksum.
 */
#include <stdbool.h>
#include <stdint.h>

#include "clock.h"
#include "led.h"
#include "lin.h"
#include "stm32f103xb.h"
#include "systick.h"
#include "uart_log.h"

#define LIN_BAUD    19200U
#define BYTE_WAIT   50000U          /* polling loops per byte: a timeout on every wait */
#define ID_BUTTON   0x10U
#define ID_LED      0x20U

// [region:init]
static void lin_init(void)
{
    RCC->APB2ENR |= RCC_APB2ENR_IOPAEN;
    RCC->APB1ENR |= RCC_APB1ENR_USART2EN;
    GPIOA->CRL = (GPIOA->CRL & ~(GPIO_CRL_MODE2 | GPIO_CRL_CNF2 | GPIO_CRL_MODE3 | GPIO_CRL_CNF3)) |
                 GPIO_CRL_MODE2_1 | GPIO_CRL_CNF2_1 | GPIO_CRL_CNF3_0;   /* PA2 AF push-pull, PA3 input */
    USART2->BRR = (uint16_t)((clock_pclk1() + (LIN_BAUD / 2U)) / LIN_BAUD);
    USART2->CR2 = USART_CR2_LINEN | USART_CR2_LBDL;        /* LIN mode, 11-bit break detection */ // «1»
    USART2->CR3 = 0U;                                       /* no smartcard, half-duplex or IrDA */ // «2»
    USART2->CR1 = USART_CR1_UE | USART_CR1_TE | USART_CR1_RE;
}
// [endregion]

static bool tx_byte(uint8_t b)
{
    for (uint32_t n = 0U; n < BYTE_WAIT; ++n)
    {
        if ((USART2->SR & USART_SR_TXE) != 0U)
        {
            USART2->DR = b;
            return true;
        }
    }
    return false;
}

static bool rx_byte(uint8_t *b)
{
    for (uint32_t n = 0U; n < BYTE_WAIT; ++n)
    {
        if ((USART2->SR & USART_SR_RXNE) != 0U)
        {
            *b = (uint8_t)USART2->DR;
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
    USART2->CR1 |= USART_CR1_SBK;                           /* 13 dominant bits: the break */   // «3»
    for (uint32_t n = 0U; (n < BYTE_WAIT) && ((USART2->CR1 & USART_CR1_SBK) != 0U); ++n)
    {
    }
    (void)rx_byte(&dummy);                                  /* the break reads back as 0x00 */
    USART2->SR &= ~USART_SR_LBD;
    return tx_checked(LIN_SYNC) && tx_checked(lin_pid(id));                                    // «4»
}

int main(void)
{
    (void)clock_init_72mhz();
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
    (void)clock_init_72mhz();
    systick_init_1ms();
    uart_log_init(115200U);
    led_init();
    lin_init();
    RCC->APB2ENR |= RCC_APB2ENR_IOPAEN;                      /* PA0 button to GND, pull-up */
    GPIOA->CRL = (GPIOA->CRL & ~(GPIO_CRL_MODE0 | GPIO_CRL_CNF0)) | GPIO_CRL_CNF0_1;
    GPIOA->BSRR = GPIO_BSRR_BS0;
    uart_puts("\nExample 13: LIN slave, publishes 0x10, subscribes 0x20\n");
    for (;;)
    {
        if ((USART2->SR & USART_SR_LBD) == 0U)              /* wait for a break */                // «7»
        {
            continue;
        }
        USART2->SR &= ~USART_SR_LBD;
        uint8_t b = 0U;
        uint8_t pid = 0U;
        (void)rx_byte(&b);                                  /* the 0x00 of the break itself */
        if (!(rx_byte(&b) && (b == LIN_SYNC) && rx_byte(&pid) && lin_pid_ok(pid)))                  // «8»
        {
            continue;                                       /* not a valid header: wait for the next break */
        }
        if ((pid & 0x3FU) == ID_BUTTON)
        {
            const uint8_t d = ((GPIOA->IDR & GPIO_IDR_IDR0) == 0U) ? 1U : 0U;
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
