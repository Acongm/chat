import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, '.acongm-ui.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const registry = manifest.registry ?? 'Acongm/shadcn-ui';
const ref = manifest.ref ?? 'main';
const entries = Array.isArray(manifest.items) ? manifest.items : [];
const errors = [];

function gitBlobSha(buffer) {
  const header = Buffer.from(`blob ${buffer.length}\0`);
  return crypto.createHash('sha1').update(header).update(buffer).digest('hex');
}

async function loadRegistryTree() {
  const url = `https://api.github.com/repos/${registry}/git/trees/${encodeURIComponent(ref)}?recursive=1`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'acongm-ui-drift-check',
    },
  });
  if (!response.ok) {
    throw new Error(`failed to read ${registry}#${ref}: ${response.status} ${response.statusText}`);
  }
  const payload = await response.json();
  if (payload.truncated) {
    throw new Error(`${registry} tree response was truncated`);
  }
  return new Map((payload.tree ?? []).filter((item) => item.type === 'blob').map((item) => [item.path, item.sha]));
}

if (entries.length === 0) {
  console.error('.acongm-ui.json must declare at least one managed item');
  process.exit(1);
}

const registryTree = await loadRegistryTree();
const seenLocal = new Set();

for (const entry of entries) {
  const { name, source, local, sourceSha, localSha, policy = 'managed' } = entry;
  if (!name || !source || !local || !sourceSha || !localSha) {
    errors.push(`invalid manifest entry: ${JSON.stringify(entry)}`);
    continue;
  }
  if (seenLocal.has(local)) {
    errors.push(`${name}: duplicate local path ${local}`);
    continue;
  }
  seenLocal.add(local);

  const localPath = path.join(root, local);
  if (!fs.existsSync(localPath)) {
    errors.push(`${name}: missing local file ${local}`);
    continue;
  }

  const currentLocalSha = gitBlobSha(fs.readFileSync(localPath));
  if (currentLocalSha !== localSha) {
    errors.push(`${name}: local drift detected for ${local}\n  baseline ${localSha}\n  current  ${currentLocalSha}`);
  }

  const currentSourceSha = registryTree.get(source);
  if (!currentSourceSha) {
    errors.push(`${name}: registry source missing at ${registry}#${ref}:${source}`);
    continue;
  }
  if (currentSourceSha !== sourceSha) {
    errors.push(`${name}: upstream registry changed for ${source}\n  reviewed ${sourceSha}\n  current  ${currentSourceSha}`);
  }

  if (policy === 'managed' && sourceSha !== localSha) {
    errors.push(`${name}: policy=managed requires sourceSha === localSha; use policy=customized for intentional local variants`);
  }
}

if (errors.length > 0) {
  console.error('Acongm UI drift gate failed:');
  console.error(errors.map((error) => `- ${error}`).join('\n'));
  console.error('\nReview with `pnpm ui:diff`, then explicitly update .acongm-ui.json after accepting/syncing the change.');
  process.exit(1);
}

const managed = entries.filter((entry) => (entry.policy ?? 'managed') === 'managed').length;
const customized = entries.length - managed;
console.log(`Acongm UI drift OK: ${entries.length} files locked to ${registry}#${ref} (${managed} managed, ${customized} customized).`);
