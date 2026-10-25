/* SPDX-License-Identifier: MIT
 * Turning the Cortex-M3 fault status registers into words, and the reset-cause flags of
 * RCC_CSR into a name. Pure functions (bit positions as in CMSIS core_cm3.h and RM0008), so they
 * are unit-tested on the host. */
#ifndef FAULTDECODE_H
#define FAULTDECODE_H

#include <stdint.h>

/* Appends the names of the set bits of CFSR and HFSR to buf ("DIVBYZERO FORCED"). Returns buf. */
char *fault_describe(uint32_t cfsr, uint32_t hfsr, char *buf, uint32_t size);
/* Highest-priority reset cause from RCC_CSR bits 31:26, e.g. "independent watchdog". */
const char *reset_cause(uint32_t csr);

#endif
