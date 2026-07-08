$html = Get-Content index.html -Raw

# 1. Find the header block
$startPattern = '(?s)<!-- Header -->\s*<header class="app-header">.*?</header>'
$headerMatch = [regex]::Match($html, $startPattern)
$headerContent = $headerMatch.Value

# 2. Remove the header from its current location
$html = $html -replace $startPattern, ''

# 3. Find <main class="app-container"> and insert the header right after it
$mainPattern = '(?s)<main class="app-container">\s*'
$replacement = "<main class=`"app-container`">`r`n$headerContent`r`n    <div class=`"app-screens-wrapper`">`r`n"
$html = $html -replace $mainPattern, $replacement

# 4. Insert closing div for app-screens-wrapper right before </main>
$mainClosePattern = '(?s)\s*</main>'
$replacementClose = "`r`n    </div>`r`n</main>"
$html = $html -replace $mainClosePattern, $replacementClose

Set-Content index.html $html
