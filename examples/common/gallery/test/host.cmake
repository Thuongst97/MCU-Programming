# SPDX-License-Identifier: MIT
# The bad half is compiled with the warnings that would have caught its defects switched off.
add_host_test(gallery SOURCES test_gallery.c ../src/good.c ../src/bad.c INCLUDES ../src)
set_source_files_properties("${HOST_TEST_DIR}/../src/bad.c" PROPERTIES
  COMPILE_OPTIONS "-Wno-sign-compare;-Wno-conversion;-Wno-parentheses;-Wno-sign-conversion")
