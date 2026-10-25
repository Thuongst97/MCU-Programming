/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_WatchdogDriver
 * In production  : VENDOR-SUPPLIED (MCAL from the silicon vendor)
 *
 * Wdg-lite on the independent watchdog IWDG (RM0008 §19). Simplification: a real Wdg driver
 * keeps triggering the hardware from a Gpt notification until the time window given to
 * Wdg_SetTriggerCondition() runs out. Wdg-lite triggers once per call instead, so WdgM must
 * call it at least once per IWDG timeout. WDGIF_OFF_MODE is refused: the IWDG cannot be stopped.
 */
#ifndef WDG_H
#define WDG_H

#include "Std_Types.h"
#include "WdgIf_Types.h"
#include "Wdg_Cfg.h"

#define WDG_VENDOR_ID                     0xFFFFU
#define WDG_MODULE_ID                     102U
#define WDG_AR_RELEASE_MAJOR_VERSION      4U
#define WDG_AR_RELEASE_MINOR_VERSION      11U
#define WDG_AR_RELEASE_REVISION_VERSION   0U
#define WDG_SW_MAJOR_VERSION              1U
#define WDG_SW_MINOR_VERSION              0U
#define WDG_SW_PATCH_VERSION              0U

#define WDG_E_DRIVER_STATE                0x10U
#define WDG_E_PARAM_MODE                  0x11U
#define WDG_E_PARAM_CONFIG                0x12U
#define WDG_E_PARAM_TIMEOUT               0x13U
#define WDG_E_PARAM_POINTER               0x14U
#define WDG_INIT_SID                      0x00U
#define WDG_SETMODE_SID                   0x01U
#define WDG_SETTRIGGERCONDITION_SID       0x03U
#define WDG_GETVERSIONINFO_SID            0x04U

typedef struct
{
    uint8 prescaler;                      /* IWDG_PR code: LSI / (4 << code) */
    uint16 reload;                        /* IWDG_RLR, 12 bit */
    uint16 maxTimeoutMs;                  /* largest value accepted by Wdg_SetTriggerCondition */
} Wdg_ConfigType;

#define WDG_START_SEC_CODE
#include "Wdg_MemMap.h"
FUNC(void, WDG_CODE) Wdg_Init(P2CONST(Wdg_ConfigType, AUTOMATIC, WDG_APPL_CONST) ConfigPtr);
FUNC(Std_ReturnType, WDG_CODE) Wdg_SetMode(WdgIf_ModeType Mode);
FUNC(void, WDG_CODE) Wdg_SetTriggerCondition(uint16 timeout);
FUNC(void, WDG_CODE) Wdg_GetVersionInfo(P2VAR(Std_VersionInfoType, AUTOMATIC, WDG_APPL_DATA) versioninfo);
#define WDG_STOP_SEC_CODE
#include "Wdg_MemMap.h"

extern CONST(Wdg_ConfigType, WDG_CONST) Wdg_Config;

#endif
