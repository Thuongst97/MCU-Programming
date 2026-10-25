/* SPDX-License-Identifier: MIT
 * The update protocol of example 12: framing, CRC-32 and a byte-by-byte frame parser.
 * Pure logic, unit-tested on the host; host/blproto.py builds the same frames in Python.
 *
 *   frame = 0xA5, cmd, len (2 bytes, little endian), payload[len], crc32 (4 bytes, little endian)
 *   crc32 covers cmd, len and payload. The bootloader answers each frame with one byte:
 *   ACK 0x79 or NACK 0x1F (the same values as ST's built-in bootloader, AN3155).
 */
#ifndef PROTO_H
#define PROTO_H

#include <stdbool.h>
#include <stdint.h>

#define PROTO_SOF       0xA5U
#define PROTO_ACK       0x79U
#define PROTO_NACK      0x1FU
#define PROTO_MAX_DATA  260U        /* WRITE: 4-byte offset + up to 256 data bytes */

enum
{
    CMD_HELLO = 0x01,   /* -> ACK */
    CMD_ERASE = 0x02,   /* erase the application slot */
    CMD_WRITE = 0x03,   /* payload: offset (u32 LE), data (even length, <= 256) */
    CMD_DONE  = 0x04,   /* payload: size (u32 LE), crc32 (u32 LE) of the whole image */
    CMD_RUN   = 0x05    /* start the application */
};

typedef struct
{
    uint8_t cmd;
    uint16_t len;
    uint8_t data[PROTO_MAX_DATA];
} proto_frame_t;

typedef enum { PROTO_NONE, PROTO_FRAME, PROTO_BAD_CRC, PROTO_TOO_LONG } proto_event_t;

typedef struct
{
    uint32_t state, got, crc_rx;
    proto_frame_t frame;
} proto_parser_t;

uint32_t crc32_update(uint32_t crc, const uint8_t *p, uint32_t n);   /* start with 0, IEEE 802.3 */
void proto_reset(proto_parser_t *p);
proto_event_t proto_feed(proto_parser_t *p, uint8_t byte);           /* PROTO_FRAME: p->frame is complete */
uint32_t get_u32le(const uint8_t *b);

#endif
