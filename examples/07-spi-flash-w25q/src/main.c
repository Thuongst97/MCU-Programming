/* SPDX-License-Identifier: MIT
 * Example 07: talk to a W25Qxx SPI NOR flash on SPI2: read its JEDEC ID, erase a 4 KB sector,
 * program a page, read it back by polling and with DMA, and verify. RM0440 "SPI", "DMA", "DMAMUX".
 */
#include <stdbool.h>
#include <stdint.h>
#include "clock.h"
#include "jedec.h"
#include "spi.h"
#include "systick.h"
#include "uart_log.h"
#include "w25q.h"

#define TEST_ADDR 0x001000U   /* sector 1: leaves sector 0 alone in case it holds data you care about */

static uint8_t s_out[W25Q_PAGE], s_in[W25Q_PAGE];

static void put_hex8(uint8_t b)
{
    static const char hex[] = "0123456789ABCDEF";
    uart_putc(hex[b >> 4]);
    uart_putc(hex[b & 0xFU]);
}

static uint32_t mismatches(const uint8_t *a, const uint8_t *b, uint32_t n)
{
    uint32_t bad = 0U;
    for (uint32_t i = 0U; i < n; ++i)
    {
        bad += (a[i] != b[i]) ? 1U : 0U;
    }
    return bad;
}

int main(void)
{
    (void)clock_init_170mhz();
    systick_init_1ms();
    uart_log_init(115200U);
    uart_puts("Example 07: SPI2 + W25Qxx flash (CS on PB12)\n");
    spi_init();

    // [region:main]
    uint8_t id[3];
    w25q_read_id(id);                                                                         // «5»
    uart_puts("JEDEC ID ");
    put_hex8(id[0]);
    uart_putc(' ');
    put_hex8(id[1]);
    uart_putc(' ');
    put_hex8(id[2]);
    uart_puts(": ");
    uart_puts(jedec_vendor(id[0]));
    uart_puts(", ");
    uart_put_dec(jedec_capacity_bytes(id[2]) / 1024U);
    uart_puts(" KB\n");
    if ((id[0] == 0x00U) || (id[0] == 0xFFU))
    {
        uart_puts("no flash answering: check CS (PB12), wiring and 3.3 V supply\n");           // «6»
        for (;;)
        {
        }
    }

    for (uint32_t i = 0U; i < W25Q_PAGE; ++i)
    {
        s_out[i] = (uint8_t)(i ^ 0x5AU);
    }
    uart_puts(w25q_erase_sector(TEST_ADDR) ? "erase sector 0x001000: OK\n" : "erase: timeout\n");
    w25q_read(TEST_ADDR, s_in, W25Q_PAGE);
    uart_puts((s_in[0] == 0xFFU && s_in[W25Q_PAGE - 1U] == 0xFFU) ? "erased bytes read 0xFF: OK\n" : "erase check FAILED\n"); // «7»
    uart_puts(w25q_program_page(TEST_ADDR, s_out, W25Q_PAGE) ? "program 256 bytes: OK\n" : "program: timeout\n");
    w25q_read(TEST_ADDR, s_in, W25Q_PAGE);
    uart_puts("verify (polling): ");
    uart_put_dec(mismatches(s_out, s_in, W25Q_PAGE));
    uart_puts(" mismatches\n");
    for (uint32_t i = 0U; i < W25Q_PAGE; ++i)
    {
        s_in[i] = 0U;
    }
    const bool dma_ok = w25q_read_dma(TEST_ADDR, s_in, W25Q_PAGE);                            // «8»
    uart_puts("verify (DMA): ");
    if (dma_ok)
    {
        uart_put_dec(mismatches(s_out, s_in, W25Q_PAGE));
        uart_puts(" mismatches\n");
    }
    else
    {
        uart_puts("DMA timeout\n");
    }
    // [endregion]
    for (;;)
    {
    }
}
