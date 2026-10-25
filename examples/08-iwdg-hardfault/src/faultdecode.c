/* SPDX-License-Identifier: MIT */
#include "faultdecode.h"

#include <stdbool.h>
#include <string.h>

typedef struct
{
    uint8_t bit;
    const char *name;
} flag_t;

// [region:tables]
static const flag_t s_cfsr[] = {
    {25U, "DIVBYZERO"}, {24U, "UNALIGNED"}, {19U, "NOCP"}, {18U, "INVPC"},                  /* UsageFault */ // «1»
    {17U, "INVSTATE"}, {16U, "UNDEFINSTR"},
    {15U, "BFARVALID"}, {12U, "STKERR"}, {11U, "UNSTKERR"}, {10U, "IMPRECISERR"},            /* BusFault */
    {9U, "PRECISERR"}, {8U, "IBUSERR"},
    {7U, "MMARVALID"}, {4U, "MSTKERR"}, {3U, "MUNSTKERR"}, {1U, "DACCVIOL"}, {0U, "IACCVIOL"},  /* MemManage */
};
static const flag_t s_hfsr[] = {{31U, "DEBUGEVT"}, {30U, "FORCED"}, {1U, "VECTTBL"}};                       // «2»
// [endregion]

static void append(char *buf, uint32_t size, const char *word)
{
    const size_t used = strlen(buf);
    if ((used + strlen(word) + 2U) <= size)
    {
        if (used != 0U)
        {
            strcat(buf, " ");
        }
        strcat(buf, word);
    }
}

char *fault_describe(uint32_t cfsr, uint32_t hfsr, char *buf, uint32_t size)
{
    if (size == 0U)
    {
        return buf;
    }
    buf[0] = '\0';
    bool any = false;
    for (uint32_t i = 0U; i < (sizeof s_cfsr / sizeof s_cfsr[0]); ++i)
    {
        if ((cfsr & (1UL << s_cfsr[i].bit)) != 0U)
        {
            append(buf, size, s_cfsr[i].name);
            any = true;
        }
    }
    for (uint32_t i = 0U; i < (sizeof s_hfsr / sizeof s_hfsr[0]); ++i)
    {
        if ((hfsr & (1UL << s_hfsr[i].bit)) != 0U)
        {
            append(buf, size, s_hfsr[i].name);
            any = true;
        }
    }
    if (!any)
    {
        append(buf, size, "none");
    }
    return buf;
}

// [region:reset-cause]
const char *reset_cause(uint32_t csr)
{
    if ((csr & (1UL << 29)) != 0U) { return "independent watchdog"; }                          // «3»
    if ((csr & (1UL << 30)) != 0U) { return "window watchdog"; }
    if ((csr & (1UL << 31)) != 0U) { return "low-power management"; }
    if ((csr & (1UL << 28)) != 0U) { return "software (SYSRESETREQ)"; }
    if ((csr & (1UL << 27)) != 0U) { return "power-on"; }                                      // «4»
    if ((csr & (1UL << 26)) != 0U) { return "reset pin"; }
    return "unknown";
}
// [endregion]
