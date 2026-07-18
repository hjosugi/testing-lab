cmake_minimum_required(VERSION 3.24)
project(testing_handbook_cpp LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

set(HANDBOOK_SANITIZER "" CACHE STRING "Sanitizer: address, undefined, or thread")
set_property(CACHE HANDBOOK_SANITIZER PROPERTY STRINGS "" address undefined thread)

if(HANDBOOK_SANITIZER)
  if(NOT CMAKE_CXX_COMPILER_ID MATCHES "Clang|GNU")
    message(FATAL_ERROR "HANDBOOK_SANITIZER requires Clang or GCC")
  endif()
  if(NOT HANDBOOK_SANITIZER MATCHES "^(address|undefined|thread)$")
    message(FATAL_ERROR "Unsupported HANDBOOK_SANITIZER=${HANDBOOK_SANITIZER}")
  endif()
  set(HANDBOOK_SANITIZER_FLAGS "${HANDBOOK_SANITIZER}")
  if(HANDBOOK_SANITIZER STREQUAL "undefined")
    set(HANDBOOK_SANITIZER_FLAGS undefined signed-integer-overflow)
  endif()
  add_compile_options(
    -g
    -O1
    -fno-omit-frame-pointer
  )
  foreach(sanitizer_flag IN LISTS HANDBOOK_SANITIZER_FLAGS)
    add_compile_options(-fsanitize=${sanitizer_flag})
    add_link_options(-fsanitize=${sanitizer_flag})
  endforeach()
  if(HANDBOOK_SANITIZER STREQUAL "undefined")
    add_compile_options(-fno-sanitize-recover=all)
    add_link_options(-fno-sanitize-recover=all)
  endif()
endif()

# Prefer the system/Nix-provided Catch2; fall back to FetchContent so the lab
# also builds on machines without a packaged copy (network required once).
find_package(Catch2 3 QUIET)
if(NOT Catch2_FOUND)
  include(FetchContent)
  FetchContent_Declare(
    Catch2
    GIT_REPOSITORY https://github.com/catchorg/Catch2.git
    GIT_TAG 6ee0826dcae55ed1e06b2c5701981221e979e1e6 # v3.15.0
  )
  FetchContent_MakeAvailable(Catch2)
  list(APPEND CMAKE_MODULE_PATH "${catch2_SOURCE_DIR}/extras")
endif()

find_package(trompeloeil 49 QUIET)
if(NOT trompeloeil_FOUND)
  include(FetchContent)
  FetchContent_Declare(
    trompeloeil
    GIT_REPOSITORY https://github.com/rollbear/trompeloeil.git
    GIT_TAG eaeb89c1ce9d354b0ba7eb921fd5712cdbd78adf # v49
  )
  FetchContent_MakeAvailable(trompeloeil)
endif()

add_executable(checkout_tests tests/checkout_test.cpp)
target_include_directories(checkout_tests PRIVATE include)
target_link_libraries(checkout_tests PRIVATE Catch2::Catch2WithMain)

add_executable(handwritten_spy_probe EXCLUDE_FROM_ALL tests/handwritten_spy_probe.cpp)
target_include_directories(handwritten_spy_probe PRIVATE include)

add_executable(mock_framework_probe EXCLUDE_FROM_ALL tests/mock_framework_probe.cpp)
target_include_directories(mock_framework_probe PRIVATE include)
target_link_libraries(mock_framework_probe PRIVATE trompeloeil::trompeloeil)

if(HANDBOOK_SANITIZER)
  find_package(Threads REQUIRED)
  add_executable(sanitizer_probe EXCLUDE_FROM_ALL tests/sanitizer_probe.cpp)
  target_compile_definitions(
    sanitizer_probe PRIVATE
    HANDBOOK_SANITIZER_${HANDBOOK_SANITIZER}=1
  )
  target_link_libraries(sanitizer_probe PRIVATE Threads::Threads)
endif()

include(CTest)
include(Catch)
catch_discover_tests(checkout_tests)
