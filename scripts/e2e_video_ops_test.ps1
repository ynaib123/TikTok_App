$ErrorActionPreference = 'Stop'

function Get-EnvValueFromDotEnv {
  param(
    [Parameter(Mandatory = $true)]
    [string] $Key
  )

  $envFile = Join-Path $PSScriptRoot '..\.env'
  if (-not (Test-Path $envFile)) {
    return $null
  }

  $prefix = "$Key="
  foreach ($line in Get-Content $envFile) {
    if ($line.StartsWith($prefix)) {
      return $line.Substring($prefix.Length).Trim()
    }
  }

  return $null
}

$adminPassword = $env:APP_ADMIN_PASSWORD
if ([string]::IsNullOrWhiteSpace($adminPassword)) {
  $adminPassword = Get-EnvValueFromDotEnv -Key 'APP_ADMIN_PASSWORD'
}

if ([string]::IsNullOrWhiteSpace($adminPassword)) {
  throw 'APP_ADMIN_PASSWORD est requis. Definis la variable d environnement ou renseigne-la dans .env avant d executer ce script.'
}

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$csrfToken = (Invoke-RestMethod -Method GET -Uri 'http://localhost:8080/api/admins/csrf-token' -WebSession $session).token
$login = Invoke-RestMethod -Method POST -Uri 'http://localhost:8080/api/admins/login' -WebSession $session -Headers @{
  'X-XSRF-TOKEN' = $csrfToken
  'Content-Type' = 'application/json'
} -Body (@{
  email = 'admin@tiktokapp.local'
  motDePasse = $adminPassword
} | ConvertTo-Json)

$jwt = $login.token

function Get-CsrfToken {
  return (Invoke-RestMethod -Method GET -Uri 'http://localhost:8080/api/admins/csrf-token' -WebSession $session).token
}

function New-AuthHeaders {
  $token = Get-CsrfToken
  return @{
    'Authorization' = "Bearer $jwt"
    'X-XSRF-TOKEN' = $token
    'Content-Type' = 'application/json'
  }
}

function New-ReadHeaders {
  $token = Get-CsrfToken
  return @{
    'Authorization' = "Bearer $jwt"
    'X-XSRF-TOKEN' = $token
  }
}

$category = 'callbackfix-' + [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()

$mainRun = Invoke-RestMethod -Method POST -Uri 'http://localhost:8080/api/video-ops/workflows/main-pipeline' -WebSession $session -Headers (New-AuthHeaders) -Body (@{
  source = 'codex-e2e-creation'
  ideaCount = 1
  category = $category
  force = $true
} | ConvertTo-Json)

Start-Sleep -Seconds 8

$mainRunStatus = Invoke-RestMethod -Method GET -Uri ("http://localhost:8080/api/video-ops/workflow-runs/{0}" -f $mainRun.runId) -WebSession $session -Headers (New-ReadHeaders)
$ideas = Invoke-RestMethod -Method GET -Uri 'http://localhost:8080/api/video-ops/content-ideas' -WebSession $session -Headers (New-ReadHeaders)
$idea = $ideas | Where-Object { $_.category -eq $category } | Sort-Object { [int64] $_.id } -Descending | Select-Object -First 1

if (-not $idea) {
  throw 'Aucune idee trouvee apres creation.'
}

$scriptRun = Invoke-RestMethod -Method POST -Uri 'http://localhost:8080/api/video-ops/workflows/check-shotstack' -WebSession $session -Headers (New-AuthHeaders) -Body (@{
  source = 'codex-e2e-script'
  contentIdeaId = $idea.id
  topic = $idea.topic
  force = $true
} | ConvertTo-Json)

Start-Sleep -Seconds 10

$scriptRunStatus = Invoke-RestMethod -Method GET -Uri ("http://localhost:8080/api/video-ops/workflow-runs/{0}" -f $scriptRun.runId) -WebSession $session -Headers (New-ReadHeaders)
$ideaStatus = Invoke-RestMethod -Method GET -Uri ("http://localhost:8080/api/video-ops/content-ideas/{0}/status" -f $idea.id) -WebSession $session -Headers (New-ReadHeaders)

[pscustomobject]@{
  category = $category
  creationRunId = $mainRun.runId
  creationStatus = $mainRunStatus.status
  creationResponsePayload = $mainRunStatus.responsePayload
  ideaId = $idea.id
  topic = $idea.topic
  scriptRunId = $scriptRun.runId
  scriptStatus = $scriptRunStatus.status
  scriptResponsePayload = $scriptRunStatus.responsePayload
  pipelineStage = $ideaStatus.pipelineStage
  scriptLength = ([string] $ideaStatus.script).Length
  captionLength = ([string] $ideaStatus.caption).Length
  keyword = $ideaStatus.backgroundKeyword
} | ConvertTo-Json -Depth 6
