/* SPDX-License-Identifier: MIT */
#include "jedec.h"

const char *jedec_vendor(uint8_t manufacturer)
{
    switch (manufacturer)
    {
    case 0xEFU:
        return "Winbond";
    case 0x20U:
        return "Micron";
    case 0xC2U:
        return "Macronix";
    case 0xC8U:
        return "GigaDevice";
    default:
        return "unknown";
    }
}

uint32_t jedec_capacity_bytes(uint8_t code)
{
    if ((code < 0x10U) || (code > 0x1FU))
    {
        return 0U;
    }
    return 1UL << code;                    /* e.g. 0x16 -> 4 MB (W25Q32), 0x17 -> 8 MB (W25Q64) */
}

// [region:addr]
void flash_cmd_addr(uint8_t cmd, uint32_t addr, uint8_t out[4])
{
    out[0] = cmd;
    out[1] = (uint8_t)(addr >> 16);        /* address goes out MSB first */  // «1»
    out[2] = (uint8_t)(addr >> 8);
    out[3] = (uint8_t)addr;
}
// [endregion]
