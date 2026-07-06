$env:Path += ';C:\Program Files\nodejs'
Set-Location "C:\Users\Administrator\Desktop\CCS-Technology"

Write-Host "Starting mock API server on port 8080..." -ForegroundColor Cyan
$mock = Start-Process -NoNewWindow -FilePath "node" -ArgumentList "mock-server.mjs" -PassThru
Start-Sleep -Seconds 2

Write-Host "Starting Vite dev server on port 5173..." -ForegroundColor Cyan
$vite = Start-Process -NoNewWindow -FilePath "npx" -ArgumentList "vite --host 0.0.0.0 --port 5173" -PassThru
Start-Sleep -Seconds 3

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  Frontend:  http://localhost:5173" -ForegroundColor Green
Write-Host "  API:       http://localhost:8080" -ForegroundColor Green
Write-Host "  Login:     demo@atheer.com / password123" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "`nPress Ctrl+C to stop all servers`n" -ForegroundColor Yellow

# Wait for either process to exit
Wait-Process -Id $mock.Id, $vite.Id -ErrorAction SilentlyContinue
