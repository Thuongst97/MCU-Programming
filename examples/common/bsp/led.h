/* SPDX-License-Identifier: MIT
 * The Blue Pill's on-board LED on PC13. It is wired from 3.3 V through a resistor to the pin,
 * so the pin must SINK current: writing 0 turns the LED on (active-low). PC13 can sink only
 * about 3 mA, must run at <= 2 MHz and must never source current (DS5319 pin notes). */
#ifndef BSP_LED_H
#define BSP_LED_H

void led_init(void);
void led_on(void);
void led_off(void);
void led_toggle(void);

#endif
