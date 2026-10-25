/* SPDX-License-Identifier: MIT */
#include "ringbuf.h"

void ringbuf_init(ringbuf_t *rb)
{
    rb->head = 0U;
    rb->tail = 0U;
}

// [region:putget]
/* head and tail run freely and wrap at 2^32; head - tail is always the number of bytes
 * stored, even across the wrap, because unsigned subtraction is modulo 2^32. */
uint32_t ringbuf_count(const ringbuf_t *rb)
{
    return rb->head - rb->tail;                                     // «2»
}

bool ringbuf_put(ringbuf_t *rb, uint8_t byte)
{
    const uint32_t head = rb->head;
    if ((head - rb->tail) >= RINGBUF_SIZE)
    {
        return false;                                               /* full: drop, never block */
    }
    rb->buf[head & (RINGBUF_SIZE - 1U)] = byte;                     // «3»
    rb->head = head + 1U;   /* publish AFTER the data is stored */  // «4»
    return true;
}

bool ringbuf_get(ringbuf_t *rb, uint8_t *byte)
{
    const uint32_t tail = rb->tail;
    if (rb->head == tail)
    {
        return false;
    }
    *byte = rb->buf[tail & (RINGBUF_SIZE - 1U)];
    rb->tail = tail + 1U;   /* free the slot AFTER reading it */    // «5»
    return true;
}
// [endregion]
