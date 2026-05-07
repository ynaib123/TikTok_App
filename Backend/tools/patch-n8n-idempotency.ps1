# Patch les 4 workflows n8n actifs pour propager X-Idempotency-Key
# de bout en bout : Webhook input -> nodes intermediaires -> callbacks.
#
# Patch CHIRURGICAL : on ne reecrit pas les callbacks, on ajoute juste les
# 3-4 lignes necessaires (extraction + header + detection 409).
#
# Usage : pwsh Backend/tools/patch-n8n-idempotency.ps1
#         pwsh Backend/tools/patch-n8n-idempotency.ps1 -DryRun
#         pwsh Backend/tools/patch-n8n-idempotency.ps1 -Only q8OpzbRoQe8W8TzY

param(
    [switch]$DryRun,
    [string]$Only = '',
    [string]$ApiKey = $env:N8N_API_KEY
)

$ErrorActionPreference = 'Stop'

if (-not $ApiKey) {
    # Fallback : lire .env a la racine pour la cle n8n.
    $envPath = Join-Path $PSScriptRoot '..\..\.env'
    if (Test-Path $envPath) {
        $line = Get-Content $envPath | Where-Object { $_ -match '^N8N_API_KEY=' }
        if ($line) { $ApiKey = ($line -split '=', 2)[1] }
    }
}
if (-not $ApiKey) {
    throw "N8N_API_KEY est requise. Definir via env var, parametre -ApiKey, ou ligne N8N_API_KEY=... dans .env"
}

$apiKey = $ApiKey
$base = 'http://localhost:5678/api/v1'
$headers = @{ 'X-N8N-API-KEY' = $apiKey }

$targets = @(
    @{ id = 'q8OpzbRoQe8W8TzY'; name = 'idea-script-generation-fused' },
    @{ id = 'renderRemotion01'; name = 'render-template-video-remotion' },
    @{ id = 'ql0Tg97q1cZ12aee'; name = 'init-publish-tiktok-fixed' }
)

function Write-Step($msg) { Write-Host "  $msg" -ForegroundColor Cyan }
function Write-Skip($msg) { Write-Host "  [skip] $msg" -ForegroundColor DarkGray }
function Write-Patch($msg) { Write-Host "  [patch] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  [warn] $msg" -ForegroundColor Yellow }

# Returns ($newCode, $changed) where $changed is bool.
function Patch-ValidateInput([string]$code) {
    if ($code -match 'idempotencyKey') {
        return @($code, $false)
    }

    # On cherche un point d'insertion : la ligne qui declare body = $json.body,
    # ou a defaut la ligne qui declare workflowRunId. Pattern A et B couverts.
    $insertLine = $null
    $insertCode = $null

    # Pattern A : `const body = $json.body || {};`
    $m = [regex]::Match($code, '(?m)^(?<line>(?:const|let|var)\s+body\s*=\s*\$json\.body[^;]*;)')
    if ($m.Success) {
        $insertLine = $m.Groups['line'].Value
        $insertCode = "const idempotencyKey = body.idempotencyKey || null;"
    } else {
        # Pattern B : `const workflowRunId = Number($json.body?.workflowRunId || ...)`
        $m = [regex]::Match($code, '(?m)^(?<line>(?:const|let|var)\s+workflowRunId\s*=\s*Number\([^;]*?\$json[^;]*;)')
        if ($m.Success) {
            $insertLine = $m.Groups['line'].Value
            $insertCode = "const idempotencyKey = String(`$json.body?.idempotencyKey || `$json.idempotencyKey || '').trim() || null;"
        }
    }

    if (-not $insertLine) {
        return @($code, $false)
    }

    $patched = $code.Replace($insertLine, "$insertLine`n$insertCode")

    # Injecter idempotencyKey dans TOUS les `return [{ json: { ... } }]`.
    $patched = [regex]::Replace($patched, 'return\s*\[\s*\{\s*json\s*:\s*\{', 'return [{ json: { idempotencyKey,')

    return @($patched, $true)
}

