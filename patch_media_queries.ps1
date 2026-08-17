$files = @("style.css", "auth.css", "index.html")
foreach ($file in $files) {
    if (Test-Path $file) {
        $content = Get-Content -Raw $file
        # Replace min-width first
        $content = $content -replace "\(min-width:\s*76[89]px\)", "(min-width: 769px) and (orientation: landscape), (min-width: 1025px)"
        # Now max-width
        $content = $content -replace "\(max-width:\s*76[78]px\)", "(max-width: 768px), (max-width: 1024px) and (orientation: portrait)"
        
        Set-Content -Path $file -Value $content -Encoding UTF8
        Write-Output "Patched $file"
    }
}
