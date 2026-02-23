#!/usr/bin/env node
/**
 * Jira API — compact CLI for Cursor AI agents.
 * Default output is compact text (saves tokens). Use --json for structured data.
 *
 * Env: JIRA_DOMAIN, JIRA_EMAIL, JIRA_API_TOKEN
 * Token: https://id.atlassian.com/manage-profile/security/api-tokens
 *
 * Commands:
 *   my                                  Open tasks by priority
 *   sprint                              Current sprint issues
 *   search "JQL"                        Search with JQL
 *   get DPH-123                         Issue detail
 *   batch DPH-1 DPH-2 DPH-3            Multiple issues (1 API call)
 *   subtasks DPH-100                    Children of a story
 *   sync                                Fetch sprint → write sprint.md
 *   create-subtask DPH-123 "Summary"    Create subtask
 *   assign DPH-1 DPH-2 <accountId>     Assign (multi-key)
 *   update DPH-123 '{"field":"val"}'    Update fields
 *   transition DPH-1 DPH-2 "Status"    Change status (multi-key)
 *   comment DPH-123 "text"             Add comment
 *   me                                  Current user
 *
 * Flags: --json (full JSON output), --limit N (result cap), --no-sync (skip auto-invalidate reminder)
 */

import { readFileSync, writeFileSync, existsSync, renameSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function loadEnv() {
  const envPath = join(ROOT, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').replace(/\r/g, '').split('\n')) {
    if (line.trimStart().startsWith('#') || !line.includes('=')) continue;
    const eqIdx = line.indexOf('=');
    const key = line.slice(0, eqIdx).trim();
    const val = line.slice(eqIdx + 1).replace(/^["']|["']$/g, '').trim();
    if (key && !process.env[key]) process.env[key] = val;
  }
}
loadEnv();

const domain = process.env.JIRA_DOMAIN || 'datacomgroup';
const email = process.env.JIRA_EMAIL;
const token = process.env.JIRA_API_TOKEN;
const baseUrl = `https://${domain}.atlassian.net`;
const auth = Buffer.from(`${email}:${token}`).toString('base64');

const argv = process.argv.slice(2);
const jsonMode = argv.includes('--json') || argv.includes('--raw');
const noSync = argv.includes('--no-sync');
const limitIdx = Math.max(argv.indexOf('--limit'), argv.indexOf('-n'));
const limitVal = limitIdx !== -1 ? parseInt(argv[limitIdx + 1], 10) : null;
const FLAGS = new Set(['--json', '--raw', '--limit', '-n', '--no-sync']);
const cleanArgs = argv.filter((a, i) => !FLAGS.has(a) && (limitIdx === -1 || i !== limitIdx + 1));

if (limitVal !== null && (!Number.isInteger(limitVal) || limitVal <= 0)) {
  console.error('Invalid --limit value: must be a positive integer.');
  process.exit(1);
}

// --- Input validation ---

const ISSUE_KEY_RE = /^[A-Z][A-Z0-9]+-\d+$/;
function validateKey(key, label = 'issue key') {
  if (!key || !ISSUE_KEY_RE.test(key.toUpperCase())) {
    console.error(`Invalid ${label}: ${key || '(empty)'}`);
    process.exit(1);
  }
  return key.toUpperCase();
}

// --- HTTP helper with retry ---

async function request(path, options = {}, retries = 2) {
  const url = path.startsWith('http') ? path : `${baseUrl}${path}`;
  for (let attempt = 0; attempt <= retries; attempt++) {
    let res;
    try {
      res = await fetch(url, {
        ...options,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`,
          ...options.headers,
        },
      });
    } catch (err) {
      if (attempt === retries) {
        const code = err.cause?.code || '';
        throw new Error(
          `Network error${code ? ` (${code})` : ''} — check your connection and JIRA_DOMAIN (${domain}).`,
        );
      }
      await new Promise(r => setTimeout(r, Math.min(1000 * 2 ** attempt, 10000)));
      continue;
    }

    if (res.ok || attempt === retries) return res;

    if (res.status === 429 || res.status >= 500) {
      const retryAfter = res.headers.get('retry-after');
      const delayMs = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : Math.min(1000 * 2 ** attempt, 10000);
      await new Promise(r => setTimeout(r, delayMs));
      continue;
    }

    return res;
  }
}

// --- Structured API error helper ---

async function throwApiError(res, context = '') {
  let body;
  try {
    body = await res.json();
  } catch {
    body = await res.text().catch(() => 'no response body');
  }
  const jiraMsg =
    body?.errorMessages?.join('; ') ||
    body?.message ||
    (typeof body === 'string' ? body.slice(0, 200) : '');
  const prefix = context ? `${context}: ` : '';
  const hint =
    res.status === 401
      ? ' — regenerate token at https://id.atlassian.com/manage-profile/security/api-tokens'
      : '';
  throw new Error(
    `${prefix}HTTP ${res.status}${jiraMsg ? ' — ' + jiraMsg : ''}${hint}`,
  );
}

// --- JSON slim (strips Jira noise for --json mode) ---

const NOISE = new Set([
  'avatarUrls', 'self', 'iconUrl', 'expand', 'renderedFields',
  'statusCategory', 'hierarchyLevel', 'entityId',
]);

function slim(obj, stripDescription = false) {
  if (Array.isArray(obj)) return obj.map(v => slim(v, stripDescription));
  if (obj && typeof obj === 'object') {
    const o = {};
    for (const [k, v] of Object.entries(obj)) {
      if (NOISE.has(k)) continue;
      if (stripDescription && k === 'description') continue;
      if (k === 'assignee' && v && typeof v === 'object') {
        o[k] = v.displayName || v.accountId || null;
        continue;
      }
      if (k === 'status' && v && typeof v === 'object') {
        o[k] = v.name || v;
        continue;
      }
      if (k === 'priority' && v && typeof v === 'object') {
        o[k] = v.name || v;
        continue;
      }
      if (k === 'issuetype' && v && typeof v === 'object') {
        o[k] = v.name || v;
        continue;
      }
      o[k] = slim(v, stripDescription);
    }
    return o;
  }
  return obj;
}

// --- File helpers ---

function atomicWrite(filePath, content) {
  const tmp = `${filePath}.tmp.${process.pid}`;
  writeFileSync(tmp, content);
  renameSync(tmp, filePath);
}

function invalidateCache() {
  const metaPath = join(ROOT, '.sprint-meta.json');
  if (!existsSync(metaPath)) return;
  try {
    const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
    meta.valid = false;
    meta.invalidatedAt = Date.now();
    writeFileSync(metaPath, JSON.stringify(meta));
  } catch { /* cache meta missing or corrupt — safe to ignore */ }
}

// --- Concurrency helper ---

async function parallel(items, fn, concurrency = 5) {
  const results = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    results.push(...await Promise.allSettled(batch.map(fn)));
  }
  return results;
}

// --- Compact text formatters ---

function relTime(d) {
  if (!d) return '';
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
  const w = Math.floor(days / 7);
  return `${w}w`;
}

function col(s, n) { return (s || '').slice(0, n).padEnd(n); }

function extractText(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node.text) return node.text;
  if (node.content) return node.content.map(extractText).join(node.type === 'doc' ? '\n' : '');
  return '';
}

function compactList(data, title) {
  const issues = data.issues || [];
  if (!issues.length) return 'No issues found.';
  const total = data.total > issues.length ? ` of ${data.total}` : '';
  const lines = [`${title || 'Results'} — ${issues.length}${total} issues`, ''];
  lines.push(`${col('KEY', 11)}${col('STATUS', 18)}${col('PRIORITY', 13)}${col('AGE', 5)}SUMMARY`);
  for (const i of issues) {
    const f = i.fields || {};
    lines.push(
      `${col(i.key, 11)}${col(f.status?.name || '', 18)}${col(f.priority?.name || '', 13)}${col(relTime(f.updated), 5)}${f.summary || ''}`
    );
  }
  return lines.join('\n');
}

function compactDetail(issue) {
  const f = issue.fields || {};
  const lines = [];
  lines.push(`${issue.key} — ${f.summary || ''}`);
  lines.push(`Status: ${f.status?.name || '?'}  |  Priority: ${f.priority?.name || '?'}  |  Type: ${f.issuetype?.name || '?'}`);
  const sprint = f.customfield_10106;
  if (sprint) lines.push(`Sprint: ${typeof sprint === 'object' ? sprint.name : sprint}`);
  if (f.parent) lines.push(`Parent: ${f.parent.key}${f.parent.fields?.summary ? ' — ' + f.parent.fields.summary : ''}`);
  lines.push(`Assignee: ${f.assignee?.displayName || 'Unassigned'}`);
  lines.push(`Updated: ${relTime(f.updated)} (${f.updated || '?'})`);
  if (f.labels?.length) lines.push(`Labels: ${f.labels.join(', ')}`);
  if (f.components?.length) lines.push(`Components: ${f.components.map(c => c.name).join(', ')}`);
  if (f.fixVersions?.length) lines.push(`Fix versions: ${f.fixVersions.map(v => v.name).join(', ')}`);
  const desc = extractText(f.description);
  if (desc.trim()) {
    lines.push('');
    lines.push(desc.trim().slice(0, 600));
  }
  if (f.subtasks?.length) {
    lines.push('');
    lines.push(`Subtasks (${f.subtasks.length}):`);
    for (const st of f.subtasks) {
      const sf = st.fields || {};
      lines.push(`  ${col(st.key, 11)}${col(sf.status?.name || '', 18)}${sf.summary || ''}`);
    }
  }
  return lines.join('\n');
}

function compactUser(user) {
  return [
    `${user.displayName} <${user.emailAddress || ''}>`,
    `Account: ${user.accountId}`,
    `Active: ${user.active}`,
  ].join('\n');
}

// --- Main ---

async function main() {
  if (!email || !token) {
    console.error('Set JIRA_EMAIL and JIRA_API_TOKEN in .env or environment.');
    console.error('Token: https://id.atlassian.com/manage-profile/security/api-tokens');
    process.exit(1);
  }

  const [cmd, ...args] = cleanArgs;
  if (!cmd) {
    console.log(
      'Usage: node scripts/jira-api.mjs <command> [args] [--json] [--limit N] [--no-sync]\n' +
      '\nRead:   my | sprint | search | get | batch | subtasks | me' +
      '\nWrite:  assign | update | transition | comment | create-subtask' +
      '\nCache:  sync'
    );
    process.exit(0);
  }

  try {
    // ────────── READ COMMANDS ──────────

    if (cmd === 'me') {
      const res = await request('/rest/api/3/myself');
      if (!res.ok) await throwApiError(res, 'me');
      const user = await res.json();
      console.log(jsonMode ? JSON.stringify(slim(user), null, 2) : compactUser(user));
      return;
    }

    if (cmd === 'my') {
      const limit = limitVal || 20;
      const jql = args[0] || 'assignee = currentUser() AND statusCategory != Done ORDER BY priority ASC, updated DESC';
      const res = await request('/rest/api/3/search/jql', {
        method: 'POST',
        body: JSON.stringify({ jql, maxResults: limit, fields: ['summary', 'status', 'priority', 'updated'] }),
      });
      if (!res.ok) await throwApiError(res, 'my');
      const data = await res.json();
      console.log(jsonMode ? JSON.stringify(slim(data, true), null, 2) : compactList(data, 'My Tasks'));
      return;
    }

    if (cmd === 'sprint') {
      const limit = limitVal || 30;
      const jql = args[0] || 'sprint in openSprints() AND project = DPH ORDER BY priority ASC, status ASC, key ASC';
      const res = await request('/rest/api/3/search/jql', {
        method: 'POST',
        body: JSON.stringify({ jql, maxResults: limit, fields: ['summary', 'status', 'priority', 'assignee', 'updated', 'customfield_10106'] }),
      });
      if (!res.ok) await throwApiError(res, 'sprint');
      const data = await res.json();
      console.log(jsonMode ? JSON.stringify(slim(data, true), null, 2) : compactList(data, 'Sprint'));
      return;
    }

    if (cmd === 'search') {
      const jql = args[0] || 'order by updated DESC';
      const limit = limitVal || 20;
      const res = await request('/rest/api/3/search/jql', {
        method: 'POST',
        body: JSON.stringify({ jql, maxResults: limit, fields: ['summary', 'status', 'priority', 'assignee', 'updated'] }),
      });
      if (!res.ok) await throwApiError(res, 'search');
      const data = await res.json();
      console.log(jsonMode ? JSON.stringify(slim(data, true), null, 2) : compactList(data, 'Search'));
      return;
    }

    if (cmd === 'get') {
      if (!args[0]) { console.error('Usage: get <issue-key>'); process.exit(1); }
      const key = validateKey(args[0]);
      const qf = jsonMode
        ? ''
        : '?fields=summary,status,assignee,priority,description,issuetype,parent,subtasks,updated,labels,components,fixVersions,customfield_10106';
      const res = await request(`/rest/api/3/issue/${key}${qf}`);
      if (!res.ok) await throwApiError(res, `get ${key}`);
      const issue = await res.json();
      console.log(jsonMode ? JSON.stringify(slim(issue), null, 2) : compactDetail(issue));
      return;
    }

    if (cmd === 'batch') {
      const keys = args.filter(a => ISSUE_KEY_RE.test(a.toUpperCase())).map(k => k.toUpperCase());
      if (!keys.length) { console.error('Usage: batch KEY-1 KEY-2 ...'); process.exit(1); }
      const jql = `key in (${keys.join(',')}) ORDER BY key ASC`;
      const res = await request('/rest/api/3/search/jql', {
        method: 'POST',
        body: JSON.stringify({ jql, maxResults: keys.length, fields: ['summary', 'status', 'assignee', 'priority', 'issuetype', 'parent', 'updated'] }),
      });
      if (!res.ok) await throwApiError(res, 'batch');
      const data = await res.json();
      console.log(jsonMode ? JSON.stringify(slim(data, true), null, 2) : compactList(data, 'Batch'));
      return;
    }

    if (cmd === 'subtasks') {
      if (!args[0]) { console.error('Usage: subtasks <parent-key>'); process.exit(1); }
      const parentKey = validateKey(args[0]);
      const jql = `parent = ${parentKey} ORDER BY status ASC, key ASC`;
      const res = await request('/rest/api/3/search/jql', {
        method: 'POST',
        body: JSON.stringify({ jql, maxResults: 50, fields: ['summary', 'status', 'assignee', 'priority', 'updated'] }),
      });
      if (!res.ok) await throwApiError(res, `subtasks ${parentKey}`);
      const data = await res.json();
      console.log(jsonMode ? JSON.stringify(slim(data, true), null, 2) : compactList(data, `Subtasks of ${parentKey}`));
      return;
    }

    // ────────── SYNC (sprint.md cache) ──────────

    if (cmd === 'sync') {
      const jql = args[0] || 'sprint in openSprints() AND project = DPH ORDER BY priority ASC, status ASC, key ASC';
      const res = await request('/rest/api/3/search/jql', {
        method: 'POST',
        body: JSON.stringify({
          jql,
          maxResults: 80,
          fields: ['summary', 'status', 'priority', 'issuetype', 'assignee', 'parent', 'updated', 'customfield_10106', 'labels'],
        }),
      });
      if (!res.ok) await throwApiError(res, 'sync');
      const data = await res.json();
      const issues = data.issues || [];

      if (data.total > issues.length) {
        console.error(`Warning: sprint has ${data.total} issues but only ${issues.length} were fetched. Use --limit or paginate.`);
      }

      const sprintName = issues[0]?.fields?.customfield_10106?.name || 'Current Sprint';
      const now = new Date();
      const ts = now.toISOString().replace('T', ' ').slice(0, 16);

      const groups = {};
      for (const issue of issues) {
        const status = issue.fields?.status?.name || 'Unknown';
        (groups[status] ??= []).push(issue);
      }

      const statusOrder = ['In Progress', 'Ready for Review', 'To Do', 'Done'];
      const sortedStatuses = Object.keys(groups).sort((a, b) => {
        const ai = statusOrder.indexOf(a);
        const bi = statusOrder.indexOf(b);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      });

      const md = [
        `# ${sprintName}`,
        `> Last synced: ${ts}`,
        '',
      ];

      for (const status of sortedStatuses) {
        const grp = groups[status];
        md.push(`## ${status} (${grp.length})`);
        md.push('');
        md.push(`| Key | Priority | Assignee | Summary |`);
        md.push(`|-----|----------|----------|---------|`);
        for (const i of grp) {
          const f = i.fields || {};
          const pri = f.priority?.name || '';
          const who = f.assignee?.displayName || 'Unassigned';
          const parent = f.parent ? ` ^${f.parent.key}` : '';
          md.push(`| ${i.key} | ${pri} | ${who} | ${f.summary || ''}${parent} |`);
        }
        md.push('');
      }

      atomicWrite(join(ROOT, 'sprint.md'), md.join('\n'));

      writeFileSync(join(ROOT, '.sprint-meta.json'), JSON.stringify({
        syncedAt: Date.now(),
        syncedAtISO: now.toISOString(),
        ttlMs: 14400000,
        issueCount: issues.length,
        sprintName,
        valid: true,
      }));

      console.log(`sprint.md updated — ${issues.length} issues, ${sortedStatuses.length} statuses.`);
      return;
    }

    // ────────── WRITE COMMANDS ──────────

    if (cmd === 'create-subtask') {
      if (!args[0] || !args[1]) { console.error('Usage: create-subtask <parent-key> <summary> [accountId]'); process.exit(1); }
      const parentKey = validateKey(args[0]);
      const summary = args[1];
      const accountId = args[2];
      const parentRes = await request(`/rest/api/3/issue/${parentKey}?fields=project`);
      if (!parentRes.ok) await throwApiError(parentRes, `create-subtask ${parentKey}`);
      const projectKey = (await parentRes.json()).fields.project.key;
      const fields = { project: { key: projectKey }, parent: { key: parentKey }, summary, issuetype: { name: 'Subtask' } };
      if (accountId) fields.assignee = { accountId };
      const res = await request('/rest/api/3/issue', { method: 'POST', body: JSON.stringify({ fields }) });
      if (!res.ok) await throwApiError(res, 'create-subtask');
      const created = await res.json();
      console.log(`Created ${created.key} under ${parentKey}.`);
      invalidateCache();
      return;
    }

    if (cmd === 'assign') {
      if (args.length < 2) { console.error('Usage: assign <key> [key...] <accountId>'); process.exit(1); }
      const accountId = args.at(-1);
      const keys = args.slice(0, -1).map(k => validateKey(k));
      const results = await parallel(keys, async (key) => {
        const res = await request(`/rest/api/3/issue/${key}/assignee`, {
          method: 'PUT',
          body: JSON.stringify({ accountId }),
        });
        if (!res.ok) throw new Error(`${key}: FAIL ${res.status}`);
        return key;
      });
      let failed = 0;
      for (const r of results) {
        if (r.status === 'fulfilled') {
          console.log(`${r.value}: Assigned`);
        } else {
          console.error(r.reason.message);
          failed++;
        }
      }
      if (failed) process.exitCode = 1;
      invalidateCache();
      return;
    }

    if (cmd === 'update') {
      if (!args[0] || !args[1]) { console.error('Usage: update <key> \'{"field":"value"}\''); process.exit(1); }
      const key = validateKey(args[0]);
      const fieldsJson = args[1];
      let parsedFields;
      try {
        parsedFields = JSON.parse(fieldsJson);
      } catch {
        console.error(`Invalid JSON: ${fieldsJson.slice(0, 100)}`);
        process.exit(1);
      }
      const res = await request(`/rest/api/3/issue/${key}`, {
        method: 'PUT',
        body: JSON.stringify({ fields: parsedFields }),
      });
      if (!res.ok) await throwApiError(res, `update ${key}`);
      console.log(`Updated ${key}.`);
      invalidateCache();
      return;
    }

    if (cmd === 'transition') {
      if (args.length < 2) { console.error('Usage: transition <key> [key...] <status>'); process.exit(1); }
      const targetStatus = args.at(-1);
      const keys = args.slice(0, -1).map(k => validateKey(k));
      const results = await parallel(keys, async (key) => {
        const tRes = await request(`/rest/api/3/issue/${key}/transitions`);
        if (!tRes.ok) throw new Error(`${key}: FAIL ${tRes.status}`);
        const { transitions } = await tRes.json();
        const match = transitions.find(t => t.name.toLowerCase() === targetStatus.toLowerCase());
        if (!match) {
          throw new Error(
            `${key}: No "${targetStatus}" transition. Available: ${transitions.map(t => t.name).join(', ')}`,
          );
        }
        const res = await request(`/rest/api/3/issue/${key}/transitions`, {
          method: 'POST',
          body: JSON.stringify({ transition: { id: match.id } }),
        });
        if (!res.ok) throw new Error(`${key}: FAIL ${res.status}`);
        return { key, name: match.name };
      });
      let failed = 0;
      for (const r of results) {
        if (r.status === 'fulfilled') {
          console.log(`${r.value.key}: → ${r.value.name}`);
        } else {
          console.error(r.reason.message);
          failed++;
        }
      }
      if (failed) process.exitCode = 1;
      invalidateCache();
      return;
    }

    if (cmd === 'comment') {
      if (!args[0] || !args[1]) { console.error('Usage: comment <key> "text"'); process.exit(1); }
      const key = validateKey(args[0]);
      const text = args[1];
      const body = { body: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] } };
      const res = await request(`/rest/api/3/issue/${key}/comment`, { method: 'POST', body: JSON.stringify(body) });
      if (!res.ok) await throwApiError(res, `comment ${key}`);
      console.log(`Comment added to ${key}.`);
      invalidateCache();
      return;
    }

    console.error(`Unknown command: ${cmd}`);
    process.exit(1);
  } catch (e) {
    console.error(e.message || e);
    process.exitCode = 1;
  }
}

main();
