/* SPDX-License-Identifier: MIT */
#include "gpio.h"

void gpio_clock_on(const GPIO_TypeDef *port)
{
    /* The GPIO ports sit 0x400 apart from GPIOA, and their enable bits in RCC_AHB2ENR are
     * bits 0 (A) to 6 (G) in the same order. */
    const uint32_t index = ((uint32_t)(uintptr_t)port - GPIOA_BASE) / (GPIOB_BASE - GPIOA_BASE);
    RCC->AHB2ENR |= (RCC_AHB2ENR_GPIOAEN << index);
    (void)RCC->AHB2ENR;   /* read back: the clock is on before the first register access */
}

// [region:mode]
void gpio_mode(GPIO_TypeDef *port, uint32_t pin, bsp_gpio_mode_t mode)
{
    const uint32_t shift = pin * 2U;                                    // «1»
    port->MODER = (port->MODER & ~(3UL << shift)) | ((uint32_t)mode << shift);   // «2»
}
// [endregion]

void gpio_pull(GPIO_TypeDef *port, uint32_t pin, bsp_gpio_pull_t pull)
{
    const uint32_t shift = pin * 2U;
    port->PUPDR = (port->PUPDR & ~(3UL << shift)) | ((uint32_t)pull << shift);
}

void gpio_open_drain(GPIO_TypeDef *port, uint32_t pin, int on)
{
    if (on != 0)
    {
        port->OTYPER |= (1UL << pin);
    }
    else
    {
        port->OTYPER &= ~(1UL << pin);
    }
}

void gpio_speed(GPIO_TypeDef *port, uint32_t pin, uint32_t speed)
{
    const uint32_t shift = pin * 2U;
    port->OSPEEDR = (port->OSPEEDR & ~(3UL << shift)) | ((speed & 3U) << shift);
}

// [region:af]
void gpio_af(GPIO_TypeDef *port, uint32_t pin, uint32_t af)
{
    const uint32_t reg = pin / 8U;                 /* AFR[0] = AFRL (pins 0-7), AFR[1] = AFRH */  // «3»
    const uint32_t shift = (pin % 8U) * 4U;        /* 4 bits per pin */
    port->AFR[reg] = (port->AFR[reg] & ~(0xFUL << shift)) | ((af & 0xFU) << shift);   // «4»
    gpio_mode(port, pin, BSP_GPIO_AF);             /* AF first, then hand the pin over */  // «5»
}
// [endregion]
