# SPDX-License-Identifier: MIT
# Top-level build for every example (cross presets) or for the host unit tests (host preset).
#   cmake --preset bluepill-debug && cmake --build --preset bluepill-debug
#   cmake --preset host-tests && cmake --build --preset host-tests && ctest --preset host-tests
cmake_minimum_required(VERSION 3.25)
project(mcu_academy LANGUAGES C)

if(CMAKE_CROSSCOMPILING)
  enable_language(ASM)
  include(examples/common/cmake/bluepill.cmake)
  # every example folder that has a CMakeLists.txt, in catalog order
  file(GLOB example_dirs LIST_DIRECTORIES true "${CMAKE_CURRENT_SOURCE_DIR}/examples/[0-9][0-9]-*")
  list(SORT example_dirs)
  foreach(dir IN LISTS example_dirs)
    if(EXISTS "${dir}/CMakeLists.txt")
      add_subdirectory("${dir}")
    endif()
  endforeach()
  foreach(dir IN ITEMS capstone/turnlight autosar)
    if(EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/${dir}/CMakeLists.txt")
      add_subdirectory("${dir}")
    endif()
  endforeach()
else()
  enable_testing()
  add_subdirectory(tests/host)
endif()
