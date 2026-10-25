/* SPDX-License-Identifier: MIT
 * Example 08: the independent watchdog, reset causes, and a HardFault handler that decodes the
 * fault, keeps a record in .noinit RAM across the reset, and restarts the chip.
 * Type a key in the terminal to cause a fault on purpose. PM0056 §4.4, RM0008 §7.3.10 and §19.
 */
#include <stdint.h>
#include "stm32f103xb.h"
#include "clock.h"
#include "faultdecode.h"
#include "led.h"
#include "systick.h"
#include "uart_log.h"

#define FAULT_MAGIC 0xFA017ED5U

typedef struct
{
    uint32_t magic, cfsr, hfsr, mmfar, bfar, pc, lr;
} fault_record_t;

// [region:record]
__attribute__((section(".noinit"))) static fault_record_t s_last_fault;   /* survives a reset */  // «1»
// [endregion]

/* ------------------------------------------------------------------ watchdog */
// [region:iwdg]
static void iwdg_start_1s(void)
{
    DBGMCU->CR |= DBGMCU_CR_DBG_IWDG_STOP;          /* don't reset while halted at a breakpoint */ // «2»
    IWDG->KR = 0x5555U;                             /* unlock PR and RLR */                        // «3»
    IWDG->PR = 3U;                                  /* LSI / 32: about 1.25 kHz */
    IWDG->RLR = 1250U - 1U;                         /* about 1 s; LSI varies 30-60 kHz (DS5319) */
    for (uint32_t n = 0U; ((IWDG->SR & (IWDG_SR_PVU | IWDG_SR_RVU)) != 0U) && (n < 100000U); ++n)
    {
        /* the new values cross into the LSI clock domain */
    }
    IWDG->KR = 0xAAAAU;                             /* reload the counter */
    IWDG->KR = 0xCCCCU;                             /* start: from now on it cannot be stopped */   // «4»
}

static void iwdg_feed(void)
{
    IWDG->KR = 0xAAAAU;                                                                            // «5»
}
// [endregion]

/* ------------------------------------------------------------------ faults */
// [region:handler]
void HardFault_Handler(void) __attribute__((naked));
void HardFault_Handler(void)
{
    /* Bit 2 of EXC_RETURN in LR says which stack the exception frame was pushed to. */
    __asm volatile(
        "tst lr, #4      \n"                                                                       // «6»
        "ite eq          \n"
        "mrseq r0, msp   \n"
        "mrsne r0, psp   \n"
        "b hardfault_c   \n");
}

void hardfault_c(const uint32_t *frame);
void hardfault_c(const uint32_t *frame)
{
    s_last_fault.cfsr = SCB->CFSR;                                                                 // «7»
    s_last_fault.hfsr = SCB->HFSR;
    s_last_fault.mmfar = SCB->MMFAR;
    s_last_fault.bfar = SCB->BFAR;
    s_last_fault.lr = frame[5];                     /* stacked r0 r1 r2 r3 r12 lr pc xpsr */
    s_last_fault.pc = frame[6];                     /* the instruction that faulted (if precise) */ // «8»
    s_last_fault.magic = FAULT_MAGIC;
    char why[96];
    uart_puts("\n*** HardFault at pc ");
    uart_put_hex(s_last_fault.pc);
    uart_puts(": ");
    uart_puts(fault_describe(s_last_fault.cfsr, s_last_fault.hfsr, why, sizeof why));
    uart_puts("\n*** resetting\n");
    NVIC_SystemReset();                             /* a known state beats limping on */           // «9»
}
// [endregion]

// [region:faults]
static void fault_div0(void)
{
    SCB->CCR |= SCB_CCR_DIV_0_TRP_Msk;              /* by default x / 0 silently gives 0 */        // «10»
    volatile uint32_t zero = 0U;
    volatile uint32_t r = 100U / zero;
    (void)r;
}

static void fault_undefined(void)
{
    __asm volatile(".hword 0xDE00");                /* UDF #0: permanently undefined in Thumb */   // «11»
}

static void fault_invstate(void)
{
    void (*fn)(void) = (void (*)(void))((uintptr_t)&fault_undefined & ~1U);  /* Thumb bit cleared */ // «12»
    fn();
}

static void fault_bus(void)
{
    volatile uint32_t v = *(volatile uint32_t *)0x60000000U;   /* no memory there on the C8 */      // «13»
    (void)v;
}
// [endregion]

static void help(void)
{
    uart_puts("keys: d = divide by 0, u = undefined instruction, i = invalid state, b = bus fault,\n"
              "      w = stop feeding the watchdog, h = this help\n");
}

int main(void)
{
    (void)clock_init_72mhz();
    systick_init_1ms();
    uart_log_init(115200U);
    led_init();

    // [region:boot]
    uart_puts("\nExample 08 boot, reset cause: ");
    uart_puts(reset_cause(RCC->CSR));                                                              // «14»
    uart_puts("\n");
    RCC->CSR |= RCC_CSR_RMVF;                       /* clear the flags for next time */
    if (s_last_fault.magic == FAULT_MAGIC)
    {
        char why[96];
        uart_puts("last fault: pc ");
        uart_put_hex(s_last_fault.pc);
        uart_puts(" ");
        uart_puts(fault_describe(s_last_fault.cfsr, s_last_fault.hfsr, why, sizeof why));
        uart_puts("\n");
        s_last_fault.magic = 0U;                    /* report each fault once */
    }
    // [endregion]
    help();
    iwdg_start_1s();

    uint32_t fed = 1U;
    for (;;)
    {
        if (fed != 0U)
        {
            iwdg_feed();
        }
        led_off();
        const int c = uart_getc_nonblocking();
        if (c == 'd')
        {
            fault_div0();
        }
        else if (c == 'u')
        {
            fault_undefined();
        }
        else if (c == 'i')
        {
            fault_invstate();
        }
        else if (c == 'b')
        {
            fault_bus();
            uart_puts("read 0x60000000 returned without a fault\n");
        }
        else if (c == 'w')
        {
            fed = 0U;
            led_on();
            uart_puts("not feeding the watchdog any more: reset in about 1 s\n");
        }
        else if (c == 'h')
        {
            help();
        }
        else
        {
            /* no key */
        }
    }
}
