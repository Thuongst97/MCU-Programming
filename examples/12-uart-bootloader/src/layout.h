/* SPDX-License-Identifier: MIT
 * Flash layout shared by the bootloader and the application of example 12 (must match ld/).
 * The G474's page size depends on the DBANK option bit: 2 KB in dual-bank mode, 4 KB in
 * single-bank mode (RM0440 "Flash memory organization"). Everything here sits on 4 KB
 * boundaries so it works in both. */
#ifndef LAYOUT_H
#define LAYOUT_H

#define BL_BASE           0x08000000UL   /* bootloader, 12 KB of code */
#define RECORD_ADDR       0x08003000UL   /* last 4 KB of the 16 KB slot: image record */
#define APP_BASE          0x08004000UL   /* application slot */
#define APP_SIZE_MAX      (240UL * 1024UL)   /* up to the end of bank 1 (0x08040000) */
#define RECORD_MAGIC      0xB0071DADUL

typedef struct
{
    uint32_t magic;   /* RECORD_MAGIC when valid */
    uint32_t size;    /* bytes of application image */
    uint32_t crc;     /* CRC-32 of those bytes */
    uint32_t check;   /* ~(magic ^ size ^ crc): catches a half-written record */
} image_record_t;

#endif
