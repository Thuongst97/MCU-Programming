/* SPDX-License-Identifier: MIT
 * Example 12, bootloader: a small UART bootloader in the first 16 KB of flash.
 *
 * At reset it stays in update mode when the button on PA0 is held, when the application slot
 * holds no valid image, or when a HELLO frame arrives within 500 ms. Otherwise it checks the
 * image record and the CRC-32 of the application and jumps to it at 0x08004000.
 * The clock is left as after reset (HSI 8 MHz), so the application starts from known settings.
 */
#include <stdbool.h>
#include <stdint.h>

#include "flash.h"
#include "layout.h"
#include "led.h"
#include "proto.h"
#include "stm32f103xb.h"
#include "systick.h"
#include "uart_log.h"

#define HELLO_WINDOW_MS 500U
#define APP_PAGES       (APP_SIZE_MAX / FLASH_PAGE_SIZE)

static void button_init(void)
{
    RCC->APB2ENR |= RCC_APB2ENR_IOPAEN;
    GPIOA->CRL = (GPIOA->CRL & ~(GPIO_CRL_MODE0 | GPIO_CRL_CNF0)) | GPIO_CRL_CNF0_1;   /* input, pull-up/down */
    GPIOA->ODR |= GPIO_ODR_ODR0;                                                       /* ... pull-up */
}

static bool button_held(void)
{
    return (GPIOA->IDR & GPIO_IDR_IDR0) == 0U;   /* to GND when pressed */
}

// [region:validate]
static bool app_valid(void)
{
    const image_record_t *rec = (const image_record_t *)RECORD_ADDR;
    if ((rec->magic != RECORD_MAGIC) || (rec->check != ~(rec->magic ^ rec->size ^ rec->crc)))   // «1»
    {
        return false;
    }
    if ((rec->size < 8U) || (rec->size > APP_SIZE_MAX))
    {
        return false;
    }
    const uint32_t *vt = (const uint32_t *)APP_BASE;
    const uint32_t sp = vt[0];
    const uint32_t pc = vt[1];
    if ((sp < SRAM_BASE) || (sp > (SRAM_BASE + (20UL * 1024UL))) || ((sp & 3U) != 0U))         // «2»
    {
        return false;
    }
    if ((pc < APP_BASE) || (pc >= (APP_BASE + rec->size)) || ((pc & 1U) == 0U))                 // «3»
    {
        return false;
    }
    return crc32_update(0U, (const uint8_t *)APP_BASE, rec->size) == rec->crc;                  // «4»
}
// [endregion]

// [region:jump]
__attribute__((noreturn)) static void jump_to_app(void)
{
    const uint32_t *vt = (const uint32_t *)APP_BASE;
    __disable_irq();                                                                            // «5»
    SysTick->CTRL = 0U;                                                  /* stop our time base */
    SysTick->VAL = 0U;
    SCB->ICSR = SCB_ICSR_PENDSTCLR_Msk;
    for (uint32_t i = 0U; i < 8U; ++i)
    {
        NVIC->ICER[i] = 0xFFFFFFFFUL;                                    /* disable every IRQ ... */ // «6»
        NVIC->ICPR[i] = 0xFFFFFFFFUL;                                    /* ... and forget pending ones */
    }
    RCC->APB2RSTR |= RCC_APB2RSTR_USART1RST | RCC_APB2RSTR_IOPARST | RCC_APB2RSTR_IOPCRST;   // «7»
    RCC->APB2RSTR &= ~(RCC_APB2RSTR_USART1RST | RCC_APB2RSTR_IOPARST | RCC_APB2RSTR_IOPCRST);
    RCC->APB2ENR = 0U;
    SCB->VTOR = APP_BASE;                                                /* the app's vector table */ // «8»
    __DSB();
    __ISB();
    __set_MSP(vt[0]);                                                    /* the app's initial SP */   // «9»
    __enable_irq();                                                      /* as after a real reset */
    void (*const entry)(void) = (void (*)(void))(uintptr_t)vt[1];
    entry();                                                             /* never returns */          // «10»
    for (;;)
    {
    }
}
// [endregion]

