$url = "https://ypkmtmmmsjcdmnarkmhf.supabase.co"
$apikey = "sb_publishable_qtUyeCpKdqAYYQsIDKiStQ_8ZM39iIU"

$headers = @{
    "apikey" = $apikey
    "Content-Type" = "application/json"
}

# 1. Sign up dummy user
Write-Host "Signing up..."
$signupBody = @{
    "email" = "ponnusamy.savings.test.user.123@gmail.com"
    "password" = "SuperSecurePassword123!"
} | ConvertTo-Json

try {
    $signupRes = Invoke-WebRequest -Uri "$url/auth/v1/signup" -Headers $headers -Method Post -Body $signupBody
    $user = $signupRes.Content | ConvertFrom-Json
    Write-Host "Signup Success! User ID: $($user.id)"
} catch {
    Write-Host "Signup failed!"
    $res = $_.Exception.Response
    if ($res) {
        $stream = $res.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $body = $reader.ReadToEnd()
        Write-Host "Signup Status: $($res.StatusCode)"
        Write-Host "Signup Response Body: $body"
    } else {
        Write-Host "Signup Exception: $($_.Exception.Message)"
    }
}

# 2. Sign in dummy user
Write-Host "Signing in..."
$signinBody = @{
    "email" = "ponnusamy.savings.test.user.123@gmail.com"
    "password" = "SuperSecurePassword123!"
} | ConvertTo-Json

try {
    $signinRes = Invoke-WebRequest -Uri "$url/auth/v1/token?grant_type=password" -Headers $headers -Method Post -Body $signinBody
    $tokenObj = $signinRes.Content | ConvertFrom-Json
    $accessToken = $tokenObj.access_token
    $userId = $tokenObj.user.id
    Write-Host "Signin Success! User ID: $userId"
    
    # 3. Insert a basic row in user_data
    Write-Host "Inserting row..."
    $authHeaders = @{
        "apikey" = $apikey
        "Authorization" = "Bearer $accessToken"
        "Content-Type" = "application/json"
        "Prefer" = "return=representation"
    }
    
    $insertBody = @{
        "user_id" = $userId
        "updated_at" = (Get-Date).ToString("yyyy-MM-ddTHH:mm:sszzz")
    } | ConvertTo-Json
    
    $insertRes = Invoke-WebRequest -Uri "$url/rest/v1/user_data" -Headers $authHeaders -Method Post -Body $insertBody
    Write-Host "Insert Success! Status: $($insertRes.StatusCode)"
    Write-Host "Returned columns: $($insertRes.Content)"
    
} catch {
    Write-Host "Error!"
    $res = $_.Exception.Response
    if ($res) {
        $stream = $res.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $body = $reader.ReadToEnd()
        Write-Host "Status: $($res.StatusCode)"
        Write-Host "Response Body: $body"
    } else {
        Write-Host "Exception: $($_.Exception.Message)"
    }
}
