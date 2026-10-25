/* SPDX-License-Identifier: MIT */
#include "flash.h"

#include "stm32f103xb.h"

#define FLASH_WAIT 1000000U

static bool wait_done(void)
{
    for (uint32_t n = 0U; n < FLASH_WAIT; ++n)
    {
        if ((FLASH->SR & FLASH_SR_BSY) == 0U)
        {
            const bool ok = (FLASH->SR & (FLASH_SR_PGERR | FLASH_SR_WRPRTERR)) == 0U;
            FLASH->SR = FLASH_SR_EOP | FLASH_SR_PGERR | FLASH_SR_WRPRTERR;   /* write 1 to clear */
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
        FLASH->KEYR = FLASH_KEY1;                                 /* PM0075 key sequence; a wrong key locks the FPEC until reset */ // «1»
        FLASH->KEYR = FLASH_KEY2;
    }
}

void flash_lock(void)
{
    FLASH->CR |= FLASH_CR_LOCK;
}
// [endregion]

// [region:erase]
bool flash_erase_page(uint32_t addr)
{
    if (!wait_done())
    {
        return false;
    }
    FLASH->CR |= FLASH_CR_PER;                                    /* page erase */                     // «2»
    FLASH->AR = addr;                                             /* any address inside the page */
    FLASH->CR |= FLASH_CR_STRT;
    const bool ok = wait_done();                                  /* the CPU stalls on flash reads meanwhile */
    FLASH->CR &= ~FLASH_CR_PER;
    return ok;
}
// [endregion]

// [region:program]
bool flash_program(uint32_t addr, const uint8_t *data, uint32_t len)
{
    for (uint32_t i = 0U; i < len; i += 2U)
    {
        const uint16_t hw = (uint16_t)(data[i] | ((uint16_t)data[i + 1U] << 8));
        if (!wait_done())
        {
            return false;
        }
        FLASH->CR |= FLASH_CR_PG;                                 /* program mode */                   // «3»
        *(volatile uint16_t *)(addr + i) = hw;                    /* the F1 writes 16 bits at a time */ // «4»
        const bool ok = wait_done();
        FLASH->CR &= ~FLASH_CR_PG;
        if (!ok || (*(volatile const uint16_t *)(addr + i) != hw)) /* verify every half-word */        // «5»
        {
            return false;
        }
    }
    return true;
}
// [endregion]
