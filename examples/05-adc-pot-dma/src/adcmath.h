/* SPDX-License-Identifier: MIT
 * ADC arithmetic for example 05: pure functions, unit-tested on the host. */
#ifndef ADCMATH_H
#define ADCMATH_H

#include <stdint.h>

#define VREFINT_MV 1200U   /* internal reference, typical 1.20 V (DS5319: 1.16 V to 1.24 V) */

/* Supply voltage VDDA in mV, measured through the internal reference (channel 17). */
uint32_t adc_vdda_mv(uint32_t vrefint_raw);

/* Millivolts on a pin for a 12-bit reading, scaled with the measured VDDA. 0 if vrefint_raw is 0. */
uint32_t adc_pin_mv(uint32_t raw, uint32_t vrefint_raw);

/* Mean of every `stride`-th sample starting at `first` (one channel out of an interleaved
 * scan buffer). Returns 0 for an empty selection. */
uint32_t adc_mean(const volatile uint16_t *buf, uint32_t len, uint32_t first, uint32_t stride);

#endif
