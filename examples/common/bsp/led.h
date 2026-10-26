/* SPDX-License-Identifier: MIT
 * LD2, the NUCLEO-G474RE's green user LED on PA5 (Arduino D13). The pin drives the LED through
 * a resistor to GND, so the pin SOURCES current: writing 1 turns the LED on (active-high).
 * ST's NUCLEO BSP (stm32g4xx_nucleo.c) does the same. */
#ifndef BSP_LED_H
#define BSP_LED_H

void led_init(void);
void led_on(void);
void led_off(void);
void led_toggle(void);

#endif
