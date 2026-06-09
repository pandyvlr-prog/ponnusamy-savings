using namespace System.Net
using namespace System.IO

$listener = [HttpListener]::new()
$listener.Prefixes.Add("http://+:8080/")
$listener.Start()
Write-Host "Listening on http://0.0.0.0:8080/ (Press Ctrl+C to stop)"

try {
    while ($true) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $path = $request.Url.LocalPath
        if ($path -eq "/") { $path = "/index.html" }
        $fullPath = Join-Path (Get-Location) $path

        if (Test-Path $fullPath -PathType Leaf) {
            $extension = [System.IO.Path]::GetExtension($fullPath)
            $contentType = "text/plain"
            switch ($extension) {
                ".html" { $contentType = "text/html" }
                ".css"  { $contentType = "text/css" }
                ".js"   { $contentType = "application/javascript" }
                ".png"  { $contentType = "image/png" }
                ".jpg"  { $contentType = "image/jpeg" }
            }
            $response.ContentType = $contentType
            $bytes = [File]::ReadAllBytes($fullPath)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            Write-Host "200 OK: $path"
        } else {
            $response.StatusCode = 404
            Write-Host "404 Not Found: $path"
        }
        $response.Close()
    }
} finally {
    $listener.Stop()
}
