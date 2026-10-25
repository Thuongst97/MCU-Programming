/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_DefaultErrorTracer
 * In production  : VENDOR-SUPPLIED (BSW stack vendor)
 *
 * Det-lite: development errors are counted, the last DET_LOG_SIZE are kept for the debugger,
 * and an optional callout (DET_CALLOUT in Det_Cfg.h) lets the integrator print them.
 * Left out: Det_Start, runtime errors and transient faults (Det_ReportRuntimeError,
 * Det_ReportTransientFault), the configurable error hooks list.
 */
#ifndef DET_H
#define DET_H

#include "Std_Types.h"
#include "Det_Cfg.h"

#define DET_VENDOR_ID                     0xFFFFU
#define DET_MODULE_ID                     15U
#define DET_AR_RELEASE_MAJOR_VERSION      4U
#define DET_AR_RELEASE_MINOR_VERSION      11U
#define DET_AR_RELEASE_REVISION_VERSION   0U
#define DET_SW_MAJOR_VERSION              1U
#define DET_SW_MINOR_VERSION              0U
#define DET_SW_PATCH_VERSION              0U

typedef struct
{
    uint16 moduleId;
    uint8 instanceId;
    uint8 apiId;
    uint8 errorId;
} Det_ErrorType;

typedef struct
{
    uint8 dummy;                          /* Det-lite has nothing to configure at run time */
} Det_ConfigType;

#define DET_START_SEC_CODE
#include "Det_MemMap.h"
FUNC(void, DET_CODE) Det_Init(P2CONST(Det_ConfigType, AUTOMATIC, DET_APPL_CONST) ConfigPtr);
FUNC(Std_ReturnType, DET_CODE) Det_ReportError(uint16 ModuleId, uint8 InstanceId, uint8 ApiId, uint8 ErrorId);
FUNC(void, DET_CODE) Det_GetVersionInfo(P2VAR(Std_VersionInfoType, AUTOMATIC, DET_APPL_DATA) versioninfo);
FUNC(uint32, DET_CODE) Det_GetErrorCount(void);   /* project extension, for tests */
#define DET_STOP_SEC_CODE
#include "Det_MemMap.h"

#endif
