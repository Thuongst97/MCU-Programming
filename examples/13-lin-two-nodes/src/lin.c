/* SPDX-License-Identifier: MIT */
#include "lin.h"

// [region:pid]
uint8_t lin_pid(uint8_t id)
{
    const uint8_t b = id & 0x3FU;
    const uint8_t p0 = (uint8_t)((b ^ (b >> 1U) ^ (b >> 2U) ^ (b >> 4U)) & 1U);            // «1»
    const uint8_t p1 = (uint8_t)((((b >> 1U) ^ (b >> 3U) ^ (b >> 4U) ^ (b >> 5U)) & 1U) ^ 1U);           // «2»
    return (uint8_t)(b | (uint8_t)(p0 << 6U) | (uint8_t)(p1 << 7U));
}

bool lin_pid_ok(uint8_t pid)
{
    return lin_pid(pid & 0x3FU) == pid;
}
// [endregion]

// [region:checksum]
uint8_t lin_checksum(const uint8_t *data, uint32_t n, uint8_t pid, bool enhanced)
{
    uint32_t sum = enhanced ? (uint32_t)pid : 0U;                       /* LIN 2.x: the PID is included */  // «3»
    for (uint32_t i = 0U; i < n; ++i)
    {
        sum += data[i];
        if (sum > 0xFFU)
        {
            sum -= 0xFFU;                                     /* add the carry back in */           // «4»
        }
    }
    return (uint8_t)~sum;                                                                           // «5»
}
// [endregion]