static void reply(bool ok)
{
    uart_putc((char)(ok ? PROTO_ACK : PROTO_NACK));
}

// [region:erase]
static bool erase_slot(void)
{
    flash_unlock();
    bool ok = flash_erase_page(RECORD_ADDR);                             /* the record goes first */  // «11»
    for (uint32_t p = 0U; ok && (p < APP_PAGES); ++p)
    {
        ok = flash_erase_page(APP_BASE + (p * FLASH_PAGE_SIZE));
    }
    flash_lock();
    return ok;
}
// [endregion]

// [region:handle]
static bool handle(const proto_frame_t *f, bool *run)
{
    switch (f->cmd)
    {
    case CMD_HELLO:
        return f->len == 0U;
    case CMD_ERASE:
        return (f->len == 0U) && erase_slot();
    case CMD_WRITE:
    {
        if ((f->len < 6U) || ((f->len & 1U) != 0U))                      /* offset + even data */
        {
            return false;
        }
        const uint32_t off = get_u32le(f->data);
        const uint32_t n = (uint32_t)f->len - 4U;
        if (((off & 1U) != 0U) || (off > APP_SIZE_MAX) || (n > (APP_SIZE_MAX - off)))           // «12»
        {
            return false;                                                /* never outside the slot */
        }
        flash_unlock();
        const bool ok = flash_program(APP_BASE + off, &f->data[4], n);
        flash_lock();
        return ok;
    }
    case CMD_DONE:
    {
        if (f->len != 8U)
        {
            return false;
        }
        const uint32_t size = get_u32le(f->data);
        const uint32_t crc = get_u32le(&f->data[4]);
        if ((size == 0U) || (size > APP_SIZE_MAX) ||
            (crc32_update(0U, (const uint8_t *)APP_BASE, size) != crc))  /* check what is in flash */ // «13»
        {
            return false;
        }
        const image_record_t rec = {RECORD_MAGIC, size, crc, ~(RECORD_MAGIC ^ size ^ crc)};
        flash_unlock();
        const bool ok = flash_program(RECORD_ADDR, (const uint8_t *)&rec, sizeof rec);         // «14»
        flash_lock();
        return ok && app_valid();
    }
    case CMD_RUN:
        *run = app_valid();
        return *run;
    default:
        return false;
    }
}
// [endregion]

// [region:main]
int main(void)
{
    led_init();
    button_init();
    systick_init_1ms();
    uart_log_init(115200U);                                              /* HSI 8 MHz: -0.6 % error */

    const bool valid = app_valid();
    bool update = !valid || button_held();                                                     // «15»
    uart_puts(valid ? "boot: application valid\n" : "boot: no valid application\n");

    proto_parser_t parser;
    proto_reset(&parser);
    const uint32_t t0 = millis();
    uint32_t blink = t0;
    for (;;)
    {
        if (!update && ((millis() - t0) >= HELLO_WINDOW_MS))
        {
            uart_puts("boot: starting application\n");
            delay_ms(2U);                                                /* let the text leave */
            jump_to_app();
        }
        if (update && ((millis() - blink) >= 100U))
        {
            blink = millis();
            led_toggle();                                                /* fast blink: update mode */
        }
        const int c = uart_getc_nonblocking();
        if (c < 0)
        {
            continue;
        }
        const proto_event_t ev = proto_feed(&parser, (uint8_t)c);
        if (ev == PROTO_FRAME)
        {
            bool run = false;
            update = true;                                               /* any valid frame: stay */  // «16»
            reply(handle(&parser.frame, &run));
            if (run)
            {
                delay_ms(2U);
                jump_to_app();
            }
        }
        else if (ev != PROTO_NONE)
        {
            reply(false);                                                /* bad CRC or too long */
        }
        else
        {
            /* byte consumed, frame not complete yet */
        }
    }
}
// [endregion]
