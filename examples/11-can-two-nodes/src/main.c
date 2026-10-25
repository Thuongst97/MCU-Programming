/* SPDX-License-Identifier: MIT
 * Example 11: two Blue Pills on one CAN bus (SN65HVD230 transceivers, 120 Ω at each end).
 * Build NODE_A or NODE_B. Node A sends its button (PA0) as frame 0x100 every 100 ms and on change;
 * node B shows it on its LED and answers with frame 0x101. CAN IDs here are hypothetical.
 * Both start with a self-test in silent loopback mode, which needs no bus at all.
 */
#include <stdbool.h>
#include <stdint.h>
#include "stm32f103xb.h"
#include "can.h"
#include "clock.h"
#include "led.h"
#include "systick.h"
#include "uart_log.h"

#define ID_BUTTON 0x100U   /* hypothetical: node A -> B, data[0] = pressed, data[1] = counter */
#define ID_LED    0x101U   /* hypothetical: node B -> A, data[0] = LED state */

#if defined(NODE_A)
#define NODE_NAME "A"
#elif defined(NODE_B)
#define NODE_NAME "B"
#else
#error "define NODE_A or NODE_B"
#endif

static void put_frame(const char *dir, const can_frame_t *f)
{
    uart_puts(dir);
    uart_puts(" id ");
    uart_put_hex(f->id);
    uart_puts(" dlc ");
    uart_put_dec(f->dlc);
    uart_puts(" data0 ");
    uart_put_dec(f->data[0]);
    uart_puts("\n");
}

// [region:selftest]
static bool self_test(void)
{
    if (!can_init(CAN_BTR_500K_36MHZ, CAN_MODE_SILENT_LOOPBACK))     /* TX goes straight to RX */ // «11»
    {
        return false;
    }
    const can_frame_t probe = {0x7FFU, 2U, {0xCAU, 0xFEU}};
    (void)can_send(&probe);
    can_frame_t got;
    const uint32_t start = millis();
    while ((millis() - start) < 50U)
    {
        if (can_receive(&got))
        {
            return (got.id == probe.id) && (got.dlc == 2U) && (got.data[1] == 0xFEU);
        }
    }
    return false;
}
// [endregion]

#if defined(NODE_A)
static bool button_pressed(void)
{
    return (GPIOA->IDR & GPIO_IDR_IDR0) == 0U;
}
#endif

int main(void)
{
    (void)clock_init_72mhz();
    systick_init_1ms();
    uart_log_init(115200U);
    led_init();
    RCC->APB2ENR |= RCC_APB2ENR_IOPAEN;
    GPIOA->CRL = (GPIOA->CRL & ~(GPIO_CRL_CNF0 | GPIO_CRL_MODE0)) | GPIO_CRL_CNF0_1;
    GPIOA->BSRR = GPIO_BSRR_BS0;
    uart_puts("Example 11 node " NODE_NAME ": bxCAN 500 kbit/s on PB8/PB9\n");
    uart_puts(self_test() ? "self-test (silent loopback): OK\n" : "self-test (silent loopback): FAILED\n");
    if (!can_init(CAN_BTR_500K_36MHZ, CAN_MODE_NORMAL))
    {
        uart_puts("could not join the bus: no 11 recessive bits on CAN_RX (transceiver? wiring?)\n");
    }

    // [region:main]
    uint32_t next_report = 1000U, sent = 0U, received = 0U;
#if defined(NODE_A)
    uint32_t next_tx = 0U;
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
            if (f.id == ID_BUTTON)                                                                     // «12»
            {
                if (f.data[0] != 0U) { led_on(); } else { led_off(); }
                const can_frame_t reply = {ID_LED, 1U, {f.data[0]}};
                sent += can_send(&reply) ? 1U : 0U;
                put_frame("rx", &f);
            }
#else
            put_frame("rx", &f);
#endif
        }
#if defined(NODE_A)
        const bool b = button_pressed();
        if ((b != last_button) || ((int32_t)(now - next_tx) >= 0))       /* on change + every 100 ms */ // «13»
        {
            last_button = b;
            next_tx = now + 100U;
            const can_frame_t tx = {ID_BUTTON, 2U, {b ? 1U : 0U, (uint8_t)sent}};
            sent += can_send(&tx) ? 1U : 0U;
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
            uart_put_dec(can_tec());                                                                   // «14»
            uart_puts(" REC ");
            uart_put_dec(can_rec());
            uart_puts(" ");
            uart_puts(can_state());
            uart_puts("\n");
        }
    }
    // [endregion]
}
