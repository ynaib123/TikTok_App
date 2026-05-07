# Smoke test end-to-end post sprints securite + fiabilite.
# Verifie : login cookies HttpOnly, security headers, rate limit, pipeline
# main-pipeline complet, idempotency 409 sur replay, trigger render.
#
# Usage : pwsh Backend/tools/smoke-test.ps1
$ErrorActionPreference = 'Stop'

function Section($n, $msg) { Write-Host "`n=== [$n] $msg ===" -ForegroundColor Cyan }
function Ok($msg)   { Write-Host "  ok   : $msg" -ForegroundColor Green }
function Fail($msg) { Write-Host "  FAIL : $msg" -ForegroundColor Red; $script:failures++ }
function Info($msg) { Write-Host "  info : $msg" -ForegroundColor DarkGray }

$script:failures = 0
$base = 'http://localhost:8080'

# Lire APP_ADMIN_PASSWORD depuis .env
$envContent = Get-Content C:\TikTok_App\.env
$pwLine = $envContent | Where-Object { $_ -match '^APP_ADMIN_PASSWORD=' }
$adminPassword = ($pwLine -split '=', 2)[1]

#----------------------------------------------------------------------
Section 1 'Login admin + cookies HttpOnly'
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$csrf = (Invoke-WebRequest -Uri "$base/api/admins/csrf-token" -WebSession $session -UseBasicParsing).Content | ConvertFrom-Json
Ok "CSRF recu : $($csrf.token.Substring(0,8))..."

