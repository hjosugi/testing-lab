# C++: Catch2 3

```bash
cmake -S . -B build -G Ninja
cmake --build build
ctest --test-dir build --output-on-failure
```

Catch2のSECTION/GENERATEとRAIIを使い、small interfaceにはhandwritten spyを使います。

