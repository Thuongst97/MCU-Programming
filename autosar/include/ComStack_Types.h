/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_CommunicationStackTypes
 * In production  : VENDOR-SUPPLIED (BSW stack vendor)
 */
#ifndef COMSTACK_TYPES_H
#define COMSTACK_TYPES_H

#include "Std_Types.h"

typedef uint16 PduIdType;                 /* a PDU's handle; each layer has its own numbering */
typedef uint16 PduLengthType;

typedef struct
{
    P2VAR(uint8, TYPEDEF, AUTOSAR_COMSTACKDATA) SduDataPtr;
    P2VAR(uint8, TYPEDEF, AUTOSAR_COMSTACKDATA) MetaDataPtr;
    PduLengthType SduLength;
} PduInfoType;

#endif
