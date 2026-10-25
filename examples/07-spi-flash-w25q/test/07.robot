# SPDX-License-Identifier: MIT
# Example 07 in Renode: Renode's Micron MT25Q flash model stands in for the W25Q (same basic
# command set, Micron JEDEC ID). Erase, program and the polled read are checked. Renode's SPI model
# drops received bytes when the TX DMA channel runs ahead, so the DMA read times out in simulation;
# the test only checks that the firmware reports that instead of hanging.
*** Settings ***
Suite Setup       Setup
Suite Teardown    Teardown
Test Teardown     Test Teardown
Resource          ${CURDIR}/../../common/renode/bluepill.robot

*** Variables ***
${ELF}            ${BUILD_DIR}/examples/07-spi-flash-w25q/07-spi-flash-w25q.elf

*** Test Cases ***
Identifies The Flash And Verifies A Page
    Create Blue Pill    ${ELF}
    Wait For Line On Uart    Example 07: SPI1 + W25Qxx flash (CS on PA4)
    Wait For Line On Uart    JEDEC ID 20 BB 16: Micron, 4096 KB
    Wait For Line On Uart    erase sector 0x001000: OK
    Wait For Line On Uart    erased bytes read 0xFF: OK
    Wait For Line On Uart    program 256 bytes: OK
    Wait For Line On Uart    verify (polling): 0 mismatches
    Wait For Line On Uart    verify (DMA):
