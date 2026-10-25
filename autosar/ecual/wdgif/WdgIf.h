/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_WatchdogInterface
 * In production  : VENDOR-SUPPLIED (BSW stack vendor), often generated as macros like these
 *
 * WdgIf maps a device index to the Wdg driver that serves it. With one watchdog the mapping is
 * a pair of macros: zero run-time cost, the same API for WdgM.
 */
#ifndef WDGIF_H
#define WDGIF_H

#include "Std_Types.h"
#include "WdgIf_Types.h"
#include "Wdg.h"

#define WDGIF_MODULE_ID                   43U
#define WDGIF_VENDOR_ID                   0xFFFFU
#define WDGIF_AR_RELEASE_MAJOR_VERSION    4U
#define WDGIF_AR_RELEASE_MINOR_VERSION    11U
#define WDGIF_AR_RELEASE_REVISION_VERSION 0U
#define WDGIF_SW_MAJOR_VERSION            1U
#define WDGIF_SW_MINOR_VERSION            0U
#define WDGIF_SW_PATCH_VERSION            0U

#define WdgIf_SetMode(DeviceIndex, WdgMode)              ((void)(DeviceIndex), Wdg_SetMode(WdgMode))
#define WdgIf_SetTriggerCondition(DeviceIndex, Timeout)  ((void)(DeviceIndex), Wdg_SetTriggerCondition(Timeout))

#endif
