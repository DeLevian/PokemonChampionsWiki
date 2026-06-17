@echo off
title Pokémon Champions Wiki - Local Server
echo ===================================================
echo   Avvio del server locale per Pokemon Champions Wiki
echo ===================================================
echo.
echo Controllo la presenza di Python nel sistema...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRORE] Python non e' installato o non e' presente nel PATH.
    echo Per favore, installa Python per poter avviare il server.
    echo.
    pause
    exit /b
)

echo Python rilevato con successo!
echo Avvio del server web locale sulla porta 8080...
echo.
echo Il browser si aprira' automaticamente all'indirizzo http://localhost:8080
echo.
echo Premi CTRL+C nella console per arrestare il server.
echo.

:: Apri il browser all'indirizzo del server
start http://localhost:8080

:: Avvia il server web integrato di Python
python -m http.server 8080

pause
