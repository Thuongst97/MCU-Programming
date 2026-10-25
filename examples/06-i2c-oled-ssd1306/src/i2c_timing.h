/* SPDX-License-Identifier: MIT
 * I2C TIMINGR calculation for the STM32G4's I2C peripheral (RM0440 "I2C timings"): pure maths,
 * unit-tested on the host. Instead of pasting a magic register value from a tool, the fields
 * are derived from the I2C-bus specification's minimum times (UM10204, standard and fast mode). */
#ifndef I2C_TIMING_H
#define I2C_TIMING_H

#include <stdint.h>

typedef struct
{
    uint32_t presc;    /* I2C clock divided by PRESC + 1 gives the timing tick */
    uint32_t scll;     /* SCL low  = (SCLL + 1) ticks */
    uint32_t sclh;     /* SCL high = (SCLH + 1) ticks */
    uint32_t sdadel;   /* data hold delay after SCL falls, in ticks */
    uint32_t scldel;   /* data set-up delay before SCL rises = (SCLDEL + 1) ticks */
} i2c_timing_t;

/* Fill `t` for an I2C kernel clock `fclk_hz` and a target SCL `fscl_hz` (<= 400 kHz).
 * Returns 0 on success, -1 if the fields cannot hold the result. */
int i2c_timing_calc(uint32_t fclk_hz, uint32_t fscl_hz, i2c_timing_t *t);

/* Pack the fields into the TIMINGR layout: PRESC[31:28] SCLDEL[23:20] SDADEL[19:16]
 * SCLH[15:8] SCLL[7:0]. */
uint32_t i2c_timing_reg(const i2c_timing_t *t);

/* Length of one tick in picoseconds (for tests and the UART report). */
uint32_t i2c_timing_tick_ps(uint32_t fclk_hz, const i2c_timing_t *t);

#endif
