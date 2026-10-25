/* SPDX-License-Identifier: MIT */
#include "turnlight_sm.h"

#include <stddef.h>

static uint32_t period_of(bool failed)
{
    return failed ? TL_FAST_PERIOD_MS : TL_PERIOD_MS;
}

static bool lamp_on(uint32_t phase_ms, bool failed)
{
    return (phase_ms % period_of(failed)) < (failed ? TL_FAST_ON_MS : TL_ON_MS);
}

static tl_side_t other(tl_side_t s)
{
    return (s == TL_LEFT) ? TL_RIGHT : TL_LEFT;
}

void tl_init(turnlight_t *t)
{
    t->mode = TL_MODE_IDLE;
    t->side = TL_LEFT;
    t->hazard = false;
    t->prev_stalk[TL_LEFT] = false;
    t->prev_stalk[TL_RIGHT] = false;
    t->phase_ms = 0U;
    t->hazard_phase_ms = 0U;
    t->held_ms = 0U;
    t->cycles = 0U;
}

static void start_turn(turnlight_t *t, tl_side_t s)
{
    t->mode = TL_MODE_TURN;
    t->side = s;
    t->phase_ms = 0U;                                       /* the lamp comes on at once */
    t->held_ms = 0U;
    t->cycles = 0U;
}

// [region:stalk]
static void stalk_logic(turnlight_t *t, const tl_inputs_t *in)
{
    for (uint32_t i = 0U; i < (uint32_t)TL_SIDES; ++i)
    {
        const tl_side_t s = (tl_side_t)i;
        const bool pressed = in->stalk[s] && !t->prev_stalk[s];
        const bool released = !in->stalk[s] && t->prev_stalk[s];
        if (pressed && !(t->mode == TL_MODE_TURN && t->side == other(s)))
        {
            start_turn(t, s);                               /* a new request wins over comfort */  // «1»
        }
        if (released && (t->mode == TL_MODE_TURN) && (t->side == s))
        {
            t->mode = (t->held_ms < TL_COMFORT_TAP_MS) ? TL_MODE_COMFORT : TL_MODE_IDLE;            // «2»
        }
        t->prev_stalk[s] = in->stalk[s];
    }
}
// [endregion]

// [region:step]
bool tl_step(turnlight_t *t, const tl_inputs_t *in, uint32_t dt_ms, tl_outputs_t *out)
{
    const tl_outputs_t before = *out;

    if (in->hazard_pressed)
    {
        t->hazard = !t->hazard;                             /* the hazard switch toggles */        // «3»
        t->hazard_phase_ms = 0U;
        if (t->hazard && (t->mode == TL_MODE_COMFORT))
        {
            t->mode = TL_MODE_IDLE;                         /* hazard cancels a comfort blink */
        }
    }
    stalk_logic(t, in);

    if (t->mode != TL_MODE_IDLE)
    {
        const uint32_t period = period_of(in->lamp_failed[t->side]);
        t->held_ms += (t->mode == TL_MODE_TURN) ? dt_ms : 0U;
        t->phase_ms += dt_ms;
        if (t->phase_ms >= period)
        {
            t->phase_ms -= period;
            t->cycles++;                                    /* one complete on + off */             // «4»
            if ((t->mode == TL_MODE_COMFORT) && (t->cycles >= TL_COMFORT_CYCLES))
            {
                t->mode = TL_MODE_IDLE;
            }
        }
    }
    if (t->hazard)
    {
        t->hazard_phase_ms = (t->hazard_phase_ms + dt_ms) % (TL_PERIOD_MS * TL_FAST_PERIOD_MS);
    }

    for (uint32_t i = 0U; i < (uint32_t)TL_SIDES; ++i)
    {
        const tl_side_t s = (tl_side_t)i;
        const bool turning = (t->mode != TL_MODE_IDLE) && (t->side == s);
        out->indicating[s] = turning || t->hazard;
        if (t->hazard)                                      /* hazard overrides: both sides in phase */ // «5»
        {
            out->lamp[s] = lamp_on(t->hazard_phase_ms, in->lamp_failed[s]);
        }
        else
        {
            out->lamp[s] = turning && lamp_on(t->phase_ms, in->lamp_failed[s]);
        }
    }
    out->hazard = t->hazard;
    return (before.lamp[TL_LEFT] != out->lamp[TL_LEFT]) || (before.lamp[TL_RIGHT] != out->lamp[TL_RIGHT]) ||
           (before.indicating[TL_LEFT] != out->indicating[TL_LEFT]) ||
           (before.indicating[TL_RIGHT] != out->indicating[TL_RIGHT]) || (before.hazard != out->hazard);
}
// [endregion]

const char *tl_mode_name(tl_mode_t m)
{
    static const char *const names[] = {"idle", "turn", "comfort"};
    return ((uint32_t)m < 3U) ? names[m] : "?";
}
