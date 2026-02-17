#!/usr/bin/env node
/**
 * Jira API script — view/update Jira work and current user (no MCP).
 * Uses Atlassian API token (email + token). No site-admin app approval needed.
 *
 * Env: JIRA_DOMAIN (e.g. datacomgroup), JIRA_EMAIL, JIRA_API_TOKEN
 * Create token: https://id.atlassian.com/manage-profile/security/api-tokens
 *
 * Usage:
 *   node scripts/jira-api.mjs me
 *   node scripts/jira-api.mjs search "project = DEMO"
 *   node scripts/jira-api.mjs get DEMO-123
 *   node scripts/jira-api.mjs assign DEMO-123 <accountId>
 *   node scripts/jira-api.mjs update DEMO-123 '{"summary":"New title","priority":{"name":"High (P2)"}}'
 *   node scripts/jira-api.mjs transition DEMO-123 "In Progress"
 *   node scripts/jira-api.mjs comment DEMO-123 "This is a comment"
 */

import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Load .env from project root if JIRA credentials not already set
function loadEnv() {
  if (process.env.JIRA_API_TOKEN) return;
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const root = join(__dirname, '..');
  const envPath = join(root, '.env');
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
}
loadEnv();

const domain = process.env.JIRA_DOMAIN || 'datacomgroup';
const email = process.env.JIRA_EMAIL;
const token = process.env.JIRA_API_TOKEN;

const baseUrl = `https://${domain}.atlassian.net`;
const auth = Buffer.from(`${email}:${token}`).toString('base64');

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

async function main() {
  if (!email || !token) {
    console.error('JIRA_EMAIL and JIRA_API_TOKEN are not set.');
    console.error('Either create a .env file in the project root (copy from .env.example) and add your values,');
    console.error('or set them in the terminal: export JIRA_EMAIL=... JIRA_API_TOKEN=...');
    console.error('Create a token: https://id.atlassian.com/manage-profile/security/api-tokens');
    process.exit(1);
  }

  const [cmd, ...args] = process.argv.slice(2);
  if (!cmd) {
    console.log('Usage: node scripts/jira-api.mjs <me|search|get|create-subtask|assign|update|transition|comment> [args...]');
    process.exit(1);
  }

  try {
    if (cmd === 'me') {
      const res = await request('/rest/api/3/myself');
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      const user = await res.json();
      console.log(JSON.stringify(user, null, 2));
      return;
    }

    if (cmd === 'search') {
      const jql = args[0] || 'order by updated DESC';
      const res = await request('/rest/api/3/search/jql', {
        method: 'POST',
        body: JSON.stringify({ jql, maxResults: 50, fields: ['summary', 'status', 'assignee', 'updated'] }),
      });
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      const data = await res.json();
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    if (cmd === 'get') {
      const key = args[0];
      if (!key) {
        console.error('Usage: node scripts/jira-api.mjs get <issue-key>');
        process.exit(1);
      }
      const res = await request(`/rest/api/3/issue/${key}`);
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      const issue = await res.json();
      console.log(JSON.stringify(issue, null, 2));
      return;
    }

    if (cmd === 'create-subtask') {
      const [parentKey, summary, accountId] = args;
      if (!parentKey || !summary) {
        console.error('Usage: node scripts/jira-api.mjs create-subtask <parent-key> <summary> [accountId]');
        process.exit(1);
      }
      const parentRes = await request(`/rest/api/3/issue/${parentKey}?fields=project`);
      if (!parentRes.ok) throw new Error(`${parentRes.status} ${await parentRes.text()}`);
      const parentIssue = await parentRes.json();
      const projectKey = parentIssue.fields.project.key;

      const fields = {
        project: { key: projectKey },
        parent: { key: parentKey },
        summary,
        issuetype: { name: 'Subtask' },
      };
      if (accountId) fields.assignee = { accountId };

      const res = await request('/rest/api/3/issue', {
        method: 'POST',
        body: JSON.stringify({ fields }),
      });
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      const created = await res.json();
      console.log(JSON.stringify(created, null, 2));
      return;
    }

    if (cmd === 'assign') {
      const [key, accountId] = args;
      if (!key || !accountId) {
        console.error('Usage: node scripts/jira-api.mjs assign <issue-key> <accountId>');
        process.exit(1);
      }
      const res = await request(`/rest/api/3/issue/${key}/assignee`, {
        method: 'PUT',
        body: JSON.stringify({ accountId }),
      });
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      console.log('Assigned.');
      return;
    }

    if (cmd === 'update') {
      const [key, fieldsJson] = args;
      if (!key || !fieldsJson) {
        console.error('Usage: node scripts/jira-api.mjs update <issue-key> \'{"summary":"...","priority":{"name":"..."}}\'');
        console.error('Supported fields: summary, description, priority, labels, and any editable field.');
        process.exit(1);
      }
      const fields = JSON.parse(fieldsJson);
      const res = await request(`/rest/api/3/issue/${key}`, {
        method: 'PUT',
        body: JSON.stringify({ fields }),
      });
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      console.log(`Updated ${key}.`);
      return;
    }

    if (cmd === 'transition') {
      const [key, targetStatus] = args;
      if (!key || !targetStatus) {
        console.error('Usage: node scripts/jira-api.mjs transition <issue-key> <status-name>');
        console.error('e.g. node scripts/jira-api.mjs transition DPH-123 "In Progress"');
        process.exit(1);
      }
      const tRes = await request(`/rest/api/3/issue/${key}/transitions`);
      if (!tRes.ok) throw new Error(`${tRes.status} ${await tRes.text()}`);
      const { transitions } = await tRes.json();
      const match = transitions.find(t => t.name.toLowerCase() === targetStatus.toLowerCase());
      if (!match) {
        const available = transitions.map(t => t.name).join(', ');
        throw new Error(`No transition to "${targetStatus}". Available: ${available}`);
      }
      const res = await request(`/rest/api/3/issue/${key}/transitions`, {
        method: 'POST',
        body: JSON.stringify({ transition: { id: match.id } }),
      });
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      console.log(`Transitioned ${key} to "${match.name}".`);
      return;
    }

    if (cmd === 'comment') {
      const [key, text] = args;
      if (!key || !text) {
        console.error('Usage: node scripts/jira-api.mjs comment <issue-key> "comment text"');
        process.exit(1);
      }
      const body = {
        body: {
          type: 'doc',
          version: 1,
          content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
        },
      };
      const res = await request(`/rest/api/3/issue/${key}/comment`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      const created = await res.json();
      console.log(`Comment added (id: ${created.id}).`);
      return;
    }

    console.error('Unknown command:', cmd);
    process.exit(1);
  } catch (e) {
    console.error(e.message || e);
    process.exit(1);
  }
}

main();
