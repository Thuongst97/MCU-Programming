/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_COM (callbacks called by PduR)
 * In production  : VENDOR-SUPPLIED (BSW stack vendor)
 */
#ifndef COM_CBK_H
#define COM_CBK_H

#include "ComStack_Types.h"

#define COM_START_SEC_CODE
#include "Com_MemMap.h"
FUNC(void, COM_CODE) Com_RxIndication(PduIdType RxPduId, P2CONST(PduInfoType, AUTOMATIC, COM_APPL_DATA) PduInfoPtr);
FUNC(void, COM_CODE) Com_TxConfirmation(PduIdType TxPduId, Std_ReturnType result);
#define COM_STOP_SEC_CODE
#include "Com_MemMap.h"

#endif
