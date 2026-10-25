/* SPDX-License-Identifier: MIT
 * Bad-vs-good gallery for module 17: the same function written twice. */
#ifndef GALLERY_H
#define GALLERY_H

#include <stdbool.h>
#include <stdint.h>

/* 1. signed/unsigned comparison: is a signed temperature below an unsigned limit? */
bool bad_below_limit(int32_t temp, uint32_t limit);
bool good_below_limit(int32_t temp, uint32_t limit);

/* 2. operator precedence: is the TXE flag (bit 7) set in a status value? */
bool bad_txe_set(uint32_t sr);
bool good_txe_set(uint32_t sr);

/* 3. narrowing: number of bytes still to send, stored in a small type */
uint8_t bad_remaining(uint32_t total, uint32_t sent);
bool good_remaining(uint32_t total, uint32_t sent, uint8_t *out);

/* 4. tick wrap-around: has a timeout of `period` ms expired since `start`? */
bool bad_expired(uint32_t now, uint32_t start, uint32_t period);
bool good_expired(uint32_t now, uint32_t start, uint32_t period);

#endif
