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
 * Flags: --json (full JSON output), --limit N (result cap)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function loadEnv() {
  if (process.env.JIRA_API_TOKEN) return;
  const envPath = join(ROOT, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_]\w*)\s*=\s*(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
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
const limitIdx = Math.max(argv.indexOf('--limit'), argv.indexOf('-n'));
const limitVal = limitIdx !== -1 ? parseInt(argv[limitIdx + 1], 10) : null;
const FLAGS = new Set(['--json', '--raw', '--limit', '-n']);
const cleanArgs = argv.filter((a, i) => !FLAGS.has(a) && (limitIdx === -1 || i !== limitIdx + 1));

// --- HTTP helper ---

function request(path, options = {}) {
  const url = path.startsWith('http') ? path : `${baseUrl}${path}`;
  return fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
      ...options.headers,
    },
  });
}

// --- JSON slim (strips Jira noise for --json mode) ---

const NOISE = new Set([
  'avatarUrls', 'self', 'iconUrl', 'expand', 'renderedFields',
  'statusCategory', 'hierarchyLevel', 'entityId', 'description',
]);

function slim(obj, depth = 0) {
  if (Array.isArray(obj)) return obj.map(v => slim(v, depth));
  if (obj && typeof obj === 'object') {
    const o = {};
    for (const [k, v] of Object.entries(obj)) {
      if (NOISE.has(k)) continue;
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
      o[k] = slim(v, depth + 1);
    }
    return o;
  }
  return obj;
}

