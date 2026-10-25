# SPDX-License-Identifier: MIT
# Example 05 in Renode: single conversions follow the simulated pot voltage. The course's ADC model
# has no DMA requests, so part 2 reports that no transfers happened (see the README).
*** Settings ***
Suite Setup       Setup
Suite Teardown    Teardown
Test Teardown     Test Teardown
Resource          ${CURDIR}/../../common/renode/bluepill.robot

*** Variables ***
${ELF}            ${BUILD_DIR}/examples/05-adc-pot-dma/05-adc-pot-dma.elf
${ADC_CH1_INPUT}  0x40012704

*** Test Cases ***
Single Conversions Read Half Scale At Mid Position
    Create Blue Pill    ${ELF}
    Wait For Line On Uart    Example 05: ADC1 on PA1 (pot), Vrefint, DMA
    Wait For Line On Uart    single: PA1 raw 2048, 1651 mV (VDDA 3300 mV)

Turning The Pot Changes The Reading
    Create Blue Pill    ${ELF}
    Wait For Line On Uart    single: PA1 raw 2048
    Execute Command    sysbus WriteDoubleWord ${ADC_CH1_INPUT} 1000
    Wait For Line On Uart    single: PA1 raw 1000, 806 mV

DMA Part Reports Honestly In Simulation
    Create Blue Pill    ${ELF}
    Wait For Line On Uart    dma: no samples yet (no DMA transfers)
