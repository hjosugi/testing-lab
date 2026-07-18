#include <atomic>
#include <iostream>
#include <limits>
#include <thread>

#if HANDBOOK_SANITIZER_thread
int racy_shared = 0;
std::atomic<int> ready_writers = 0;
std::atomic<bool> release_writers = false;

void write_racy_shared(int value) {
  ready_writers.fetch_add(1, std::memory_order_release);
  while (!release_writers.load(std::memory_order_acquire)) {
    std::this_thread::yield();
  }
  racy_shared = value;
}
#endif

int main(int argc, char **) {
#if HANDBOOK_SANITIZER_address
  auto *value = new int(42);
  delete value;
  std::cout << "use-after-free value: " << *value << '\n';
#elif HANDBOOK_SANITIZER_undefined
  volatile int maximum = std::numeric_limits<int>::max();
  return maximum + argc;
#elif HANDBOOK_SANITIZER_thread
  std::thread first(write_racy_shared, 1);
  std::thread second(write_racy_shared, 2);
  while (ready_writers.load(std::memory_order_acquire) != 2) {
    std::this_thread::yield();
  }
  release_writers.store(true, std::memory_order_release);
  first.join();
  second.join();
  std::cout << "racy value: " << racy_shared << '\n';
#else
#error "A HANDBOOK_SANITIZER_* definition is required"
#endif
}
