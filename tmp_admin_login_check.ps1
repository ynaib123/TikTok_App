$base = 'http://localhost:8080'
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$csrf = Invoke-RestMethod -Uri "$base/api/admins/csrf-token" -WebSession $session
$headers = @{ 'X-XSRF-TOKEN' = $csrf.token }
$body = @{ email = 'admin@tiktokapp.local'; motDePasse = 'DGN3SNs5buYiCLe_KwFFhQ0MbfF36tQh'; rememberMe = $true } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri "$base/api/admins/login" -WebSession $session -Headers $headers -ContentType 'application/json' -Body $body
Write-Output ("LOGIN_OK email={0} name={1} role={2}" -f $login.admin.email, $login.admin.nom, $login.role)
