/* SPDX-License-Identifier: MIT
 * The "good" half of the gallery, built with the course's full warning set. */
#include "gallery.h"

#define TXE (1UL << 7)

// [region:sign]
bool good_below_limit(int32_t temp, uint32_t limit)
{
    if (temp < 0)
    {
        return true;                     /* every negative value is below any unsigned limit */
    }
    return (uint32_t)temp < limit;       /* now both operands are unsigned, by intent */
}
// [endregion]

// [region:prec]
bool good_txe_set(uint32_t sr)
{
    return (sr & TXE) != 0U;             /* parentheses say what is meant */
}
// [endregion]

// [region:narrow]
bool good_remaining(uint32_t total, uint32_t sent, uint8_t *out)
{
    if ((sent > total) || ((total - sent) > UINT8_MAX))
    {
        return false;                    /* the caller must handle "doesn't fit" */
    }
    *out = (uint8_t)(total - sent);      /* explicit cast after the range check */
    return true;
}
// [endregion]

// [region:wrap]
bool good_expired(uint32_t now, uint32_t start, uint32_t period)
{
    return (now - start) >= period;      /* unsigned subtraction is correct across the wrap */
}
// [endregion]
