$css = Get-Content 'style.css' -Raw

# 1. Update overlay z-index
$css = $css -replace '(?s)\.calc-modal-overlay \{.*?-webkit-backdrop-filter: blur\(12px\);', '.calc-modal-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    z-index: 9999999 !important;'

# 2. Update calc-premium-container width to be more rectangular (landscape-ish)
$css = $css -replace 'max-width: 360px;', 'max-width: 460px;'

# 3. Reduce button padding to shrink height
$css = $css -replace 'padding: 16px 0;', 'padding: 10px 0;'
$css = $css -replace 'padding: 20px 0;', 'padding: 10px 0;'

# 4. Make gap smaller
$css = $css -replace 'gap: 14px;', 'gap: 10px;'

Set-Content 'style.css' -Value $css -NoNewline

# Bump cache
$html = Get-Content 'index.html' -Raw
$html = $html -replace 'style\.css\?v=\d+', 'style.css?v=62'
Set-Content 'index.html' -Value $html -NoNewline
