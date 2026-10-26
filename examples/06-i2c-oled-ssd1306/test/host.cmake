# SPDX-License-Identifier: MIT
add_host_test(06-gfx SOURCES test_gfx.c ../src/gfx.c ../src/font5x7.c INCLUDES ../src)
add_host_test(06-i2ctiming SOURCES test_i2ctiming.c ../src/i2c_timing.c INCLUDES ../src)
