/* SPDX-License-Identifier: MIT */
#include "can.h"

#include <stddef.h>
#include "stm32g474xx.h"
#include "gpio.h"

#define AF_PA11_FDCAN1_RX 9U   /* DS12288 alternate functions; checked by tools/check-pins.py */
#define AF_PA12_FDCAN1_TX 9U
#define CAN_WAIT 200000U
#define RXQ_LEN  4U

/* Message RAM of FDCAN1 (RM0440 "FDCAN message RAM"): a fixed layout on the G4, 0x350 bytes per
 * instance starting at SRAMCAN_BASE. Offsets of the parts this driver uses: */
#define MRAM_RXF0  (SRAMCAN_BASE + 0x0B0U)   /* RX FIFO 0: 3 elements */
#define MRAM_TXQ   (SRAMCAN_BASE + 0x278U)   /* TX FIFO: 3 elements */
#define MRAM_SIZE  0x350U
#define ELEM_WORDS 18U                       /* 2 header words + 64 data bytes */
/* Bits of the element header words (RM0440 "Rx/Tx buffer element"); CMSIS has no names for them. */
#define ELEM_STDID_Pos 18U                   /* word 0: standard ID in bits 28:18 */
#define ELEM_DLC_Pos   16U                   /* word 1: DLC in bits 19:16 */
#define ELEM_BRS       (1UL << 20)
#define ELEM_FDF       (1UL << 21)

static can_frame_t s_rxq[RXQ_LEN];
static volatile uint32_t s_rx_head, s_rx_tail;   /* ISR writes head, main writes tail (module 06) */

static bool wait_cccr(uint32_t mask, uint32_t want)
{
    for (uint32_t n = 0U; n < CAN_WAIT; ++n)
    {
        if ((FDCAN1->CCCR & mask) == want)
        {
            return true;
        }
    }
    return false;
}

static volatile uint32_t *elem(uint32_t base, uint32_t index)
{
    return (volatile uint32_t *)(uintptr_t)(base + (index * ELEM_WORDS * 4U));
}

// [region:init]
bool can_init(const can_timing_t *nominal, const can_timing_t *data, can_mode_t mode)
{
    RCC->CCIPR = (RCC->CCIPR & ~RCC_CCIPR_FDCANSEL) | RCC_CCIPR_FDCANSEL_1;   /* kernel clock = PCLK1 */ // «1»
    RCC->APB1ENR1 |= RCC_APB1ENR1_FDCANEN;
    (void)RCC->APB1ENR1;
    gpio_clock_on(GPIOA);
    gpio_pull(GPIOA, 11U, BSP_GPIO_PULLUP);              /* RX idles recessive (1) without a transceiver */
    gpio_af(GPIOA, 11U, AF_PA11_FDCAN1_RX);
    gpio_af(GPIOA, 12U, AF_PA12_FDCAN1_TX);

    FDCAN1->CCCR |= FDCAN_CCCR_INIT;                      /* stop taking part in the bus */          // «2»
    if (!wait_cccr(FDCAN_CCCR_INIT, FDCAN_CCCR_INIT))
    {
        return false;
    }
    FDCAN1->CCCR |= FDCAN_CCCR_CCE;                       /* unlock the configuration registers */
    FDCAN1->NBTP = ((nominal->sjw - 1U) << FDCAN_NBTP_NSJW_Pos) | ((nominal->brp - 1U) << FDCAN_NBTP_NBRP_Pos)
                 | ((nominal->tseg1 - 1U) << FDCAN_NBTP_NTSEG1_Pos) | ((nominal->tseg2 - 1U) << FDCAN_NBTP_NTSEG2_Pos); // «3»
    if (data != NULL)
    {
        FDCAN1->DBTP = ((data->sjw - 1U) << FDCAN_DBTP_DSJW_Pos) | ((data->brp - 1U) << FDCAN_DBTP_DBRP_Pos)
                     | ((data->tseg1 - 1U) << FDCAN_DBTP_DTSEG1_Pos) | ((data->tseg2 - 1U) << FDCAN_DBTP_DTSEG2_Pos);
        FDCAN1->CCCR |= FDCAN_CCCR_FDOE | FDCAN_CCCR_BRSE;   /* allow FD frames and the bit-rate switch */ // «4»
    }
    for (uint32_t a = 0U; a < MRAM_SIZE; a += 4U)         /* the message RAM is not cleared by reset */
    {
        *(volatile uint32_t *)(uintptr_t)(SRAMCAN_BASE + a) = 0U;
    }
    FDCAN1->RXGFC = 0U;          /* no filters (LSS = 0); non-matching standard frames -> FIFO 0 */   // «5»
    FDCAN1->TXBC = 0U;           /* TX buffers work as a FIFO */
    if (mode == CAN_MODE_INTERNAL_LOOPBACK)
    {
        FDCAN1->CCCR |= FDCAN_CCCR_TEST | FDCAN_CCCR_MON; /* bus monitoring: nothing reaches the pin */
        FDCAN1->TEST |= FDCAN_TEST_LBCK;                  /* ... and TX loops back to RX inside */   // «6»
    }
    FDCAN1->IE = FDCAN_IE_RF0NE;                          /* interrupt: new frame in RX FIFO 0 */
    FDCAN1->ILE = FDCAN_ILE_EINT0;                        /* on interrupt line 0 (ILS = 0) */
    NVIC_SetPriority(FDCAN1_IT0_IRQn, 5U);
    NVIC_EnableIRQ(FDCAN1_IT0_IRQn);

    FDCAN1->CCCR &= ~FDCAN_CCCR_INIT;                     /* join the bus ... */
    return wait_cccr(FDCAN_CCCR_INIT, 0U);                /* ... after 11 recessive bits */          // «7»
}
// [endregion]

