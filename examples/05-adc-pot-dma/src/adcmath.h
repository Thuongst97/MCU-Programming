/* SPDX-License-Identifier: MIT
 * ADC arithmetic for example 05: pure functions, unit-tested on the host. */
#ifndef ADCMATH_H
#define ADCMATH_H

#include <stdint.h>

/* ST measures Vrefint on every chip at the factory with VDDA = 3.0 V and stores the 12-bit
 * reading (VREFINT_CAL) in system memory (RM0440 "Internal voltage reference"; the address is
 * in main.c). Comparing today's reading with it gives the real VDDA. */
#define VREFINT_CAL_VDDA_MV 3000U

/* Supply voltage VDDA in mV, from today's Vrefint reading and the factory value. 0 if raw is 0. */
uint32_t adc_vdda_mv(uint32_t vrefint_raw, uint32_t vrefint_cal);

/* Millivolts on a pin for a 12-bit reading, scaled with the measured VDDA. 0 if vrefint_raw is 0. */
uint32_t adc_pin_mv(uint32_t raw, uint32_t vrefint_raw, uint32_t vrefint_cal);

/* Mean of every `stride`-th sample starting at `first` (one channel out of an interleaved
 * scan buffer). Returns 0 for an empty selection. */
uint32_t adc_mean(const volatile uint16_t *buf, uint32_t len, uint32_t first, uint32_t stride);

#endif
