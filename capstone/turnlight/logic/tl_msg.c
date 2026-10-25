/* SPDX-License-Identifier: MIT */
#include "tl_msg.h"

// [region:pack]
void tl_status_pack(const tl_status_t *s, uint8_t data[TL_STATUS_DLC])
{
    data[0] = (uint8_t)((s->lamp_left ? 0x01U : 0U) | (s->lamp_right ? 0x02U : 0U) |
                        (s->ind_left ? 0x04U : 0U) | (s->ind_right ? 0x08U : 0U) |
                        (s->hazard ? 0x10U : 0U) | (s->out_left ? 0x20U : 0U) |
                        (s->out_right ? 0x40U : 0U) | (s->cluster_lost ? 0x80U : 0U));
    data[1] = s->reset_cause;
    data[2] = s->alive;
    data[3] = 0U;                                           /* reserved: always send 0 */
}

bool tl_status_unpack(const uint8_t *data, uint8_t dlc, tl_status_t *s)
{
    if (dlc != TL_STATUS_DLC)
    {
        return false;                                       /* never decode a frame of the wrong size */
    }
    s->lamp_left = (data[0] & 0x01U) != 0U;
    s->lamp_right = (data[0] & 0x02U) != 0U;
    s->ind_left = (data[0] & 0x04U) != 0U;
    s->ind_right = (data[0] & 0x08U) != 0U;
    s->hazard = (data[0] & 0x10U) != 0U;
    s->out_left = (data[0] & 0x20U) != 0U;
    s->out_right = (data[0] & 0x40U) != 0U;
    s->cluster_lost = (data[0] & 0x80U) != 0U;
    s->reset_cause = data[1];
    s->alive = data[2];
    return true;
}
// [endregion]

const char *tl_reset_name(uint8_t cause)
{
    static const char *const names[] = {"power-on", "reset pin", "software", "independent watchdog",
                                        "window watchdog", "low-power", "unknown"};
    return names[(cause < (uint8_t)TL_RESET_UNKNOWN) ? cause : (uint8_t)TL_RESET_UNKNOWN];
}

// [region:comm]
void tl_comm_init(tl_comm_t *c)
{
    c->since_ms = 0U;
    c->lost = false;                                        /* give the cluster time after start-up */
}

bool tl_comm_step(tl_comm_t *c, bool ack_received, uint32_t dt_ms)
{
    const bool was = c->lost;
    if (ack_received)
    {
        c->since_ms = 0U;
        c->lost = false;
    }
    else if (c->since_ms < TL_ACK_TIMEOUT_MS)
    {
        c->since_ms += dt_ms;
        c->lost = c->since_ms >= TL_ACK_TIMEOUT_MS;        /* TL-REQ-007: more than 500 ms */
    }
    else
    {
        /* still lost; the counter stays saturated */
    }
    return was != c->lost;
}
// [endregion]
