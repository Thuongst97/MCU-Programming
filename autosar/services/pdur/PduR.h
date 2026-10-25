/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_PDURouter
 * In production  : VENDOR-SUPPLIED (BSW stack vendor), routing tables GENERATED
 *
 * PduR-lite: static 1:1 routes between Com and CanIf. Left out: gateway routes, fan-out,
 * transport-protocol (TP) routing, routing path groups, buffers.
 */
#ifndef PDUR_H
#define PDUR_H

#include "ComStack_Types.h"
#include "PduR_Cfg.h"

#define PDUR_VENDOR_ID                    0xFFFFU
#define PDUR_MODULE_ID                    51U
#define PDUR_AR_RELEASE_MAJOR_VERSION     4U
#define PDUR_AR_RELEASE_MINOR_VERSION     11U
#define PDUR_AR_RELEASE_REVISION_VERSION  0U
#define PDUR_SW_MAJOR_VERSION             1U
#define PDUR_SW_MINOR_VERSION             0U
#define PDUR_SW_PATCH_VERSION             0U

typedef struct
{
    P2CONST(PduIdType, TYPEDEF, PDUR_APPL_CONST) comTxToCanIf;     /* Com TX I-PDU -> CanIf TX PDU */
    P2CONST(PduIdType, TYPEDEF, PDUR_APPL_CONST) canIfTxToCom;     /* CanIf TX PDU -> Com TX I-PDU */
    P2CONST(PduIdType, TYPEDEF, PDUR_APPL_CONST) canIfRxToCom;     /* CanIf RX PDU -> Com RX I-PDU */
    uint8 numTx;
    uint8 numRx;
} PduR_PBConfigType;

#define PDUR_START_SEC_CODE
#include "PduR_MemMap.h"
FUNC(void, PDUR_CODE) PduR_Init(P2CONST(PduR_PBConfigType, AUTOMATIC, PDUR_APPL_CONST) ConfigPtr);
#define PDUR_STOP_SEC_CODE
#include "PduR_MemMap.h"

extern CONST(PduR_PBConfigType, PDUR_CONST) PduR_Config;

#endif
