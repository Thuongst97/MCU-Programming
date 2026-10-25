/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SRS_BSWGeneral (conventions); module SWS as named below
 * In production  : HAND-WRITTEN (review examples, never shipped)
 *
 * The "before" halves of the bad-vs-good comparisons on autosar-mcal.html and autosar-review.html.
 * They compile (CLAUDE.md rule 17) but break a convention; the "after" halves are the real modules
 * in autosar/ or the capstone. Excluded from tools/run-misra.py on purpose.
 */
#include "Std_Types.h"
#include "Det.h"
#include "stm32g474xx.h"

void Gallery_Use(void);   /* keeps every example referenced */

// [region:dio-bad]
/* "Driver" written without the SWS: ad-hoc name, int levels, read-modify-write on ODR */
void lamp_write(int pin, int level)
{
    if (level)
    {
        GPIOB->ODR |= (1UL << pin);          /* read, modify, write: an ISR writing ODR in between is lost */
    }
    else
    {
        GPIOB->ODR &= ~(1UL << pin);
    }
}
// [endregion]

// [region:ret-bad]
/* Error codes invented per module: -1, 0, 1, 2 ... every caller must know this module's meaning */
int lamp_set_duty(int channel, int percent)
{
    if ((channel < 0) || (channel > 1))
    {
        return -1;
    }
    if ((percent < 0) || (percent > 100))
    {
        return -2;
    }
    TIM3->CCR1 = (uint32)percent * 10U;
    return 0;
}
// [endregion]

// [region:det-bad]
/* Development checks always on, and a production error reported as a development error */
Std_ReturnType Lamp_Init(const uint8 *config)
{
    (void)Det_ReportError(254U, 0U, 0U, 0x10U);   /* unconditional: costs time and flash in production */
    if (*config == 0U)                             /* no NULL check before the dereference */
    {
        return E_NOT_OK;
    }
    return E_OK;
}
// [endregion]

// [region:swc-bad]
/* An "application" function that reads pins itself: tied to this ECU, untestable on a PC */
boolean TurnLight_StalkLeftPressed(void)
{
    return ((GPIOB->IDR & GPIO_IDR_IDR12) == 0U) ? TRUE : FALSE;
}
// [endregion]

// [region:wait-bad]
/* Waits forever if the crystal is missing: the ECU hangs before the watchdog is even running */
void Clock_Start(void)
{
    RCC->CR |= RCC_CR_HSEON;
    while ((RCC->CR & RCC_CR_HSERDY) == 0U)
    {
    }
}
// [endregion]

void Gallery_Use(void)
{
    static const uint8 cfg = 1U;
    lamp_write(12, 1);
    (void)lamp_set_duty(0, 50);
    (void)Lamp_Init(&cfg);
    (void)TurnLight_StalkLeftPressed();
    Clock_Start();
}
