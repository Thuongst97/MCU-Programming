/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_DiagnosticEventManager
 * In production  : VENDOR-SUPPLIED (BSW stack vendor), event tables GENERATED
 *
 * Dem-lite: monitors report PASSED/FAILED (or PREPASSED/PREFAILED for counter-based
 * debouncing); Dem keeps one UDS status byte per event (ISO 14229-1 bit meanings) and calls a
 * configured callback when it changes. One operation cycle, started by Dem_Init. Left out:
 * event memory and its non-volatile storage, freeze frames, extended data, aging, DTC groups,
 * enable/storage conditions, indicators, the Dcm interface, Dem_ClearDTC.
 */
#ifndef DEM_H
#define DEM_H

#include "Std_Types.h"
#include "Dem_Types.h"
#include "Dem_Cfg.h"

#define DEM_VENDOR_ID                     0xFFFFU
#define DEM_MODULE_ID                     54U
#define DEM_AR_RELEASE_MAJOR_VERSION      4U
#define DEM_AR_RELEASE_MINOR_VERSION      11U
#define DEM_AR_RELEASE_REVISION_VERSION   0U
#define DEM_SW_MAJOR_VERSION              1U
#define DEM_SW_MINOR_VERSION              0U
#define DEM_SW_PATCH_VERSION              0U

#define DEM_E_PARAM_DATA                  0x30U
#define DEM_E_UNINIT                      0x20U
#define DEM_SETEVENTSTATUS_SID            0x04U


/* UDS DTC status bits (ISO 14229-1) */
#define DEM_UDS_STATUS_TF                 0x01U   /* testFailed */
#define DEM_UDS_STATUS_TFTOC              0x02U   /* testFailedThisOperationCycle */
#define DEM_UDS_STATUS_PDTC               0x04U   /* pendingDTC */
#define DEM_UDS_STATUS_CDTC               0x08U   /* confirmedDTC */
#define DEM_UDS_STATUS_TNCSLC             0x10U   /* testNotCompletedSinceLastClear */
#define DEM_UDS_STATUS_TFSLC              0x20U   /* testFailedSinceLastClear */
#define DEM_UDS_STATUS_TNCTOC             0x40U   /* testNotCompletedThisOperationCycle */
#define DEM_UDS_STATUS_WIR                0x80U   /* warningIndicatorRequested */

typedef struct
{
    P2CONST(char, TYPEDEF, DEM_APPL_CONST) name;     /* for logs and the course's trace output */
    uint32 dtc;                                      /* 3-byte UDS DTC number, hypothetical */
    sint16 failThreshold;                            /* counter-based debouncing */
    sint16 passThreshold;
    sint16 stepUp;                                   /* per PREFAILED */
    sint16 stepDown;                                 /* per PREPASSED */
} Dem_EventParameterType;

typedef struct
{
    P2CONST(Dem_EventParameterType, TYPEDEF, DEM_APPL_CONST) events;   /* index = event ID - 1 */
    uint16 numEvents;
    P2FUNC(void, DEM_APPL_CODE, statusChanged)(Dem_EventIdType id, Dem_UdsStatusByteType oldStatus,
                                               Dem_UdsStatusByteType newStatus);
} Dem_ConfigType;

#define DEM_START_SEC_CODE
#include "Dem_MemMap.h"
FUNC(void, DEM_CODE) Dem_PreInit(void);
FUNC(void, DEM_CODE) Dem_Init(P2CONST(Dem_ConfigType, AUTOMATIC, DEM_APPL_CONST) ConfigPtr);
FUNC(Std_ReturnType, DEM_CODE) Dem_SetEventStatus(Dem_EventIdType EventId, Dem_EventStatusType EventStatus);
FUNC(Std_ReturnType, DEM_CODE) Dem_GetEventUdsStatus(Dem_EventIdType EventId,
                                                     P2VAR(Dem_UdsStatusByteType, AUTOMATIC, DEM_APPL_DATA) UDSStatusByte);
FUNC(void, DEM_CODE) Dem_MainFunction(void);
#define DEM_STOP_SEC_CODE
#include "Dem_MemMap.h"

extern CONST(Dem_ConfigType, DEM_CONST) Dem_Config;

#endif
