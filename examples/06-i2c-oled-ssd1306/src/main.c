/* SPDX-License-Identifier: MIT
 * Example 06: an SSD1306 OLED on I2C1 (PB8 SCL = D15, PB9 SDA = D14). Shows text and a moving bar, and
 * reports the I2C result codes on the UART so a missing display is obvious.
 */
#include <stdint.h>
#include "stm32g474xx.h"
#include "clock.h"
#include "gfx.h"
#include "i2c.h"
#include "ssd1306.h"
#include "systick.h"
#include "uart_log.h"

static gfx_t s_fb;

static void put_status(const char *what, i2c_status_t st)
{
    static const char *const names[] = {"OK", "bus busy", "no ACK", "timeout"};
    uart_puts(what);
    uart_puts(names[st]);
    uart_puts("\n");
}

static void u32_to_str(uint32_t v, char *out)
{
    char tmp[11];
    uint32_t n = 0U;
    do
    {
        tmp[n++] = (char)('0' + (v % 10U));
        v /= 10U;
    } while (v != 0U);
    while (n > 0U)
    {
        *out++ = tmp[--n];
    }
    *out = '\0';
}

int main(void)
{
    (void)clock_init_170mhz();
    systick_init_1ms();
    uart_log_init(115200U);
    uart_puts("Example 06: SSD1306 on I2C1 (PB8/PB9 = D15/D14, 400 kHz)\n");
    put_status("i2c init: ", i2c_init());

    // [region:main]
    const i2c_status_t probe = i2c_probe(SSD1306_ADDR);                                      // «7»
    put_status("probe 0x3C: ", probe);
    if (probe != I2C_OK)
    {
        uart_puts("check wiring, power and the module's address (0x3C or 0x3D)\n");
    }
    else
    {
        put_status("ssd1306 init: ", ssd1306_init());
    }
    uint32_t frames = 0U, errors = 0U, next_report = 1000U;
    for (;;)
    {
        const uint32_t now = millis();
        char num[11];
        gfx_clear(&s_fb);
        (void)gfx_text(&s_fb, 0U, 0U, "MCU ACADEMY");
        (void)gfx_text(&s_fb, 0U, 2U, "I2C1 400 KHZ 0X3C");
        u32_to_str(now / 1000U, num);
        const uint32_t x = gfx_text(&s_fb, 0U, 4U, "UPTIME ");
        (void)gfx_text(&s_fb, gfx_text(&s_fb, x, 4U, num), 4U, " S");
        gfx_bar(&s_fb, 0U, 6U, 128U, (now / 20U) % 101U);                                    // «8»
        if ((probe == I2C_OK) && (ssd1306_flush(&s_fb) == I2C_OK))
        {
            ++frames;
        }
        else
        {
            ++errors;
        }
        if ((int32_t)(now - next_report) >= 0)
        {
            next_report += 1000U;
            uart_puts("frames ");
            uart_put_dec(frames);
            uart_puts(", errors ");
            uart_put_dec(errors);
            uart_puts("\n");
        }
        delay_ms(50U);
    }
    // [endregion]
}
