/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_WatchdogDriver
 * In production  : VENDOR-SUPPLIED (MCAL from the silicon vendor)
 */
#include "Wdg.h"
#include "stm32f103xb.h"
#if (WDG_DEV_ERROR_DETECT == STD_ON)
#include "Det.h"
#define WDG_DET(api, err) ((void)Det_ReportError(WDG_MODULE_ID, 0U, (api), (err)))
#else
#define WDG_DET(api, err) ((void)0)
#endif

#if (WDG_AR_RELEASE_MAJOR_VERSION != STD_TYPES_AR_RELEASE_MAJOR_VERSION) || \
    (WDG_AR_RELEASE_MINOR_VERSION != STD_TYPES_AR_RELEASE_MINOR_VERSION)
#error "Wdg.c: AUTOSAR release of Std_Types.h does not match"
#endif

#define WDG_KEY_UNLOCK   0x5555U          /* IWDG_KR key values, RM0008 §19.4.1 */
#define WDG_KEY_START    0xCCCCU
#define WDG_KEY_RELOAD   0xAAAAU

#define WDG_START_SEC_VAR_CLEARED_UNSPECIFIED
#include "Wdg_MemMap.h"
static P2CONST(Wdg_ConfigType, WDG_VAR, WDG_APPL_CONST) Wdg_ConfigPtr;
#define WDG_STOP_SEC_VAR_CLEARED_UNSPECIFIED
#include "Wdg_MemMap.h"

#define WDG_START_SEC_CODE
#include "Wdg_MemMap.h"

FUNC(void, WDG_CODE) Wdg_Init(P2CONST(Wdg_ConfigType, AUTOMATIC, WDG_APPL_CONST) ConfigPtr)
{
    if (ConfigPtr == NULL_PTR)
    {
        WDG_DET(WDG_INIT_SID, WDG_E_PARAM_POINTER);
        return;
    }
    if ((ConfigPtr->prescaler > 6U) || (ConfigPtr->reload > 0x0FFFU))
    {
        WDG_DET(WDG_INIT_SID, WDG_E_PARAM_CONFIG);
        return;
    }
    DBGMCU->CR |= DBGMCU_CR_DBG_IWDG_STOP;                /* pause while halted by the debugger */
    IWDG->KR = WDG_KEY_UNLOCK;
    IWDG->PR = ConfigPtr->prescaler;
    IWDG->RLR = ConfigPtr->reload;
    IWDG->KR = WDG_KEY_START;                             /* from here on it cannot be stopped */
    Wdg_ConfigPtr = ConfigPtr;
}

FUNC(Std_ReturnType, WDG_CODE) Wdg_SetMode(WdgIf_ModeType Mode)
{
    if (Wdg_ConfigPtr == NULL_PTR)
    {
        WDG_DET(WDG_SETMODE_SID, WDG_E_DRIVER_STATE);
        return E_NOT_OK;
    }
    if (Mode == WDGIF_OFF_MODE)
    {
        WDG_DET(WDG_SETMODE_SID, WDG_E_PARAM_MODE);       /* the IWDG has no off switch */
        return E_NOT_OK;
    }
    return E_OK;                                          /* slow and fast use the same timeout here */
}

// [region:trigger]
FUNC(void, WDG_CODE) Wdg_SetTriggerCondition(uint16 timeout)
{
    if (Wdg_ConfigPtr == NULL_PTR)
    {
        WDG_DET(WDG_SETTRIGGERCONDITION_SID, WDG_E_DRIVER_STATE);
        return;
    }
    if (timeout > Wdg_ConfigPtr->maxTimeoutMs)
    {
        WDG_DET(WDG_SETTRIGGERCONDITION_SID, WDG_E_PARAM_TIMEOUT);
        return;
    }
    if (timeout != 0U)
    {
        IWDG->KR = WDG_KEY_RELOAD;                        /* timeout 0: stop triggering, reset follows */
    }
}
// [endregion]

FUNC(void, WDG_CODE) Wdg_GetVersionInfo(P2VAR(Std_VersionInfoType, AUTOMATIC, WDG_APPL_DATA) versioninfo)
{
    if (versioninfo == NULL_PTR)
    {
        WDG_DET(WDG_GETVERSIONINFO_SID, WDG_E_PARAM_POINTER);
        return;
    }
    versioninfo->vendorID = WDG_VENDOR_ID;
    versioninfo->moduleID = WDG_MODULE_ID;
    versioninfo->sw_major_version = WDG_SW_MAJOR_VERSION;
    versioninfo->sw_minor_version = WDG_SW_MINOR_VERSION;
    versioninfo->sw_patch_version = WDG_SW_PATCH_VERSION;
}

#define WDG_STOP_SEC_CODE
#include "Wdg_MemMap.h"