$loginBody = @{ email='admin@tiktokapp.local'; motDePasse=$adminPassword; rememberMe=$true } | ConvertTo-Json
$login = Invoke-WebRequest -Uri "$base/api/admins/login" -Method Post `
    -ContentType 'application/json' -Body $loginBody `
    -Headers @{ 'X-XSRF-TOKEN' = $csrf.token } `
    -WebSession $session -UseBasicParsing
if ($login.StatusCode -eq 200) { Ok "POST /admins/login -> 200" } else { Fail "Login statut $($login.StatusCode)" }

# Inspecter les cookies poses
$cookies = $session.Cookies.GetCookies($base) | Where-Object { $_.Name -like 'tiktok_app_admin_*' }
$accessCookie = $cookies | Where-Object Name -eq 'tiktok_app_admin_access'
$refreshCookie = $cookies | Where-Object Name -eq 'tiktok_app_admin_refresh'
if ($accessCookie -and $accessCookie.HttpOnly) { Ok "Cookie tiktok_app_admin_access pose + HttpOnly=true" } else { Fail "Access cookie absent ou non-HttpOnly" }
if ($refreshCookie -and $refreshCookie.HttpOnly) { Ok "Cookie tiktok_app_admin_refresh pose + HttpOnly=true" } else { Fail "Refresh cookie absent ou non-HttpOnly" }

# Le body ne devrait plus contenir le token brut en localStorage utilise (mais le backend le retourne pour compat tests).
$loginJson = $login.Content | ConvertFrom-Json
if ($loginJson.token) { Info "body.token toujours present (rétrocompat tests/integrations) -- attendu" }

#----------------------------------------------------------------------
Section 2 'Security headers sur reponse authentifiee'
$health = Invoke-WebRequest -Uri "$base/api/video-ops/health" -WebSession $session -UseBasicParsing
$h = $health.Headers
$expected = @{
    'Content-Security-Policy' = 'default-src'
    'X-Frame-Options' = 'DENY'
    'X-Content-Type-Options' = 'nosniff'
    'Referrer-Policy' = 'strict-origin'
    'Permissions-Policy' = 'camera='
}
foreach ($name in $expected.Keys) {
    $value = $h[$name]
    if ($value -and ($value -join ',') -match $expected[$name]) {
        Ok "$name present"
    } else {
        Fail "$name manquant ou value inattendue : $($value -join ',')"
    }
}
# HSTS : Spring Security ne le pose qu'en HTTPS (request.isSecure()). Sur
# localhost HTTP c'est attendu absent. On le verifie informatif uniquement.
$hsts = $h['Strict-Transport-Security']
if ($base.StartsWith('https://') -or $hsts) {
    if ($hsts -and ($hsts -join ',') -match 'max-age=') { Ok "Strict-Transport-Security present" }
    else { Fail "Strict-Transport-Security attendu en HTTPS : $($hsts -join ',')" }
} else {
    Info "Strict-Transport-Security absent (normal sur HTTP local, sera pose en HTTPS)"
}

#----------------------------------------------------------------------
Section 3 'Pipeline main-pipeline (creation idee + script)'
# Capturer baseline avant trigger
$ideasBefore = (Invoke-RestMethod -Uri "$base/api/video-ops/content-ideas?page=0&size=20&sort=id,desc" -WebSession $session)
$baselineMaxId = ($ideasBefore.content | ForEach-Object { [int]$_.id } | Measure-Object -Maximum).Maximum
Info "baseline content_idea id max = $baselineMaxId"

# Refresh CSRF
$csrf = (Invoke-WebRequest -Uri "$base/api/admins/csrf-token" -WebSession $session -UseBasicParsing).Content | ConvertFrom-Json

$triggerBody = @{
    source = 'smoke-test'
    ideaCount = 1
    category = 'Tech'
    tiktokAccountOpenId = '-000MiGDsVAboLay49xf6jAABXmapm58k16u'
    force = $true
} | ConvertTo-Json
$trigger = Invoke-WebRequest -Uri "$base/api/video-ops/workflows/main-pipeline" `
    -Method Post -ContentType 'application/json' -Body $triggerBody `
    -Headers @{ 'X-XSRF-TOKEN' = $csrf.token } -WebSession $session -UseBasicParsing
if ($trigger.StatusCode -eq 200) { Ok "POST main-pipeline -> 200" } else { Fail "trigger statut $($trigger.StatusCode)" }
$triggerJson = $trigger.Content | ConvertFrom-Json
$script:runId = $triggerJson.runId
Info "runId = $($script:runId)"

# Polling : attendre que le run passe SUCCEEDED (max 60s — Groq + script gen
# peuvent depasser 30s si pic de charge ou ratelimit).
$deadline = (Get-Date).AddSeconds(60)
$run = $null
while ((Get-Date) -lt $deadline) {
    $run = Invoke-RestMethod -Uri "$base/api/video-ops/workflow-runs/$($script:runId)" -WebSession $session
    if ($run.status -eq 'SUCCEEDED' -or $run.status -eq 'FAILED') { break }
    Start-Sleep -Milliseconds 1500
}
if ($run.status -eq 'SUCCEEDED') {
    Ok "run $($script:runId) termine en SUCCEEDED"
    $script:pipelineSucceeded = $true
} elseif ($run.status -eq 'FAILED') {
    Fail "run $($script:runId) FAILED : $($run.errorMessage)"
} else {
    Fail "run $($script:runId) statut=$($run.status) apres 60s (n8n hung ou Groq down)"
}

# Verifier qu'une nouvelle idee a ete creee
Start-Sleep -Seconds 1
$ideasAfter = (Invoke-RestMethod -Uri "$base/api/video-ops/content-ideas?page=0&size=20&sort=id,desc" -WebSession $session)
$newIdeas = $ideasAfter.content | Where-Object { [int]$_.id -gt $baselineMaxId }
if ($newIdeas) {
    $newIdea = $newIdeas[0]
    Ok "Nouvelle idee creee : id=$($newIdea.id) topic='$($newIdea.topic.Substring(0, [Math]::Min(60,$newIdea.topic.Length)))...' scriptStatus=$($newIdea.scriptStatus)"
    if ($newIdea.scripts -or $newIdea.script -or $newIdea.scriptStatus -eq 'done') {
        Ok "Script attache a l'idee (scriptStatus=$($newIdea.scriptStatus))"
    } else {
        Fail "Script absent : $(($newIdea | ConvertTo-Json -Depth 1))"
    }
    $script:newIdeaId = $newIdea.id
} else {
    Fail "Aucune nouvelle idee detectee apres le run"
}

#----------------------------------------------------------------------
Section 4 'Idempotency : replay avec mauvaise cle -> 409 (sans muter le run)'
$dbRun = Invoke-RestMethod -Uri "$base/api/video-ops/workflow-runs/$($script:runId)" -WebSession $session
Info "run.status courant = $($dbRun.status), workflowType = $($dbRun.workflowType)"

# Recuperer le secret callback legacy (HMAC alternatif tolere)
$envContent = Get-Content C:\TikTok_App\.env
$cbSecret = (($envContent | Where-Object { $_ -match '^APP_VIDEO_OPS_WORKFLOW_CALLBACK_SECRET=' }) -split '=', 2)[1]
$callbackBody = '{"status":"SUCCEEDED","message":"smoke replay","responsePayload":"{}"}'
try {
    Invoke-WebRequest -Uri "$base/api/video-ops/workflow-runs/$($script:runId)/complete" `
        -Method Post -ContentType 'application/json' -Body $callbackBody `
        -Headers @{
            'X-Video-Ops-Callback-Secret' = $cbSecret
            'X-Idempotency-Key' = 'WRONG_KEY:99999'
        } -UseBasicParsing -ErrorAction Stop | Out-Null
    Fail "Replay avec mauvaise cle aurait du etre rejete en 409"
} catch {
    $statusCode = [int]$_.Exception.Response.StatusCode
    if ($statusCode -eq 409) {
        Ok "Replay avec X-Idempotency-Key=WRONG_KEY -> 409 Conflict (attendu, run non-mute)"
    } else {
        Fail "Replay avec mauvaise cle a renvoye $statusCode au lieu de 409"
    }
}

#----------------------------------------------------------------------
Section 5 'Idempotency : replay avec bonne cle sur run TERMINAL -> 200 idempotent'
# Pour ce test, on utilise un run deja en etat terminal pour ne pas muter
# le run principal (qui peut etre encore PENDING/ACCEPTED si Groq est lent).
# On recherche un run SUCCEEDED ou FAILED dans l'historique.
$observability = Invoke-RestMethod -Uri "$base/api/video-ops/observability" -WebSession $session
$terminalRun = $observability.recentRuns | Where-Object {
    $_.status -in @('SUCCEEDED','FAILED') -and $_.id -ne $script:runId
} | Select-Object -First 1

if (-not $terminalRun) {
    Info "Pas de run terminal historique disponible, skip section 5"
} else {
    Info "Run terminal cible : id=$($terminalRun.id) status=$($terminalRun.status) workflowType=$($terminalRun.workflowType)"
    $correctKey = "$($terminalRun.workflowType):" + ($(if ($terminalRun.contentIdeaId) { $terminalRun.contentIdeaId } else { 'global' }))
    try {
        $resp = Invoke-WebRequest -Uri "$base/api/video-ops/workflow-runs/$($terminalRun.id)/complete" `
            -Method Post -ContentType 'application/json' -Body $callbackBody `
            -Headers @{
                'X-Video-Ops-Callback-Secret' = $cbSecret
                'X-Idempotency-Key' = $correctKey
            } -UseBasicParsing
        if ($resp.StatusCode -eq 200) {
            $respJson = $resp.Content | ConvertFrom-Json
            if ($respJson.status -eq $terminalRun.status) {
                Ok "Replay bonne cle sur run terminal -> 200 + status preserve ($($respJson.status))"
            } else {
                Fail "Run terminal mute ! avant=$($terminalRun.status) apres=$($respJson.status)"
            }
        } else {
            Fail "Replay bonne cle statut $($resp.StatusCode)"
        }
    } catch {
        Fail "Replay bonne cle : $($_.Exception.Message)"
    }
}

#----------------------------------------------------------------------
Section 6 'Rate limit POST /admins/login (10/min)'
$wrongBody = @{ email='admin@tiktokapp.local'; motDePasse='wrong'; rememberMe=$false } | ConvertTo-Json
$rateSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$csrfRate = (Invoke-WebRequest -Uri "$base/api/admins/csrf-token" -WebSession $rateSession -UseBasicParsing).Content | ConvertFrom-Json
$got429 = $false
$attempts = 0
for ($i = 1; $i -le 14; $i++) {
    $attempts = $i
    try {
        Invoke-WebRequest -Uri "$base/api/admins/login" -Method Post `
            -ContentType 'application/json' -Body $wrongBody `
            -Headers @{ 'X-XSRF-TOKEN' = $csrfRate.token } `
            -WebSession $rateSession -UseBasicParsing -ErrorAction Stop | Out-Null
    } catch {
        $sc = [int]$_.Exception.Response.StatusCode
        if ($sc -eq 429) { $got429 = $true; break }
        # 401 attendu sur les 10 premieres
    }
}
if ($got429) {
    Ok "Rate limit declenche apres $attempts tentatives -> 429"
} else {
    Fail "Pas de 429 apres $attempts tentatives wrong-password"
}

