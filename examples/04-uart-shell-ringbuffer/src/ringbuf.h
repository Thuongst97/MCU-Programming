/* SPDX-License-Identifier: MIT
 * Single-producer single-consumer ring buffer for bytes, safe between ONE interrupt handler and
 * main() without disabling interrupts: the producer only writes `head`, the consumer only writes
 * `tail`, and each 32-bit index store is a single, atomic instruction on the Cortex-M3. */
#ifndef RINGBUF_H
#define RINGBUF_H

#include <stdbool.h>
#include <stdint.h>

#define RINGBUF_SIZE 64U   /* power of two: the index wrap is a cheap mask */
_Static_assert((RINGBUF_SIZE & (RINGBUF_SIZE - 1U)) == 0U, "RINGBUF_SIZE must be a power of two");

// [region:type]
typedef struct
{
    uint8_t buf[RINGBUF_SIZE];
    volatile uint32_t head;   /* next slot to write; written only by the producer */  // «1»
    volatile uint32_t tail;   /* next slot to read;  written only by the consumer */
} ringbuf_t;
// [endregion]

void ringbuf_init(ringbuf_t *rb);
bool ringbuf_put(ringbuf_t *rb, uint8_t byte);   /* false if full (byte dropped) */
bool ringbuf_get(ringbuf_t *rb, uint8_t *byte);  /* false if empty */
uint32_t ringbuf_count(const ringbuf_t *rb);

#endif
