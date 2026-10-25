/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_PWMDriver
 * In production  : VENDOR-SUPPLIED (MCAL from the silicon vendor)
 */
#include "Pwm.h"
#include "stm32g474xx.h"
#if (PWM_DEV_ERROR_DETECT == STD_ON)
#include "Det.h"
#define PWM_DET(api, err) ((void)Det_ReportError(PWM_MODULE_ID, 0U, (api), (err)))
#else
#define PWM_DET(api, err) ((void)0)
#endif

#if (PWM_AR_RELEASE_MAJOR_VERSION != STD_TYPES_AR_RELEASE_MAJOR_VERSION) || \
    (PWM_AR_RELEASE_MINOR_VERSION != STD_TYPES_AR_RELEASE_MINOR_VERSION)
#error "Pwm.c: AUTOSAR release of Std_Types.h does not match"
#endif

#define PWM_START_SEC_VAR_CLEARED_UNSPECIFIED
#include "Pwm_MemMap.h"
static P2CONST(Pwm_ConfigType, PWM_VAR, PWM_APPL_CONST) Pwm_ConfigPtr;
#define PWM_STOP_SEC_VAR_CLEARED_UNSPECIFIED
#include "Pwm_MemMap.h"

#define PWM_START_SEC_CODE
#include "Pwm_MemMap.h"

static FUNC(TIM_TypeDef *, PWM_CODE) Pwm_Timer(uint8 t)
{
    return (t == 2U) ? TIM2 : ((t == 3U) ? TIM3 : TIM4);
}

static FUNC(volatile uint32 *, PWM_CODE) Pwm_Ccr(TIM_TypeDef *tim, uint8 ch)
{
    volatile uint32 *const ccr[4] = {&tim->CCR1, &tim->CCR2, &tim->CCR3, &tim->CCR4};
    return ccr[(ch - 1U) & 3U];
}

// [region:init]
FUNC(void, PWM_CODE) Pwm_Init(P2CONST(Pwm_ConfigType, AUTOMATIC, PWM_APPL_CONST) ConfigPtr)
{
    if (ConfigPtr == NULL_PTR)
    {
        PWM_DET(PWM_INIT_SID, PWM_E_PARAM_POINTER);
        return;
    }
    if (Pwm_ConfigPtr != NULL_PTR)
    {
        PWM_DET(PWM_INIT_SID, PWM_E_ALREADY_INITIALIZED);   // «1»
        return;
    }
    RCC->APB1ENR |= RCC_APB1ENR_TIM2EN | RCC_APB1ENR_TIM3EN | RCC_APB1ENR_TIM4EN;
    for (uint8 i = 0U; i < ConfigPtr->numChannels; ++i)
    {
        P2CONST(Pwm_ChannelConfigType, AUTOMATIC, PWM_APPL_CONST) c = &ConfigPtr->channels[i];
        TIM_TypeDef *const tim = Pwm_Timer(c->timer);
        tim->PSC = (uint16)((ConfigPtr->timerClockHz / ConfigPtr->countHz) - 1U);   // «2»
        tim->ARR = (uint32)ConfigPtr->period - 1U;
        const uint32 oc = (6UL << TIM_CCMR1_OC1M_Pos) | TIM_CCMR1_OC1PE;   /* PWM mode 1, preload */
        if (c->tchannel <= 2U)
        {
            tim->CCMR1 |= oc << ((c->tchannel - 1U) * 8U);
        }
        else
        {
            tim->CCMR2 |= oc << ((c->tchannel - 3U) * 8U);
        }
        tim->CCER |= TIM_CCER_CC1E << ((c->tchannel - 1U) * 4U);
        *Pwm_Ccr(tim, c->tchannel) = ((uint32)c->defaultDuty * ConfigPtr->period) >> 15;
        tim->CR1 = TIM_CR1_ARPE;
        tim->EGR = TIM_EGR_UG;
        tim->CR1 |= TIM_CR1_CEN;
    }
    Pwm_ConfigPtr = ConfigPtr;
}
// [endregion]

FUNC(void, PWM_CODE) Pwm_DeInit(void)
{
    if (Pwm_ConfigPtr == NULL_PTR)
    {
        PWM_DET(PWM_DEINIT_SID, PWM_E_UNINIT);
        return;
    }
    for (uint8 i = 0U; i < Pwm_ConfigPtr->numChannels; ++i)
    {
        Pwm_SetOutputToIdle(i);
    }
    Pwm_ConfigPtr = NULL_PTR;
}

// [region:duty]
FUNC(void, PWM_CODE) Pwm_SetDutyCycle(Pwm_ChannelType ChannelNumber, uint16 DutyCycle)
{
    if (Pwm_ConfigPtr == NULL_PTR)
    {
        PWM_DET(PWM_SETDUTYCYCLE_SID, PWM_E_UNINIT);
        return;
    }
    if (ChannelNumber >= Pwm_ConfigPtr->numChannels)
    {
        PWM_DET(PWM_SETDUTYCYCLE_SID, PWM_E_PARAM_CHANNEL);
        return;
    }
    P2CONST(Pwm_ChannelConfigType, AUTOMATIC, PWM_APPL_CONST) c = &Pwm_ConfigPtr->channels[ChannelNumber];
    const uint32 duty = (DutyCycle > 0x8000U) ? 0x8000UL : (uint32)DutyCycle;      /* 0x8000 = 100 % */   // «3»
    *Pwm_Ccr(Pwm_Timer(c->timer), c->tchannel) = (duty * Pwm_ConfigPtr->period) >> 15;   /* next period */   // «4»
}
// [endregion]

FUNC(void, PWM_CODE) Pwm_SetOutputToIdle(Pwm_ChannelType ChannelNumber)
{
    if ((Pwm_ConfigPtr == NULL_PTR) || (ChannelNumber >= Pwm_ConfigPtr->numChannels))
    {
        PWM_DET(PWM_SETOUTPUTTOIDLE_SID, (Pwm_ConfigPtr == NULL_PTR) ? PWM_E_UNINIT : PWM_E_PARAM_CHANNEL);
        return;
    }
    P2CONST(Pwm_ChannelConfigType, AUTOMATIC, PWM_APPL_CONST) c = &Pwm_ConfigPtr->channels[ChannelNumber];
    *Pwm_Ccr(Pwm_Timer(c->timer), c->tchannel) = (c->idleState == STD_HIGH) ? Pwm_ConfigPtr->period : 0U;
}

FUNC(void, PWM_CODE) Pwm_GetVersionInfo(P2VAR(Std_VersionInfoType, AUTOMATIC, PWM_APPL_DATA) versioninfo)
{
    if (versioninfo == NULL_PTR)
    {
        PWM_DET(PWM_GETVERSIONINFO_SID, PWM_E_PARAM_POINTER);
        return;
    }
    versioninfo->vendorID = PWM_VENDOR_ID;
    versioninfo->moduleID = PWM_MODULE_ID;
    versioninfo->sw_major_version = PWM_SW_MAJOR_VERSION;
    versioninfo->sw_minor_version = PWM_SW_MINOR_VERSION;
    versioninfo->sw_patch_version = PWM_SW_PATCH_VERSION;
}

#define PWM_STOP_SEC_CODE
#include "Pwm_MemMap.h"
