$url = "https://ypkmtmmmsjcdmnarkmhf.supabase.co"
$apikey = "sb_publishable_qtUyeCpKdqAYYQsIDKiStQ_8ZM39iIU"

# Step 1: Sign in with Google cannot be done from PS, but we can try email/password
# FIRST - let's check if there are any rows at all using service-role or trying anon
$headers = @{
    "apikey" = $apikey
    "Authorization" = "Bearer $apikey"
    "Content-Type" = "application/json"
}

Write-Host "=== CHECKING ROW COUNT (anonymously - may be 0 due to RLS) ==="
try {
    $res = Invoke-WebRequest -Uri "$url/rest/v1/user_data?select=count" -Headers $headers -Method Get -ErrorAction Stop
    Write-Host "Count response: $($res.Content)"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
}

Write-Host ""
Write-Host "=== TESTING RLS: Check if table has ANY rows ==="
try {
    $res = Invoke-WebRequest -Uri "$url/rest/v1/user_data?select=user_id&limit=10" -Headers ($headers + @{"Prefer" = "count=exact"}) -Method Head -ErrorAction Stop
    Write-Host "Content-Range header: $($res.Headers['Content-Range'])"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
}

Write-Host ""
Write-Host "DIAGNOSIS:"
Write-Host "If table appears empty above, it means either:"
Write-Host "1. RLS is blocking anonymous reads (data exists but we can't see it)"
Write-Host "2. Table is genuinely empty (commitState() never ran with real user ID)"
Write-Host ""
Write-Host "The cards on your laptop are stored under localStorage key: 'pms_installment_cards'"
Write-Host "commitState() packages them into workspace_notepad.installment_cards before sending to Supabase"
Write-Host ""
Write-Host "To verify: Open browser console on laptop and run:"
Write-Host "  JSON.parse(localStorage.getItem('pms_installment_cards'))"
Write-Host "  window.AuthState.currentUser.id"
