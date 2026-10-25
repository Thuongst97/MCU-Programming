/* SPDX-License-Identifier: MIT */
#include "adcmath.h"

// [region:math]
uint32_t adc_vdda_mv(uint32_t vrefint_raw)
{
    if (vrefint_raw == 0U)
    {
        return 0U;
    }
    return (VREFINT_MV * 4095U + (vrefint_raw / 2U)) / vrefint_raw;     /* rounded */      // «1»
}

uint32_t adc_pin_mv(uint32_t raw, uint32_t vrefint_raw)
{
    if (vrefint_raw == 0U)
    {
        return 0U;
    }
    return (raw * VREFINT_MV + (vrefint_raw / 2U)) / vrefint_raw;      /* VDDA cancels out */ // «2»
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
