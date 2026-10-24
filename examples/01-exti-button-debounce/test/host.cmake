# SPDX-License-Identifier: MIT
# Host unit tests for example 01 (included by tests/host/CMakeLists.txt).
add_host_test(01-debounce SOURCES test_debounce.c ../src/debounce.c INCLUDES ../src)
