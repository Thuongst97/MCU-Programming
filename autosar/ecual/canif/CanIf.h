/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_CANInterface
 * In production  : VENDOR-SUPPLIED (BSW stack vendor), tables GENERATED
 *
 * CanIf-lite: maps its TX PDU handles to CAN IDs and the driver's HTH, and received CAN IDs to
 * RX PDU handles for PduR. One controller. Left out: transmit buffering on CAN_BUSY (the frame
 * is refused and Com sends it again next cycle), PDU channel modes, DLC check against the
 * configuration, software filtering beyond an exact ID match, wake-up and transceiver handling.
 */
#ifndef CANIF_H
#define CANIF_H

#include "ComStack_Types.h"
#include "Can_GeneralTypes.h"
#include "CanIf_Cfg.h"

#define CANIF_VENDOR_ID                   0xFFFFU
#define CANIF_MODULE_ID                   60U
#define CANIF_AR_RELEASE_MAJOR_VERSION    4U
#define CANIF_AR_RELEASE_MINOR_VERSION    11U
#define CANIF_AR_RELEASE_REVISION_VERSION 0U
#define CANIF_SW_MAJOR_VERSION            1U
#define CANIF_SW_MINOR_VERSION            0U
#define CANIF_SW_PATCH_VERSION            0U

#define CANIF_E_PARAM_LPDU                0x0DU
#define CANIF_E_PARAM_CONTROLLERID        0x0FU
#define CANIF_E_PARAM_POINTER             0x14U
#define CANIF_E_UNINIT                    0x1EU
#define CANIF_TRANSMIT_SID                0x05U
#define CANIF_RXINDICATION_SID            0x14U

typedef struct
{
    Can_IdType canId;
    uint8 dlc;
    Can_HwHandleType hth;
    PduIdType upperTxPduId;               /* PduR's handle for the confirmation */
} CanIf_TxPduConfigType;

typedef struct
{
    Can_IdType canId;
    PduIdType upperRxPduId;               /* PduR's handle */
} CanIf_RxPduConfigType;

typedef struct
{
    P2CONST(CanIf_TxPduConfigType, TYPEDEF, CANIF_APPL_CONST) txPdus;
    uint8 numTxPdus;
    P2CONST(CanIf_RxPduConfigType, TYPEDEF, CANIF_APPL_CONST) rxPdus;
    uint8 numRxPdus;
} CanIf_ConfigType;

#define CANIF_START_SEC_CODE
#include "CanIf_MemMap.h"
FUNC(void, CANIF_CODE) CanIf_Init(P2CONST(CanIf_ConfigType, AUTOMATIC, CANIF_APPL_CONST) ConfigPtr);
FUNC(Std_ReturnType, CANIF_CODE) CanIf_Transmit(PduIdType TxPduId, P2CONST(PduInfoType, AUTOMATIC, CANIF_APPL_DATA) PduInfoPtr);
FUNC(Std_ReturnType, CANIF_CODE) CanIf_SetControllerMode(uint8 ControllerId, Can_ControllerStateType ControllerMode);
#define CANIF_STOP_SEC_CODE
#include "CanIf_MemMap.h"

extern CONST(CanIf_ConfigType, CANIF_CONST) CanIf_Config;

#endif
