/* SPDX-License-Identifier: MIT
 * TurnLight capstone: the CAN messages (TL-REQ-006/007/010). IDs and layout are hypothetical,
 * made up for this course; see docs/can-matrix.md.
 *
 *   TurnLightStatus 0x3A0, DLC 4, ECU -> cluster, every 100 ms and on change
 *     byte 0  bit 0 LampLeft   bit 1 LampRight   bit 2 IndLeft   bit 3 IndRight
 *             bit 4 Hazard     bit 5 LampOutLeft bit 6 LampOutRight bit 7 ClusterLost
 *     byte 1  ResetCause (tl_reset_code_t)
 *     byte 2  AliveCounter (increments with every frame)
 *     byte 3  reserved, 0
 *   ClusterAck 0x3A1, DLC 1, cluster -> ECU, every 100 ms: byte 0 echoes the last AliveCounter
 */
#ifndef TL_MSG_H
#define TL_MSG_H

#include <stdbool.h>
#include <stdint.h>

#define TL_CAN_ID_STATUS     0x3A0U
#define TL_CAN_ID_ACK        0x3A1U
#define TL_STATUS_DLC        4U
#define TL_STATUS_CYCLE_MS   100U
#define TL_ACK_TIMEOUT_MS    500U

typedef enum
{
    TL_RESET_POWER_ON = 0, TL_RESET_PIN, TL_RESET_SOFTWARE, TL_RESET_IWDG, TL_RESET_WWDG, TL_RESET_LOW_POWER,
    TL_RESET_UNKNOWN
} tl_reset_code_t;

typedef struct
{
    bool lamp_left;
    bool lamp_right;
    bool ind_left;
    bool ind_right;
    bool hazard;
    bool out_left;
    bool out_right;
    bool cluster_lost;
    uint8_t reset_code;
    uint8_t alive;
} tl_status_t;

void tl_status_pack(const tl_status_t *s, uint8_t data[TL_STATUS_DLC]);
bool tl_status_unpack(const uint8_t *data, uint8_t dlc, tl_status_t *s);
const char *tl_reset_name(uint8_t cause);

/* Communication supervision of ClusterAck: call every dt_ms; returns true when "lost" changes. */
typedef struct
{
    uint32_t since_ms;
    bool lost;
} tl_comm_t;

void tl_comm_init(tl_comm_t *c);
bool tl_comm_step(tl_comm_t *c, bool ack_received, uint32_t dt_ms);

#endif
