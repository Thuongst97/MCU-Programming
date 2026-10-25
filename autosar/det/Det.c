/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_DefaultErrorTracer
 * In production  : VENDOR-SUPPLIED (BSW stack vendor)
 */
#include "Det.h"

#if (DET_AR_RELEASE_MAJOR_VERSION != STD_TYPES_AR_RELEASE_MAJOR_VERSION) || \
    (DET_AR_RELEASE_MINOR_VERSION != STD_TYPES_AR_RELEASE_MINOR_VERSION)
#error "Det.c: AUTOSAR release of Std_Types.h does not match"
#endif

#define DET_START_SEC_VAR_CLEARED_UNSPECIFIED
#include "Det_MemMap.h"
static VAR(Det_ErrorType, DET_VAR) Det_Log[DET_LOG_SIZE];
static VAR(uint32, DET_VAR) Det_Count;
#define DET_STOP_SEC_VAR_CLEARED_UNSPECIFIED
#include "Det_MemMap.h"

#define DET_START_SEC_CODE
#include "Det_MemMap.h"

FUNC(void, DET_CODE) Det_Init(P2CONST(Det_ConfigType, AUTOMATIC, DET_APPL_CONST) ConfigPtr)
{
    (void)ConfigPtr;
    Det_Count = 0U;
}

// [region:report]
FUNC(Std_ReturnType, DET_CODE) Det_ReportError(uint16 ModuleId, uint8 InstanceId, uint8 ApiId, uint8 ErrorId)
{
    P2VAR(Det_ErrorType, AUTOMATIC, DET_VAR) e = &Det_Log[Det_Count % DET_LOG_SIZE];
    e->moduleId = ModuleId;                               /* who, which instance, which API, what */
    e->instanceId = InstanceId;
    e->apiId = ApiId;
    e->errorId = ErrorId;
    Det_Count++;
#ifdef DET_CALLOUT
    DET_CALLOUT(ModuleId, InstanceId, ApiId, ErrorId);   /* e.g. print it, or halt for the debugger */
#endif
    return E_OK;                                          /* development errors never fail the caller */
}
// [endregion]

FUNC(void, DET_CODE) Det_GetVersionInfo(P2VAR(Std_VersionInfoType, AUTOMATIC, DET_APPL_DATA) versioninfo)
{
    if (versioninfo != NULL_PTR)
    {
        versioninfo->vendorID = DET_VENDOR_ID;
        versioninfo->moduleID = DET_MODULE_ID;
        versioninfo->sw_major_version = DET_SW_MAJOR_VERSION;
        versioninfo->sw_minor_version = DET_SW_MINOR_VERSION;
        versioninfo->sw_patch_version = DET_SW_PATCH_VERSION;
    }
}

FUNC(uint32, DET_CODE) Det_GetErrorCount(void)
{
    return Det_Count;
}

#define DET_STOP_SEC_CODE
#include "Det_MemMap.h"
