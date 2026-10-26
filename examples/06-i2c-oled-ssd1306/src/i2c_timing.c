/* SPDX-License-Identifier: MIT */
#include "i2c_timing.h"

/* I2C-bus minimums and maximums in ns (UM10204): standard mode (100 kHz) and fast mode (400 kHz). */
typedef struct
{
    uint32_t t_low_min;
    uint32_t t_high_min;
    uint32_t t_su_dat_min;
    uint32_t t_r_max;
    uint32_t t_f_max;
    uint32_t t_hd_dat_max;
} bus_mode_t;

#define T_AF_MIN_NS 50U           /* analog noise filter delay, minimum (RM0440 / DS12288) */

static uint32_t div_up(uint64_t a, uint64_t b)
{
    return (uint32_t)((a + b - 1U) / b);
}

// [region:calc]
/* Try one prescaler: 0 and the fields if everything fits, -1 otherwise. */
static int try_presc(uint32_t fclk_hz, uint32_t fscl_hz, const bus_mode_t *m, uint32_t presc, i2c_timing_t *t)
{
    const uint64_t tick_ps = (1000000000000ULL * ((uint64_t)presc + 1U)) / fclk_hz;
    const uint64_t clk_ps = 1000000000000ULL / fclk_hz;
    /* Low and high phases: at least the spec minimum, together at least one SCL period. */
    uint32_t low = div_up((uint64_t)m->t_low_min * 1000U, tick_ps);                 // «2»
    uint32_t high = div_up((uint64_t)m->t_high_min * 1000U, tick_ps);
    const uint32_t period = div_up(1000000000000ULL / fscl_hz, tick_ps);
    if ((low + high) < period)
    {
        const uint32_t extra = period - (low + high);
        low += extra / 2U;                                                          // «3»
        high += extra - (extra / 2U);
    }
    /* Data hold (SDADEL) and set-up (SCLDEL), with the RM0440 formulas (no digital filter). */
    const uint64_t hold_ps = (uint64_t)m->t_f_max * 1000U;                            // «4»
    const uint64_t skip_ps = ((uint64_t)T_AF_MIN_NS * 1000U) + (3U * clk_ps);
    const uint32_t sdadel = (hold_ps > skip_ps) ? div_up(hold_ps - skip_ps, tick_ps) : 0U;
    uint32_t scldel = div_up((uint64_t)(m->t_r_max + m->t_su_dat_min) * 1000U, tick_ps);  // «5»
    scldel = (scldel == 0U) ? 0U : (scldel - 1U);
    if ((low > 256U) || (high > 256U) || (sdadel > 15U) || (scldel > 15U) ||
        (((uint64_t)sdadel * tick_ps) > ((uint64_t)m->t_hd_dat_max * 1000U)))
    {
        return -1;
    }
    t->presc = presc;
    t->scll = low - 1U;
    t->sclh = high - 1U;
    t->sdadel = sdadel;
    t->scldel = scldel;
    return 0;
}

int i2c_timing_calc(uint32_t fclk_hz, uint32_t fscl_hz, i2c_timing_t *t)
{
    if ((fclk_hz == 0U) || (fscl_hz == 0U) || (fscl_hz > 400000U))
    {
        return -1;
    }
    static const bus_mode_t k_standard = {4700U, 4000U, 250U, 1000U, 300U, 3450U};
    static const bus_mode_t k_fast = {1300U, 600U, 100U, 300U, 300U, 900U};
    const bus_mode_t *m = (fscl_hz <= 100000U) ? &k_standard : &k_fast;
    /* Start with a tick of about 60 ns (fine resolution) and slow it down until every field
     * fits: the 4-bit SCLDEL/SDADEL fields need a longer tick in standard mode. */
    uint32_t presc = div_up(fclk_hz, 16000000U);                                    // «1»
    presc = (presc == 0U) ? 0U : (presc - 1U);
    for (; presc <= 15U; ++presc)
    {
        if (try_presc(fclk_hz, fscl_hz, m, presc, t) == 0)
        {
            return 0;
        }
    }
    return -1;
}
// [endregion]

uint32_t i2c_timing_reg(const i2c_timing_t *t)
{
    return (t->presc << 28) | (t->scldel << 20) | (t->sdadel << 16) | (t->sclh << 8) | t->scll;
}

uint32_t i2c_timing_tick_ps(uint32_t fclk_hz, const i2c_timing_t *t)
{
    return (uint32_t)((1000000000000ULL * (t->presc + 1U)) / fclk_hz);
}
