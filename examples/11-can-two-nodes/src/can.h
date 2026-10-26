/* SPDX-License-Identifier: MIT
 * FDCAN1 driver for the NUCLEO-G474RE: FDCAN1_RX on PA11, FDCAN1_TX on PA12, standard 11-bit IDs,
 * classic CAN and CAN FD frames, receive FIFO 0 by interrupt. RM0440 "FDCAN". */
#ifndef CAN_H
#define CAN_H

#include <stdbool.h>
#include <stdint.h>
#include "canfd.h"

typedef struct
{
    uint16_t id;        /* 11-bit standard identifier */
    uint8_t len;        /* 0..8 bytes (classic) or up to 64 (CAN FD) */
    bool fd;            /* CAN FD frame (FDF bit) */
    bool brs;           /* switch to the data bit rate for the data phase (FD only) */
    uint8_t data[64];
} can_frame_t;

typedef enum { CAN_MODE_NORMAL, CAN_MODE_INTERNAL_LOOPBACK } can_mode_t;

/* `data` == NULL: classic CAN only. Otherwise CAN FD is allowed, with that data-phase timing. */
bool can_init(const can_timing_t *nominal, const can_timing_t *data, can_mode_t mode);
bool can_send(const can_frame_t *f);          /* false if the 3-entry TX FIFO is full */
bool can_receive(can_frame_t *f);             /* false if nothing is queued */
uint32_t can_tec(void);
uint32_t can_rec(void);
const char *can_state(void);                  /* "error active", "error passive" or "bus off" */

#endif
