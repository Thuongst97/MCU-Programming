/* SPDX-License-Identifier: MIT
 * Polling I2C master on I2C1 (PB8 = SCL = Arduino D15, PB9 = SDA = D14), fast mode 400 kHz.
 * RM0440 "I2C". */
#ifndef I2C_H
#define I2C_H

#include <stdint.h>

typedef enum
{
    I2C_OK = 0,
    I2C_ERR_BUSY,      /* the bus never became free */
    I2C_ERR_NACK,      /* the slave did not acknowledge (absent, wrong address) */
    I2C_ERR_TIMEOUT    /* an expected event flag never came */
} i2c_status_t;

i2c_status_t i2c_init(void);   /* computes TIMINGR; fails only if the clock is impossible */
i2c_status_t i2c_probe(uint8_t addr7);
/* One transaction: START, address+W, `prefix` byte, `len` data bytes, STOP. */
i2c_status_t i2c_write(uint8_t addr7, uint8_t prefix, const uint8_t *data, uint32_t len);

#endif
