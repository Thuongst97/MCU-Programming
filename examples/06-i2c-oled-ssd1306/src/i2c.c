/* SPDX-License-Identifier: MIT
 * I2C2 master on the STM32G4, polling (RM0440 "I2C", master transmitter). The G4's I2C works
 * per transfer: CR2 names the slave, the byte count and whether to send STOP by itself; the
 * code only feeds bytes when TXIS asks for one. Every wait is bounded; a missing slave is
 * reported as a NACK, never a hang. */
#include "i2c.h"

#include <stddef.h>
#include "stm32g474xx.h"
#include "clock.h"
#include "gpio.h"
#include "i2c_timing.h"

#define AF_PA9_I2C2_SCL 4U   /* Arduino D8; DS12288 alternate functions, checked by check-pins.py */
#define AF_PA8_I2C2_SDA 4U   /* Arduino D7 */
/* Not PB8/PB9 (D15/D14): PB8 is also BOOT0, and the pull-up on SCL would start ST's bootloader
 * instead of this program after every reset (RM0440 "Boot configuration"). */
#define I2C_WAIT 20000U

/* Wait until `flag` is set in ISR. A NACK ends the transfer (AUTOEND or not, the code sends STOP). */
static i2c_status_t wait_isr(uint32_t flag)
{
    for (uint32_t n = 0U; n < I2C_WAIT; ++n)
    {
        const uint32_t isr = I2C2->ISR;
        if ((isr & I2C_ISR_NACKF) != 0U)                    /* the slave did not acknowledge */
        {
            I2C2->ICR = I2C_ICR_NACKCF;
            I2C2->CR2 |= I2C_CR2_STOP;
            return I2C_ERR_NACK;
        }
        if ((isr & flag) != 0U)
        {
            return I2C_OK;
        }
    }
    I2C2->CR2 |= I2C_CR2_STOP;
    return I2C_ERR_TIMEOUT;
}

// [region:recover]
/* If a slave was reset in the middle of a transfer it may still hold SDA low, and the I2C
 * peripheral then sees the bus as busy forever. Clock SCL by hand (up to 9 pulses) until the
 * slave lets go of SDA, then reset the peripheral by switching it off (PE = 0). */
static void bus_recover(void)
{
    GPIOA->BSRR = GPIO_BSRR_BS9 | GPIO_BSRR_BS8;
    gpio_open_drain(GPIOA, 9U, 1);
    gpio_open_drain(GPIOA, 8U, 1);
    gpio_mode(GPIOA, 9U, BSP_GPIO_OUTPUT);                   /* GPIO open-drain for now */          // «1»
    gpio_mode(GPIOA, 8U, BSP_GPIO_OUTPUT);
    for (uint32_t i = 0U; (i < 9U) && ((GPIOA->IDR & GPIO_IDR_ID8) == 0U); ++i)                 // «2»
    {
        GPIOA->BSRR = GPIO_BSRR_BR9;
        for (volatile uint32_t d = 0U; d < 1000U; ++d)
        {
        }
        GPIOA->BSRR = GPIO_BSRR_BS9;
        for (volatile uint32_t d = 0U; d < 1000U; ++d)
        {
        }
    }
    I2C2->CR1 &= ~I2C_CR1_PE;                                /* PE = 0 resets the I2C logic */      // «3»
}
// [endregion]

// [region:init]
i2c_status_t i2c_init(void)
{
    gpio_clock_on(GPIOA);
    RCC->APB1ENR1 |= RCC_APB1ENR1_I2C2EN;                    /* kernel clock: PCLK1 (reset value) */
    (void)RCC->APB1ENR1;
    bus_recover();
    gpio_pull(GPIOA, 9U, BSP_GPIO_PULLUP);                   /* weak backup; the module has 4.7 k */
    gpio_pull(GPIOA, 8U, BSP_GPIO_PULLUP);
    gpio_af(GPIOA, 9U, AF_PA9_I2C2_SCL);                     /* still open-drain: I2C must never drive high */ // «4»
    gpio_af(GPIOA, 8U, AF_PA8_I2C2_SDA);
    i2c_timing_t t;
    if (i2c_timing_calc(clock_pclk1(), 400000U, &t) != 0)                                         // «5»
    {
        return I2C_ERR_TIMEOUT;
    }
    I2C2->TIMINGR = i2c_timing_reg(&t);        /* 170 MHz, 400 kHz: 0xA0640D18 */                  // «6»
    I2C2->CR1 = I2C_CR1_PE;                                                                       // «7»
    return I2C_OK;
}
// [endregion]

i2c_status_t i2c_probe(uint8_t addr7)
{
    return i2c_write(addr7, 0x00U, NULL, 0U);
}

/* NBYTES counts at most 255; longer transfers run in chunks with RELOAD set until the last. */
static uint32_t chunk_bits(uint32_t left)
{
    const uint32_t n = (left > 255U) ? 255U : left;
    return (n << I2C_CR2_NBYTES_Pos) | ((left > 255U) ? I2C_CR2_RELOAD : I2C_CR2_AUTOEND);
}

// [region:write]
i2c_status_t i2c_write(uint8_t addr7, uint8_t prefix, const uint8_t *data, uint32_t len)
{
    uint32_t n = 0U;
    while ((I2C2->ISR & I2C_ISR_BUSY) != 0U)                 /* wait for a free bus */
    {
        if (++n > I2C_WAIT)
        {
            return I2C_ERR_BUSY;
        }
    }
    uint32_t left = len + 1U;                                /* the prefix byte, then the data */
    I2C2->CR2 = ((uint32_t)addr7 << (I2C_CR2_SADD_Pos + 1U))  /* 7-bit address in SADD[7:1], write */ // «8»
              | chunk_bits(left) | I2C_CR2_START;            /* START, address, then bytes */      // «9»
    for (uint32_t i = 0U; i <= len; ++i)
    {
        i2c_status_t st = wait_isr(I2C_ISR_TXIS);           /* the peripheral wants the next byte */ // «10»
        if (st != I2C_OK)
        {
            return st;
        }
        I2C2->TXDR = (i == 0U) ? prefix : data[i - 1U];
        --left;
        if ((left != 0U) && (((len + 1U - left) % 255U) == 0U))   /* chunk done, more to come */
        {
            st = wait_isr(I2C_ISR_TCR);                     /* transfer complete, reload */
            if (st != I2C_OK)
            {
                return st;
            }
            I2C2->CR2 = (I2C2->CR2 & ~(I2C_CR2_NBYTES | I2C_CR2_RELOAD | I2C_CR2_AUTOEND)) | chunk_bits(left);
        }
    }
    const i2c_status_t st = wait_isr(I2C_ISR_STOPF);        /* AUTOEND sent STOP after the last byte */ // «11»
    I2C2->ICR = I2C_ICR_STOPCF;
    return st;
}
// [endregion]
