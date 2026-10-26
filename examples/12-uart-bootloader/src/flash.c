/* SPDX-License-Identifier: MIT */
#include "flash.h"

#include "stm32g474xx.h"

/* The unlock keys (RM0440 "Unlocking the flash memory"): the CMSIS header does not name them. */
#define FLASH_UNLOCK_KEY1 0x45670123UL
#define FLASH_UNLOCK_KEY2 0xCDEF89ABUL
#define FLASH_BANK2_BASE  (FLASH_BASE + 0x40000UL)   /* dual-bank mode: 2 x 256 KB */
#define FLASH_WAIT 1000000U
#define FLASH_ERRORS (FLASH_SR_OPERR | FLASH_SR_PROGERR | FLASH_SR_WRPERR | FLASH_SR_PGAERR | \
                      FLASH_SR_SIZERR | FLASH_SR_PGSERR | FLASH_SR_MISERR | FLASH_SR_FASTERR)

static bool wait_done(void)
{
    for (uint32_t n = 0U; n < FLASH_WAIT; ++n)
    {
        if ((FLASH->SR & FLASH_SR_BSY) == 0U)
        {
            const bool ok = (FLASH->SR & FLASH_ERRORS) == 0U;
            FLASH->SR = FLASH_SR_EOP | FLASH_ERRORS;              /* write 1 to clear */
            return ok;
        }
    }
    return false;
}

// [region:unlock]
void flash_unlock(void)
{
    if ((FLASH->CR & FLASH_CR_LOCK) != 0U)
    {
        FLASH->KEYR = FLASH_UNLOCK_KEY1;                          /* a wrong key locks the flash until reset */ // «1»
        FLASH->KEYR = FLASH_UNLOCK_KEY2;
    }
}

void flash_lock(void)
{
    FLASH->CR |= FLASH_CR_LOCK;
}
// [endregion]

uint32_t flash_page_size(void)
{
    return ((FLASH->OPTR & FLASH_OPTR_DBANK) != 0U) ? 2048U : 4096U;
}

// [region:erase]
bool flash_erase_page(uint32_t addr)
{
    if (!wait_done())                                             /* also clears stale error flags */
    {
        return false;
    }
    const bool dual = (FLASH->OPTR & FLASH_OPTR_DBANK) != 0U;
    const bool bank2 = dual && (addr >= FLASH_BANK2_BASE);
    const uint32_t page = (addr - (bank2 ? FLASH_BANK2_BASE : FLASH_BASE)) / flash_page_size();
    FLASH->CR = (FLASH->CR & ~(FLASH_CR_PNB | FLASH_CR_BKER))
              | (page << FLASH_CR_PNB_Pos)                        /* which page ... */                 // «2»
              | (bank2 ? FLASH_CR_BKER : 0U)                      /* ... in which bank */
              | FLASH_CR_PER;                                     /* page erase */
    FLASH->CR |= FLASH_CR_STRT;
    const bool ok = wait_done();                                  /* the CPU stalls on flash reads meanwhile */
    FLASH->CR &= ~FLASH_CR_PER;
    return ok;
}
// [endregion]

// [region:program]
bool flash_program(uint32_t addr, const uint8_t *data, uint32_t len)
{
    if (((addr % 8U) != 0U) || ((len % 8U) != 0U))
    {
        return false;
    }
    for (uint32_t i = 0U; i < len; i += 8U)
    {
        uint32_t lo = 0U, hi = 0U;
        for (uint32_t b = 0U; b < 4U; ++b)
        {
            lo |= (uint32_t)data[i + b] << (8U * b);
            hi |= (uint32_t)data[i + 4U + b] << (8U * b);
        }
        if (!wait_done())
        {
            return false;
        }
        FLASH->CR |= FLASH_CR_PG;                                 /* program mode */                   // «3»
        *(volatile uint32_t *)(addr + i) = lo;                    /* the G4 programs 64 bits: */       // «4»
        *(volatile uint32_t *)(addr + i + 4U) = hi;               /* the second write starts it */
        const bool ok = wait_done();
        FLASH->CR &= ~FLASH_CR_PG;
        if (!ok || (*(volatile const uint32_t *)(addr + i) != lo) ||
            (*(volatile const uint32_t *)(addr + i + 4U) != hi))  /* verify every double word */        // «5»
        {
            return false;
        }
    }
    return true;
}
// [endregion]
