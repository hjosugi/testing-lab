{
  description = "Polyglot testing-framework design handbook and hands-on labs";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" "aarch64-darwin" ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f (import nixpkgs { inherit system; }));
      mkShellWithHook = pkgs: packages: extraShellHook: pkgs.mkShell {
        inherit packages;
        shellHook = ''
          export LANG=C.UTF-8
          export LC_ALL=C.UTF-8
          export TZ=UTC
          export UV_PYTHON_DOWNLOADS=never
          ${extraShellHook}
          echo "Testing handbook shell: $(basename $PWD)"
        '';
      };
      mkShell = pkgs: packages: mkShellWithHook pkgs packages "";
      mkBrowserShell = pkgs: packages: mkShellWithHook pkgs packages ''
        export PLAYWRIGHT_BROWSERS_PATH="${pkgs.playwright-driver.browsers}"
        export PLAYWRIGHT_NIX_DRIVER_VERSION="${pkgs.playwright-driver.version}"
        ${pkgs.lib.optionalString pkgs.stdenv.isLinux ''
          # The npm playwright-core host check greps apt package names
          # (libgles2, gstreamer1.0-libav) that the Nix-patched browsers do
          # not load from the host; nixpkgs drops the same check upstream.
          export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true
          export __EGL_VENDOR_LIBRARY_DIRS="${pkgs.mesa}/share/glvnd/egl_vendor.d"
          export LIBGL_DRIVERS_PATH="${pkgs.mesa}/lib/dri"
          export LIBGL_ALWAYS_SOFTWARE=1
        ''}
      '';
    in {
      devShells = forAllSystems (pkgs:
        let
          pythonPkgs = with pkgs.python313Packages; [
            python
            pytest
            pytest-cov
            pytest-xdist
            hypothesis
            psycopg
            testcontainers
          ];
          containerPkgs = [ pkgs.docker-client ];
          nodePkgs = [ pkgs.nodejs_24 ];
          browserPkgs = [ pkgs.playwright-driver.browsers ]
            ++ pkgs.lib.optionals pkgs.stdenv.isLinux [ pkgs.mesa ];
          jvmPkgs = [ pkgs.jdk21 pkgs.gradle ];
          dotnetPkgs = [ pkgs.dotnet-sdk_10 ];
          cppPkgs = [ pkgs.clang pkgs.cmake pkgs.ninja pkgs.catch2_3 pkgs.trompeloeil pkgs.llvmPackages.llvm ];
          goPkgs = [ pkgs.go ];
          rustPkgs = [ pkgs.cargo pkgs.rustc pkgs.rustfmt pkgs.clippy pkgs.cargo-mutants ];
          phpWithPcov = pkgs.php84.withExtensions ({ enabled, all }: enabled ++ [ all.pcov ]);
          composerWithPcov = pkgs.php84Packages.composer.override { php = phpWithPcov; };
          phpunit12 = pkgs.stdenvNoCC.mkDerivation {
            pname = "phpunit";
            version = "12.5.31";
            src = pkgs.fetchurl {
              url = "https://phar.phpunit.de/phpunit-12.5.31.phar";
              hash = "sha256-GU/LZiGGa1QvEwTg2o3Hq8sV1vnRhRiTrsQIlrz1u0Q=";
            };
            dontUnpack = true;
            nativeBuildInputs = [ pkgs.makeWrapper ];
            installPhase = ''
              install -Dm644 "$src" "$out/share/phpunit/phpunit-12.5.31.phar"
              makeWrapper ${phpWithPcov}/bin/php "$out/bin/phpunit-12" \
                --add-flags "$out/share/phpunit/phpunit-12.5.31.phar"
            '';
          };
          phpPkgs = [ phpWithPcov composerWithPcov phpunit12 ];
          commonPkgs = [ pkgs.git pkgs.gnumake pkgs.jq pkgs.zip pkgs.unzip ];
          apiPkgs = [ pkgs.python313 pkgs.uv ] ++ nodePkgs;
          generativePkgs = nodePkgs ++ goPkgs;
        in {
          default = mkBrowserShell pkgs (commonPkgs ++ containerPkgs ++ pythonPkgs ++ nodePkgs ++ browserPkgs ++ [ pkgs.uv ] ++ jvmPkgs ++ dotnetPkgs ++ cppPkgs ++ goPkgs ++ rustPkgs ++ phpPkgs);
          api = mkShell pkgs (commonPkgs ++ apiPkgs);
          generative = mkShell pkgs (commonPkgs ++ generativePkgs);
          python = mkShell pkgs (commonPkgs ++ containerPkgs ++ pythonPkgs);
          node = mkBrowserShell pkgs (commonPkgs ++ nodePkgs ++ browserPkgs);
          jvm = mkShell pkgs (commonPkgs ++ jvmPkgs);
          dotnet = mkShell pkgs (commonPkgs ++ dotnetPkgs);
          cpp = mkShell pkgs (commonPkgs ++ cppPkgs);
          go = mkShell pkgs (commonPkgs ++ goPkgs);
          rust = mkShell pkgs (commonPkgs ++ rustPkgs);
          php = mkShell pkgs (commonPkgs ++ phpPkgs);
        });
    };
}
