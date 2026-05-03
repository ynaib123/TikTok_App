const fs = require('fs');
const path = require('path');
const sqlite3 = require('/usr/local/lib/node_modules/n8n/node_modules/sqlite3');
const crypto = require('crypto');
const workflowId = 'ql0Tg97q1cZ12aee';
const file = path.resolve('/workspace/n8n-local/init-live.json');
const workflow = JSON.parse(fs.readFileSync(file, 'utf8'));
const versionId = crypto.randomUUID();
const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 23);
const db = new sqlite3.Database('/workspace/n8n-local/database.sqlite');
function run(sql, params = []) { return new Promise((resolve, reject) => db.run(sql, params, function(err){ if (err) reject(err); else resolve(this); })); }
function get(sql, params = []) { return new Promise((resolve, reject) => db.get(sql, params, (err,row)=> err ? reject(err) : resolve(row))); }
(async () => {
  const entity = await get("SELECT versionCounter, meta, pinData, staticData, settings, active, isArchived, description FROM workflow_entity WHERE id = ?", [workflowId]);
  if (!entity) throw new Error('workflow not found');
  const latest = await get("SELECT authors FROM workflow_history WHERE workflowId = ? ORDER BY createdAt DESC LIMIT 1", [workflowId]);
  const authors = latest?.authors || 'codex';
  await run('BEGIN TRANSACTION');
  await run("INSERT INTO workflow_history (versionId, workflowId, authors, createdAt, updatedAt, nodes, connections, name, autosaved, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
    versionId,
    workflowId,
    authors,
    now,
    now,
    JSON.stringify(workflow.nodes),
    JSON.stringify(workflow.connections),
    workflow.name,
    0,
    null
  ]);
  await run("UPDATE workflow_entity SET nodes = ?, connections = ?, settings = ?, staticData = ?, pinData = ?, versionId = ?, activeVersionId = ?, versionCounter = ?, updatedAt = ? WHERE id = ?", [
    JSON.stringify(workflow.nodes),
    JSON.stringify(workflow.connections),
    JSON.stringify(workflow.settings || { executionOrder: 'v1', binaryMode: 'separate' }),
    JSON.stringify({}),
    JSON.stringify(workflow.pinData || {}),
    versionId,
    versionId,
    Number(entity.versionCounter || 1) + 1,
    now,
    workflowId
  ]);
  await run('COMMIT');
  console.log(JSON.stringify({ workflowId, versionId, updatedAt: now }, null, 2));
})().catch(async (err) => {
  try { await run('ROLLBACK'); } catch {}
  console.error(err);
  process.exit(1);
}).finally(() => db.close());
