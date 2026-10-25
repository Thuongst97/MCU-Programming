/* SPDX-License-Identifier: MIT
 * Command bytes and timing limits come from the W25Q32/W25Q64 datasheets (Winbond). */
#include "w25q.h"

#include "jedec.h"
#include "spi.h"
#include "systick.h"

#define CMD_WRITE_ENABLE 0x06U
#define CMD_READ_STATUS1 0x05U
#define CMD_PAGE_PROGRAM 0x02U
#define CMD_READ_DATA    0x03U
#define CMD_SECTOR_ERASE 0x20U
#define CMD_JEDEC_ID     0x9FU
#define STATUS_BUSY      0x01U

static void send(const uint8_t *b, uint32_t n)
{
    for (uint32_t i = 0U; i < n; ++i)
    {
        (void)spi_xfer(b[i]);
    }
}

// [region:busy]
static bool wait_ready(uint32_t timeout_ms)
{
    const uint32_t start = millis();
    for (;;)
    {
        spi_select();
        (void)spi_xfer(CMD_READ_STATUS1);
        const uint8_t sr1 = spi_xfer(0xFFU);                     /* dummy byte clocks the status in */ // «1»
        spi_deselect();
        if ((sr1 & STATUS_BUSY) == 0U)
        {
            return true;
        }
        if ((millis() - start) > timeout_ms)
        {
            return false;                                        /* bounded, like every hardware wait */
        }
    }
}

static void write_enable(void)
{
    spi_select();
    (void)spi_xfer(CMD_WRITE_ENABLE);                            /* required before every erase/program */ // «2»
    spi_deselect();
}
// [endregion]

void w25q_read_id(uint8_t id[3])
{
    spi_select();
    (void)spi_xfer(CMD_JEDEC_ID);
    for (uint32_t i = 0U; i < 3U; ++i)
    {
        id[i] = spi_xfer(0xFFU);
    }
    spi_deselect();
}

// [region:erase-program]
bool w25q_erase_sector(uint32_t addr)
{
    uint8_t cmd[4];
    write_enable();
    flash_cmd_addr(CMD_SECTOR_ERASE, addr, cmd);
    spi_select();
    send(cmd, 4U);
    spi_deselect();                                              /* the erase starts when CS rises */ // «3»
    return wait_ready(500U);                                     /* datasheet: up to 400 ms per 4 KB */
}

bool w25q_program_page(uint32_t addr, const uint8_t *data, uint32_t len)
{
    if ((len == 0U) || (len > W25Q_PAGE) || (((addr % W25Q_PAGE) + len) > W25Q_PAGE))
    {
        return false;                                            /* never wrap inside a page */      // «4»
    }
    uint8_t cmd[4];
    write_enable();
    flash_cmd_addr(CMD_PAGE_PROGRAM, addr, cmd);
    spi_select();
    send(cmd, 4U);
    send(data, len);
    spi_deselect();
    return wait_ready(10U);                                      /* datasheet: up to 3 ms per page */
}
// [endregion]

void w25q_read(uint32_t addr, uint8_t *data, uint32_t len)
{
    uint8_t cmd[4];
    flash_cmd_addr(CMD_READ_DATA, addr, cmd);
    spi_select();
    send(cmd, 4U);
    for (uint32_t i = 0U; i < len; ++i)
    {
        data[i] = spi_xfer(0xFFU);
    }
    spi_deselect();
}

bool w25q_read_dma(uint32_t addr, uint8_t *data, uint32_t len)
{
    uint8_t cmd[4];
    flash_cmd_addr(CMD_READ_DATA, addr, cmd);
    spi_select();
    send(cmd, 4U);
    const bool ok = spi_read_dma(data, len);
    spi_deselect();
    return ok;
}
