/* SPDX-License-Identifier: MIT
 * TurnLight capstone, stages 1 and 2: the board layer. Every register access of the ECU node
 * lives here; the logic in ../logic never touches hardware.
 *
 *   PB12 / PB13 / PB14  left stalk / right stalk / hazard button, to GND, internal pull-up
 *   PA6 / PA7           left / right lamp: TIM3 CH1 / CH2, 1 kHz PWM (a LED + resistor each)
 *   PA1                 lamp current sense (ADC1 IN1): a potentiometer on the bench
 *   PB8 / PB9           CAN RX / TX (example 11's driver) to an SN65HVD230
 *   PA9 / PA10          USART1 log;  PC13 heartbeat LED
 */
#ifndef TL_HW_H
#define TL_HW_H

#include <stdbool.h>
#include <stdint.h>

#include "turnlight_sm.h"

typedef enum { TL_BTN_LEFT = 0, TL_BTN_RIGHT, TL_BTN_HAZARD, TL_BTN_COUNT } tl_button_t;

#define TL_PWM_TOP     1000U    /* duty in per mille */
#define TL_RAMP_MS     20U      /* TL-REQ-008: soft on/off */
#define TL_WDG_MS      100U     /* TL-REQ-009 */

bool tl_hw_init(void);                                  /* false if the ADC did not calibrate */
bool tl_hw_button_pressed(tl_button_t b);               /* raw level, not debounced */
void tl_hw_lamp_ramp(const bool on[TL_SIDES], uint32_t dt_ms);   /* call every few ms */
uint16_t tl_hw_lamp_current(void);                      /* 12-bit ADC reading, 0 on timeout */
uint8_t tl_hw_reset_cause(void);                        /* tl_reset_cause_t; clears the flags */
void tl_hw_wdg_start(void);
void tl_hw_wdg_feed(void);

#endif
