$url = "https://ypkmtmmmsjcdmnarkmhf.supabase.co"
$apikey = "sb_publishable_qtUyeCpKdqAYYQsIDKiStQ_8ZM39iIU"

$headers = @{
    "apikey" = $apikey
    "Authorization" = "Bearer $apikey"
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}

Write-Host "=== HOW ARE YOU LOGGING IN? ==="
Write-Host ""
Write-Host "The problem is that your app's login form (username/password) does NOT use Supabase auth."
Write-Host "It is a MOCK login - it saves to localStorage only, with NO real Supabase user ID."
Write-Host "So commitState() sees currentUser.id = undefined and SKIPS the cloud save entirely."
Write-Host ""
Write-Host "=== CHECKING AUTH METHODS ==="

# Try to get list of auth users (not possible with anon key, but check the users table)
try {
    $res = Invoke-WebRequest -Uri "$url/auth/v1/user" -Headers $headers -Method Get -ErrorAction Stop
    Write-Host "Auth check status: $($res.StatusCode)"
    Write-Host "Body: $($res.Content)"
} catch {
    $res = $_.Exception.Response
    if ($res) {
        $stream = $res.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $body = $reader.ReadToEnd()
        Write-Host "Auth Status: $($res.StatusCode)"
        Write-Host "Body: $body"
    }
}
