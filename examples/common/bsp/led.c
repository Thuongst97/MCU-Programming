/* SPDX-License-Identifier: MIT */
#include "led.h"
#include "board.h"
#include "gpio.h"

void led_init(void)
{
    gpio_clock_on(BOARD_LED_PORT);                               /* RCC_AHB2ENR.GPIOAEN */
    led_off();                                                   /* set the level first ... */
    gpio_mode(BOARD_LED_PORT, BOARD_LED_PIN, BSP_GPIO_OUTPUT);   /* ... then drive the pin */
}

void led_on(void)
{
    BOARD_LED_PORT->BSRR = GPIO_BSRR_BS5;   /* set = drive high = LED on (active-high) */
}

void led_off(void)
{
    BOARD_LED_PORT->BSRR = GPIO_BSRR_BR5;   /* reset = drive low = LED off */
}

// [region:toggle]
void led_toggle(void)
{
    if ((BOARD_LED_PORT->ODR & GPIO_ODR_OD5) != 0U)   /* read back what we last drove */  // «1»
    {
        led_off();
    }
    else
    {
        led_on();
    }
}
// [endregion]
