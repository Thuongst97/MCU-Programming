/* SPDX-License-Identifier: MIT
 * Example 12, application: an ordinary program linked to run at 0x08004000. The only
 * differences to any other example are the linker script and the bootloader that starts it;
 * the shared SystemInit() points VTOR at this image's vector table. */
#include <stdint.h>

#include "clock.h"
#include "led.h"
#include "stm32g474xx.h"
#include "systick.h"
#include "uart_log.h"

#ifndef APP_VERSION
#define APP_VERSION 1U
#endif

// [region:main]
int main(void)
{
    const clock_status_t clk = clock_init_170mhz();   /* the bootloader left the reset clock */   // «1»
    led_init();
    systick_init_1ms();
    uart_log_init(115200U);
    uart_puts("app: version ");
    uart_put_dec(APP_VERSION);
    uart_puts(", vector table at ");
    uart_put_hex(SCB->VTOR);                                                                    // «2»
    uart_puts(clk == CLOCK_OK ? ", 170 MHz\n" : ", clock fault, HSI16\n");
    uart_puts("app: send r to reboot into the bootloader\n");
    for (;;)
    {
        delay_ms(500U);
        led_toggle();
        if (uart_getc_nonblocking() == 'r')
        {
            uart_puts("app: reboot\n");
            delay_ms(2U);
            NVIC_SystemReset();                      /* the bootloader runs again, with its window */ // «3»
        }
    }
}
// [endregion]
