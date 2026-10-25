/* SPDX-License-Identifier: MIT
 * Flash layout shared by the bootloader and the application of example 12 (must match ld/). */
#ifndef LAYOUT_H
#define LAYOUT_H

#define FLASH_PAGE_SIZE   1024U          /* medium-density F103: 1 KB pages (PM0075) */
#define BL_BASE           0x08000000UL   /* bootloader, 15 KB of code */
#define RECORD_ADDR       0x08003C00UL   /* last page of the 16 KB slot: image record */
#define APP_BASE          0x08004000UL   /* application slot */
#define APP_SIZE_MAX      (48UL * 1024UL)
#define RECORD_MAGIC      0xB0071DADUL

typedef struct
{
    uint32_t magic;   /* RECORD_MAGIC when valid */
    uint32_t size;    /* bytes of application image */
    uint32_t crc;     /* CRC-32 of those bytes */
    uint32_t check;   /* ~(magic ^ size ^ crc): catches a half-written record */
} image_record_t;

#endif
