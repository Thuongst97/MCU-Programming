/* SPDX-License-Identifier: MIT */
#include "debounce.h"

void debounce_init(debounce_t *d, uint32_t settle_ms, bool pressed_now, uint32_t now_ms)
{
    d->stable_pressed = pressed_now;
    d->last_sample = pressed_now;
    d->since_ms = now_ms;
    d->settle_ms = settle_ms;
}

// [region:update]
debounce_event_t debounce_update(debounce_t *d, bool pressed_sample, uint32_t now_ms)
{
    if (pressed_sample != d->last_sample)        /* the contact moved (or bounced): restart */ // «1»
    {
        d->last_sample = pressed_sample;
        d->since_ms = now_ms;
        return DEBOUNCE_NONE;
    }
    if ((pressed_sample != d->stable_pressed) &&
        ((now_ms - d->since_ms) >= d->settle_ms))  /* held long enough: accept the new level */ // «2»
    {
        d->stable_pressed = pressed_sample;
        return pressed_sample ? DEBOUNCE_PRESSED : DEBOUNCE_RELEASED;
    }
    return DEBOUNCE_NONE;
}
// [endregion]
