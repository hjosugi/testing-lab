# .NET 10: NUnit 4 and MSTest 4/MTP

```bash
dotnet restore tests/NUnitTests/NUnitTests.csproj --locked-mode
dotnet restore tests/MSTestTests/MSTestTests.csproj --locked-mode
dotnet test --project tests/NUnitTests/NUnitTests.csproj
dotnet test --project tests/MSTestTests/MSTestTests.csproj
```

- NUnit project: constraint modelとdata-driven test
- MSTest project: `MSTest.Sdk`でMicrosoft.Testing.Platformをprojectへ統合
- SDKは`global.json`、NuGet graphは各projectの`packages.lock.json`で固定
