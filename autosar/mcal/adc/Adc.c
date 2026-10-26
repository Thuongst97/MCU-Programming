/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_ADCDriver
 * In production  : VENDOR-SUPPLIED (MCAL from the silicon vendor)
 */
#include "Adc.h"
#include "stm32g474xx.h"
#if (ADC_DEV_ERROR_DETECT == STD_ON)
#include "Det.h"
#define ADC_DET(api, err) ((void)Det_ReportError(ADC_MODULE_ID, 0U, (api), (err)))
#else
#define ADC_DET(api, err) ((void)0)
#endif

#if (ADC_AR_RELEASE_MAJOR_VERSION != STD_TYPES_AR_RELEASE_MAJOR_VERSION) || \
    (ADC_AR_RELEASE_MINOR_VERSION != STD_TYPES_AR_RELEASE_MINOR_VERSION)
#error "Adc.c: AUTOSAR release of Std_Types.h does not match"
#endif

#define ADC_WAIT_LOOPS 100000UL

typedef struct
{
    Adc_StatusType status;
    uint8 next;                                           /* index of the channel being converted */
    P2VAR(Adc_ValueGroupType, TYPEDEF, ADC_APPL_DATA) buffer;
} Adc_GroupStateType;

#define ADC_START_SEC_VAR_CLEARED_UNSPECIFIED
#include "Adc_MemMap.h"
static P2CONST(Adc_ConfigType, ADC_VAR, ADC_APPL_CONST) Adc_ConfigPtr;
static VAR(Adc_GroupStateType, ADC_VAR) Adc_State[ADC_MAX_GROUPS];
static VAR(sint16, ADC_VAR) Adc_Active;                   /* one group at a time on this hardware; -1 = none */
#define ADC_STOP_SEC_VAR_CLEARED_UNSPECIFIED
#include "Adc_MemMap.h"

#define ADC_START_SEC_CODE
#include "Adc_MemMap.h"

static FUNC(boolean, ADC_CODE) Adc_Wait(volatile uint32 *reg, uint32 mask, uint32 want)
{
    for (uint32 n = 0U; n < ADC_WAIT_LOOPS; ++n)
    {
        if ((*reg & mask) == want)
        {
            return TRUE;
        }
    }
    return FALSE;
}

static FUNC(void, ADC_CODE) Adc_StartChannel(Adc_ChannelType ch)
{
    ADC1->SQR1 = (uint32)ch << ADC_SQR1_SQ1_Pos;          /* L = 0: a sequence of one */
    ADC1->CR |= ADC_CR_ADSTART;
}

FUNC(void, ADC_CODE) Adc_Init(P2CONST(Adc_ConfigType, AUTOMATIC, ADC_APPL_CONST) ConfigPtr)
{
    if (ConfigPtr == NULL_PTR)
    {
        ADC_DET(ADC_INIT_SID, ADC_E_PARAM_POINTER);
        return;
    }
    if (Adc_ConfigPtr != NULL_PTR)
    {
        ADC_DET(ADC_INIT_SID, ADC_E_ALREADY_INITIALIZED);
        return;
    }
    RCC->AHB2ENR |= RCC_AHB2ENR_ADC12EN;
    ADC12_COMMON->CCR = ADC_CCR_CKMODE_1 | ADC_CCR_CKMODE_0;   /* ADC clock = HCLK / 4 = 42.5 MHz */
    uint32 smp = 0U;
    for (uint32 i = 0U; i < 10U; ++i)
    {
        smp |= (uint32)ConfigPtr->sampleTime << (3U * i);
    }
    ADC1->SMPR1 = smp;                                    /* channels 0..9 */
    ADC1->CR &= ~ADC_CR_DEEPPWD;                          /* G4 power-up: leave deep power-down, */
    ADC1->CR |= ADC_CR_ADVREGEN;                          /* start the regulator (20 us), */
    for (volatile uint32 n = 0U; n < 10000U; ++n)
    {
        /* tADCVREG_STUP */
    }
    ADC1->CR &= ~ADC_CR_ADCALDIF;                         /* calibrate (single-ended), */
    ADC1->CR |= ADC_CR_ADCAL;
    if (!Adc_Wait(&ADC1->CR, ADC_CR_ADCAL, 0U))
    {
        return;                                           /* stays uninitialised: every call reports UNINIT */
    }
    ADC1->ISR = ADC_ISR_ADRDY;
    ADC1->CR |= ADC_CR_ADEN;                              /* enable and wait until ready */
    if (!Adc_Wait(&ADC1->ISR, ADC_ISR_ADRDY, ADC_ISR_ADRDY))
    {
        return;
    }
    for (uint8 g = 0U; g < ADC_MAX_GROUPS; ++g)
    {
        Adc_State[g].status = ADC_IDLE;
        Adc_State[g].buffer = NULL_PTR;
    }
    Adc_Active = -1;
    Adc_ConfigPtr = ConfigPtr;
}

