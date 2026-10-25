/* SPDX-License-Identifier: MIT
 * The "bad" half of the gallery. Compiled with -Wno-sign-compare -Wno-conversion
 * -Wno-parentheses (see CMake): each function contains the defect those warnings report. */
#include "gallery.h"

#define TXE (1UL << 7)

// [region:sign]
bool bad_below_limit(int32_t temp, uint32_t limit)
{
    return temp < limit;                 /* temp is converted to unsigned: -1 becomes 4294967295 */
}
// [endregion]

// [region:prec]
bool bad_txe_set(uint32_t sr)
{
    return sr & TXE != 0U;               /* parsed as sr & (TXE != 0U), i.e. sr & 1 */
}
// [endregion]

// [region:narrow]
uint8_t bad_remaining(uint32_t total, uint32_t sent)
{
    return total - sent;                 /* 300 bytes left becomes 44 */
}
// [endregion]

// [region:wrap]
bool bad_expired(uint32_t now, uint32_t start, uint32_t period)
{
    return now >= start + period;        /* start + period can wrap past 0xFFFFFFFF */
}
// [endregion]
