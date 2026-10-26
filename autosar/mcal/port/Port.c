/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_PortDriver
 * In production  : VENDOR-SUPPLIED (MCAL from the silicon vendor)
 */
#include "Port.h"
#include "stm32g474xx.h"
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

#define PORT_NUM_PINS 112U                /* GPIOA..GPIOG, 16 pins each */
#define PORT_SWDIO    13U                 /* PA13 */
#define PORT_SWCLK    14U                 /* PA14 */

#define PORT_START_SEC_VAR_CLEARED_UNSPECIFIED
#include "Port_MemMap.h"
static P2CONST(Port_ConfigType, PORT_VAR, PORT_APPL_CONST) Port_ConfigPtr;
#define PORT_STOP_SEC_VAR_CLEARED_UNSPECIFIED
#include "Port_MemMap.h"

#define PORT_START_SEC_CODE
#include "Port_MemMap.h"

static FUNC(GPIO_TypeDef *, PORT_CODE) Port_Gpio(Port_PinType pin)
{
    /* The GPIO ports sit 0x400 apart starting at GPIOA (RM0440 memory map). */
    return (GPIO_TypeDef *)(GPIOA_BASE + ((uint32)(pin / 16U) * (GPIOB_BASE - GPIOA_BASE)));
}

static FUNC(void, PORT_CODE) Port_ApplyMode(P2CONST(Port_PinConfigType, AUTOMATIC, PORT_APPL_CONST) p)
{
    GPIO_TypeDef *const g = Port_Gpio(p->pin);
    const uint32 n = (uint32)p->pin % 16U;
    g->MODER = (g->MODER & ~(3UL << (n * 2U))) | ((uint32)p->mode << (n * 2U));
}

static FUNC(void, PORT_CODE) Port_ApplyPin(P2CONST(Port_PinConfigType, AUTOMATIC, PORT_APPL_CONST) p)
{
    GPIO_TypeDef *const g = Port_Gpio(p->pin);
    const uint32 n = (uint32)p->pin % 16U;
    g->BSRR = (p->initialLevel == STD_HIGH) ? (1UL << n) : (1UL << (n + 16U));   /* level first ... */
    g->PUPDR = (g->PUPDR & ~(3UL << (n * 2U))) | ((uint32)p->pull << (n * 2U));
    g->OSPEEDR = (g->OSPEEDR & ~(3UL << (n * 2U))) | ((uint32)p->speed << (n * 2U));
    g->OTYPER = (g->OTYPER & ~(1UL << n)) | ((uint32)p->openDrain << n);
    g->AFR[n / 8U] = (g->AFR[n / 8U] & ~(0xFUL << ((n % 8U) * 4U))) | ((uint32)p->af << ((n % 8U) * 4U));
    Port_ApplyMode(p);                                                           /* ... mode last */
}

static FUNC(boolean, PORT_CODE) Port_TakesSwd(P2CONST(Port_PinConfigType, AUTOMATIC, PORT_APPL_CONST) p)
{
    const boolean swdPin = ((p->pin == PORT_SWDIO) || (p->pin == PORT_SWCLK)) ? TRUE : FALSE;
    return ((swdPin == TRUE) && ((p->mode != PORT_MODE_AF) || (p->af != 0U))) ? TRUE : FALSE;
}

// [region:init]
FUNC(void, PORT_CODE) Port_Init(P2CONST(Port_ConfigType, AUTOMATIC, PORT_APPL_CONST) ConfigPtr)
{
    if (ConfigPtr == NULL_PTR)
    {
        PORT_DET(PORT_INIT_SID, PORT_E_PARAM_POINTER);   // «1»
        return;
    }
    for (uint8 i = 0U; i < ConfigPtr->numPins; ++i)
    {
        if (Port_TakesSwd(&ConfigPtr->pins[i]) == TRUE)
        {
            PORT_DET(PORT_INIT_SID, PORT_E_PARAM_CONFIG);   /* would lock out the debugger: refuse */  // «2»
            return;
        }
    }
    RCC->AHB2ENR |= RCC_AHB2ENR_GPIOAEN | RCC_AHB2ENR_GPIOBEN | RCC_AHB2ENR_GPIOCEN | RCC_AHB2ENR_GPIODEN |  // «3»
                    RCC_AHB2ENR_GPIOEEN | RCC_AHB2ENR_GPIOFEN | RCC_AHB2ENR_GPIOGEN;
    (void)RCC->AHB2ENR;
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
        Port_ApplyMode(&Port_ConfigPtr->pins[i]);
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
