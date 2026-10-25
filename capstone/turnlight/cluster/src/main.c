/* SPDX-License-Identifier: MIT
 * TurnLight capstone: the cluster node (a second Blue Pill). Receives TurnLightStatus, draws the
 * telltales on the SSD1306 OLED, and answers with ClusterAck every 100 ms (TL-REQ-006/007).
 * Holding the button on PA0 stops the acknowledgements, to test the ECU's supervision on a bench.
 * Drivers: examples 06 (I2C, SSD1306, font) and 11 (bxCAN).
 */
#include <stdbool.h>
#include <stdint.h>

#include "can.h"
#include "clock.h"
#include "gfx.h"
#include "i2c.h"
#include "led.h"
#include "ssd1306.h"
#include "stm32g474xx.h"
#include "systick.h"
#include "tl_msg.h"
#include "uart_log.h"

static gfx_t s_fb;

static void button_init(void)
{
    RCC->APB2ENR |= RCC_APB2ENR_IOPAEN;
    GPIOA->CRL = (GPIOA->CRL & ~(GPIO_CRL_MODE0 | GPIO_CRL_CNF0)) | GPIO_CRL_CNF0_1;
    GPIOA->BSRR = GPIO_BSRR_BS0;
}

static void draw(const tl_status_t *s, bool have_oled)
{
    gfx_clear(&s_fb);
    (void)gfx_text(&s_fb, 0U, 0U, "TURNLIGHT CLUSTER");
    (void)gfx_text(&s_fb, 0U, 3U, s->lamp_left ? "<<<" : "   ");
    (void)gfx_text(&s_fb, 104U, 3U, s->lamp_right ? ">>>" : "   ");
    (void)gfx_text(&s_fb, 46U, 3U, s->hazard ? "HAZARD" : "");
    (void)gfx_text(&s_fb, 0U, 6U, s->out_left ? "LAMP L OUT" : "");
    (void)gfx_text(&s_fb, 70U, 6U, s->out_right ? "LAMP R OUT" : "");
    if (have_oled)
    {
        (void)ssd1306_flush(&s_fb);
    }
}

// [region:loop]
int main(void)
{
    (void)clock_init_170mhz();
    systick_init_1ms();
    uart_log_init(115200U);
    led_init();
    button_init();
    i2c_init();
    const bool have_oled = ssd1306_init() == I2C_OK;
    uart_puts(have_oled ? "\nTurnLight cluster node, OLED ok\n" : "\nTurnLight cluster node, no OLED\n");
    if (!can_init(CAN_BTR_500K_36MHZ, CAN_MODE_NORMAL))
    {
        uart_puts("cluster: CAN init failed\n");
    }
    tl_status_t shown = {0};
    uint8_t last_alive = 0U;
    uint32_t next_ack = millis();
    draw(&shown, have_oled);
    for (;;)
    {
        can_frame_t rx;
        while (can_receive(&rx))
        {
            tl_status_t s;
            if ((rx.id == TL_CAN_ID_STATUS) && tl_status_unpack(rx.data, rx.dlc, &s))
            {
                last_alive = s.alive;
                const bool changed = (s.lamp_left != shown.lamp_left) || (s.lamp_right != shown.lamp_right) ||
                                     (s.hazard != shown.hazard) || (s.out_left != shown.out_left) ||
                                     (s.out_right != shown.out_right);
                if (changed)
                {
                    uart_puts("cluster: L ");
                    uart_putc(s.lamp_left ? '1' : '0');
                    uart_puts(" R ");
                    uart_putc(s.lamp_right ? '1' : '0');
                    uart_puts(s.hazard ? " hazard" : "");
                    uart_puts((s.out_left || s.out_right) ? " lamp-out\n" : "\n");
                    shown = s;
                    draw(&shown, have_oled);
                }
            }
        }
        const bool muted = (GPIOA->IDR & GPIO_IDR_IDR0) == 0U;              /* button held: stay silent */
        if (((int32_t)(millis() - next_ack) >= 0) && !muted)
        {
            next_ack += TL_STATUS_CYCLE_MS;
            const can_frame_t ack = {.id = TL_CAN_ID_ACK, .dlc = 1U, .data = {last_alive}};
            (void)can_send(&ack);
            led_toggle();
        }
    }
}
// [endregion]
