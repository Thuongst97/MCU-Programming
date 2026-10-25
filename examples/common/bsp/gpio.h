/* SPDX-License-Identifier: MIT
 * Small helpers for the STM32G4 GPIO block (RM0440 "GPIO"). Each pin has a 2-bit field in
 * MODER, OSPEEDR and PUPDR, a 1-bit field in OTYPER and a 4-bit field in AFR[0] (pins 0-7) or
 * AFR[1] (pins 8-15). These helpers only do the read-modify-write with the right shifts;
 * gpio.html shows the same writes done by hand. */
#ifndef BSP_GPIO_H
#define BSP_GPIO_H

#include <stdint.h>
#include "stm32g474xx.h"

typedef enum
{
    BSP_GPIO_INPUT = 0U,    /* MODER = 00 */
    BSP_GPIO_OUTPUT = 1U,   /* MODER = 01 */
    BSP_GPIO_AF = 2U,       /* MODER = 10: the pin belongs to a peripheral */
    BSP_GPIO_ANALOG = 3U    /* MODER = 11: reset state of most pins, lowest power */
} bsp_gpio_mode_t;

typedef enum
{
    BSP_GPIO_NOPULL = 0U,   /* PUPDR = 00 */
    BSP_GPIO_PULLUP = 1U,   /* PUPDR = 01 */
    BSP_GPIO_PULLDOWN = 2U  /* PUPDR = 10 */
} bsp_gpio_pull_t;

void gpio_clock_on(const GPIO_TypeDef *port);   /* RCC_AHB2ENR bit for this port */
void gpio_mode(GPIO_TypeDef *port, uint32_t pin, bsp_gpio_mode_t mode);
void gpio_pull(GPIO_TypeDef *port, uint32_t pin, bsp_gpio_pull_t pull);
void gpio_open_drain(GPIO_TypeDef *port, uint32_t pin, int on);
void gpio_speed(GPIO_TypeDef *port, uint32_t pin, uint32_t speed);   /* 0 low .. 3 very high */
void gpio_af(GPIO_TypeDef *port, uint32_t pin, uint32_t af);          /* sets AFR, then MODER = AF */

#endif