// [region:tx]
bool can_send(const can_frame_t *f)
{
    if ((FDCAN1->TXFQS & FDCAN_TXFQS_TFQF) != 0U)
    {
        return false;                                     /* all three TX elements pending */        // «8»
    }
    const uint32_t put = (FDCAN1->TXFQS & FDCAN_TXFQS_TFQPI) >> FDCAN_TXFQS_TFQPI_Pos;
    volatile uint32_t *e = elem(MRAM_TXQ, put);
    const uint32_t dlc = can_len_to_dlc(f->fd ? f->len : ((f->len > 8U) ? 8U : f->len));
    e[0] = (uint32_t)f->id << ELEM_STDID_Pos;             /* standard ID, data frame */               // «9»
    e[1] = (dlc << ELEM_DLC_Pos) | (f->fd ? ELEM_FDF : 0U) | ((f->fd && f->brs) ? ELEM_BRS : 0U);
    const uint32_t bytes = can_dlc_to_len(dlc);           /* padding bytes are sent as 0 */
    for (uint32_t w = 0U; w < ((bytes + 3U) / 4U); ++w)
    {
        uint32_t v = 0U;
        for (uint32_t b = 0U; b < 4U; ++b)
        {
            const uint32_t i = (w * 4U) + b;
            v |= (uint32_t)((i < f->len) ? f->data[i] : 0U) << (8U * b);
        }
        e[2U + w] = v;
    }
    FDCAN1->TXBAR = 1UL << put;                           /* request transmission of that element */ // «10»
    return true;
}
// [endregion]

// [region:rx]
void FDCAN1_IT0_IRQHandler(void);
void FDCAN1_IT0_IRQHandler(void)
{
    FDCAN1->IR = FDCAN_IR_RF0N;                           /* acknowledge (write 1 to clear) */
    while ((FDCAN1->RXF0S & FDCAN_RXF0S_F0FL) != 0U)      /* up to 3 frames may be waiting */
    {
        const uint32_t get = (FDCAN1->RXF0S & FDCAN_RXF0S_F0GI) >> FDCAN_RXF0S_F0GI_Pos;
        const volatile uint32_t *e = elem(MRAM_RXF0, get);
        const uint32_t head = s_rx_head;
        can_frame_t *f = &s_rxq[head % RXQ_LEN];
        const uint32_t w1 = e[1];
        f->id = (uint16_t)((e[0] >> ELEM_STDID_Pos) & 0x7FFU);                                       // «11»
        f->fd = (w1 & ELEM_FDF) != 0U;
        f->brs = (w1 & ELEM_BRS) != 0U;
        f->len = (uint8_t)can_dlc_to_len((w1 >> ELEM_DLC_Pos) & 0xFU);
        if (!f->fd && (f->len > 8U))
        {
            f->len = 8U;                                  /* classic DLC 9..15 still means 8 bytes */
        }
        for (uint32_t i = 0U; i < f->len; ++i)
        {
            f->data[i] = (uint8_t)(e[2U + (i / 4U)] >> (8U * (i % 4U)));
        }
        FDCAN1->RXF0A = get << FDCAN_RXF0A_F0AI_Pos;      /* release the FIFO element */             // «12»
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
    return (FDCAN1->ECR & FDCAN_ECR_TEC) >> FDCAN_ECR_TEC_Pos;
}

uint32_t can_rec(void)
{
    return (FDCAN1->ECR & FDCAN_ECR_REC) >> FDCAN_ECR_REC_Pos;
}

const char *can_state(void)
{
    const uint32_t psr = FDCAN1->PSR;
    if ((psr & FDCAN_PSR_BO) != 0U) { return "bus off"; }
    if ((psr & FDCAN_PSR_EP) != 0U) { return "error passive"; }
    return "error active";
}
