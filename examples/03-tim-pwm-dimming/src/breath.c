/* SPDX-License-Identifier: MIT */
#include "breath.h"

// [region:breath]
uint32_t breath_duty(uint32_t step, uint32_t period, uint32_t top)
{
    if ((period < 2U) || (top == 0U))
    {
        return 0U;
    }
    const uint32_t half = period / 2U;
    step %= period;
    const uint32_t x = (step < half) ? step : (period - step);    /* triangle 0..half..0 */  // «1»
    /* (x / half)^2 * top in integers; 64-bit intermediate so top * half^2 cannot overflow */
    return (uint32_t)(((uint64_t)top * x * x) / ((uint64_t)half * half));                  // «2»
}
// [endregion]
