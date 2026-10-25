/* SPDX-License-Identifier: MIT
 * Host tests for the SPSC ring buffer (example 04). */
#include "ringbuf.h"
#include "unity.h"

static ringbuf_t rb;

void setUp(void) { ringbuf_init(&rb); }
void tearDown(void) {}

static void test_empty_then_fifo_order(void)
{
    uint8_t b;
    TEST_ASSERT_FALSE(ringbuf_get(&rb, &b));
    TEST_ASSERT_TRUE(ringbuf_put(&rb, 1U));
    TEST_ASSERT_TRUE(ringbuf_put(&rb, 2U));
    TEST_ASSERT_EQUAL_UINT32(2U, ringbuf_count(&rb));
    TEST_ASSERT_TRUE(ringbuf_get(&rb, &b));
    TEST_ASSERT_EQUAL_UINT8(1U, b);
    TEST_ASSERT_TRUE(ringbuf_get(&rb, &b));
    TEST_ASSERT_EQUAL_UINT8(2U, b);
    TEST_ASSERT_FALSE(ringbuf_get(&rb, &b));
}

static void test_full_drops_and_keeps_old_data(void)
{
    for (uint32_t i = 0U; i < RINGBUF_SIZE; ++i)
    {
        TEST_ASSERT_TRUE(ringbuf_put(&rb, (uint8_t)i));
    }
    TEST_ASSERT_FALSE(ringbuf_put(&rb, 0xAAU));
    uint8_t b;
    TEST_ASSERT_TRUE(ringbuf_get(&rb, &b));
    TEST_ASSERT_EQUAL_UINT8(0U, b);
}

static void test_indices_wrap_at_2_pow_32(void)
{
    rb.head = 0xFFFFFFFEU;   /* start just below the wrap */
    rb.tail = 0xFFFFFFFEU;
    for (uint8_t i = 0U; i < 5U; ++i)
    {
        TEST_ASSERT_TRUE(ringbuf_put(&rb, i));
    }
    TEST_ASSERT_EQUAL_UINT32(5U, ringbuf_count(&rb));
    for (uint8_t i = 0U; i < 5U; ++i)
    {
        uint8_t b;
        TEST_ASSERT_TRUE(ringbuf_get(&rb, &b));
        TEST_ASSERT_EQUAL_UINT8(i, b);
    }
    TEST_ASSERT_EQUAL_UINT32(0U, ringbuf_count(&rb));
}

int main(void)
{
    UNITY_BEGIN();
    RUN_TEST(test_empty_then_fifo_order);
    RUN_TEST(test_full_drops_and_keeps_old_data);
    RUN_TEST(test_indices_wrap_at_2_pow_32);
    return UNITY_END();
}
