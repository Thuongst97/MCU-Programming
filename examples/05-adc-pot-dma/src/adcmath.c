/* SPDX-License-Identifier: MIT */
#include "adcmath.h"

// [region:math]
uint32_t adc_vdda_mv(uint32_t vrefint_raw, uint32_t vrefint_cal)
{
    if (vrefint_raw == 0U)
    {
        return 0U;
    }
    return (VREFINT_CAL_VDDA_MV * vrefint_cal + (vrefint_raw / 2U)) / vrefint_raw;   /* rounded */ // «1»
}

uint32_t adc_pin_mv(uint32_t raw, uint32_t vrefint_raw, uint32_t vrefint_cal)
{
    if (vrefint_raw == 0U)
    {
        return 0U;
    }
    /* raw / 4095 x VDDA, with VDDA = 3000 x cal / vrefint_raw; 64-bit so nothing overflows */
    const uint64_t num = (uint64_t)raw * VREFINT_CAL_VDDA_MV * vrefint_cal;                          // «2»
    const uint64_t den = (uint64_t)vrefint_raw * 4095U;
    return (uint32_t)((num + (den / 2U)) / den);
}

uint32_t adc_mean(const volatile uint16_t *buf, uint32_t len, uint32_t first, uint32_t stride)
{
    uint32_t sum = 0U, n = 0U;
    for (uint32_t i = first; (stride != 0U) && (i < len); i += stride)
    {
        sum += buf[i];                                                                      // «3»
        ++n;
    }
    return (n == 0U) ? 0U : ((sum + (n / 2U)) / n);
}
// [endregion]
