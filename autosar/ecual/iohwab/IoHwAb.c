/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_IOHardwareAbstraction
 * In production  : HAND-WRITTEN per ECU
 */
#include "IoHwAb.h"
#include "SchM_IoHwAb.h"

#define IOHWAB_FULL 0x8000U               /* Pwm: 100 % */

typedef struct
{
    boolean stable;
    boolean last;
    uint8 sinceMs;
} IoHwAb_DebounceType;

#define IOHWAB_START_SEC_VAR_CLEARED_UNSPECIFIED
#include "IoHwAb_MemMap.h"
static P2CONST(IoHwAb_ConfigType, IOHWAB_VAR, IOHWAB_APPL_CONST) IoHwAb_ConfigPtr;
static VAR(IoHwAb_DebounceType, IOHWAB_VAR) IoHwAb_In[IOHWAB_MAX_INPUTS];
static VAR(boolean, IOHWAB_VAR) IoHwAb_LampTarget[IOHWAB_MAX_LAMPS];
static VAR(uint16, IOHWAB_VAR) IoHwAb_LampDuty[IOHWAB_MAX_LAMPS];
static VAR(Adc_ValueGroupType, IOHWAB_VAR) IoHwAb_AdcBuffer[1];
static VAR(uint16, IOHWAB_VAR) IoHwAb_Current;
#define IOHWAB_STOP_SEC_VAR_CLEARED_UNSPECIFIED
#include "IoHwAb_MemMap.h"

#define IOHWAB_START_SEC_CODE
#include "IoHwAb_MemMap.h"

FUNC(void, IOHWAB_CODE) IoHwAb_Init(P2CONST(IoHwAb_ConfigType, AUTOMATIC, IOHWAB_APPL_CONST) ConfigPtr)
{
    for (uint8 i = 0U; i < IOHWAB_MAX_INPUTS; ++i)
    {
        IoHwAb_In[i].stable = FALSE;
        IoHwAb_In[i].last = FALSE;
        IoHwAb_In[i].sinceMs = 0U;
    }
    for (uint8 i = 0U; i < IOHWAB_MAX_LAMPS; ++i)
    {
        IoHwAb_LampTarget[i] = FALSE;
        IoHwAb_LampDuty[i] = 0U;
    }
    IoHwAb_Current = 0U;
    (void)Adc_SetupResultBuffer(ConfigPtr->currentGroup, IoHwAb_AdcBuffer);
    Adc_StartGroupConversion(ConfigPtr->currentGroup);
    IoHwAb_ConfigPtr = ConfigPtr;
}

FUNC(Std_ReturnType, IOHWAB_CODE) IoHwAb_Digital_Get(IoHwAb_SignalType Signal, P2VAR(boolean, AUTOMATIC, IOHWAB_APPL_DATA) Value)
{
    if ((IoHwAb_ConfigPtr == NULL_PTR) || (Signal >= IoHwAb_ConfigPtr->numInputs) || (Value == NULL_PTR))
    {
        return E_NOT_OK;
    }
    *Value = IoHwAb_In[Signal].stable;
    return E_OK;
}

FUNC(Std_ReturnType, IOHWAB_CODE) IoHwAb_Lamp_Set(IoHwAb_SignalType Lamp, boolean On)
{
    if ((IoHwAb_ConfigPtr == NULL_PTR) || (Lamp >= IoHwAb_ConfigPtr->numLamps))
    {
        return E_NOT_OK;
    }
    IoHwAb_LampTarget[Lamp] = On;                   /* the ramp follows in IoHwAb_MainFunction_Fast */
    return E_OK;
}

FUNC(Std_ReturnType, IOHWAB_CODE) IoHwAb_LampCurrent_Get(P2VAR(uint16, AUTOMATIC, IOHWAB_APPL_DATA) Raw)
{
    if ((IoHwAb_ConfigPtr == NULL_PTR) || (Raw == NULL_PTR))
    {
        return E_NOT_OK;
    }
    SchM_Enter_IoHwAb_IOHWAB_EXCLUSIVE_AREA_0();
    *Raw = IoHwAb_Current;
    SchM_Exit_IoHwAb_IOHWAB_EXCLUSIVE_AREA_0();
    return E_OK;
}

// [region:ramp]
FUNC(void, IOHWAB_CODE) IoHwAb_MainFunction_Fast(void)
{
    if (IoHwAb_ConfigPtr == NULL_PTR)
    {
        return;
    }
    for (uint8 i = 0U; i < IoHwAb_ConfigPtr->numLamps; ++i)
    {
        P2CONST(IoHwAb_LampConfigType, AUTOMATIC, IOHWAB_APPL_CONST) c = &IoHwAb_ConfigPtr->lamps[i];
        const uint16 step = (uint16)((IOHWAB_FULL * IOHWAB_FAST_PERIOD_MS) / c->rampMs);
        const uint16 target = (IoHwAb_LampTarget[i] == TRUE) ? IOHWAB_FULL : 0U;
        uint16 d = IoHwAb_LampDuty[i];
        if (d < target)
        {
            d = ((uint16)(target - d) > step) ? (uint16)(d + step) : target;
        }
        else
        {
            d = ((uint16)(d - target) > step) ? (uint16)(d - step) : target;
        }
        IoHwAb_LampDuty[i] = d;
        Pwm_SetDutyCycle(c->channel, d);                                   /* MCAL: TIM3 CCRx */
    }
}
// [endregion]

FUNC(void, IOHWAB_CODE) IoHwAb_MainFunction(void)
{
    if (IoHwAb_ConfigPtr == NULL_PTR)
    {
        return;
    }
    for (uint8 i = 0U; i < IoHwAb_ConfigPtr->numInputs; ++i)               /* debounce */
    {
        P2CONST(IoHwAb_DigitalInConfigType, AUTOMATIC, IOHWAB_APPL_CONST) c = &IoHwAb_ConfigPtr->inputs[i];
        const Dio_LevelType level = Dio_ReadChannel(c->channel);
        const boolean active = (c->activeLow == TRUE) ? ((level == STD_LOW) ? TRUE : FALSE)
                                                      : ((level == STD_HIGH) ? TRUE : FALSE);
        P2VAR(IoHwAb_DebounceType, AUTOMATIC, IOHWAB_VAR) d = &IoHwAb_In[i];
        if (active != d->last)
        {
            d->last = active;
            d->sinceMs = 0U;
        }
        else if (d->sinceMs < c->debounceMs)
        {
            d->sinceMs = (uint8)(d->sinceMs + IOHWAB_PERIOD_MS);
            if (d->sinceMs >= c->debounceMs)
            {
                d->stable = active;                                        /* held long enough */
            }
        }
        else
        {
            /* stable */
        }
    }
    if (Adc_GetGroupStatus(IoHwAb_ConfigPtr->currentGroup) == ADC_STREAM_COMPLETED)   /* lamp current */
    {
        Adc_ValueGroupType v[1];
        if (Adc_ReadGroup(IoHwAb_ConfigPtr->currentGroup, v) == E_OK)
        {
            SchM_Enter_IoHwAb_IOHWAB_EXCLUSIVE_AREA_0();
            IoHwAb_Current = v[0];
            SchM_Exit_IoHwAb_IOHWAB_EXCLUSIVE_AREA_0();
        }
        Adc_StartGroupConversion(IoHwAb_ConfigPtr->currentGroup);         /* ready by the next call */
    }
}

#define IOHWAB_STOP_SEC_CODE
#include "IoHwAb_MemMap.h"
