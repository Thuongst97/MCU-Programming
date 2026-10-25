/* SPDX-License-Identifier: MIT
 * "Breathing" brightness curve for a PWM-dimmed LED: pure logic, unit-tested on the host. */
#ifndef BREATH_H
#define BREATH_H

#include <stdint.h>

/* Duty (0..top) for step 0..period-1 of a breathing cycle: rises then falls, with a squared
 * curve because the eye perceives brightness roughly logarithmically: a linear duty ramp
 * looks like it jumps to bright and then barely changes. */
uint32_t breath_duty(uint32_t step, uint32_t period, uint32_t top);

#endif
