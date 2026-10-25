/* SPDX-License-Identifier: MIT */
#include "lampmon.h"

void lampmon_init(lampmon_t *m)
{
    for (uint32_t i = 0U; i < (uint32_t)TL_SIDES; ++i)
    {
        m->on_ms[i] = 0U;
        m->sampled[i] = false;
        m->failed[i] = false;
    }
}

// [region:step]
void lampmon_step(lampmon_t *m, const bool lamp[TL_SIDES], uint16_t current_raw, uint32_t dt_ms,
                  lampmon_event_t ev[TL_SIDES])
{
    for (uint32_t i = 0U; i < (uint32_t)TL_SIDES; ++i)
    {
        ev[i] = LAMPMON_NO_CHANGE;
        if (!lamp[i])
        {
            m->on_ms[i] = 0U;                              /* a new on-phase starts a new judgement */
            m->sampled[i] = false;
            continue;
        }
        m->on_ms[i] += dt_ms;
        if (m->sampled[i] || (m->on_ms[i] < LAMPMON_SETTLE_MS))
        {
            continue;                                      /* once per on-phase, after the ramp */ // «1»
        }
        m->sampled[i] = true;
        const bool bad = current_raw < LAMPMON_MIN_RAW;
        if (bad != m->failed[i])
        {
            m->failed[i] = bad;
            ev[i] = bad ? LAMPMON_FAILED : LAMPMON_HEALED;                                          // «2»
        }
    }
}
// [endregion]
