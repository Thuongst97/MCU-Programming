# SPDX-License-Identifier: MIT
# Host unit tests (Unity, driven by CTest; no Ceedling): every examples/**/test/host.cmake and
# capstone/**/test/host.cmake registers its tests with add_host_test().
#   cmake --preset host-tests && cmake --build --preset host-tests && ctest --preset host-tests
get_filename_component(MCU_ROOT "${CMAKE_CURRENT_LIST_DIR}/../.." ABSOLUTE)

add_library(unity STATIC "${MCU_ROOT}/third_party/unity/src/unity.c")
target_include_directories(unity SYSTEM PUBLIC "${MCU_ROOT}/third_party/unity/src")

set(HOST_C_FLAGS -std=c11 -Wall -Wextra -Werror -Wshadow -Wconversion -g -O0)

# add_host_test(<name> SOURCES files... [INCLUDES dirs...] [DEFINES defs...])
# Paths are relative to the folder of the host.cmake that calls it.
function(add_host_test name)
  cmake_parse_arguments(T "" "" "SOURCES;INCLUDES;DEFINES" ${ARGN})
  set(srcs "")
  foreach(s IN LISTS T_SOURCES)
    list(APPEND srcs "${HOST_TEST_DIR}/${s}")
  endforeach()
  set(incs "")
  foreach(i IN LISTS T_INCLUDES)
    list(APPEND incs "${HOST_TEST_DIR}/${i}")
  endforeach()
  add_executable(test-${name} ${srcs})
  target_include_directories(test-${name} PRIVATE ${incs})
  target_compile_definitions(test-${name} PRIVATE ${T_DEFINES} HOST_TEST=1)
  target_compile_options(test-${name} PRIVATE ${HOST_C_FLAGS})
  target_link_libraries(test-${name} PRIVATE unity)
  add_test(NAME ${name} COMMAND test-${name})
endfunction()

file(GLOB_RECURSE host_test_files
  "${MCU_ROOT}/examples/*/host.cmake" "${MCU_ROOT}/capstone/*/host.cmake" "${MCU_ROOT}/autosar/*/host.cmake")
list(SORT host_test_files)
foreach(f IN LISTS host_test_files)
  get_filename_component(HOST_TEST_DIR "${f}" DIRECTORY)
  include("${f}")
endforeach()
