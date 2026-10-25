/* SPDX-License-Identifier: MIT
 * TurnLight capstone: the turn-signal / hazard state machine (TL-REQ-001..005).
 * Pure logic: no registers, no time source, no OS. The caller steps it every few milliseconds
 * with debounced inputs and gets lamp commands back. All three capstone stages (bare metal,
 * FreeRTOS, AUTOSAR-style) run this same file; only the integration around it changes.
 */
#ifndef TURNLIGHT_SM_H
#define TURNLIGHT_SM_H

#include <stdbool.h>
#include <stdint.h>

/* TL-REQ-002: 1.5 Hz target. 670 ms period = 1.49 Hz (-0.5 %), 330 ms on = 49 % duty. */
#define TL_PERIOD_MS        670U
#define TL_ON_MS            330U
/* TL-REQ-005: a failed lamp flashes at double frequency. */
#define TL_FAST_PERIOD_MS   340U
#define TL_FAST_ON_MS       170U
/* TL-REQ-004: a tap shorter than this gives exactly TL_COMFORT_CYCLES flashes. */
#define TL_COMFORT_TAP_MS   500U
#define TL_COMFORT_CYCLES   3U

typedef enum { TL_LEFT = 0, TL_RIGHT = 1, TL_SIDES = 2 } tl_side_t;

typedef enum
{
    TL_MODE_IDLE = 0,
    TL_MODE_TURN,       /* stalk held */
    TL_MODE_COMFORT     /* stalk tapped: finishing TL_COMFORT_CYCLES flashes */
} tl_mode_t;

typedef struct
{
    bool stalk[TL_SIDES];       /* debounced: true while the left/right stalk button is held */
    bool hazard_pressed;        /* edge: the hazard button was pressed since the last step */
    bool lamp_failed[TL_SIDES]; /* from the lamp monitor (TL-REQ-005) */
} tl_inputs_t;

typedef struct
{
    bool lamp[TL_SIDES];        /* lamp commands for this step (the flasher output) */
    bool indicating[TL_SIDES];  /* the side is active (also during the off phase) */
    bool hazard;
} tl_outputs_t;

typedef struct
{
    tl_mode_t mode;
    tl_side_t side;             /* valid in TURN and COMFORT */
    bool hazard;
    bool prev_stalk[TL_SIDES];
    uint32_t phase_ms;          /* position in the current flash cycle (turn or comfort) */
    uint32_t hazard_phase_ms;
    uint32_t held_ms;           /* how long the stalk has been held */
    uint32_t cycles;            /* completed flash cycles in this activation */
} turnlight_t;

void tl_init(turnlight_t *t);
/* Advance by dt_ms; returns true when any output differs from the previous step. */
bool tl_step(turnlight_t *t, const tl_inputs_t *in, uint32_t dt_ms, tl_outputs_t *out);
const char *tl_mode_name(tl_mode_t m);

#endif
