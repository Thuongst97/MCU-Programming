/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_PDURouter (API for Com)
 * In production  : VENDOR-SUPPLIED (BSW stack vendor)
 */
#ifndef PDUR_COM_H
#define PDUR_COM_H

#include "PduR.h"

#define PDUR_START_SEC_CODE
#include "PduR_MemMap.h"
FUNC(Std_ReturnType, PDUR_CODE) PduR_ComTransmit(PduIdType TxPduId, P2CONST(PduInfoType, AUTOMATIC, PDUR_APPL_DATA) PduInfoPtr);
#define PDUR_STOP_SEC_CODE
#include "PduR_MemMap.h"

#endif
