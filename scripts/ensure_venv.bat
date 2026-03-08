@echo off
REM Batch helper to activate the backend virtualenv for cmd.exe
REM Usage (in cmd.exe):
REM   call scripts\ensure_venv.bat

SETLOCAL ENABLEDELAYEDEXPANSION
SET SCRIPT_DIR=%~dp0
SET VENV_PATH=%SCRIPT_DIR%..\backend\venv

IF NOT EXIST "%VENV_PATH%\Scripts\activate.bat" (
  echo Virtual environment not found at %VENV_PATH%
  EXIT /B 1
)

echo Activating virtual environment at: %VENV_PATH%
call "%VENV_PATH%\Scripts\activate.bat"

IF DEFINED VIRTUAL_ENV (
  echo Activated virtual environment: %VIRTUAL_ENV%
  EXIT /B 0
) ELSE (
  echo Activation attempted. If Python version isn't from the venv, run the activate script manually.
  EXIT /B 0
)
