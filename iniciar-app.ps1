$env:Path = "C:\Program Files\nodejs;" + $env:Path
Write-Host "===================================================" -ForegroundColor Green
Write-Host "  Iniciando Presu App (Finanzas Personales)..." -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Green
Start-Process "http://localhost:5173"
& "C:\Program Files\nodejs\npm.cmd" run dev
