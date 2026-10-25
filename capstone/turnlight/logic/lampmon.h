/* SPDX-License-Identifier: MIT
 * TurnLight capstone: lamp-out detection (TL-REQ-005). A lamp that is commanded on but draws too
 * little current has failed (open filament or wire). The current is sampled once per on-phase,
 * after the 20 ms soft-start ramp has finished, and a failure heals when a later sample is good.
 * On the bench one potentiometer on PA1 stands in for the current sense of every lamp. */
#ifndef LAMPMON_H
#define LAMPMON_H

#include <stdbool.h>
#include <stdint.h>

#include "turnlight_sm.h"

#define LAMPMON_SETTLE_MS  60U      /* 20 ms ramp + margin before the current is meaningful */
#define LAMPMON_MIN_RAW    400U     /* ADC counts (12 bit); below this the lamp is out */

typedef enum { LAMPMON_NO_CHANGE = 0, LAMPMON_FAILED, LAMPMON_HEALED } lampmon_event_t;

typedef struct
{
    uint32_t on_ms[TL_SIDES];
    bool sampled[TL_SIDES];         /* this on-phase has been judged */
    bool failed[TL_SIDES];
} lampmon_t;

void lampmon_init(lampmon_t *m);
/* Call with the lamp commands and the current reading; ev[] receives one event per side. */
void lampmon_step(lampmon_t *m, const bool lamp[TL_SIDES], uint16_t current_raw, uint32_t dt_ms,
                  lampmon_event_t ev[TL_SIDES]);

#endif
