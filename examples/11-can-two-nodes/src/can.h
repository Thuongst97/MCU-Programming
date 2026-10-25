/* SPDX-License-Identifier: MIT
 * bxCAN driver for the Blue Pill: CAN_RX on PB8, CAN_TX on PB9 (AFIO remap), standard 11-bit IDs,
 * receive FIFO 0 by interrupt. RM0008 chapter 24. */
#ifndef CAN_H
#define CAN_H

#include <stdbool.h>
#include <stdint.h>

typedef struct
{
    uint16_t id;        /* 11-bit standard identifier */
    uint8_t dlc;        /* 0..8 data bytes */
    uint8_t data[8];
} can_frame_t;

typedef enum { CAN_MODE_NORMAL, CAN_MODE_SILENT_LOOPBACK } can_mode_t;

/* 500 kbit/s from PCLK1 = 36 MHz: BRP 4, 1 + 15 + 2 = 18 quanta, sample point 88.9 %. */
#define CAN_BTR_500K_36MHZ ((1U << CAN_BTR_TS2_Pos) | (14U << CAN_BTR_TS1_Pos) | (3U << CAN_BTR_BRP_Pos))

bool can_init(uint32_t btr, can_mode_t mode);
bool can_send(const can_frame_t *f);          /* false if all three mailboxes are busy */
bool can_receive(can_frame_t *f);             /* false if nothing is queued */
uint32_t can_tec(void);
uint32_t can_rec(void);
const char *can_state(void);                  /* "error active", "error passive" or "bus off" */

#endif
