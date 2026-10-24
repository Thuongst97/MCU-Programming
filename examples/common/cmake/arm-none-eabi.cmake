# SPDX-License-Identifier: MIT
# CMake toolchain file for the Arm GNU Toolchain (arm-none-eabi). Bare metal: no OS, no libc startup.
# Put the toolchain's bin/ on PATH, or pass -DARM_TOOLCHAIN_DIR=/path/to/toolchain/bin.
set(CMAKE_SYSTEM_NAME Generic)
set(CMAKE_SYSTEM_PROCESSOR arm)
# CMake test-compiles a program to check the compiler; a static library avoids needing our linker script.
set(CMAKE_TRY_COMPILE_TARGET_TYPE STATIC_LIBRARY)

set(ARM_TOOLCHAIN_DIR "$ENV{ARM_TOOLCHAIN_DIR}" CACHE PATH "Directory containing arm-none-eabi-gcc (empty: search PATH)")
set(_hint "")
if(ARM_TOOLCHAIN_DIR)
  set(_hint HINTS "${ARM_TOOLCHAIN_DIR}" NO_DEFAULT_PATH)
endif()
find_program(ARM_GCC arm-none-eabi-gcc ${_hint} REQUIRED)
get_filename_component(_bin "${ARM_GCC}" DIRECTORY)

set(CMAKE_C_COMPILER   "${_bin}/arm-none-eabi-gcc${CMAKE_EXECUTABLE_SUFFIX}")
set(CMAKE_ASM_COMPILER "${_bin}/arm-none-eabi-gcc${CMAKE_EXECUTABLE_SUFFIX}")
set(CMAKE_OBJCOPY      "${_bin}/arm-none-eabi-objcopy${CMAKE_EXECUTABLE_SUFFIX}" CACHE FILEPATH "")
set(CMAKE_SIZE         "${_bin}/arm-none-eabi-size${CMAKE_EXECUTABLE_SUFFIX}" CACHE FILEPATH "")

set(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER)
set(CMAKE_FIND_ROOT_PATH_MODE_LIBRARY ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE ONLY)
