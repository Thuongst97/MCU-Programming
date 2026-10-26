/* SPDX-License-Identifier: MIT
 * Example 11: two NUCLEO-G474RE boards on one CAN bus (a CAN transceiver module on each, 120 Ω at
 * each end). Build NODE_A or NODE_B. Node A sends its button (B1) as classic frame 0x100 every
 * 100 ms and on change, and once a second a 16-byte CAN FD frame 0x102 with bit-rate switch;
 * node B shows the button on its LED, answers with frame 0x101 and prints what it receives.
 * CAN IDs here are hypothetical. Both start with a self-test in internal loopback mode, which
 * needs no bus at all.
 */
#include <stdbool.h>
#include <stdint.h>
#include "stm32g474xx.h"
#include "board.h"
#include "can.h"
#include "clock.h"
#include "gpio.h"
#include "led.h"
#include "systick.h"
#include "uart_log.h"

#define ID_BUTTON 0x100U   /* hypothetical: node A -> B, data[0] = pressed, data[1] = counter */
#define ID_LED    0x101U   /* hypothetical: node B -> A, data[0] = LED state */
#define ID_FD     0x102U   /* hypothetical: node A -> B, 16 bytes, CAN FD with bit-rate switch */

#if defined(NODE_A)
#define NODE_NAME "A"
#elif defined(NODE_B)
#define NODE_NAME "B"
#else
#error "define NODE_A or NODE_B"
#endif

static can_timing_t s_nominal, s_data;

static void put_frame(const char *dir, const can_frame_t *f)
{
    uart_puts(dir);
    uart_puts(" id ");
    uart_put_hex(f->id);
    uart_puts(f->fd ? (f->brs ? " FD+BRS" : " FD") : " classic");
    uart_puts(" len ");
    uart_put_dec(f->len);
    uart_puts(" data0 ");
    uart_put_dec(f->data[0]);
    uart_puts("\n");
}

// [region:selftest]
static bool self_test(void)
{
    if (!can_init(&s_nominal, &s_data, CAN_MODE_INTERNAL_LOOPBACK))    /* TX goes straight to RX */ // «13»
    {
        return false;
    }
    can_frame_t probe = {0x7FFU, 20U, true, true, {0}};
    for (uint32_t i = 0U; i < probe.len; ++i)
    {
        probe.data[i] = (uint8_t)(0xA0U + i);
    }
    (void)can_send(&probe);
    can_frame_t got;
    const uint32_t start = millis();
    while ((millis() - start) < 50U)
    {
        if (can_receive(&got))
        {
            return (got.id == probe.id) && got.fd && (got.len == 20U) && (got.data[19] == 0xB3U);
        }
    }
    return false;
}
// [endregion]

#if defined(NODE_A)
static bool button_pressed(void)
{
    return ((BOARD_BTN_PORT->IDR >> BOARD_BTN_PIN) & 1U) == BOARD_BTN_PRESSED;
}
#endif

int main(void)
{
    (void)clock_init_170mhz();
    systick_init_1ms();
    uart_log_init(115200U);
    led_init();
    gpio_clock_on(BOARD_BTN_PORT);
    gpio_mode(BOARD_BTN_PORT, BOARD_BTN_PIN, BSP_GPIO_INPUT);
    gpio_pull(BOARD_BTN_PORT, BOARD_BTN_PIN, BSP_GPIO_PULLDOWN);
    /* 500 kbit/s arbitration, 1 Mbit/s data phase, from the 170 MHz kernel clock (PCLK1). */
    const bool timing_ok = (can_timing_calc(clock_pclk1(), 500000U, 875U, &CAN_NOMINAL_LIMITS, &s_nominal) == 0)
                        && (can_timing_calc(clock_pclk1(), 1000000U, 800U, &CAN_DATA_LIMITS, &s_data) == 0);
    uart_puts("Example 11 node " NODE_NAME ": FDCAN1 500 kbit/s + 1 Mbit/s data on PA11/PA12\n");
    if (!timing_ok)
    {
        uart_puts("no exact bit timing for this clock\n");
    }
    uart_puts(self_test() ? "self-test (internal loopback, CAN FD): OK\n" : "self-test (internal loopback, CAN FD): FAILED\n");
    if (!can_init(&s_nominal, &s_data, CAN_MODE_NORMAL))
    {
        uart_puts("could not join the bus: no 11 recessive bits on FDCAN1_RX (transceiver? wiring?)\n");
    }

    // [region:main]
    uint32_t next_report = 1000U, sent = 0U, received = 0U;
#if defined(NODE_A)
    uint32_t next_tx = 0U, next_fd = 500U;
    bool last_button = false;
#endif
    for (;;)
    {
        const uint32_t now = millis();
        can_frame_t f;
        while (can_receive(&f))
        {
            ++received;
#if defined(NODE_B)
            if (f.id == ID_BUTTON)                                                                     // «14»
            {
                if (f.data[0] != 0U) { led_on(); } else { led_off(); }
                const can_frame_t reply = {ID_LED, 1U, false, false, {f.data[0]}};
                sent += can_send(&reply) ? 1U : 0U;
            }
#endif
            put_frame("rx", &f);
        }
#if defined(NODE_A)
        const bool b = button_pressed();
        if ((b != last_button) || ((int32_t)(now - next_tx) >= 0))       /* on change + every 100 ms */ // «15»
        {
            last_button = b;
            next_tx = now + 100U;
            const can_frame_t tx = {ID_BUTTON, 2U, false, false, {b ? 1U : 0U, (uint8_t)sent}};
            sent += can_send(&tx) ? 1U : 0U;
        }
        if ((int32_t)(now - next_fd) >= 0)                               /* once a second: CAN FD */  // «16»
        {
            next_fd += 1000U;
            can_frame_t fd = {ID_FD, 16U, true, true, {0}};
            for (uint32_t i = 0U; i < fd.len; ++i)
            {
                fd.data[i] = (uint8_t)((sent + i) & 0xFFU);
            }
            sent += can_send(&fd) ? 1U : 0U;
        }
#endif
        if ((int32_t)(now - next_report) >= 0)
        {
            next_report += 1000U;
            uart_puts("tx ");
            uart_put_dec(sent);
            uart_puts(" rx ");
            uart_put_dec(received);
            uart_puts(" TEC ");
            uart_put_dec(can_tec());                                                                   // «17»
            uart_puts(" REC ");
            uart_put_dec(can_rec());
            uart_puts(" ");
            uart_puts(can_state());
            uart_puts("\n");
        }
    }
    // [endregion]
}
