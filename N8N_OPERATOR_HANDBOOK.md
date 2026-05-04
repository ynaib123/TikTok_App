# n8n TikTok Workflows - Operator Handbook

## 🎯 Quick Reference for Operations Teams

### Workflow Status Indicators

| Status | Meaning | Action |
|--------|---------|--------|
| 🟢 **Success** | Completed normally | None - working as intended |
| 🔴 **Failed** | Permanent error | Check logs, investigate root cause |
| ⏸️ **Paused** | Transient error detected | Review logs, optionally Resume |
| ⚠️ **Needs Review** | Quality gate failed | Manual decision required |

---

## 📍 Pause Points: When & Why

### Scenario 1: LLM API Timeout

```
❌ FAILED at: "HTTP: Call Groq LLM"
Error: "Timeout after 30s"

Is Transient Error? → YES
└─ Pause For Retry

Action:
1. Check Groq API status (groq.com/status)
2. Check network connectivity
3. Click "Resume" in n8n UI
```

**Outcome:**
- ✅ HTTP node auto-retries (2x max)
- ✅ If succeeds → workflow continues
- ✅ If fails again → callback backend, status=FAILED

---

### Scenario 2: Output Quality Failed

```
❌ FAILED at: "Validate Output Quality"
Error: "Script too short (< 10 chars)"

Is Transient Error? → NO
└─ Prepare Callback Error

Action:
1. Check LLM response (see logs)
2. Options:
   a. Adjust prompt + manually retry LLM
   b. Mark as needs_review + skip
   c. Investigate LLM model quality
```

**Outcome:**
- Callback sent to backend with status=FAILED
- Content marked as failed in pipeline
- No auto-retry possible

---

### Scenario 3: Network Error During Save

```
❌ FAILED at: "HTTP: Save to Backend"
Error: "Connection refused to backend:8080"

Is Transient Error? → YES (connection)
└─ Pause For Retry

Action:
1. Check if backend service is running
   $ docker ps | grep tiktok-app-backend
2. If down: restart the service
   $ docker restart tiktok-app-backend
3. Wait 10s for service to be healthy
4. Click "Resume" in n8n UI
```

**Outcome:**
- HTTP node retries (2x max)
- If backend is up → save succeeds, workflow completes
- If backend still down → callback fails, manual investigation needed

---

## 🔍 Debugging Checklist

When a workflow fails, use this checklist:

### Step 1: Identify Failure Point
```
Open n8n → Executions → Click failed execution
Look for RED node (where it failed)
Check node output for error message
```

### Step 2: Check Error Classification
```
ERROR TYPE:
├─ Timeout/Connection → TRANSIENT (retry available)
├─ Invalid Input → PERMANENT (fix input, retry workflow)
├─ API Quota → PERMANENT (refill quota, resume)
├─ Validation Failed → PERMANENT (investigate LLM)
└─ Service Down → TRANSIENT (restart, resume)
```

### Step 3: Check Logs
```
Execution Details tab:
- Check "Prepare Error Log" output
- Look for: error message, contentIdeaId, timestamp
- Trace back: which node actually failed?

Example output:
{
  "status": "FAILED",
  "error": "Timeout after 30s",
  "contentIdeaId": 12345,
  "timestamp": "2026-05-03T14:23:45Z"
}
```

### Step 4: Decide Action
```
IF transient error AND can fix:
  → Fix upstream issue (e.g., restart backend)
  → Click "Resume" button
  → Workflow retries from pause point

ELSE IF permanent error:
  → Investigate root cause
  → Log ticket for developers
  → Mark content as failed
  → Move to next item
```

---

## 🔄 Resume Procedures

### How to Resume a Paused Execution

1. **Open n8n Dashboard**
   - Navigate to: http://localhost:5678
   - Click "Executions" in sidebar

2. **Filter Paused**
   - Click "Filter" button
   - Status = "Paused"
   - Date range = Last 24 hours

3. **Click Execution**
   - Click the paused execution row
   - Should show red/orange "Paused" indicator

4. **Review Error**
   - Look at "Pause For Retry" node output
   - Read the reason for pause
   - Check "Prepare Error Log" for details

5. **Fix Issue (if applicable)**
   - Timeout? → Wait 30s, check network
   - Backend down? → Restart service
   - LLM quota? → Refill API quota
   - Invalid data? → Cannot resume (use Needs Review instead)

6. **Click Resume**
   - Button location: Top-right of execution details
   - Label: "Resume Execution"
   - Will continue from "Pause For Retry" node

7. **Monitor**
   - Watch execution progress
   - Should show green "Success" or red "Failed"
   - If failed again → investigate further

---

## 📊 Common Error Messages & Solutions

### Error: "LLM response JSON invalid"

