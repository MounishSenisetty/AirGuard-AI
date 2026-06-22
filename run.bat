@echo off
echo =========================================
echo   AirGuard AI - Urban Air Quality Intel
echo   ET AI Hackathon 2026
echo =========================================
echo.
cd /d "%~dp0"

:: Install dependencies if needed
echo [1/2] Installing dependencies...
pip install -r backend\requirements.txt --quiet

:: Start the server
echo [2/2] Starting AirGuard AI server...
echo.
echo  Open browser at: http://localhost:8000
echo.
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
