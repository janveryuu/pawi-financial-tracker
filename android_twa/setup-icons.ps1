Add-Type -AssemblyName System.Drawing

$srcLogo = "c:\Users\LEGION\Documents\Pawi-FinancialTracker\mobile_app\public\pawikan-logo.png"
$resDir = "c:\Users\LEGION\Documents\Pawi-FinancialTracker\android_twa\app\src\main\res"

$drawableDir = Join-Path $resDir "drawable"
if (!(Test-Path $drawableDir)) { New-Item -ItemType Directory -Path $drawableDir -Force }

# Copy splash icon (512x512)
Copy-Item "c:\Users\LEGION\Documents\Pawi-FinancialTracker\mobile_app\public\icon-512.png" (Join-Path $drawableDir "splash_icon.png") -Force

# Generate mipmap icon densities
$densities = @(
    @{ Name = "mipmap-mdpi"; Size = 48 },
    @{ Name = "mipmap-hdpi"; Size = 72 },
    @{ Name = "mipmap-xhdpi"; Size = 96 },
    @{ Name = "mipmap-xxhdpi"; Size = 144 },
    @{ Name = "mipmap-xxxhdpi"; Size = 192 }
)

$src = [System.Drawing.Bitmap]::FromFile($srcLogo)

foreach ($d in $densities) {
    $targetDir = Join-Path $resDir $d.Name
    if (!(Test-Path $targetDir)) { New-Item -ItemType Directory -Path $targetDir -Force }

    $w = $d.Size
    $h = $d.Size
    
    # 1. Standard square icon
    $bmp = New-Object System.Drawing.Bitmap $w, $h
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($src, 0, 0, $w, $h)
    $bmp.Save((Join-Path $targetDir "ic_launcher.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()

    # 2. Round adaptive icon
    $bmpRound = New-Object System.Drawing.Bitmap $w, $h
    $gRound = [System.Drawing.Graphics]::FromImage($bmpRound)
    $gRound.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#FAFAF7"))
    $gRound.FillRectangle($brush, 0, 0, $w, $h)
    $pad = [int]($w * 0.1)
    $gRound.DrawImage($src, $pad, $pad, ($w - 2*$pad), ($h - 2*$pad))
    $bmpRound.Save((Join-Path $targetDir "ic_launcher_round.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $gRound.Dispose()
    $bmpRound.Dispose()
}

$src.Dispose()
Write-Host "Android mipmap and drawable icons generated successfully!"
