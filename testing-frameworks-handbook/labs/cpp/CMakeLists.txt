cmake_minimum_required(VERSION 3.24)
project(testing_handbook_cpp LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Prefer the system/Nix-provided Catch2; fall back to FetchContent so the lab
# also builds on machines without a packaged copy (network required once).
find_package(Catch2 3 QUIET)
if(NOT Catch2_FOUND)
  include(FetchContent)
  FetchContent_Declare(
    Catch2
    GIT_REPOSITORY https://github.com/catchorg/Catch2.git
    GIT_TAG v3.11.0
  )
  FetchContent_MakeAvailable(Catch2)
  list(APPEND CMAKE_MODULE_PATH "${catch2_SOURCE_DIR}/extras")
endif()
add_executable(checkout_tests tests/checkout_test.cpp)
target_include_directories(checkout_tests PRIVATE include)
target_link_libraries(checkout_tests PRIVATE Catch2::Catch2WithMain)

include(CTest)
include(Catch)
catch_discover_tests(checkout_tests)

