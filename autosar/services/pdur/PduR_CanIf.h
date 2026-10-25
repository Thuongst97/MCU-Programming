/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_PDURouter (callbacks for CanIf)
 * In production  : VENDOR-SUPPLIED (BSW stack vendor)
 */
#ifndef PDUR_CANIF_H
#define PDUR_CANIF_H

#include "PduR.h"

#define PDUR_START_SEC_CODE
#include "PduR_MemMap.h"
FUNC(void, PDUR_CODE) PduR_CanIfRxIndication(PduIdType RxPduId, P2CONST(PduInfoType, AUTOMATIC, PDUR_APPL_DATA) PduInfoPtr);
FUNC(void, PDUR_CODE) PduR_CanIfTxConfirmation(PduIdType TxPduId, Std_ReturnType result);
#define PDUR_STOP_SEC_CODE
#include "PduR_MemMap.h"

#endif
