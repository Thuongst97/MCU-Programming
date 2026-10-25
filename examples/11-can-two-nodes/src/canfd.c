/* SPDX-License-Identifier: MIT */
#include "canfd.h"

const can_timing_limits_t CAN_NOMINAL_LIMITS = {512U, 256U, 128U, 128U};
const can_timing_limits_t CAN_DATA_LIMITS = {32U, 32U, 16U, 16U};

// [region:timing]
int can_timing_calc(uint32_t fclk_hz, uint32_t bitrate, uint32_t sp_permille,
                    const can_timing_limits_t *lim, can_timing_t *t)
{
    if ((bitrate == 0U) || (sp_permille >= 1000U))
    {
        return -1;
    }
    for (uint32_t brp = 1U; brp <= lim->max_brp; ++brp)
    {
        if ((fclk_hz % (brp * bitrate)) != 0U)               /* only exact bit rates */           // «1»
        {
            continue;
        }
        const uint32_t tq = fclk_hz / (brp * bitrate);         /* quanta per bit */
        if (tq > 25U)
        {
            continue;                                          /* too fine: try a bigger prescaler */
        }
        if (tq < 8U)
        {
            return -1;                                         /* too coarse, and it only gets worse */
        }
        const uint32_t before_sp = (tq * sp_permille) / 1000U; /* 1 + tseg1, rounded down */     // «2»
        if (before_sp < 2U)
        {
            continue;
        }
        const uint32_t tseg1 = before_sp - 1U, tseg2 = tq - before_sp;
        if ((tseg1 > lim->max_tseg1) || (tseg2 < 1U) || (tseg2 > lim->max_tseg2))
        {
            continue;
        }
        t->brp = brp;
        t->tseg1 = tseg1;
        t->tseg2 = tseg2;
        t->sjw = (tseg2 < lim->max_sjw) ? tseg2 : lim->max_sjw;                                 // «3»
        return 0;
    }
    return -1;
}
// [endregion]

// [region:dlc]
static const uint8_t k_dlc_len[16] = {0U, 1U, 2U, 3U, 4U, 5U, 6U, 7U, 8U, 12U, 16U, 20U, 24U, 32U, 48U, 64U};

uint32_t can_dlc_to_len(uint32_t dlc)
{
    return (dlc < 16U) ? k_dlc_len[dlc] : 64U;
}

uint32_t can_len_to_dlc(uint32_t len)
{
    for (uint32_t dlc = 0U; dlc < 16U; ++dlc)
    {
        if (k_dlc_len[dlc] >= len)
        {
            return dlc;
        }
    }
    return 15U;
}
// [endregion]
