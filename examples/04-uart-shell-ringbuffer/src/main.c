/* SPDX-License-Identifier: MIT
 * Example 04: an interrupt-driven USART1 with lock-free ring buffers, and a command shell on top.
 * Type "help" in your terminal (115200 8N1). RM0008 §27 (USART), PM0056 §4.3 (NVIC).
 */
#include <stdint.h>
#include "stm32f103xb.h"
#include "clock.h"
#include "led.h"
#include "ringbuf.h"
#include "shell.h"
#include "systick.h"

static ringbuf_t s_rx, s_tx;
static volatile uint32_t s_rx_dropped;

// [region:init]
static void uart_irq_init(uint32_t baud)
{
    RCC->APB2ENR |= RCC_APB2ENR_IOPAEN | RCC_APB2ENR_USART1EN;
    GPIOA->CRH = (GPIOA->CRH & ~(GPIO_CRH_CNF9 | GPIO_CRH_MODE9 | GPIO_CRH_CNF10 | GPIO_CRH_MODE10))
                 | GPIO_CRH_CNF9_1 | GPIO_CRH_MODE9 | GPIO_CRH_CNF10_0;
    USART1->BRR = (clock_pclk2() + (baud / 2U)) / baud;
    USART1->CR1 = USART_CR1_UE | USART_CR1_TE | USART_CR1_RE | USART_CR1_RXNEIE;   /* RX interrupt on */ // «1»
    NVIC_SetPriority(USART1_IRQn, 6U);                                                                // «2»
    NVIC_EnableIRQ(USART1_IRQn);
}
// [endregion]

// [region:isr]
void USART1_IRQHandler(void);
void USART1_IRQHandler(void)
{
    const uint32_t sr = USART1->SR;
    if ((sr & (USART_SR_RXNE | USART_SR_ORE)) != 0U)          /* byte received (or overrun) */      // «3»
    {
        const uint8_t b = (uint8_t)USART1->DR;                /* reading DR clears RXNE and ORE */
        if (!ringbuf_put(&s_rx, b))
        {
            s_rx_dropped++;                                   /* main() was too slow: count, don't block */
        }
    }
    if (((USART1->CR1 & USART_CR1_TXEIE) != 0U) && ((sr & USART_SR_TXE) != 0U))                    // «4»
    {
        uint8_t b;
        if (ringbuf_get(&s_tx, &b))
        {
            USART1->DR = b;
        }
        else
        {
            USART1->CR1 &= ~USART_CR1_TXEIE;                  /* nothing left: stop TXE interrupts */ // «5»
        }
    }
}
// [endregion]

// [region:write]
static void tx_put(uint8_t b)
{
    for (uint32_t n = 0U; !ringbuf_put(&s_tx, b) && (n < 1000000U); ++n)
    {
        /* TX buffer full: the ISR drains it at line speed; bounded wait */                     // «6»
    }
    /* CR1 is also written by the ISR, so this read-modify-write must not be interrupted. */
    const uint32_t primask = __get_PRIMASK();
    __disable_irq();                                                                            // «7»
    USART1->CR1 |= USART_CR1_TXEIE;
    __set_PRIMASK(primask);
}

static void uart_write(const char *s)
{
    for (; *s != '\0'; ++s)
    {
        if (*s == '\n')
        {
            tx_put((uint8_t)'\r');   /* terminals expect CR LF */
        }
        tx_put((uint8_t)*s);
    }
}
// [endregion]

static void write_dec(uint32_t v)
{
    char buf[11];
    uint32_t i = sizeof buf - 1U;
    buf[i] = '\0';
    do
    {
        buf[--i] = (char)('0' + (v % 10U));
        v /= 10U;
    } while ((v != 0U) && (i > 0U));
    uart_write(&buf[i]);
}

static void write_hex(uint32_t v)
{
    char buf[11] = "0x00000000";
    for (uint32_t i = 0U; i < 8U; ++i)
    {
        buf[9U - i] = "0123456789ABCDEF"[v & 0xFU];
        v >>= 4;
    }
    uart_write(buf);
}

/* ------------------------------------------------------------------ commands */
static shell_t s_shell;

static void cmd_help(uint32_t argc, const char *const argv[])
{
    (void)argc;
    (void)argv;
    shell_help(&s_shell);
}

static void cmd_led(uint32_t argc, const char *const argv[])
{
    if (argc < 2U)
    {
        uart_write("usage: led on|off|toggle\n");
    }
    else if (argv[1][0] == 'o' && argv[1][1] == 'n')
    {
        led_on();
    }
    else if (argv[1][0] == 'o' && argv[1][1] == 'f')
    {
        led_off();
    }
    else
    {
        led_toggle();
    }
}

static void cmd_clock(uint32_t argc, const char *const argv[])
{
    (void)argc;
    (void)argv;
    uart_write("SYSCLK/HCLK ");
    write_dec(clock_hclk());
    uart_write(" Hz, PCLK1 ");
    write_dec(clock_pclk1());
    uart_write(" Hz, PCLK2 ");
    write_dec(clock_pclk2());
    uart_write(" Hz\n");
}

static void cmd_mco(uint32_t argc, const char *const argv[])
{
    if ((argc >= 2U) && (argv[1][0] == 'h'))
    {
        clock_mco(CLOCK_MCO_HSE);
        uart_write("MCO on PA8: HSE (8 MHz)\n");
    }
    else if ((argc >= 2U) && (argv[1][0] == 'p'))
    {
        clock_mco(CLOCK_MCO_PLL_DIV2);
        uart_write("MCO on PA8: PLL / 2 (36 MHz)\n");
    }
    else
    {
        clock_mco(CLOCK_MCO_OFF);
        uart_write("MCO off\n");
    }
}

static void cmd_uptime(uint32_t argc, const char *const argv[])
{
    (void)argc;
    (void)argv;
    write_dec(millis());
    uart_write(" ms, rx dropped ");
    write_dec(s_rx_dropped);
    uart_write("\n");
}

static void cmd_regs(uint32_t argc, const char *const argv[])
{
    (void)argc;
    (void)argv;
    uart_write("RCC_CR      ");
    write_hex(RCC->CR);
    uart_write("\nRCC_CFGR    ");
    write_hex(RCC->CFGR);
    uart_write("\nRCC_APB2ENR ");
    write_hex(RCC->APB2ENR);
    uart_write("\nFLASH_ACR   ");
    write_hex(FLASH->ACR);
    uart_write("\n");
}

static const shell_cmd_t s_cmds[] = {
    {"help", "list commands", cmd_help},
    {"led", "led on|off|toggle (PC13)", cmd_led},
    {"clock", "show the bus clocks", cmd_clock},
    {"mco", "mco hse|pll|off: clock out on PA8", cmd_mco},
    {"uptime", "milliseconds since start", cmd_uptime},
    {"regs", "dump RCC and FLASH registers", cmd_regs},
};

// [region:main]
int main(void)
{
    (void)clock_init_72mhz();
    systick_init_1ms();
    led_init();
    led_off();
    ringbuf_init(&s_rx);
    ringbuf_init(&s_tx);
    uart_irq_init(115200U);
    uart_write("Example 04: UART shell (type help)\n");
    shell_init(&s_shell, s_cmds, sizeof s_cmds / sizeof s_cmds[0], uart_write);

    for (;;)
    {
        uint8_t c;
        while (ringbuf_get(&s_rx, &c))                         /* consume everything the ISR queued */ // «8»
        {
            shell_feed(&s_shell, (char)c);
        }
        __WFI();                                               /* sleep until the next interrupt */    // «9»
    }
}
// [endregion]
