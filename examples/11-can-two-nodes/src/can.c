/* SPDX-License-Identifier: MIT */
#include "can.h"

#include "stm32f103xb.h"

#define CAN_WAIT 200000U
#define RXQ_LEN  8U

static can_frame_t s_rxq[RXQ_LEN];
static volatile uint32_t s_rx_head, s_rx_tail;   /* ISR writes head, main writes tail (module 06) */

static bool wait_msr(uint32_t mask, uint32_t want)
{
    for (uint32_t n = 0U; n < CAN_WAIT; ++n)
    {
        if ((CAN1->MSR & mask) == want)
        {
            return true;
        }
    }
    return false;
}

// [region:init]
bool can_init(uint32_t btr, can_mode_t mode)
{
    RCC->APB2ENR |= RCC_APB2ENR_IOPBEN | RCC_APB2ENR_AFIOEN;
    RCC->APB1ENR |= RCC_APB1ENR_CAN1EN;
    /* CAN on PB8/PB9. SWJ_CFG reads back undefined, so write it explicitly (000 = reset default). */
    AFIO->MAPR = (AFIO->MAPR & ~(AFIO_MAPR_CAN_REMAP | AFIO_MAPR_SWJ_CFG)) | AFIO_MAPR_CAN_REMAP_REMAP2;  // «1»
    GPIOB->CRH = (GPIOB->CRH & ~(GPIO_CRH_MODE8 | GPIO_CRH_CNF8 | GPIO_CRH_MODE9 | GPIO_CRH_CNF9))
                 | GPIO_CRH_CNF8_1                        /* PB8 CAN_RX: input with pull-up */
                 | GPIO_CRH_MODE9 | GPIO_CRH_CNF9_1;      /* PB9 CAN_TX: AF push-pull */
    GPIOB->BSRR = GPIO_BSRR_BS8;

    CAN1->MCR = CAN_MCR_INRQ | CAN_MCR_ABOM;              /* leave Sleep, request Initialization */  // «2»
    if (!wait_msr(CAN_MSR_INAK | CAN_MSR_SLAK, CAN_MSR_INAK))
    {
        return false;
    }
    CAN1->BTR = btr | ((mode == CAN_MODE_SILENT_LOOPBACK) ? (CAN_BTR_LBKM | CAN_BTR_SILM) : 0U);  // «3»

    /* One filter bank, 32-bit mask mode, mask 0: accept every frame into FIFO 0. */
    CAN1->FMR |= CAN_FMR_FINIT;                                                                       // «4»
    CAN1->FA1R &= ~1U;
    CAN1->FS1R |= 1U;                                     /* bank 0: one 32-bit filter */
    CAN1->FM1R &= ~1U;                                    /* identifier/mask mode */
    CAN1->FFA1R &= ~1U;                                   /* to FIFO 0 */
    CAN1->sFilterRegister[0].FR1 = 0U;                    /* identifier (don't care) */
    CAN1->sFilterRegister[0].FR2 = 0U;                    /* mask: no bit must match */
    CAN1->FA1R |= 1U;
    CAN1->FMR &= ~CAN_FMR_FINIT;

    CAN1->IER = CAN_IER_FMPIE0;                           /* interrupt when FIFO 0 is not empty */
    NVIC_SetPriority(USB_LP_CAN1_RX0_IRQn, 5U);           /* vector shared with USB (IRQ 20) */     // «5»
    NVIC_EnableIRQ(USB_LP_CAN1_RX0_IRQn);

    CAN1->MCR &= ~CAN_MCR_INRQ;                           /* to Normal mode ... */
    return wait_msr(CAN_MSR_INAK, 0U);                    /* ... once 11 recessive bits are seen */  // «6»
}
// [endregion]

// [region:tx]
bool can_send(const can_frame_t *f)
{
    const uint32_t tsr = CAN1->TSR;
    uint32_t mb;
    if ((tsr & CAN_TSR_TME0) != 0U) { mb = 0U; }
    else if ((tsr & CAN_TSR_TME1) != 0U) { mb = 1U; }
    else if ((tsr & CAN_TSR_TME2) != 0U) { mb = 2U; }
    else { return false; }                                /* all three mailboxes pending */          // «7»
    CAN_TxMailBox_TypeDef *m = &CAN1->sTxMailBox[mb];
    m->TDTR = f->dlc & 0xFU;
    m->TDLR = (uint32_t)f->data[0] | ((uint32_t)f->data[1] << 8) | ((uint32_t)f->data[2] << 16) | ((uint32_t)f->data[3] << 24);
    m->TDHR = (uint32_t)f->data[4] | ((uint32_t)f->data[5] << 8) | ((uint32_t)f->data[6] << 16) | ((uint32_t)f->data[7] << 24);
    m->TIR = ((uint32_t)f->id << CAN_TI0R_STID_Pos) | CAN_TI0R_TXRQ;   /* standard ID, data frame: go */ // «8»
    return true;
}
// [endregion]

// [region:rx]
void USB_LP_CAN1_RX0_IRQHandler(void);
void USB_LP_CAN1_RX0_IRQHandler(void)
{
    while ((CAN1->RF0R & CAN_RF0R_FMP0) != 0U)            /* up to 3 frames may be waiting */
    {
        const uint32_t head = s_rx_head;
        can_frame_t *f = &s_rxq[head % RXQ_LEN];
        f->id = (uint16_t)(CAN1->sFIFOMailBox[0].RIR >> CAN_RI0R_STID_Pos);                          // «9»
        f->dlc = (uint8_t)(CAN1->sFIFOMailBox[0].RDTR & CAN_RDT0R_DLC);
        const uint32_t lo = CAN1->sFIFOMailBox[0].RDLR, hi = CAN1->sFIFOMailBox[0].RDHR;
        for (uint32_t i = 0U; i < 4U; ++i)
        {
            f->data[i] = (uint8_t)(lo >> (8U * i));
            f->data[i + 4U] = (uint8_t)(hi >> (8U * i));
        }
        CAN1->RF0R |= CAN_RF0R_RFOM0;                     /* release the FIFO slot */             // «10»
        if ((head - s_rx_tail) < RXQ_LEN)
        {
            s_rx_head = head + 1U;                        /* drop the frame if main() is behind */
        }
    }
}

bool can_receive(can_frame_t *f)
{
    const uint32_t tail = s_rx_tail;
    if (s_rx_head == tail)
    {
        return false;
    }
    *f = s_rxq[tail % RXQ_LEN];
    s_rx_tail = tail + 1U;
    return true;
}
// [endregion]

uint32_t can_tec(void)
{
    return (CAN1->ESR & CAN_ESR_TEC) >> CAN_ESR_TEC_Pos;
}

uint32_t can_rec(void)
{
    return (CAN1->ESR & CAN_ESR_REC) >> CAN_ESR_REC_Pos;
}

const char *can_state(void)
{
    const uint32_t esr = CAN1->ESR;
    if ((esr & CAN_ESR_BOFF) != 0U) { return "bus off"; }
    if ((esr & CAN_ESR_EPVF) != 0U) { return "error passive"; }
    return "error active";
}
