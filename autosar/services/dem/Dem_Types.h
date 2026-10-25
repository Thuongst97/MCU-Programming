/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_DiagnosticEventManager (types shared with the RTE)
 * In production  : GENERATED together with the RTE types (Rte_Dem_Type.h)
 */
#ifndef DEM_TYPES_H
#define DEM_TYPES_H

#include "Std_Types.h"

typedef uint16 Dem_EventIdType;           /* 1..n; 0 is not a valid event */
typedef uint8 Dem_EventStatusType;
typedef uint8 Dem_UdsStatusByteType;

#define DEM_EVENT_STATUS_PASSED           0x00U
#define DEM_EVENT_STATUS_FAILED           0x01U
#define DEM_EVENT_STATUS_PREPASSED        0x02U
#define DEM_EVENT_STATUS_PREFAILED        0x03U

#endif
