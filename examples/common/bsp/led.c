/* SPDX-License-Identifier: MIT */
#include "led.h"
#include "stm32f103xb.h"

void led_init(void)
{
    RCC->APB2ENR |= RCC_APB2ENR_IOPCEN;   /* clock the GPIOC block */
    /* PC13: CRH bits 23:20. MODE = 10 (output, 2 MHz max), CNF = 00 (push-pull). */
    GPIOC->CRH = (GPIOC->CRH & ~(GPIO_CRH_MODE13 | GPIO_CRH_CNF13)) | GPIO_CRH_MODE13_1;
    led_off();
}

void led_on(void)
{
    GPIOC->BSRR = GPIO_BSRR_BR13;   /* reset = drive low = LED on (active-low) */
}

void led_off(void)
{
    GPIOC->BSRR = GPIO_BSRR_BS13;   /* set = drive high = LED off */
}

void led_toggle(void)
{
    if ((GPIOC->ODR & GPIO_ODR_ODR13) != 0U)
    {
        led_on();
    }
    else
    {
        led_off();
    }
}