**Location:** Parse JSON Response node  
**Cause:** Groq returned non-JSON text  
**Solution:**
```
1. Check Groq API quota: groq.com/account
2. Check prompt in HTTP request (is it too long?)
3. Resume execution after fixing
```

### Error: "script too short (< 10 chars)"

**Location:** Validate Output Quality node  
**Cause:** LLM generated short/empty script  
**Solution:**
```
1. Issue: LLM quality degradation
2. Check: temperature setting (current: 0.6)
3. Action: Lower temperature to 0.4 (more consistent)
4. Need to update workflow → Contact DevOps
```

### Error: "Timeout after 30s"

**Location:** HTTP: Call Groq LLM node  
**Cause:** Groq API slow or unreachable  
**Solution:**
```
1. Check Groq status: groq.com/status
2. Check network (ping api.groq.com)
3. Wait for Groq recovery
4. Resume execution
```

### Error: "Connection refused to backend:8080"

**Location:** HTTP: Save to Backend node  
**Cause:** Backend service down  
**Solution:**
```
1. Check service: docker ps | grep backend
2. If not running: docker start tiktok-app-backend
3. Wait for healthcheck: docker logs -f tiktok-app-backend
4. Resume execution
```

### Error: "Input validation failed"

**Location:** Validate Inputs (If) node  
**Cause:** Missing/invalid contentIdeaId, topic, category  
**Solution:**
```
1. Check request payload
2. These are required:
   - contentIdeaId (number > 0)
   - topic (non-empty string)
   - category (non-empty string)
   - workflowRunId (number > 0)
3. Cannot resume (needs fixing at caller level)
4. Escalate to caller team
```

---

## 📋 Daily Operational Tasks

### Morning Check (Start of Shift)

```bash
# 1. Check for paused executions
curl 'http://localhost:5678/api/v1/executions?status=paused&limit=50'

# 2. Check error rate (last 24h)
curl 'http://localhost:5678/api/v1/executions?status=failed&limit=100' | grep -c "FAILED"

# 3. Check for long-running executions
curl 'http://localhost:5678/api/v1/executions?running=true'
```

### When Paused Execution Detected

1. **Notification** → Operator gets alert
2. **Investigation** → Check logs (5-10 min)
3. **Resolution** → Fix issue or mark for review (10-20 min)
4. **Resume** → Click Resume button (1 min)
5. **Monitor** → Watch for completion (5-30 min depending on issue)

### End of Shift Handover

```
Document:
- How many paused executions were resolved?
- Were there any new error patterns?
- Do any require code changes?
- Are there trends (e.g., Groq rate limits)?

Create ticket if:
- Repeated errors of same type
- New error pattern discovered
- Service reliability < 99%
```

---

## 🚨 Escalation Paths

### Tier 1: Operator (You)
- ✅ Resume paused executions
- ✅ Restart backend/n8n services
- ✅ Monitor error patterns
- ✅ Refill API quotas
- ✅ Document issues

### Tier 2: DevOps
- Escalate if:
  - Service won't restart
  - Database connectivity issues
  - Infrastructure problems
  - Need to scale resources

### Tier 3: Engineering
- Escalate if:
  - Logic bugs in workflow
  - Prompt quality issues
  - Need to modify workflow
  - External API integration problems

### Example Escalation Ticket:

```
Title: Script generation failing 10% of time with "output too short"

Description:
- Error location: Validate Output Quality node
- Error message: "Script < 10 chars"
- Frequency: ~100/day out of 1000 requests
- When: Since 2026-05-02 19:00 UTC
- Impact: Content queue backing up

Request:
- Investigate LLM quality degradation
- Consider prompt tuning (temperature, instructions)
- Deploy fix once validated

Logs: /n8n/executions/2026-05-02/script-generation
```

---

## 📞 Contacts & Escalation

```
On-Call DevOps: ops@company.com
Engineering Lead (Workflows): eng-workflows@company.com
LLM Team (Groq issues): llm-support@company.com
Backend Team: backend@company.com

Status Pages:
- Groq: groq.com/status
- Backend: status.internal/backend
- n8n: status.internal/n8n
```

---

## ✅ Success Criteria

You're doing well if:
- ✅ Paused executions are resumed within 30 min
- ✅ Error patterns are tracked (spreadsheet or ticket)
- ✅ No silent failures (all errors are logged)
- ✅ Backend stays healthy (99.5%+ uptime)
- ✅ Groq API quota is monitored
- ✅ Escalations are clear and timely

---

## 🎓 Training Resources

**Internal Wiki:**
- [n8n Architecture](./wiki/n8n-architecture.md)
- [Workflow Runbook](./wiki/runbook.md)

**External:**
- [n8n Docs](https://docs.n8n.io/)
- [Groq API Docs](https://console.groq.com/docs/)

**Hands-On:**
- Practice: Resume 5 paused executions in staging
- Shadow: 2 hours with experienced operator
- On-call rotation: Start with support mode