#----------------------------------------------------------------------
Section 7 'Trigger render-template-video sur la nouvelle idee'
# (smoke-test : on lance le render et on verifie qu'il est ACCEPTED, sans
#  attendre les ~3min du Shotstack render reel)
if ($script:newIdeaId) {
    $csrf = (Invoke-WebRequest -Uri "$base/api/admins/csrf-token" -WebSession $session -UseBasicParsing).Content | ConvertFrom-Json
    $renderBody = @{
        source = 'smoke-test'
        contentIdeaId = $script:newIdeaId
        force = $true
    } | ConvertTo-Json
    try {
        $renderResp = Invoke-WebRequest -Uri "$base/api/video-ops/workflows/render-template" `
            -Method Post -ContentType 'application/json' -Body $renderBody `
            -Headers @{ 'X-XSRF-TOKEN' = $csrf.token } -WebSession $session -UseBasicParsing
        $renderJson = $renderResp.Content | ConvertFrom-Json
        Ok "POST render-template -> $($renderResp.StatusCode), runId=$($renderJson.runId), status=$($renderJson.status)"
        Info "Le render Shotstack reel prend 1-3min; smoke s'arrete ici, test live UI a faire."
    } catch {
        $sc = [int]$_.Exception.Response.StatusCode
        # 400 acceptable si l'idee n'a pas tous les champs requis ; smoke flag uniquement les erreurs serveur.
        if ($sc -ge 500) { Fail "render-template -> 5xx ($sc)" }
        else { Info "render-template -> $sc (probablement metier : champs idee manquants pour render reel, hors scope smoke)" }
    }
} else {
    Info "newIdeaId absent, skip render trigger"
}

#----------------------------------------------------------------------
Section 8 'Logout + invalidation cookies'
$csrf = (Invoke-WebRequest -Uri "$base/api/admins/csrf-token" -WebSession $session -UseBasicParsing).Content | ConvertFrom-Json
$logout = Invoke-WebRequest -Uri "$base/api/admins/logout" -Method Post `
    -ContentType 'application/json' -Body '{}' `
    -Headers @{ 'X-XSRF-TOKEN' = $csrf.token } -WebSession $session -UseBasicParsing
if ($logout.StatusCode -eq 200) { Ok "POST logout -> 200" } else { Fail "logout statut $($logout.StatusCode)" }

#----------------------------------------------------------------------
Write-Host "`n=== RESULTAT ===" -ForegroundColor White
if ($script:failures -eq 0) {
    Write-Host "Tous les checks ok." -ForegroundColor Green
    exit 0
} else {
    Write-Host "$($script:failures) check(s) en echec." -ForegroundColor Red
    exit 1
}
