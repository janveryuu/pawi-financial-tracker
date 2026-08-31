Add-Type -AssemblyName System.Drawing

$srcPath = "c:\Users\LEGION\Documents\Pawi-FinancialTracker\mobile_app\public\pawikan-logo.png"
$pubDir = "c:\Users\LEGION\Documents\Pawi-FinancialTracker\mobile_app\public"
$src = [System.Drawing.Bitmap]::FromFile($srcPath)

function Resize-Icon($w, $h, $outName, $isMaskable) {
    $bmp = New-Object System.Drawing.Bitmap $w, $h
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    
    if ($isMaskable) {
        $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#FAFAF7"))
        $g.FillRectangle($brush, 0, 0, $w, $h)
        # 12% padding for safe zone in Android adaptive icons
        $pad = [int]($w * 0.12)
        $drawW = $w - ($pad * 2)
        $drawH = $h - ($pad * 2)
        $g.DrawImage($src, $pad, $pad, $drawW, $drawH)
    } else {
        $g.Clear([System.Drawing.Color]::Transparent)
        $g.DrawImage($src, 0, 0, $w, $h)
    }
    
    $outPath = Join-Path $pubDir $outName
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Generated: $outName"
}

Resize-Icon 192 192 "icon-192.png" $false
Resize-Icon 512 512 "icon-512.png" $false
Resize-Icon 192 192 "icon-maskable-192.png" $true
Resize-Icon 512 512 "icon-maskable-512.png" $true

$src.Dispose()
Write-Host "All Android & PWA icons generated successfully!"
