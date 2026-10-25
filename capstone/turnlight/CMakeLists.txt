# SPDX-License-Identifier: MIT
# TurnLight capstone (modules 24-26): the same ECU three times, plus the cluster node.
foreach(dir IN ITEMS stage1-baremetal stage2-freertos stage3-autosar cluster)
  if(EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/${dir}/CMakeLists.txt")
    add_subdirectory(${dir})
  endif()
endforeach()
