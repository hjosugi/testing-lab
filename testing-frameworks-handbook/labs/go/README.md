# Go: standard testing and fuzzing

```bash
go test ./...
go test -race ./...
go test -fuzz=FuzzTotal -fuzztime=10s
```

consumer-owned small interfaceとhandwritten spy/fakeを使います。

