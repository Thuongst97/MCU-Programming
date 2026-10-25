/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_PortDriver
 * In production  : VENDOR-SUPPLIED (MCAL from the silicon vendor)
 */
#include "Port.h"
#include "stm32f103xb.h"
#if (PORT_DEV_ERROR_DETECT == STD_ON)
#include "Det.h"
#define PORT_DET(api, err) ((void)Det_ReportError(PORT_MODULE_ID, 0U, (api), (err)))
#else
#define PORT_DET(api, err) ((void)0)
#endif

#if (PORT_AR_RELEASE_MAJOR_VERSION != STD_TYPES_AR_RELEASE_MAJOR_VERSION) || \
    (PORT_AR_RELEASE_MINOR_VERSION != STD_TYPES_AR_RELEASE_MINOR_VERSION)
#error "Port.c: AUTOSAR release of Std_Types.h does not match"
#endif

#define PORT_NUM_PINS 48U                 /* GPIOA..GPIOC on the 48-pin package */

#define PORT_START_SEC_VAR_CLEARED_UNSPECIFIED
#include "Port_MemMap.h"
static P2CONST(Port_ConfigType, PORT_VAR, PORT_APPL_CONST) Port_ConfigPtr;
#define PORT_STOP_SEC_VAR_CLEARED_UNSPECIFIED
#include "Port_MemMap.h"

#define PORT_START_SEC_CODE
#include "Port_MemMap.h"

static FUNC(GPIO_TypeDef *, PORT_CODE) Port_Gpio(Port_PinType pin)
{
    static GPIO_TypeDef *const gpio[3] = {GPIOA, GPIOB, GPIOC};
    return gpio[pin / 16U];
}

static FUNC(void, PORT_CODE) Port_ApplyPin(P2CONST(Port_PinConfigType, AUTOMATIC, PORT_APPL_CONST) p)
{
    GPIO_TypeDef *const g = Port_Gpio(p->pin);
    const uint32 n = (uint32)p->pin % 16U;
    volatile uint32 *const cr = (n < 8U) ? &g->CRL : &g->CRH;
    const uint32 shift = (n % 8U) * 4U;
    g->BSRR = (p->initialLevel == STD_HIGH) ? (1UL << n) : (1UL << (n + 16U));   /* level first ... */
    *cr = (*cr & ~(0xFUL << shift)) | ((uint32)p->mode << shift);                 /* ... then the mode */
}

// [region:init]
FUNC(void, PORT_CODE) Port_Init(P2CONST(Port_ConfigType, AUTOMATIC, PORT_APPL_CONST) ConfigPtr)
{
    if (ConfigPtr == NULL_PTR)
    {
        PORT_DET(PORT_INIT_SID, PORT_E_PARAM_POINTER);   // «1»
        return;
    }
    if ((ConfigPtr->afioMapr & AFIO_MAPR_SWJ_CFG) == AFIO_MAPR_SWJ_CFG_DISABLE)
    {
        PORT_DET(PORT_INIT_SID, PORT_E_PARAM_CONFIG);    /* would lock out the debugger: refuse */   // «2»
        return;
    }
    RCC->APB2ENR |= RCC_APB2ENR_IOPAEN | RCC_APB2ENR_IOPBEN | RCC_APB2ENR_IOPCEN | RCC_APB2ENR_AFIOEN;
    AFIO->MAPR = ConfigPtr->afioMapr;   // «3»
    for (uint8 i = 0U; i < ConfigPtr->numPins; ++i)
    {
        if (ConfigPtr->pins[i].pin >= PORT_NUM_PINS)
        {
            PORT_DET(PORT_INIT_SID, PORT_E_PARAM_PIN);
            continue;
        }
        Port_ApplyPin(&ConfigPtr->pins[i]);   // «4»
    }
    Port_ConfigPtr = ConfigPtr;   // «5»
}
// [endregion]

FUNC(void, PORT_CODE) Port_RefreshPortDirection(void)
{
    if (Port_ConfigPtr == NULL_PTR)
    {
        PORT_DET(PORT_REFRESHPORTDIRECTION_SID, PORT_E_UNINIT);
        return;
    }
    for (uint8 i = 0U; i < Port_ConfigPtr->numPins; ++i)  /* re-apply against corrupted registers */
    {
        GPIO_TypeDef *const g = Port_Gpio(Port_ConfigPtr->pins[i].pin);
        const uint32 n = (uint32)Port_ConfigPtr->pins[i].pin % 16U;
        volatile uint32 *const cr = (n < 8U) ? &g->CRL : &g->CRH;
        const uint32 shift = (n % 8U) * 4U;
        *cr = (*cr & ~(0xFUL << shift)) | ((uint32)Port_ConfigPtr->pins[i].mode << shift);
    }
}

FUNC(void, PORT_CODE) Port_GetVersionInfo(P2VAR(Std_VersionInfoType, AUTOMATIC, PORT_APPL_DATA) versioninfo)
{
    if (versioninfo == NULL_PTR)
    {
        PORT_DET(PORT_GETVERSIONINFO_SID, PORT_E_PARAM_POINTER);
        return;
    }
    versioninfo->vendorID = PORT_VENDOR_ID;
    versioninfo->moduleID = PORT_MODULE_ID;
    versioninfo->sw_major_version = PORT_SW_MAJOR_VERSION;
    versioninfo->sw_minor_version = PORT_SW_MINOR_VERSION;
    versioninfo->sw_patch_version = PORT_SW_PATCH_VERSION;
}

#define PORT_STOP_SEC_CODE
#include "Port_MemMap.h"
