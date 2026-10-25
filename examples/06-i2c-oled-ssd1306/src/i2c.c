/* SPDX-License-Identifier: MIT
 * I2C1 master, polling, following the event sequence of RM0008 §26.3.3 (master transmitter).
 * Every wait is bounded; a missing slave is reported as a NACK, never a hang. */
#include "i2c.h"

#include <stddef.h>
#include "stm32f103xb.h"
#include "clock.h"

#define I2C_WAIT 20000U

static i2c_status_t wait_sr1(uint32_t flag)
{
    for (uint32_t n = 0U; n < I2C_WAIT; ++n)
    {
        const uint32_t sr1 = I2C1->SR1;
        if ((sr1 & I2C_SR1_AF) != 0U)                       /* acknowledge failure */
        {
            I2C1->SR1 = ~I2C_SR1_AF;                         /* rc_w0: write 0 to clear */
            I2C1->CR1 |= I2C_CR1_STOP;
            return I2C_ERR_NACK;
        }
        if ((sr1 & flag) != 0U)
        {
            return I2C_OK;
        }
    }
    I2C1->CR1 |= I2C_CR1_STOP;
    return I2C_ERR_TIMEOUT;
}

// [region:recover]
/* If a slave was reset in the middle of a transfer it may still hold SDA low, and the F1's I2C
 * then sees the bus as busy forever (see the I2C section of errata sheet ES096). Clock SCL by hand
 * until the slave lets go of SDA, then reset the peripheral before configuring it. */
static void bus_recover(void)
{
    GPIOB->BSRR = GPIO_BSRR_BS6 | GPIO_BSRR_BS7;
    GPIOB->CRL = (GPIOB->CRL & ~(GPIO_CRL_MODE6 | GPIO_CRL_CNF6 | GPIO_CRL_MODE7 | GPIO_CRL_CNF7))
                 | GPIO_CRL_MODE6_1 | GPIO_CRL_CNF6_0      /* GPIO open-drain, 2 MHz */          // «1»
                 | GPIO_CRL_MODE7_1 | GPIO_CRL_CNF7_0;
    for (uint32_t i = 0U; (i < 9U) && ((GPIOB->IDR & GPIO_IDR_IDR7) == 0U); ++i)               // «2»
    {
        GPIOB->BSRR = GPIO_BSRR_BR6;
        for (volatile uint32_t d = 0U; d < 200U; ++d)
        {
        }
        GPIOB->BSRR = GPIO_BSRR_BS6;
        for (volatile uint32_t d = 0U; d < 200U; ++d)
        {
        }
    }
    I2C1->CR1 = I2C_CR1_SWRST;                              /* reset the I2C state machine */      // «3»
    I2C1->CR1 = 0U;
}
// [endregion]

// [region:init]
void i2c_init(void)
{
    RCC->APB2ENR |= RCC_APB2ENR_IOPBEN;
    RCC->APB1ENR |= RCC_APB1ENR_I2C1EN;
    bus_recover();
    GPIOB->CRL = (GPIOB->CRL & ~(GPIO_CRL_MODE6 | GPIO_CRL_CNF6 | GPIO_CRL_MODE7 | GPIO_CRL_CNF7))
                 | GPIO_CRL_MODE6 | GPIO_CRL_CNF6          /* AF open-drain, 50 MHz: I2C is open-drain */ // «4»
                 | GPIO_CRL_MODE7 | GPIO_CRL_CNF7;
    const uint32_t mhz = clock_pclk1() / 1000000U;          /* 36 */
    I2C1->CR2 = mhz;                                         /* FREQ: the peripheral's input clock */ // «5»
    I2C1->CCR = I2C_CCR_FS | (clock_pclk1() / (3U * 400000U)); /* fast mode, Tlow:Thigh = 2:1 */      // «6»
    I2C1->TRISE = ((mhz * 300U) / 1000U) + 1U;               /* 300 ns max rise time in fast mode */  // «7»
    I2C1->CR1 = I2C_CR1_PE;
}
// [endregion]

i2c_status_t i2c_probe(uint8_t addr7)
{
    return i2c_write(addr7, 0x00U, NULL, 0U);
}

// [region:write]
i2c_status_t i2c_write(uint8_t addr7, uint8_t prefix, const uint8_t *data, uint32_t len)
{
    uint32_t n = 0U;
    while ((I2C1->SR2 & I2C_SR2_BUSY) != 0U)                 /* wait for a free bus */
    {
        if (++n > I2C_WAIT)
        {
            return I2C_ERR_BUSY;
        }
    }
    I2C1->CR1 |= I2C_CR1_START;                                                                      // «8»
    i2c_status_t st = wait_sr1(I2C_SR1_SB);                  /* EV5: start condition sent */
    if (st != I2C_OK)
    {
        return st;
    }
    I2C1->DR = (uint8_t)(addr7 << 1);                        /* address + write bit (0) */           // «9»
    st = wait_sr1(I2C_SR1_ADDR);                             /* EV6: the slave acknowledged */
    if (st != I2C_OK)
    {
        return st;
    }
    (void)I2C1->SR2;                                         /* reading SR1 then SR2 clears ADDR */  // «10»
    for (uint32_t i = 0U; i <= len; ++i)
    {
        st = wait_sr1(I2C_SR1_TXE);                          /* EV8: data register empty */
        if (st != I2C_OK)
        {
            return st;
        }
        I2C1->DR = (i == 0U) ? prefix : data[i - 1U];
    }
    st = wait_sr1(I2C_SR1_BTF);                              /* EV8_2: last byte fully sent */       // «11»
    I2C1->CR1 |= I2C_CR1_STOP;
    return st;
}
// [endregion]
