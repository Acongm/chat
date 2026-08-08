import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(root, '.acongm-ui.json'), 'utf8'));
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const registry = manifest.registry ?? 'Acongm/shadcn-ui';
const ref = manifest.ref ?? 'main';
const installRef = manifest.installRef;
const workspace = manifest.workspace;
const entries = Array.isArray(manifest.items) ? manifest.items : [];
const errors = [];

function gitBlobSha(buffer) {
  const header = Buffer.from(`blob ${buffer.length}\0`);
  return crypto.createHash('sha1').update(header).update(buffer).digest('hex');
}

async function loadRegistryTree(treeRef) {
  const url = `https://api.github.com/repos/${registry}/git/trees/${encodeURIComponent(treeRef)}?recursive=1`;
  const response = await fetch(url, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'acongm-ui-drift-check' } });
  if (!response.ok) throw new Error(`failed to read ${registry}#${treeRef}: ${response.status} ${response.statusText}`);
  const payload = await response.json();
  if (payload.truncated) throw new Error(`${registry}#${treeRef} tree response was truncated`);
  return new Map((payload.tree ?? []).filter((item) => item.type === 'blob').map((item) => [item.path, item.sha]));
}

if (!/^[0-9a-f]{40}$/.test(installRef ?? '')) errors.push('installRef must be a full 40-character commit SHA');
if (!workspace || !fs.existsSync(path.join(root, workspace, 'components.json'))) errors.push('workspace must point to an app directory containing components.json');
if (entries.length === 0) errors.push('.acongm-ui.json must declare at least one managed item');

const registryScriptPath = path.join(root, 'scripts/ui-registry.mjs');
if (!fs.existsSync(registryScriptPath)) errors.push('scripts/ui-registry.mjs is required for manifest-driven Registry commands');
else {
  const registryScript = fs.readFileSync(registryScriptPath, 'utf8');
  for (const contract of [
    ['manifest.installRef', 'wrapper must read installRef from .acongm-ui.json'],
    ['manifest.ref', 'wrapper must read candidate ref from .acongm-ui.json'],
    ['manifest.workspace', 'wrapper must read workspace from .acongm-ui.json'],
    ['"-c", workspace', 'wrapper must use shadcn monorepo -c workspace'],
    ['"--overwrite"', 'ui:sync must support explicit overwrite'],
    ['"--dry-run", "--diff"', 'ui:diff must remain non-mutating'],
  ]) if (!registryScript.includes(contract[0])) errors.push(contract[1]);
}

const expectedScripts = {
  'ui:view': 'node scripts/ui-registry.mjs view core-ui',
  'ui:add': 'node scripts/ui-registry.mjs add core-ui',
  'ui:sync': 'node scripts/ui-registry.mjs sync core-ui',
  'ui:diff': 'node scripts/ui-registry.mjs diff core-ui',
};
for (const [name, expected] of Object.entries(expectedScripts)) if (packageJson.scripts?.[name] !== expected) errors.push(`${name} must delegate to the reviewed manifest-driven Registry wrapper`);

const [registryTree, installTree] = await Promise.all([loadRegistryTree(ref), loadRegistryTree(installRef)]);
const seenLocal = new Set();
for (const entry of entries) {
  const { name, source, local, sourceSha, localSha, policy = 'managed' } = entry;
  if (!name || !source || !local || !sourceSha || !localSha) { errors.push(`invalid manifest entry: ${JSON.stringify(entry)}`); continue; }
  if (seenLocal.has(local)) { errors.push(`${name}: duplicate local path ${local}`); continue; }
  seenLocal.add(local);
  const localPath = path.join(root, local);
  if (!fs.existsSync(localPath)) { errors.push(`${name}: missing local file ${local}`); continue; }
  const currentLocalSha = gitBlobSha(fs.readFileSync(localPath));
  if (currentLocalSha !== localSha) errors.push(`${name}: local drift detected for ${local}\n  baseline ${localSha}\n  current  ${currentLocalSha}`);
  const reviewedSourceSha = installTree.get(source);
  if (!reviewedSourceSha) errors.push(`${name}: source missing from reviewed ${registry}#${installRef}:${source}`);
  else if (reviewedSourceSha !== sourceSha) errors.push(`${name}: sourceSha does not match installRef\n  manifest ${sourceSha}\n  pinned   ${reviewedSourceSha}`);
  const currentSourceSha = registryTree.get(source);
  if (!currentSourceSha) errors.push(`${name}: registry source missing at ${registry}#${ref}:${source}`);
  else if (currentSourceSha !== sourceSha) errors.push(`${name}: upstream registry changed for ${source}\n  reviewed ${sourceSha}\n  current  ${currentSourceSha}`);
  if (policy === 'managed' && sourceSha !== localSha) errors.push(`${name}: policy=managed requires sourceSha === localSha; use policy=customized for intentional local variants`);
}

if (errors.length > 0) {
  console.error('Acongm UI drift gate failed:');
  console.error(errors.map((error) => `- ${error}`).join('\n'));
  console.error('\nReview latest Registry changes with `pnpm ui:diff`, then explicitly update code, installRef and .acongm-ui.json after accepting the upgrade.');
  process.exit(1);
}
const managed = entries.filter((entry) => (entry.policy ?? 'managed') === 'managed').length;
const customized = entries.length - managed;
console.log(`Acongm UI drift OK: ${entries.length} files pinned to ${registry}#${installRef}, watching #${ref} (${managed} managed, ${customized} customized).`);
