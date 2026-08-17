$pdfPath = "js/pdf.js"
$content = Get-Content -Raw $pdfPath -Encoding UTF8

$oldSize = "        if (paperSize === 'custom') {`n            pdfFormat = [190, 155];`n            PAGE_WIDTH = 190;`n            PAGE_HEIGHT = 155;`n        }"
$newSize = "        if (paperSize === 'custom') {`n            pdfFormat = [155, 190];`n            PAGE_WIDTH = 155;`n            PAGE_HEIGHT = 190;`n        }"

$content = $content.Replace($oldSize, $newSize)

$oldSize2 = "        if (paperSize === 'custom') {`r`n            pdfFormat = [190, 155];`r`n            PAGE_WIDTH = 190;`r`n            PAGE_HEIGHT = 155;`r`n        }"
$newSize2 = "        if (paperSize === 'custom') {`r`n            pdfFormat = [155, 190];`r`n            PAGE_WIDTH = 155;`r`n            PAGE_HEIGHT = 190;`r`n        }"

$content = $content.Replace($oldSize2, $newSize2)

Set-Content -Path $pdfPath -Value $content -Encoding UTF8
Write-Output "Patched custom paper size dimensions"