function outJson(data) {
  console.log(JSON.stringify(slim(data), null, 2));
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
      'Usage: node scripts/jira-api.mjs <command> [args] [--json] [--limit N]\n' +
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
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
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
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      const data = await res.json();
      console.log(jsonMode ? JSON.stringify(slim(data), null, 2) : compactList(data, 'My Tasks'));
      return;
    }

    if (cmd === 'sprint') {
      const limit = limitVal || 30;
      const jql = args[0] || 'sprint in openSprints() AND project = DPH ORDER BY priority ASC, status ASC, key ASC';
      const res = await request('/rest/api/3/search/jql', {
        method: 'POST',
        body: JSON.stringify({ jql, maxResults: limit, fields: ['summary', 'status', 'priority', 'assignee', 'updated', 'customfield_10106'] }),
      });
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      const data = await res.json();
      console.log(jsonMode ? JSON.stringify(slim(data), null, 2) : compactList(data, 'Sprint'));
      return;
    }

    if (cmd === 'search') {
      const jql = args[0] || 'order by updated DESC';
      const limit = limitVal || 20;
      const res = await request('/rest/api/3/search/jql', {
        method: 'POST',
        body: JSON.stringify({ jql, maxResults: limit, fields: ['summary', 'status', 'priority', 'assignee', 'updated'] }),
      });
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      const data = await res.json();
      console.log(jsonMode ? JSON.stringify(slim(data), null, 2) : compactList(data, 'Search'));
      return;
    }

    if (cmd === 'get') {
      const key = args[0];
      if (!key) { console.error('Usage: get <issue-key>'); process.exit(1); }
      const qf = jsonMode
        ? ''
        : '?fields=summary,status,assignee,priority,description,issuetype,parent,subtasks,updated,labels,components,fixVersions,customfield_10106';
      const res = await request(`/rest/api/3/issue/${key}${qf}`);
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      const issue = await res.json();
      console.log(jsonMode ? JSON.stringify(slim(issue), null, 2) : compactDetail(issue));
      return;
    }

    if (cmd === 'batch') {
      const keys = args.filter(a => /^[A-Z]+-\d+$/i.test(a));
      if (!keys.length) { console.error('Usage: batch KEY-1 KEY-2 ...'); process.exit(1); }
      const jql = `key in (${keys.join(',')}) ORDER BY key ASC`;
      const res = await request('/rest/api/3/search/jql', {
        method: 'POST',
        body: JSON.stringify({ jql, maxResults: keys.length, fields: ['summary', 'status', 'assignee', 'priority', 'issuetype', 'parent', 'updated'] }),
      });
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      const data = await res.json();
      console.log(jsonMode ? JSON.stringify(slim(data), null, 2) : compactList(data, 'Batch'));
      return;
    }

    if (cmd === 'subtasks') {
      const parentKey = args[0];
      if (!parentKey) { console.error('Usage: subtasks <parent-key>'); process.exit(1); }
      const jql = `parent = ${parentKey} ORDER BY status ASC, key ASC`;
      const res = await request('/rest/api/3/search/jql', {
        method: 'POST',
        body: JSON.stringify({ jql, maxResults: 50, fields: ['summary', 'status', 'assignee', 'priority', 'updated'] }),
      });
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      const data = await res.json();
      console.log(jsonMode ? JSON.stringify(slim(data), null, 2) : compactList(data, `Subtasks of ${parentKey}`));
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
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      const data = await res.json();
      const issues = data.issues || [];

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

      const sprintPath = join(ROOT, 'sprint.md');
      writeFileSync(sprintPath, md.join('\n'));
      console.log(`sprint.md updated — ${issues.length} issues, ${sortedStatuses.length} statuses.`);
      return;
    }

    // ────────── WRITE COMMANDS ──────────

    if (cmd === 'create-subtask') {
      const [parentKey, summary, accountId] = args;
      if (!parentKey || !summary) { console.error('Usage: create-subtask <parent-key> <summary> [accountId]'); process.exit(1); }
      const parentRes = await request(`/rest/api/3/issue/${parentKey}?fields=project`);
      if (!parentRes.ok) throw new Error(`${parentRes.status} ${await parentRes.text()}`);
      const projectKey = (await parentRes.json()).fields.project.key;
      const fields = { project: { key: projectKey }, parent: { key: parentKey }, summary, issuetype: { name: 'Subtask' } };
      if (accountId) fields.assignee = { accountId };
      const res = await request('/rest/api/3/issue', { method: 'POST', body: JSON.stringify({ fields }) });
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      const created = await res.json();
      console.log(`Created ${created.key} under ${parentKey}.`);
      return;
    }

    if (cmd === 'assign') {
      if (args.length < 2) { console.error('Usage: assign <key> [key...] <accountId>'); process.exit(1); }
      const accountId = args.at(-1);
      const keys = args.slice(0, -1);
      let failed = 0;
      for (const key of keys) {
        const res = await request(`/rest/api/3/issue/${key}/assignee`, { method: 'PUT', body: JSON.stringify({ accountId }) });
        if (!res.ok) { console.error(`${key}: FAIL ${res.status}`); failed++; } else { console.log(`${key}: Assigned`); }
      }
      if (failed) process.exitCode = 1;
      return;
    }

    if (cmd === 'update') {
      const [key, fieldsJson] = args;
      if (!key || !fieldsJson) { console.error('Usage: update <key> \'{"field":"value"}\''); process.exit(1); }
      const res = await request(`/rest/api/3/issue/${key}`, { method: 'PUT', body: JSON.stringify({ fields: JSON.parse(fieldsJson) }) });
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      console.log(`Updated ${key}.`);
      return;
    }

    if (cmd === 'transition') {
      if (args.length < 2) { console.error('Usage: transition <key> [key...] <status>'); process.exit(1); }
      const targetStatus = args.at(-1);
      const keys = args.slice(0, -1);
      let failed = 0;
      for (const key of keys) {
        const tRes = await request(`/rest/api/3/issue/${key}/transitions`);
        if (!tRes.ok) { console.error(`${key}: FAIL ${tRes.status}`); failed++; continue; }
        const { transitions } = await tRes.json();
        const match = transitions.find(t => t.name.toLowerCase() === targetStatus.toLowerCase());
        if (!match) {
          console.error(`${key}: No "${targetStatus}" transition. Available: ${transitions.map(t => t.name).join(', ')}`);
          failed++; continue;
        }
        const res = await request(`/rest/api/3/issue/${key}/transitions`, { method: 'POST', body: JSON.stringify({ transition: { id: match.id } }) });
        if (!res.ok) { console.error(`${key}: FAIL ${res.status}`); failed++; } else { console.log(`${key}: → ${match.name}`); }
      }
      if (failed) process.exitCode = 1;
      return;
    }

    if (cmd === 'comment') {
      const [key, text] = args;
      if (!key || !text) { console.error('Usage: comment <key> "text"'); process.exit(1); }
      const body = { body: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] } };
      const res = await request(`/rest/api/3/issue/${key}/comment`, { method: 'POST', body: JSON.stringify(body) });
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      console.log(`Comment added to ${key}.`);
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
