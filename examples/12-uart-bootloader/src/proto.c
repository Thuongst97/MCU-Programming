/* SPDX-License-Identifier: MIT */
#include "proto.h"

// [region:crc]
uint32_t crc32_update(uint32_t crc, const uint8_t *p, uint32_t n)
{
    crc = ~crc;                                                   /* same result as zlib.crc32() */  // «1»
    for (uint32_t i = 0U; i < n; ++i)
    {
        crc ^= p[i];
        for (uint32_t k = 0U; k < 8U; ++k)
        {
            crc = (crc >> 1) ^ (0xEDB88320UL & (0UL - (crc & 1UL)));   /* reflected polynomial */
        }
    }
    return ~crc;
}
// [endregion]

uint32_t get_u32le(const uint8_t *b)
{
    return (uint32_t)b[0] | ((uint32_t)b[1] << 8) | ((uint32_t)b[2] << 16) | ((uint32_t)b[3] << 24);
}

void proto_reset(proto_parser_t *p)
{
    p->state = 0U;
    p->got = 0U;
    p->crc_rx = 0U;
}

// [region:parser]
proto_event_t proto_feed(proto_parser_t *p, uint8_t byte)
{
    switch (p->state)
    {
    case 0U:                                                      /* hunt for start of frame */      // «2»
        if (byte == PROTO_SOF)
        {
            p->state = 1U;
        }
        return PROTO_NONE;
    case 1U:
        p->frame.cmd = byte;
        p->state = 2U;
        return PROTO_NONE;
    case 2U:
        p->frame.len = byte;
        p->state = 3U;
        return PROTO_NONE;
    case 3U:
        p->frame.len = (uint16_t)(p->frame.len | ((uint16_t)byte << 8));
        p->got = 0U;
        if (p->frame.len > PROTO_MAX_DATA)
        {
            proto_reset(p);
            return PROTO_TOO_LONG;                                /* never overflow the buffer */    // «3»
        }
        p->state = (p->frame.len == 0U) ? 5U : 4U;
        return PROTO_NONE;
    case 4U:
        p->frame.data[p->got++] = byte;
        if (p->got == p->frame.len)
        {
            p->got = 0U;
            p->state = 5U;
        }
        return PROTO_NONE;
    default:                                                      /* 4 CRC bytes */
    {
        p->crc_rx |= (uint32_t)byte << (8U * p->got);
        if (++p->got < 4U)
        {
            return PROTO_NONE;
        }
        const uint8_t hdr[3] = {p->frame.cmd, (uint8_t)p->frame.len, (uint8_t)(p->frame.len >> 8)};
        const uint32_t crc = crc32_update(crc32_update(0U, hdr, 3U), p->frame.data, p->frame.len);
        const uint32_t rx = p->crc_rx;
        proto_reset(p);
        return (crc == rx) ? PROTO_FRAME : PROTO_BAD_CRC;                                             // «4»
    }
    }
}
// [endregion]