function Patch-PrepareError([string]$code) {
    if ($code -match 'idempotencyKey') {
        return @($code, $false)
    }
    if ($code -notmatch [regex]::Escape("`$('Validate Input')")) {
        return @($code, $false)
    }

    # Inserer un bloc qui lit l'idempotencyKey depuis Validate Input, juste avant le return.
    $block = @'

let idempotencyKey = null;
try {
  const validateNode = $('Validate Input');
  if (validateNode && validateNode.first() && validateNode.first().json) {
    idempotencyKey = validateNode.first().json.idempotencyKey || null;
  }
} catch (e) {}

'@

    # Trouver la derniere occurence de "return [" et inserer avant.
    $idx = $code.LastIndexOf('return [')
    if ($idx -lt 0) { return @($code, $false) }
    $patched = $code.Insert($idx, $block.Trim() + "`n`n")

    # Injecter idempotencyKey dans le return [{ json: { ... } }].
    $patched = [regex]::Replace($patched, 'return\s*\[\s*\{\s*json\s*:\s*\{', 'return [{ json: { idempotencyKey,')

    return @($patched, $true)
}

function Patch-Callback([string]$code, [string]$validateNodeName) {
    if ($code -match 'X-Idempotency-Key') {
        return @($code, $false)
    }

    # 1) Lecture de idempotencyKey directement depuis le Validate node : evite de
    #    dependre de la propagation par les nodes intermediaires.
    $wrMatch = [regex]::Match($code, '(?m)^(?<line>(?:const|let|var)\s+workflowRunId\s*=\s*Number\([^;]*;)')
    if (-not $wrMatch.Success) {
        return @($code, $false)
    }
    $idemRead = if ($validateNodeName) {
        # Echappement single-quote pour PowerShell + JS
        $jsName = $validateNodeName.Replace("'", "\'")
        "let idempotencyKey = '';`ntry { idempotencyKey = String(`$('$jsName').first().json.idempotencyKey || '').trim(); } catch (e) {}"
    } else {
        "const idempotencyKey = String(`$json.idempotencyKey || '').trim();"
    }
    $patched = $code.Replace(
        $wrMatch.Groups['line'].Value,
        $wrMatch.Groups['line'].Value + "`n$idemRead"
    )

    # 2) Ajout du header X-Idempotency-Key : on cible la ligne avec X-Video-Ops-Callback-Secret
    #    et on l'ajoute apres une virgule.
    $secMatch = [regex]::Match($patched, "(?m)^(?<lead>\s*)'X-Video-Ops-Callback-Secret':\s*callbackSecret(?<trail>,?)")
    if ($secMatch.Success) {
        $lead = $secMatch.Groups['lead'].Value
        $extra = "$lead'X-Video-Ops-Callback-Secret': callbackSecret,`n$lead...(idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {})"
        $patched = $patched.Replace($secMatch.Value, $extra)
    } else {
        Write-Warn "    pas de ligne X-Video-Ops-Callback-Secret detectee, header non injecte."
    }

    # 3) Detection 409 : on injecte juste apres la verification du statusCode 2xx.
    #    On cible la ligne `if (response.statusCode >= 200 && ... < 300)` quel que soit le suffix (break;, return ...).
    $okMatch = [regex]::Match($patched, '(?m)^(?<lead>\s*)(?<line>if\s*\(\s*response\.statusCode\s*>=\s*200\s*&&\s*response\.statusCode\s*<\s*300\s*\)[^\n]*)')
    if ($okMatch.Success) {
        $lead = $okMatch.Groups['lead'].Value
        $repl = $okMatch.Groups['line'].Value + "`n${lead}if (response.statusCode === 409) throw new Error('CALLBACK_OBSOLETE_REPLAY: 409 idempotency mismatch');"
        $patched = $patched.Replace($okMatch.Groups['line'].Value, $repl)
    }

    return @($patched, $true)
}

