@echo off
title Monety App
cd /d "%~dp0"

:: 1. Cierra procesos previos sin mostrar mensajes de error molestos
taskkill /F /IM node.exe >nul 2>&1

echo Iniciando Monety en http://localhost:5173...

:: 2. Ejecuta Vite sin abrir pestaña previa desde Windows
call npm run dev -- --port 5173 --strictPort --open