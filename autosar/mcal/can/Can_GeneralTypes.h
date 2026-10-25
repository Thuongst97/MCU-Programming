/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_CANDriver (types shared with CanIf)
 * In production  : VENDOR-SUPPLIED (BSW stack vendor)
 */
#ifndef CAN_GENERALTYPES_H
#define CAN_GENERALTYPES_H

#include "ComStack_Types.h"

#define CAN_BUSY ((Std_ReturnType)0x02U)  /* Can_Write: no free hardware object right now */

typedef uint32 Can_IdType;                /* standard 11-bit IDs in this project */
typedef uint16 Can_HwHandleType;

typedef struct
{
    PduIdType swPduHandle;                /* handed back in CanIf_TxConfirmation */
    uint8 length;
    Can_IdType id;
    P2VAR(uint8, TYPEDEF, CAN_APPL_DATA) sdu;
} Can_PduType;

typedef struct
{
    Can_IdType CanId;
    Can_HwHandleType Hoh;
    uint8 ControllerId;
} Can_HwType;

typedef enum { CAN_CS_UNINIT = 0, CAN_CS_STARTED, CAN_CS_STOPPED, CAN_CS_SLEEP } Can_ControllerStateType;
typedef enum { CAN_ERRORSTATE_ACTIVE = 0, CAN_ERRORSTATE_PASSIVE, CAN_ERRORSTATE_BUSOFF } Can_ErrorStateType;

#endif
