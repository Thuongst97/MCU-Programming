/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_CANInterface
 * In production  : VENDOR-SUPPLIED (BSW stack vendor)
 */
#include "CanIf.h"
#include "CanIf_Cbk.h"
#include "Can.h"
#include "PduR_CanIf.h"
#if (CANIF_DEV_ERROR_DETECT == STD_ON)
#include "Det.h"
#define CANIF_DET(api, err) ((void)Det_ReportError(CANIF_MODULE_ID, 0U, (api), (err)))
#else
#define CANIF_DET(api, err) ((void)0)
#endif

#if (CANIF_AR_RELEASE_MAJOR_VERSION != CAN_AR_RELEASE_MAJOR_VERSION) || \
    (CANIF_AR_RELEASE_MINOR_VERSION != CAN_AR_RELEASE_MINOR_VERSION)
#error "CanIf.c: AUTOSAR release of Can.h does not match"
#endif

#define CANIF_START_SEC_VAR_CLEARED_UNSPECIFIED
#include "CanIf_MemMap.h"
static P2CONST(CanIf_ConfigType, CANIF_VAR, CANIF_APPL_CONST) CanIf_ConfigPtr;
#define CANIF_STOP_SEC_VAR_CLEARED_UNSPECIFIED
#include "CanIf_MemMap.h"

#define CANIF_START_SEC_CODE
#include "CanIf_MemMap.h"

FUNC(void, CANIF_CODE) CanIf_Init(P2CONST(CanIf_ConfigType, AUTOMATIC, CANIF_APPL_CONST) ConfigPtr)
{
    CanIf_ConfigPtr = ConfigPtr;
}

FUNC(Std_ReturnType, CANIF_CODE) CanIf_SetControllerMode(uint8 ControllerId, Can_ControllerStateType ControllerMode)
{
    if (ControllerId != 0U)
    {
        CANIF_DET(0x03U, CANIF_E_PARAM_CONTROLLERID);
        return E_NOT_OK;
    }
    return Can_SetControllerMode(ControllerId, ControllerMode);
}

// [region:transmit]
FUNC(Std_ReturnType, CANIF_CODE) CanIf_Transmit(PduIdType TxPduId, P2CONST(PduInfoType, AUTOMATIC, CANIF_APPL_DATA) PduInfoPtr)
{
    if (CanIf_ConfigPtr == NULL_PTR)
    {
        CANIF_DET(CANIF_TRANSMIT_SID, CANIF_E_UNINIT);
        return E_NOT_OK;
    }
    if (PduInfoPtr == NULL_PTR)
    {
        CANIF_DET(CANIF_TRANSMIT_SID, CANIF_E_PARAM_POINTER);
        return E_NOT_OK;
    }
    if (TxPduId >= CanIf_ConfigPtr->numTxPdus)
    {
        CANIF_DET(CANIF_TRANSMIT_SID, CANIF_E_PARAM_LPDU);
        return E_NOT_OK;
    }
    P2CONST(CanIf_TxPduConfigType, AUTOMATIC, CANIF_APPL_CONST) c = &CanIf_ConfigPtr->txPdus[TxPduId];
    const Can_PduType pdu = {TxPduId, (uint8)((PduInfoPtr->SduLength > c->dlc) ? c->dlc : PduInfoPtr->SduLength),
                             c->canId, PduInfoPtr->SduDataPtr};               /* PDU handle -> CAN ID */
    return (Can_Write(c->hth, &pdu) == E_OK) ? E_OK : E_NOT_OK;               /* CAN_BUSY: refused here */
}
// [endregion]

// [region:rx]
FUNC(void, CANIF_CODE) CanIf_RxIndication(P2CONST(Can_HwType, AUTOMATIC, CANIF_APPL_DATA) Mailbox,
                                          P2CONST(PduInfoType, AUTOMATIC, CANIF_APPL_DATA) PduInfoPtr)
{
    if (CanIf_ConfigPtr == NULL_PTR)
    {
        CANIF_DET(CANIF_RXINDICATION_SID, CANIF_E_UNINIT);
        return;
    }
    if ((Mailbox == NULL_PTR) || (PduInfoPtr == NULL_PTR))
    {
        CANIF_DET(CANIF_RXINDICATION_SID, CANIF_E_PARAM_POINTER);
        return;
    }
    for (uint8 i = 0U; i < CanIf_ConfigPtr->numRxPdus; ++i)     /* CAN ID -> RX PDU handle */
    {
        if (CanIf_ConfigPtr->rxPdus[i].canId == Mailbox->CanId)
        {
            PduR_CanIfRxIndication(CanIf_ConfigPtr->rxPdus[i].upperRxPduId, PduInfoPtr);
            return;
        }
    }
    /* not configured: silently dropped (the software filter) */
}
// [endregion]

FUNC(void, CANIF_CODE) CanIf_TxConfirmation(PduIdType CanTxPduId)
{
    if ((CanIf_ConfigPtr != NULL_PTR) && (CanTxPduId < CanIf_ConfigPtr->numTxPdus))
    {
        PduR_CanIfTxConfirmation(CanIf_ConfigPtr->txPdus[CanTxPduId].upperTxPduId, E_OK);
    }
}

FUNC(void, CANIF_CODE) CanIf_ControllerModeIndication(uint8 ControllerId, Can_ControllerStateType ControllerMode)
{
    (void)ControllerId;                  /* production: forwarded to CanSM */
    (void)ControllerMode;
}

#define CANIF_STOP_SEC_CODE
#include "CanIf_MemMap.h"
