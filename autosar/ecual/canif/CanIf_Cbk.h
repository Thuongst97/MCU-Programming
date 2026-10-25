/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_CANInterface (callbacks called by the Can driver)
 * In production  : VENDOR-SUPPLIED (BSW stack vendor)
 */
#ifndef CANIF_CBK_H
#define CANIF_CBK_H

#include "ComStack_Types.h"
#include "Can_GeneralTypes.h"

#define CANIF_START_SEC_CODE
#include "CanIf_MemMap.h"
FUNC(void, CANIF_CODE) CanIf_RxIndication(P2CONST(Can_HwType, AUTOMATIC, CANIF_APPL_DATA) Mailbox,
                                          P2CONST(PduInfoType, AUTOMATIC, CANIF_APPL_DATA) PduInfoPtr);
FUNC(void, CANIF_CODE) CanIf_TxConfirmation(PduIdType CanTxPduId);
FUNC(void, CANIF_CODE) CanIf_ControllerModeIndication(uint8 ControllerId, Can_ControllerStateType ControllerMode);
#define CANIF_STOP_SEC_CODE
#include "CanIf_MemMap.h"

#endif
