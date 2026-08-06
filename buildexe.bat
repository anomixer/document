@echo off
setlocal
cd /d "%~dp0"

echo [buildexe] ============================================
echo [buildexe]  OnlyOffice Desktop - Tauri (Rust) builder
echo [buildexe] ============================================
echo.

rem ---- 0. prerequisite: Rust toolchain (cargo) ----
rem rustup installs to %USERPROFILE%\.cargo\bin but that is not always on the
rem PATH of a freshly double-clicked cmd, so add the common locations explicitly.
if defined CARGO_HOME set "PATH=%CARGO_HOME%\bin;%PATH%"
set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
set "PATH=%ProgramFiles%\Rust\.cargo\bin;%PATH%"
where cargo >nul 2>&1
if errorlevel 1 (
    echo [buildexe] cargo still not found on PATH. Open a NEW cmd/Rustup shell
    echo [buildexe] or install from https://rustup.rs with the MSVC toolchain, then re-run.
    echo [buildexe] Also needs VS Build Tools for the C++ linker.
    exit /b 1
)
for /f "delims=" %%v in ('cargo --version') do echo [buildexe] %%v

rem ---- 1. node deps (includes @tauri-apps/cli) ----
if not exist "node_modules\.bin\tauri.cmd" (
    echo [buildexe] Installing node dependencies...
    call pnpm install
    if errorlevel 1 (
        echo [buildexe] ERROR: pnpm install failed.
        exit /b 1
    )
)

rem ---- 2. build the Tauri exe ----
echo [buildexe] Building web app + Tauri exe (first build compiles all Rust deps, can take 10+ min)...
call npx tauri build --no-bundle
if errorlevel 1 (
    echo [buildexe] ERROR: tauri build failed.
    exit /b 1
)

echo.
echo [buildexe] SUCCESS:
echo [buildexe]   src-tauri\target\release\document-desktop.exe
echo [buildexe] Zip that single exe and put it in a GitHub Release.
echo [buildexe] (It opens as a real desktop window; requires the WebView2 runtime,
echo [buildexe]  which is built in on Windows 10/11.)
pause