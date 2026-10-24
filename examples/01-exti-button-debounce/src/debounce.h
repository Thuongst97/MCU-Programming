/* SPDX-License-Identifier: MIT
 * Button debouncing as a pure state machine: no registers, no time source, so it runs (and is
 * unit-tested) on the host as well as on the Blue Pill. */
#ifndef DEBOUNCE_H
#define DEBOUNCE_H

#include <stdint.h>
#include <stdbool.h>

typedef enum
{
    DEBOUNCE_NONE = 0,
    DEBOUNCE_PRESSED,     /* stable press confirmed */
    DEBOUNCE_RELEASED     /* stable release confirmed */
} debounce_event_t;

typedef struct
{
    bool stable_pressed;  /* the debounced state */
    bool last_sample;     /* the most recent raw reading */
    uint32_t since_ms;    /* when last_sample last changed */
    uint32_t settle_ms;   /* how long a level must hold to count */
} debounce_t;

void debounce_init(debounce_t *d, uint32_t settle_ms, bool pressed_now, uint32_t now_ms);

/* Feed one raw sample (true = pressed). Returns an event when the stable state changes. */
debounce_event_t debounce_update(debounce_t *d, bool pressed_sample, uint32_t now_ms);

#endif
