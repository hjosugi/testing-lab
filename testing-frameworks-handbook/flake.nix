{
  description = "Polyglot testing-framework design handbook and hands-on labs";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" "aarch64-darwin" ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f (import nixpkgs { inherit system; }));
      mkShell = pkgs: packages: pkgs.mkShell {
        inherit packages;
        shellHook = ''
          export LANG=C.UTF-8
          export LC_ALL=C.UTF-8
          export TZ=UTC
          echo "Testing handbook shell: $(basename $PWD)"
        '';
      };
    in {
      devShells = forAllSystems (pkgs:
        let
          pythonPkgs = with pkgs.python313Packages; [ python pytest pytest-cov pytest-xdist hypothesis ];
          nodePkgs = [ pkgs.nodejs_24 ];
          jvmPkgs = [ pkgs.jdk21 pkgs.gradle ];
          dotnetPkgs = [ pkgs.dotnet-sdk_10 ];
          cppPkgs = [ pkgs.clang pkgs.cmake pkgs.ninja pkgs.catch2_3 pkgs.trompeloeil pkgs.llvmPackages.llvm ];
          goPkgs = [ pkgs.go ];
          rustPkgs = [ pkgs.cargo pkgs.rustc pkgs.rustfmt pkgs.clippy pkgs.cargo-mutants ];
          phpPkgs = [ pkgs.php84 pkgs.php84Packages.composer ];
          commonPkgs = [ pkgs.git pkgs.gnumake pkgs.jq pkgs.zip pkgs.unzip ];
        in {
          default = mkShell pkgs (commonPkgs ++ pythonPkgs ++ nodePkgs ++ jvmPkgs ++ dotnetPkgs ++ cppPkgs ++ goPkgs ++ rustPkgs ++ phpPkgs);
          python = mkShell pkgs (commonPkgs ++ pythonPkgs);
          node = mkShell pkgs (commonPkgs ++ nodePkgs);
          jvm = mkShell pkgs (commonPkgs ++ jvmPkgs);
          dotnet = mkShell pkgs (commonPkgs ++ dotnetPkgs);
          cpp = mkShell pkgs (commonPkgs ++ cppPkgs);
          go = mkShell pkgs (commonPkgs ++ goPkgs);
          rust = mkShell pkgs (commonPkgs ++ rustPkgs);
          php = mkShell pkgs (commonPkgs ++ phpPkgs);
        });
    };
}
