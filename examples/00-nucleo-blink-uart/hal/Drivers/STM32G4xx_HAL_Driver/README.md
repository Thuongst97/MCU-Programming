# STM32G4 HAL/LL driver subset (vendor code, not edited)

Used **only** by `examples/00-nucleo-blink-uart/hal` (setup module, path A comparison) and `…/ll`
(Appendix D). This is the one place outside `third_party/` where vendor code lives (CLAUDE.md rule 10):
it stands in for the `Drivers/` folder STM32CubeMX copies into a generated project.

| | |
|---|---|
| Upstream | https://github.com/STMicroelectronics/stm32g4xx_hal_driver |
| Tag | `v1.2.7` |
| Commit | `f5929f431f9effe45fbe18f5337e4753ced9ac92` |
| Licence | BSD-3-Clause (`LICENSE.md`, unchanged) |
| Copied | the HAL modules this example enables (CORTEX, RCC, GPIO, UART, DMA, FLASH, PWR, EXTI, with their `_ex` parts), the LL headers used by `../ll`, `Legacy/stm32_hal_legacy.h` |
