/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_WatchdogManager
 * In production  : VENDOR-SUPPLIED (BSW stack vendor), supervision tables GENERATED
 *
 * WdgM-lite: alive supervision only. Each supervised entity (SE) reports one checkpoint;
 * every WdgM_MainFunction the counts are compared with the expected range, and the watchdog
 * is triggered only while every SE is OK. Left out: deadline and logical supervision, modes,
 * the failed-tolerance counters, partition reset, global-status callbacks.
 */
#ifndef WDGM_H
#define WDGM_H

#include "Std_Types.h"
#include "WdgM_Types.h"
#include "WdgM_Cfg.h"

#define WDGM_VENDOR_ID                    0xFFFFU
#define WDGM_MODULE_ID                    13U
#define WDGM_AR_RELEASE_MAJOR_VERSION     4U
#define WDGM_AR_RELEASE_MINOR_VERSION     11U
#define WDGM_AR_RELEASE_REVISION_VERSION  0U
#define WDGM_SW_MAJOR_VERSION             1U
#define WDGM_SW_MINOR_VERSION             0U
#define WDGM_SW_PATCH_VERSION             0U

#define WDGM_E_UNINIT                     0x10U
#define WDGM_E_PARAM_SEID                 0x14U
#define WDGM_E_CPID                       0x15U
#define WDGM_CHECKPOINTREACHED_SID        0x0EU

typedef enum
{
    WDGM_LOCAL_STATUS_OK = 0, WDGM_LOCAL_STATUS_FAILED, WDGM_LOCAL_STATUS_EXPIRED, WDGM_LOCAL_STATUS_DEACTIVATED
} WdgM_LocalStatusType;
typedef enum
{
    WDGM_GLOBAL_STATUS_OK = 0, WDGM_GLOBAL_STATUS_FAILED, WDGM_GLOBAL_STATUS_EXPIRED, WDGM_GLOBAL_STATUS_STOPPED,
    WDGM_GLOBAL_STATUS_DEACTIVATED
} WdgM_GlobalStatusType;

typedef struct
{
    uint16 expectedAlive;                 /* checkpoints per WdgM_MainFunction period */
    uint16 minMargin;
    uint16 maxMargin;
} WdgM_SupervisedEntityConfigType;

typedef struct
{
    P2CONST(WdgM_SupervisedEntityConfigType, TYPEDEF, WDGM_APPL_CONST) entities;
    uint16 numEntities;
    uint16 triggerTimeoutMs;              /* passed to WdgIf_SetTriggerCondition while OK */
} WdgM_ConfigType;

#define WDGM_START_SEC_CODE
#include "WdgM_MemMap.h"
FUNC(void, WDGM_CODE) WdgM_Init(P2CONST(WdgM_ConfigType, AUTOMATIC, WDGM_APPL_CONST) ConfigPtr);
FUNC(Std_ReturnType, WDGM_CODE) WdgM_CheckpointReached(WdgM_SupervisedEntityIdType SEID, WdgM_CheckpointIdType CheckpointID);
FUNC(Std_ReturnType, WDGM_CODE) WdgM_GetGlobalStatus(P2VAR(WdgM_GlobalStatusType, AUTOMATIC, WDGM_APPL_DATA) Status);
FUNC(void, WDGM_CODE) WdgM_MainFunction(void);
#define WDGM_STOP_SEC_CODE
#include "WdgM_MemMap.h"

extern CONST(WdgM_ConfigType, WDGM_CONST) WdgM_Config;

#endif
