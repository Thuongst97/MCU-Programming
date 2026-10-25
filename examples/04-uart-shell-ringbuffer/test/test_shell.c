/* SPDX-License-Identifier: MIT
 * Host tests for the command shell (example 04): line editing, tokenising, dispatch. */
#include <string.h>
#include "shell.h"
#include "unity.h"

static char out[512];
static uint32_t calls;
static uint32_t last_argc;
static char last_arg1[16];

static void capture(const char *s) { strncat(out, s, sizeof out - strlen(out) - 1U); }
static void cmd_led(uint32_t argc, const char *const argv[])
{
    calls++;
    last_argc = argc;
    last_arg1[0] = '\0';
    if (argc > 1U)
    {
        strncpy(last_arg1, argv[1], sizeof last_arg1 - 1U);
    }
}
static const shell_cmd_t cmds[] = {{"led", "led on|off", cmd_led}};
static shell_t sh;

static void type(const char *s)
{
    for (; *s != '\0'; ++s)
    {
        shell_feed(&sh, *s);
    }
}

void setUp(void)
{
    out[0] = '\0';
    calls = 0U;
    last_argc = 0U;
    memset(last_arg1, 0, sizeof last_arg1);
    shell_init(&sh, cmds, 1U, capture);
}
void tearDown(void) {}

static void test_dispatches_with_arguments(void)
{
    type("led   on\r");
    TEST_ASSERT_EQUAL_UINT32(1U, calls);
    TEST_ASSERT_EQUAL_UINT32(2U, last_argc);
    TEST_ASSERT_EQUAL_STRING("on", last_arg1);
}

static void test_crlf_runs_once(void)
{
    type("led\r\n");
    TEST_ASSERT_EQUAL_UINT32(1U, calls);
}

static void test_backspace_edits_the_line(void)
{
    type("lex\bd off\r");
    TEST_ASSERT_EQUAL_UINT32(1U, calls);
    TEST_ASSERT_EQUAL_STRING("off", last_arg1);
}

static void test_unknown_command_is_reported(void)
{
    type("blink\r");
    TEST_ASSERT_EQUAL_UINT32(0U, calls);
    TEST_ASSERT_NOT_NULL(strstr(out, "unknown command: blink"));
}

static void test_overlong_line_is_truncated_not_overflowed(void)
{
    for (uint32_t i = 0U; i < 200U; ++i)
    {
        shell_feed(&sh, 'x');
    }
    shell_feed(&sh, '\r');
    TEST_ASSERT_EQUAL_UINT32(0U, calls);
    TEST_ASSERT_TRUE(sh.len == 0U);
}

int main(void)
{
    UNITY_BEGIN();
    RUN_TEST(test_dispatches_with_arguments);
    RUN_TEST(test_crlf_runs_once);
    RUN_TEST(test_backspace_edits_the_line);
    RUN_TEST(test_unknown_command_is_reported);
    RUN_TEST(test_overlong_line_is_truncated_not_overflowed);
    return UNITY_END();
}
