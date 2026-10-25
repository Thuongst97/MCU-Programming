/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_PWMDriver
 * In production  : VENDOR-SUPPLIED (MCAL from the silicon vendor)
 *
 * Pwm-lite on the general-purpose timers TIM2..TIM4 (RM0008 §15), fixed-period channels.
 * Duty cycles use the SWS scale: 0x0000 = 0 %, 0x8000 = 100 %.
 * Not supported: Pwm_SetPeriodAndDuty (variable period), notifications, Pwm_GetOutputState.
 */
#ifndef PWM_H
#define PWM_H

#include "Std_Types.h"
#include "Pwm_Cfg.h"

#define PWM_VENDOR_ID                     0xFFFFU
#define PWM_MODULE_ID                     121U
#define PWM_AR_RELEASE_MAJOR_VERSION      4U
#define PWM_AR_RELEASE_MINOR_VERSION      11U
#define PWM_AR_RELEASE_REVISION_VERSION   0U
#define PWM_SW_MAJOR_VERSION              1U
#define PWM_SW_MINOR_VERSION              0U
#define PWM_SW_PATCH_VERSION              0U

#define PWM_E_INIT_FAILED                 0x10U
#define PWM_E_UNINIT                      0x11U
#define PWM_E_PARAM_CHANNEL               0x12U
#define PWM_E_ALREADY_INITIALIZED         0x14U
#define PWM_E_PARAM_POINTER               0x15U
#define PWM_INIT_SID                      0x00U
#define PWM_DEINIT_SID                    0x01U
#define PWM_SETDUTYCYCLE_SID              0x02U
#define PWM_SETOUTPUTTOIDLE_SID           0x04U
#define PWM_GETVERSIONINFO_SID            0x08U

typedef uint8 Pwm_ChannelType;
typedef uint16 Pwm_PeriodType;

typedef struct
{
    uint8 timer;                          /* 2, 3 or 4 */
    uint8 tchannel;                       /* timer channel 1..4 */
    uint16 defaultDuty;                   /* 0x0000..0x8000 */
    uint8 idleState;                      /* STD_HIGH / STD_LOW after Pwm_SetOutputToIdle */
} Pwm_ChannelConfigType;

typedef struct
{
    P2CONST(Pwm_ChannelConfigType, TYPEDEF, PWM_APPL_CONST) channels;
    uint8 numChannels;
    uint32 timerClockHz;                  /* TIMxCLK from the Mcu clock setting (x2 rule on APB1) */
    uint32 countHz;                       /* timer count rate */
    Pwm_PeriodType period;                /* counts per period (ARR + 1) */
} Pwm_ConfigType;

#define PWM_START_SEC_CODE
#include "Pwm_MemMap.h"
FUNC(void, PWM_CODE) Pwm_Init(P2CONST(Pwm_ConfigType, AUTOMATIC, PWM_APPL_CONST) ConfigPtr);
FUNC(void, PWM_CODE) Pwm_DeInit(void);
FUNC(void, PWM_CODE) Pwm_SetDutyCycle(Pwm_ChannelType ChannelNumber, uint16 DutyCycle);
FUNC(void, PWM_CODE) Pwm_SetOutputToIdle(Pwm_ChannelType ChannelNumber);
FUNC(void, PWM_CODE) Pwm_GetVersionInfo(P2VAR(Std_VersionInfoType, AUTOMATIC, PWM_APPL_DATA) versioninfo);
#define PWM_STOP_SEC_CODE
#include "Pwm_MemMap.h"

extern CONST(Pwm_ConfigType, PWM_CONST) Pwm_Config;

#endif
