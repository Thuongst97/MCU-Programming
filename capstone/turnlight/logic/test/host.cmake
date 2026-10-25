# SPDX-License-Identifier: MIT
add_host_test(tl-statemachine SOURCES test_turnlight_sm.c ../turnlight_sm.c INCLUDES ..)
add_host_test(tl-lampmon-msg SOURCES test_lampmon_msg.c ../lampmon.c ../tl_msg.c INCLUDES ..)
