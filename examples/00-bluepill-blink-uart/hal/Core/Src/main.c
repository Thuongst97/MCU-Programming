/* SPDX-License-Identifier: MIT
 * Example 00, HAL path: the same program as ../bare, written against ST's HAL in the structure
 * STM32CubeMX generates (main.c + stm32f1xx_it.c + stm32f1xx_hal_conf.h, startup in assembly).
 * Shown side by side with the register version in setup.html#paths. The rest of the course
 * uses registers (CLAUDE.md rule 20).
 */
#include "stm32f1xx_hal.h"

static UART_HandleTypeDef huart1;

static void SystemClock_Config(void);
static void MX_GPIO_Init(void);
static void MX_USART1_UART_Init(void);
static void say(const char *s);
static void say_u32(uint32_t v);

// [region:main]
int main(void)
{
    HAL_Init();                 /* SysTick at 1 kHz on HSI, NVIC priority grouping */      // «1»
    SystemClock_Config();       /* HSE x 9 = 72 MHz, same settings as the bare version */  // «2»
    MX_GPIO_Init();
    MX_USART1_UART_Init();

    say("Hello from Blue Pill @ ");
    say_u32(HAL_RCC_GetSysClockFreq() / 1000000U);
    say(" MHz (HAL)\r\n");

    uint32_t seconds = 0U;
    for (;;)
    {
        HAL_GPIO_WritePin(GPIOC, GPIO_PIN_13, GPIO_PIN_RESET);   /* LED on (active-low) */ // «3»
        HAL_Delay(500U);
        HAL_GPIO_WritePin(GPIOC, GPIO_PIN_13, GPIO_PIN_SET);     /* LED off */
        HAL_Delay(500U);                                         /* busy-waits on uwTick */ // «4»
        ++seconds;
        say("uptime ");
        say_u32(seconds);
        say(" s\r\n");
    }
}
// [endregion]

// [region:clock]
static void SystemClock_Config(void)
{
    RCC_OscInitTypeDef osc = {0};
    RCC_ClkInitTypeDef clk = {0};

    osc.OscillatorType = RCC_OSCILLATORTYPE_HSE;                                   // «5»
    osc.HSEState = RCC_HSE_ON;
    osc.HSEPredivValue = RCC_HSE_PREDIV_DIV1;
    osc.PLL.PLLState = RCC_PLL_ON;
    osc.PLL.PLLSource = RCC_PLLSOURCE_HSE;
    osc.PLL.PLLMUL = RCC_PLL_MUL9;
    if (HAL_RCC_OscConfig(&osc) != HAL_OK)                                         // «6»
    {
        for (;;) { }
    }
    clk.ClockType = RCC_CLOCKTYPE_HCLK | RCC_CLOCKTYPE_SYSCLK | RCC_CLOCKTYPE_PCLK1 | RCC_CLOCKTYPE_PCLK2;
    clk.SYSCLKSource = RCC_SYSCLKSOURCE_PLLCLK;
    clk.AHBCLKDivider = RCC_SYSCLK_DIV1;
    clk.APB1CLKDivider = RCC_HCLK_DIV2;                                            // «7»
    clk.APB2CLKDivider = RCC_HCLK_DIV1;
    if (HAL_RCC_ClockConfig(&clk, FLASH_LATENCY_2) != HAL_OK)   /* HAL's own constant for 2 WS */ // «8»
    {
        for (;;) { }
    }
}
// [endregion]

static void MX_GPIO_Init(void)
{
    GPIO_InitTypeDef io = {0};
    __HAL_RCC_GPIOC_CLK_ENABLE();
    HAL_GPIO_WritePin(GPIOC, GPIO_PIN_13, GPIO_PIN_SET);
    io.Pin = GPIO_PIN_13;
    io.Mode = GPIO_MODE_OUTPUT_PP;
    io.Pull = GPIO_NOPULL;
    io.Speed = GPIO_SPEED_FREQ_LOW;   /* 2 MHz: the PC13 limit */
    HAL_GPIO_Init(GPIOC, &io);
}

static void MX_USART1_UART_Init(void)
{
    huart1.Instance = USART1;
    huart1.Init.BaudRate = 115200U;
    huart1.Init.WordLength = UART_WORDLENGTH_8B;
    huart1.Init.StopBits = UART_STOPBITS_1;
    huart1.Init.Parity = UART_PARITY_NONE;
    huart1.Init.Mode = UART_MODE_TX_RX;
    huart1.Init.HwFlowCtl = UART_HWCONTROL_NONE;
    huart1.Init.OverSampling = UART_OVERSAMPLING_16;
    if (HAL_UART_Init(&huart1) != HAL_OK)   /* calls HAL_UART_MspInit below for pins + clocks */
    {
        for (;;) { }
    }
}

/* "MSP" = MCU support package: the board-specific part HAL leaves to you. */
void HAL_UART_MspInit(UART_HandleTypeDef *huart)
{
    GPIO_InitTypeDef io = {0};
    if (huart->Instance == USART1)
    {
        __HAL_RCC_USART1_CLK_ENABLE();
        __HAL_RCC_GPIOA_CLK_ENABLE();
        io.Pin = GPIO_PIN_9;
        io.Mode = GPIO_MODE_AF_PP;
        io.Speed = GPIO_SPEED_FREQ_HIGH;
        HAL_GPIO_Init(GPIOA, &io);
        io.Pin = GPIO_PIN_10;
        io.Mode = GPIO_MODE_INPUT;
        io.Pull = GPIO_NOPULL;
        HAL_GPIO_Init(GPIOA, &io);
    }
}

static void say(const char *s)
{
    uint16_t n = 0U;
    while (s[n] != '\0')
    {
        ++n;
    }
    (void)HAL_UART_Transmit(&huart1, (const uint8_t *)s, n, 100U);
}

static void say_u32(uint32_t v)
{
    char buf[11];
    char *p = &buf[10];
    *p = '\0';
    do
    {
        *--p = (char)('0' + (v % 10U));
        v /= 10U;
    } while (v != 0U);
    say(p);
}
