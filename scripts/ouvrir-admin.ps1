# Lance le serveur MangaWatch (si besoin) et ouvre la page admin dans le navigateur.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$url = "http://localhost:3000/pages/admin.html"
$port = 3000

Set-Location $root

function Test-PortOpen {
    param([int]$Port)
    try {
        $conn = New-Object System.Net.Sockets.TcpClient("127.0.0.1", $Port)
        $conn.Close()
        return $true
    } catch {
        return $false
    }
}

if (-not (Test-PortOpen -Port $port)) {
    Write-Host "Demarrage du serveur (npm run dev)..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        "Set-Location '$root'; npm run dev"
    ) -WindowStyle Normal
    $tries = 0
    while (-not (Test-PortOpen -Port $port) -and $tries -lt 30) {
        Start-Sleep -Seconds 1
        $tries++
    }
    if (-not (Test-PortOpen -Port $port)) {
        Write-Host "Le serveur ne repond pas sur le port $port. Verifiez la fenetre npm run dev." -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "Serveur deja actif sur le port $port." -ForegroundColor Green
}

Write-Host "Ouverture : $url" -ForegroundColor Green
Start-Process $url
