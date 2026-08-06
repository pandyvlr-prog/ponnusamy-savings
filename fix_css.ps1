$filePath = "style.css"
$lines = Get-Content $filePath -Encoding UTF8
$newLines = @()
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($i -ne 509) { # 0-indexed, so 509 is line 510
        $newLines += $lines[$i]
    }
}
Set-Content -Path $filePath -Value $newLines -Encoding UTF8
Write-Host "Removed line 510"
