/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_DiagnosticEventManager
 * In production  : VENDOR-SUPPLIED (BSW stack vendor)
 */
#include "Dem.h"
#include "SchM_Dem.h"
#if (DEM_DEV_ERROR_DETECT == STD_ON)
#include "Det.h"
#define DEM_DET(api, err) ((void)Det_ReportError(DEM_MODULE_ID, 0U, (api), (err)))
#else
#define DEM_DET(api, err) ((void)0)
#endif

#define DEM_START_SEC_VAR_CLEARED_UNSPECIFIED
#include "Dem_MemMap.h"
static P2CONST(Dem_ConfigType, DEM_VAR, DEM_APPL_CONST) Dem_ConfigPtr;
static VAR(Dem_UdsStatusByteType, DEM_VAR) Dem_Status[DEM_MAX_EVENTS];
static VAR(sint16, DEM_VAR) Dem_Counter[DEM_MAX_EVENTS];
#define DEM_STOP_SEC_VAR_CLEARED_UNSPECIFIED
#include "Dem_MemMap.h"

#define DEM_START_SEC_CODE
#include "Dem_MemMap.h"

FUNC(void, DEM_CODE) Dem_PreInit(void)
{
    for (uint16 i = 0U; i < DEM_MAX_EVENTS; ++i)                     /* "not tested yet" */
    {
        Dem_Status[i] = DEM_UDS_STATUS_TNCSLC | DEM_UDS_STATUS_TNCTOC;
        Dem_Counter[i] = 0;
    }
}

FUNC(void, DEM_CODE) Dem_Init(P2CONST(Dem_ConfigType, AUTOMATIC, DEM_APPL_CONST) ConfigPtr)
{
    Dem_ConfigPtr = ConfigPtr;                                         /* operation cycle starts */
}

// [region:set]
FUNC(Std_ReturnType, DEM_CODE) Dem_SetEventStatus(Dem_EventIdType EventId, Dem_EventStatusType EventStatus)
{
    if (Dem_ConfigPtr == NULL_PTR)
    {
        DEM_DET(DEM_SETEVENTSTATUS_SID, DEM_E_UNINIT);
        return E_NOT_OK;
    }
    if ((EventId == 0U) || (EventId > Dem_ConfigPtr->numEvents) || (EventStatus > DEM_EVENT_STATUS_PREFAILED))
    {
        DEM_DET(DEM_SETEVENTSTATUS_SID, DEM_E_PARAM_DATA);
        return E_NOT_OK;
    }
    const uint16 i = (uint16)(EventId - 1U);
    P2CONST(Dem_EventParameterType, AUTOMATIC, DEM_APPL_CONST) p = &Dem_ConfigPtr->events[i];
    SchM_Enter_Dem_DEM_EXCLUSIVE_AREA_0();
    sint16 c = Dem_Counter[i];
    switch (EventStatus)                                               /* counter-based debouncing */
    {
    case DEM_EVENT_STATUS_PREFAILED:
        c = ((c + p->stepUp) > p->failThreshold) ? p->failThreshold : (sint16)(c + p->stepUp);
        break;
    case DEM_EVENT_STATUS_PREPASSED:
        c = ((c - p->stepDown) < p->passThreshold) ? p->passThreshold : (sint16)(c - p->stepDown);
        break;
    case DEM_EVENT_STATUS_FAILED:
        c = p->failThreshold;                                          /* qualified at once */
        break;
    default:
        c = p->passThreshold;
        break;
    }
    Dem_Counter[i] = c;
    const Dem_UdsStatusByteType old = Dem_Status[i];
    Dem_UdsStatusByteType st = old;
    if (c >= p->failThreshold)
    {
        st |= DEM_UDS_STATUS_TF | DEM_UDS_STATUS_TFTOC | DEM_UDS_STATUS_PDTC | DEM_UDS_STATUS_CDTC |
              DEM_UDS_STATUS_TFSLC;                                    /* confirmed at the first failure */
        st &= (Dem_UdsStatusByteType)~(DEM_UDS_STATUS_TNCSLC | DEM_UDS_STATUS_TNCTOC);
    }
    else if (c <= p->passThreshold)
    {
        st &= (Dem_UdsStatusByteType)~DEM_UDS_STATUS_TF;               /* the rest stays as history */
        st &= (Dem_UdsStatusByteType)~(DEM_UDS_STATUS_TNCSLC | DEM_UDS_STATUS_TNCTOC);
    }
    else
    {
        /* still debouncing: no new result */
    }
    Dem_Status[i] = st;
    SchM_Exit_Dem_DEM_EXCLUSIVE_AREA_0();
    if ((st != old) && (Dem_ConfigPtr->statusChanged != NULL_PTR))
    {
        Dem_ConfigPtr->statusChanged(EventId, old, st);
    }
    return E_OK;
}
// [endregion]

FUNC(Std_ReturnType, DEM_CODE) Dem_GetEventUdsStatus(Dem_EventIdType EventId,
                                                     P2VAR(Dem_UdsStatusByteType, AUTOMATIC, DEM_APPL_DATA) UDSStatusByte)
{
    if ((Dem_ConfigPtr == NULL_PTR) || (EventId == 0U) || (EventId > Dem_ConfigPtr->numEvents) || (UDSStatusByte == NULL_PTR))
    {
        return E_NOT_OK;
    }
    *UDSStatusByte = Dem_Status[EventId - 1U];
    return E_OK;
}

FUNC(void, DEM_CODE) Dem_MainFunction(void)
{
    /* Dem-lite has no time-based debouncing or aging; kept so the schedule matches production */
}

#define DEM_STOP_SEC_CODE
#include "Dem_MemMap.h"
