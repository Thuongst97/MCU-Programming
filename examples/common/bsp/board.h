/* SPDX-License-Identifier: MIT
 * NUCLEO-G474RE board facts, in one place.
 *   Pins and polarities: ST's NUCLEO-G474RE BSP (stm32g4xx_nucleo.h) and UM2505.
 *   Alternate-function numbers (AF_<pin>_<signal>): DS12288 "Alternate functions" table;
 *   tools/check-pins.py checks every AF_ constant in the repository against ST's open pin
 *   data (third_party/stm32_open_pin_data).
 */
#ifndef BSP_BOARD_H
#define BSP_BOARD_H

#include "stm32g474xx.h"

/* LD2, the green user LED: PA5 drives it through a resistor to GND, so 1 = on (active-high).
 * PA5 is also Arduino D13 / SPI1_SCK: never use SPI1 on PA5 and the LED together. */
#define BOARD_LED_PORT       GPIOA
#define BOARD_LED_PIN        5U

/* B1, the blue USER button on PC13. ST's BSP reads it with a pull-down and a rising edge:
 * pressed = 1. (One community board file says active-low: check yours, see board.html.) */
#define BOARD_BTN_PORT       GPIOC
#define BOARD_BTN_PIN        13U
#define BOARD_BTN_PRESSED    1U

/* Virtual COM port: the on-board ST-LINK/V3E bridges LPUART1 to USB. */
#define BOARD_VCP_PORT       GPIOA
#define BOARD_VCP_TX_PIN     2U
#define BOARD_VCP_RX_PIN     3U
#define AF_PA2_LPUART1_TX    12U
#define AF_PA3_LPUART1_RX    12U

/* Clock output (MCO) on PA8 = Arduino D7. */
#define AF_PA8_RCC_MCO       0U

/* X3: 24 MHz crystal for HSE. The course runs from HSI16 and does not need it. */
#define BOARD_HSE_HZ         24000000U

#endif
