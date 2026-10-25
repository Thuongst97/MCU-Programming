/* SPDX-License-Identifier: MIT
 * CAN bit timing and CAN FD lengths for example 11: pure functions, unit-tested on the host. */
#ifndef CANFD_H
#define CANFD_H

#include <stdint.h>

/* One bit = 1 (sync) + tseg1 + tseg2 time quanta; a quantum lasts brp kernel-clock periods.
 * The sample point sits after 1 + tseg1 quanta. sjw is how far a resync may move it. */
typedef struct
{
    uint32_t brp, tseg1, tseg2, sjw;
} can_timing_t;

/* Field limits of one bit-timing register (FDCAN_NBTP for the arbitration phase, FDCAN_DBTP for
 * the data phase; RM0440 "FDCAN"). */
typedef struct
{
    uint32_t max_brp, max_tseg1, max_tseg2, max_sjw;
} can_timing_limits_t;

extern const can_timing_limits_t CAN_NOMINAL_LIMITS;   /* NBTP: 512 / 256 / 128 / 128 */
extern const can_timing_limits_t CAN_DATA_LIMITS;      /* DBTP: 32 / 32 / 16 / 16 */

/* Find the smallest prescaler that gives an exact bit rate with 8..25 quanta per bit and a
 * sample point at or just below `sp_permille` (e.g. 850 = 85 %). 0 on success, -1 if none. */
int can_timing_calc(uint32_t fclk_hz, uint32_t bitrate, uint32_t sp_permille,
                    const can_timing_limits_t *lim, can_timing_t *t);

/* CAN FD data length code <-> bytes: 0..8 are themselves, then 12, 16, 20, 24, 32, 48, 64
 * (ISO 11898-1:2015). can_len_to_dlc rounds up: the frame carries padding bytes. */
uint32_t can_dlc_to_len(uint32_t dlc);
uint32_t can_len_to_dlc(uint32_t len);

#endif
