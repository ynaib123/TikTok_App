$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$null = Invoke-RestMethod -Uri 'http://localhost:5678/healthz' -WebSession $session
try {
  $workflows = Invoke-RestMethod -Uri 'http://localhost:5678/rest/workflows' -WebSession $session
  Write-Output ("N8N_API_OK count={0}" -f @($workflows.data).Count)
} catch {
  Write-Output ("N8N_API_FAIL {0}" -f $_.Exception.Message)
}
