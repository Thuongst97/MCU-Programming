/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_COM (I-PDU callout), AUTOSAR_CP_SWS_DiagnosticEventManager (callbacks)
 * In production  : HAND-WRITTEN by the integrator; the configuration only names the functions
 */
#ifndef INTEGRATION_CALLOUTS_H
#define INTEGRATION_CALLOUTS_H

#include "ComStack_Types.h"

boolean Integration_TurnLightStatusTxCallout(PduIdType id, PduInfoType *pdu);   /* alive counter */
void Integration_DemStatusChanged(uint16 EventId, uint8 oldStatus, uint8 newStatus);

#endif
