$url = "https://ypkmtmmmsjcdmnarkmhf.supabase.co"
$apikey = "sb_publishable_qtUyeCpKdqAYYQsIDKiStQ_8ZM39iIU"

$headers = @{
    "apikey" = $apikey
    "Authorization" = "Bearer $apikey"
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}

# We will test an upsert. We don't have a valid active user session token, but we can do a mock GET and inspect schema or try to upsert as a guest to see if it catches column errors.
# Since we don't have a login session here, let's just make a POST request with the new payload to check if PostgREST returns a 'column does not exist' or an 'invalid/unauthorized' error.
# If the column does not exist, it will return:
#   column user_data.XXXX does not exist (BadRequest 400)
# If the column exists, since we are unauthorized to update someone else's data (or no session is provided), it should return:
#   either status 401 Unauthorized or status 403 Forbidden or 201/200 if public write is allowed.
# In either case, it will NOT return "column user_data.installment_cards_data does not exist".

$testPayload = @{
    "user_id" = "00000000-0000-0000-0000-000000000000"
    "groups_data" = @()
    "members_data" = @()
    "templates_data" = @()
    "notes_data" = @()
    "workspace_notepad" = @{
        "notes" = @()
        "cards" = @{ "12" = @() }
    }
    "updated_at" = (Get-Date).ToString("yyyy-MM-ddTHH:mm:sszzz")
} | ConvertTo-Json

Write-Host "Sending test upsert with combined payload..."
try {
    $response = Invoke-WebRequest -Uri "$url/rest/v1/user_data" -Headers $headers -Method Post -Body $testPayload
    Write-Host "Success! Status code: $($response.StatusCode)"
    Write-Host "Response content: $($response.Content)"
} catch {
    Write-Host "Request completed (expected error or status check)."
    $res = $_.Exception.Response
    if ($res) {
        $stream = $res.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $body = $reader.ReadToEnd()
        Write-Host "Status code: $($res.StatusCode)"
        Write-Host "Response body: $body"
    } else {
        Write-Host "Exception message: $($_.Exception.Message)"
    }
}
