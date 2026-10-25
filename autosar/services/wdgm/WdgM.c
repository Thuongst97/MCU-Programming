/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_WatchdogManager
 * In production  : VENDOR-SUPPLIED (BSW stack vendor)
 */
#include "WdgM.h"
#include "WdgIf.h"
#include "SchM_WdgM.h"
#if (WDGM_DEV_ERROR_DETECT == STD_ON)
#include "Det.h"
#define WDGM_DET(api, err) ((void)Det_ReportError(WDGM_MODULE_ID, 0U, (api), (err)))
#else
#define WDGM_DET(api, err) ((void)0)
#endif

#define WDGM_START_SEC_VAR_CLEARED_UNSPECIFIED
#include "WdgM_MemMap.h"
static P2CONST(WdgM_ConfigType, WDGM_VAR, WDGM_APPL_CONST) WdgM_ConfigPtr;
static VAR(uint16, WDGM_VAR) WdgM_Alive[WDGM_MAX_ENTITIES];
static VAR(WdgM_LocalStatusType, WDGM_VAR) WdgM_Local[WDGM_MAX_ENTITIES];
static VAR(WdgM_GlobalStatusType, WDGM_VAR) WdgM_Global;
#define WDGM_STOP_SEC_VAR_CLEARED_UNSPECIFIED
#include "WdgM_MemMap.h"

#define WDGM_START_SEC_CODE
#include "WdgM_MemMap.h"

FUNC(void, WDGM_CODE) WdgM_Init(P2CONST(WdgM_ConfigType, AUTOMATIC, WDGM_APPL_CONST) ConfigPtr)
{
    for (uint16 i = 0U; i < WDGM_MAX_ENTITIES; ++i)
    {
        WdgM_Alive[i] = 0U;
        WdgM_Local[i] = WDGM_LOCAL_STATUS_OK;
    }
    WdgM_Global = WDGM_GLOBAL_STATUS_OK;
    WdgM_ConfigPtr = ConfigPtr;
}

FUNC(Std_ReturnType, WDGM_CODE) WdgM_CheckpointReached(WdgM_SupervisedEntityIdType SEID, WdgM_CheckpointIdType CheckpointID)
{
    if (WdgM_ConfigPtr == NULL_PTR)
    {
        WDGM_DET(WDGM_CHECKPOINTREACHED_SID, WDGM_E_UNINIT);
        return E_NOT_OK;
    }
    if (SEID >= WdgM_ConfigPtr->numEntities)
    {
        WDGM_DET(WDGM_CHECKPOINTREACHED_SID, WDGM_E_PARAM_SEID);
        return E_NOT_OK;
    }
    if (CheckpointID != 0U)
    {
        WDGM_DET(WDGM_CHECKPOINTREACHED_SID, WDGM_E_CPID);   /* alive supervision: one checkpoint per SE */
        return E_NOT_OK;
    }
    SchM_Enter_WdgM_WDGM_EXCLUSIVE_AREA_0();
    if (WdgM_Alive[SEID] < 0xFFFFU)
    {
        WdgM_Alive[SEID]++;
    }
    SchM_Exit_WdgM_WDGM_EXCLUSIVE_AREA_0();
    return E_OK;
}

// [region:main]
FUNC(void, WDGM_CODE) WdgM_MainFunction(void)
{
    if (WdgM_ConfigPtr == NULL_PTR)
    {
        return;
    }
    boolean allOk = TRUE;
    for (uint16 i = 0U; i < WdgM_ConfigPtr->numEntities; ++i)
    {
        P2CONST(WdgM_SupervisedEntityConfigType, AUTOMATIC, WDGM_APPL_CONST) c = &WdgM_ConfigPtr->entities[i];
        SchM_Enter_WdgM_WDGM_EXCLUSIVE_AREA_0();
        const uint16 n = WdgM_Alive[i];   // «1»
        WdgM_Alive[i] = 0U;
        SchM_Exit_WdgM_WDGM_EXCLUSIVE_AREA_0();
        const boolean inRange = (((n + c->minMargin) >= c->expectedAlive) && (n <= (c->expectedAlive + c->maxMargin))) ? TRUE : FALSE;
        if (inRange == FALSE)   // «2»
        {
            WdgM_Local[i] = WDGM_LOCAL_STATUS_EXPIRED;       /* lite: no failed-tolerance, expire at once */
        }
        allOk = ((allOk == TRUE) && (WdgM_Local[i] == WDGM_LOCAL_STATUS_OK)) ? TRUE : FALSE;
    }
    if (allOk == TRUE)
    {
        WdgIf_SetTriggerCondition(0U, WdgM_ConfigPtr->triggerTimeoutMs);   /* keep the watchdog happy */   // «3»
    }
    else
    {
        WdgM_Global = WDGM_GLOBAL_STATUS_STOPPED;
        WdgIf_SetTriggerCondition(0U, 0U);                   /* stop triggering: the IWDG resets the ECU */   // «4»
    }
}
// [endregion]

FUNC(Std_ReturnType, WDGM_CODE) WdgM_GetGlobalStatus(P2VAR(WdgM_GlobalStatusType, AUTOMATIC, WDGM_APPL_DATA) Status)
{
    if ((WdgM_ConfigPtr == NULL_PTR) || (Status == NULL_PTR))
    {
        return E_NOT_OK;
    }
    *Status = WdgM_Global;
    return E_OK;
}

#define WDGM_STOP_SEC_CODE
#include "WdgM_MemMap.h"