FUNC(Std_ReturnType, ADC_CODE) Adc_SetupResultBuffer(Adc_GroupType Group,
                                                     P2VAR(Adc_ValueGroupType, AUTOMATIC, ADC_APPL_DATA) DataBufferPtr)
{
    if (Adc_ConfigPtr == NULL_PTR)
    {
        ADC_DET(ADC_SETUPRESULTBUFFER_SID, ADC_E_UNINIT);
        return E_NOT_OK;
    }
    if ((Group >= Adc_ConfigPtr->numGroups) || (DataBufferPtr == NULL_PTR))
    {
        ADC_DET(ADC_SETUPRESULTBUFFER_SID, (DataBufferPtr == NULL_PTR) ? ADC_E_PARAM_POINTER : ADC_E_PARAM_GROUP);
        return E_NOT_OK;
    }
    Adc_State[Group].buffer = DataBufferPtr;              /* the caller owns the result buffer */
    return E_OK;
}

// [region:start]
FUNC(void, ADC_CODE) Adc_StartGroupConversion(Adc_GroupType Group)
{
    if (Adc_ConfigPtr == NULL_PTR)
    {
        ADC_DET(ADC_STARTGROUPCONVERSION_SID, ADC_E_UNINIT);
        return;
    }
    if (Group >= Adc_ConfigPtr->numGroups)
    {
        ADC_DET(ADC_STARTGROUPCONVERSION_SID, ADC_E_PARAM_GROUP);
        return;
    }
    if (Adc_State[Group].buffer == NULL_PTR)
    {
        ADC_DET(ADC_STARTGROUPCONVERSION_SID, ADC_E_BUFFER_UNINIT);   // «1»
        return;
    }
    if (Adc_Active >= 0)
    {
        ADC_DET(ADC_STARTGROUPCONVERSION_SID, ADC_E_BUSY);   // «2»
        return;
    }
    Adc_State[Group].status = ADC_BUSY;
    Adc_State[Group].next = 0U;
    Adc_Active = (sint16)Group;
    Adc_StartChannel(Adc_ConfigPtr->groups[Group].channels[0]);
}

FUNC(Adc_StatusType, ADC_CODE) Adc_GetGroupStatus(Adc_GroupType Group)
{
    if ((Adc_ConfigPtr == NULL_PTR) || (Group >= Adc_ConfigPtr->numGroups))
    {
        ADC_DET(ADC_GETGROUPSTATUS_SID, (Adc_ConfigPtr == NULL_PTR) ? ADC_E_UNINIT : ADC_E_PARAM_GROUP);
        return ADC_IDLE;
    }
    P2VAR(Adc_GroupStateType, AUTOMATIC, ADC_VAR) st = &Adc_State[Group];
    if ((st->status == ADC_BUSY) && ((ADC1->ISR & ADC_ISR_EOC) != 0U))     /* polling advances the group */   // «3»
    {
        st->buffer[st->next] = (Adc_ValueGroupType)(ADC1->DR & 0xFFFU);
        st->next++;
        if (st->next < Adc_ConfigPtr->groups[Group].numChannels)
        {
            Adc_StartChannel(Adc_ConfigPtr->groups[Group].channels[st->next]);
        }
        else
        {
            st->status = ADC_STREAM_COMPLETED;            /* one-shot group: completed and stream completed */   // «4»
            Adc_Active = -1;
        }
    }
    return st->status;
}
// [endregion]

FUNC(Std_ReturnType, ADC_CODE) Adc_ReadGroup(Adc_GroupType Group,
                                             P2VAR(Adc_ValueGroupType, AUTOMATIC, ADC_APPL_DATA) DataBufferPtr)
{
    if ((Adc_ConfigPtr == NULL_PTR) || (Group >= Adc_ConfigPtr->numGroups) || (DataBufferPtr == NULL_PTR))
    {
        ADC_DET(ADC_READGROUP_SID, (Adc_ConfigPtr == NULL_PTR) ? ADC_E_UNINIT : ADC_E_PARAM_GROUP);
        return E_NOT_OK;
    }
    if (Adc_GetGroupStatus(Group) != ADC_STREAM_COMPLETED)
    {
        ADC_DET(ADC_READGROUP_SID, ADC_E_IDLE);
        return E_NOT_OK;
    }
    for (uint8 i = 0U; i < Adc_ConfigPtr->groups[Group].numChannels; ++i)
    {
        DataBufferPtr[i] = Adc_State[Group].buffer[i];
    }
    Adc_State[Group].status = ADC_IDLE;                   /* one-shot: back to idle after reading */
    return E_OK;
}

FUNC(void, ADC_CODE) Adc_GetVersionInfo(P2VAR(Std_VersionInfoType, AUTOMATIC, ADC_APPL_DATA) versioninfo)
{
    if (versioninfo == NULL_PTR)
    {
        ADC_DET(ADC_GETVERSIONINFO_SID, ADC_E_PARAM_POINTER);
        return;
    }
    versioninfo->vendorID = ADC_VENDOR_ID;
    versioninfo->moduleID = ADC_MODULE_ID;
    versioninfo->sw_major_version = ADC_SW_MAJOR_VERSION;
    versioninfo->sw_minor_version = ADC_SW_MINOR_VERSION;
    versioninfo->sw_patch_version = ADC_SW_PATCH_VERSION;
}

#define ADC_STOP_SEC_CODE
#include "Adc_MemMap.h"
