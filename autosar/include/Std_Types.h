/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_StandardTypes (requirement IDs: see docs/autosar-self-review.md)
 * In production  : VENDOR-SUPPLIED (part of the platform / compiler integration)
 */
#ifndef STD_TYPES_H
#define STD_TYPES_H

#include "Platform_Types.h"
#include "Compiler.h"

typedef uint8 Std_ReturnType;               /* E_OK, E_NOT_OK, or module-specific codes from 0x02 */

#ifndef STATUSTYPEDEFINED
#define STATUSTYPEDEFINED
#define E_OK            ((Std_ReturnType)0x00U)
typedef unsigned char StatusType;           /* OSEK compatibility: E_OK is shared with the OS */
#endif
#define E_NOT_OK        ((Std_ReturnType)0x01U)

#define STD_HIGH        0x01U               /* physical level 5 V or 3.3 V */
#define STD_LOW         0x00U               /* physical level 0 V */
#define STD_ACTIVE      0x01U
#define STD_IDLE        0x00U
#define STD_ON          0x01U
#define STD_OFF         0x00U

typedef struct
{
    uint16 vendorID;
    uint16 moduleID;
    uint8 sw_major_version;
    uint8 sw_minor_version;
    uint8 sw_patch_version;
} Std_VersionInfoType;

/* Published information of this file (every BSW file carries the same set). */
#define STD_TYPES_VENDOR_ID                     0xFFFFU   /* 0xFFFF: no registered vendor (teaching code) */
#define STD_TYPES_AR_RELEASE_MAJOR_VERSION      4U
#define STD_TYPES_AR_RELEASE_MINOR_VERSION      11U
#define STD_TYPES_AR_RELEASE_REVISION_VERSION   0U

#endif
