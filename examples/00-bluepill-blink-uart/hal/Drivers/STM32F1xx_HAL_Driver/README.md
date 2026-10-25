# STM32F1 HAL/LL driver subset (vendor code, not edited)

Used **only** by `examples/00-bluepill-blink-uart/hal` (setup module, path A comparison) and `…/ll`
(Appendix D). This is the one place outside `third_party/` where vendor code lives (CLAUDE.md rule 10):
it stands in for the `Drivers/` folder STM32CubeMX copies into a generated project.

| | |
|---|---|
| Upstream | https://github.com/STMicroelectronics/stm32f1xx-hal-driver |
| Tag | `v1.1.10` |
| Commit | `77fbb30b7a1d02533980400083e48c559aae5a4f` |
| Licence | BSD-3-Clause (`LICENSE.md`, unchanged) |
| Copied | the HAL modules this example enables (CORTEX, RCC, GPIO, UART, DMA, FLASH, PWR, EXTI), the LL headers used by `../ll`, `Legacy/stm32_hal_legacy.h` |
