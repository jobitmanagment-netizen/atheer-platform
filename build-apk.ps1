# ATHEER Global Platform — Android APK Build Script
# Prerequisites:
#   1. Node.js 20+
#   2. Java JDK 17+ (https://adoptium.net)
#   3. Android Studio (or Android SDK + Build Tools)
#   4. Set environment variables:
#      - ANDROID_HOME = C:\Users\<user>\AppData\Local\Android\Sdk
#      - JAVA_HOME    = C:\Program Files\Eclipse Adoptium\jdk-17.0.17.10-hotspot

Write-Host "=== ATHEER APK Builder ===" -ForegroundColor Cyan

# 1. Install dependencies
Write-Host "[1/5] Installing npm dependencies..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot"
npm install --silent

# 2. Build web app
Write-Host "[2/5] Building frontend..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "Frontend build failed!" -ForegroundColor Red; exit 1 }

# 3. Sync with Capacitor
Write-Host "[3/5] Syncing with Capacitor..." -ForegroundColor Yellow
npx cap sync android
if ($LASTEXITCODE -ne 0) { Write-Host "Capacitor sync failed!" -ForegroundColor Red; exit 1 }

# 4. Verify Android SDK
Write-Host "[4/5] Verifying Android SDK..." -ForegroundColor Yellow
if (-not (Test-Path "$env:ANDROID_HOME\platforms")) {
    Write-Host "WARNING: ANDROID_HOME not set or SDK not found at $env:ANDROID_HOME" -ForegroundColor Red
    Write-Host "Attempting to find SDK automatically..." -ForegroundColor Yellow
    $possiblePaths = @(
        "$env:LOCALAPPDATA\Android\Sdk",
        "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk",
        "C:\Android\Sdk",
        "D:\Android\Sdk"
    )
    foreach ($p in $possiblePaths) {
        if (Test-Path "$p\platforms") {
            $env:ANDROID_HOME = $p
            Write-Host "Found SDK at: $p" -ForegroundColor Green
            break
        }
    }
}

# Update local.properties
if ($env:ANDROID_HOME) {
    "sdk.dir=$($env:ANDROID_HOME.Replace('\', '\\'))" | Set-Content "$PSScriptRoot\android\local.properties"
    Write-Host "Updated local.properties" -ForegroundColor Green
}

# 5. Build APK
Write-Host "[5/5] Building APK (this may take 5-10 minutes)..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot\android"
if ($IsLinux -or $IsMacOS) {
    bash ./gradlew assembleRelease
} else {
    .\gradlew.bat assembleRelease
}

if ($LASTEXITCODE -eq 0) {
    $apk = Get-ChildItem -Path "app\build\outputs\apk\release" -Filter "*.apk" | Select-Object -First 1
    Write-Host "=== BUILD SUCCESSFUL ===" -ForegroundColor Green
    Write-Host "APK located at: $($apk.FullName)" -ForegroundColor Green
    Write-Host "Size: $('{0:N2}' -f ($apk.Length / 1MB)) MB" -ForegroundColor Green
} else {
    Write-Host "APK build failed! Check errors above." -ForegroundColor Red
    exit 1
}