function Strip-ReadOnly($workflow) {
    # n8n API PUT /workflows/{id} n'accepte pas tous les champs renvoyes par GET,
    # ni toutes les sous-cles de settings. On filtre.
    $allowedSettingsKeys = @(
        'executionOrder', 'saveExecutionProgress', 'saveManualExecutions',
        'saveDataErrorExecution', 'saveDataSuccessExecution', 'executionTimeout',
        'errorWorkflow', 'timezone', 'callerPolicy', 'callerIds'
    )
    $cleanSettings = [ordered]@{}
    if ($workflow.settings) {
        foreach ($k in $allowedSettingsKeys) {
            if ($workflow.settings.PSObject.Properties[$k]) {
                $cleanSettings[$k] = $workflow.settings.$k
            }
        }
    }

    $payload = [ordered]@{
        name        = $workflow.name
        nodes       = $workflow.nodes
        connections = $workflow.connections
        settings    = $cleanSettings
    }
    if ($workflow.PSObject.Properties['staticData'] -and $null -ne $workflow.staticData) {
        $payload['staticData'] = $workflow.staticData
    }
    return $payload
}

foreach ($t in $targets) {
    if ($Only -and $Only -ne $t.id) { continue }
    Write-Host ""
    Write-Host "=== $($t.name) ($($t.id)) ===" -ForegroundColor White

    $w = Invoke-RestMethod -Uri "$base/workflows/$($t.id)" -Headers $headers
    $changed = $false

    # Trouver le nom du node Validate (premier node Code dont le nom commence par 'Validate'
    # et qui n'est pas 'Validate Script Quality' / 'Validate Aesthetic*' qui sont des etapes metier).
    $validateNode = $null
    foreach ($n in $w.nodes) {
        if ($n.type -ne 'n8n-nodes-base.code') { continue }
        if ($n.name -match '^Validate Input' -or $n.name -match '^Validate ' -and $n.name -notmatch 'Script Quality' -and $n.name -notmatch 'Aesthetic') {
            if ($n.name -match '^Validate Input') { $validateNode = $n.name; break }
            if (-not $validateNode) { $validateNode = $n.name }
        }
    }
    if ($validateNode) { Write-Step "Validate node detecte : $validateNode" }

    foreach ($n in $w.nodes) {
        if ($n.type -ne 'n8n-nodes-base.code') { continue }
        $code = $n.parameters.jsCode
        if (-not $code) { continue }

        $name = $n.name
        if ($name -eq $validateNode) {
            $r = Patch-ValidateInput $code
            if ($r[1]) { $n.parameters.jsCode = $r[0]; $changed = $true; Write-Patch "$name : idempotencyKey extrait + propage" }
            else       { Write-Skip "$name : deja patche ou pattern non reconnu" }
            continue
        }
        if ($name -eq 'Prepare Error') {
            $r = Patch-PrepareError $code
            if ($r[1]) { $n.parameters.jsCode = $r[0]; $changed = $true; Write-Patch "Prepare Error : idempotencyKey relu depuis Validate Input" }
            else       { Write-Skip "Prepare Error : deja patche ou pattern non reconnu" }
            continue
        }
        if ($name -match '^Callback') {
            $r = Patch-Callback $code $validateNode
            if ($r[1]) { $n.parameters.jsCode = $r[0]; $changed = $true; Write-Patch "$name : header X-Idempotency-Key + detection 409" }
            else       { Write-Skip "$name : deja patche ou pattern non reconnu" }
            continue
        }
    }

    if (-not $changed) {
        Write-Step "Aucun changement (deja patche ?)"
        continue
    }

    if ($DryRun) {
        Write-Step "DryRun = pas de PUT. Workflow modifie en memoire uniquement."
        continue
    }

    $payload = Strip-ReadOnly $w
    $body = $payload | ConvertTo-Json -Depth 100 -Compress
    $resp = Invoke-RestMethod -Uri "$base/workflows/$($t.id)" -Headers $headers `
        -Method Put -ContentType 'application/json' -Body $body
    Write-Step "PUT ok (active=$($resp.active))"
}

Write-Host ""
Write-Host "Termine." -ForegroundColor Green
