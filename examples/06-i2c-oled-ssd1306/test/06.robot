# SPDX-License-Identifier: MIT
# Example 06 in Renode. Renode has no SSD1306 model: a generic I2C slave that acknowledges every
# byte stands in for the display, so the tests check the I2C protocol handling, not the pixels.
*** Settings ***
Suite Setup       Setup
Suite Teardown    Teardown
Test Teardown     Test Teardown
Resource          ${CURDIR}/../../common/renode/bluepill.robot

*** Variables ***
${ELF}            ${BUILD_DIR}/examples/06-i2c-oled-ssd1306/06-i2c-oled-ssd1306.elf

*** Test Cases ***
Display Present: Init And Frames Succeed
    Create Blue Pill    ${ELF}
    Execute Command    machine LoadPlatformDescriptionFromString "oled: Mocks.DummyI2CSlave @ i2c1 0x3C"
    Wait For Line On Uart    probe 0x3C: OK
    Wait For Line On Uart    ssd1306 init: OK
    Wait For Line On Uart    errors 0    treatAsRegex=true

No Display: Reported As A NACK, No Hang
    Create Blue Pill    ${ELF}
    Wait For Line On Uart    probe 0x3C: no ACK
    Wait For Line On Uart    check wiring, power and the module's address (0x3C or 0x3D)
    Wait For Line On Uart    frames 0, errors
