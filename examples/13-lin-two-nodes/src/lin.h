/* SPDX-License-Identifier: MIT
 * LIN frame helpers (ISO 17987 / LIN 2.x): protected identifier and checksums.
 * Pure functions, unit-tested on the host. */
#ifndef LIN_H
#define LIN_H

#include <stdbool.h>
#include <stdint.h>

#define LIN_SYNC 0x55U

uint8_t lin_pid(uint8_t id);                                  /* 6-bit ID + parity bits P0, P1 */
bool lin_pid_ok(uint8_t pid);                                 /* parity check on reception */
uint8_t lin_checksum(const uint8_t *data, uint32_t n, uint8_t pid, bool enhanced);

#endif
