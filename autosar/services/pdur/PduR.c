/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_PDURouter
 * In production  : VENDOR-SUPPLIED (BSW stack vendor)
 */
#include "PduR.h"
#include "PduR_CanIf.h"
#include "PduR_Com.h"
#include "CanIf.h"
#include "Com_Cbk.h"

#define PDUR_START_SEC_VAR_CLEARED_UNSPECIFIED
#include "PduR_MemMap.h"
static P2CONST(PduR_PBConfigType, PDUR_VAR, PDUR_APPL_CONST) PduR_ConfigPtr;
#define PDUR_STOP_SEC_VAR_CLEARED_UNSPECIFIED
#include "PduR_MemMap.h"

#define PDUR_START_SEC_CODE
#include "PduR_MemMap.h"

FUNC(void, PDUR_CODE) PduR_Init(P2CONST(PduR_PBConfigType, AUTOMATIC, PDUR_APPL_CONST) ConfigPtr)
{
    PduR_ConfigPtr = ConfigPtr;
}

// [region:route]
FUNC(Std_ReturnType, PDUR_CODE) PduR_ComTransmit(PduIdType TxPduId, P2CONST(PduInfoType, AUTOMATIC, PDUR_APPL_DATA) PduInfoPtr)
{
    if ((PduR_ConfigPtr == NULL_PTR) || (TxPduId >= PduR_ConfigPtr->numTx))
    {
        return E_NOT_OK;
    }
    return CanIf_Transmit(PduR_ConfigPtr->comTxToCanIf[TxPduId], PduInfoPtr);   /* Com handle -> CanIf handle */
}

FUNC(void, PDUR_CODE) PduR_CanIfRxIndication(PduIdType RxPduId, P2CONST(PduInfoType, AUTOMATIC, PDUR_APPL_DATA) PduInfoPtr)
{
    if ((PduR_ConfigPtr != NULL_PTR) && (RxPduId < PduR_ConfigPtr->numRx))
    {
        Com_RxIndication(PduR_ConfigPtr->canIfRxToCom[RxPduId], PduInfoPtr);
    }
}
// [endregion]

FUNC(void, PDUR_CODE) PduR_CanIfTxConfirmation(PduIdType TxPduId, Std_ReturnType result)
{
    if ((PduR_ConfigPtr != NULL_PTR) && (TxPduId < PduR_ConfigPtr->numTx))
    {
        Com_TxConfirmation(PduR_ConfigPtr->canIfTxToCom[TxPduId], result);
    }
}

#define PDUR_STOP_SEC_CODE
#include "PduR_MemMap.h"
