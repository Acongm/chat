import { spawnSync } from "node:child_process";
import fs from "node:fs";

const manifest = JSON.parse(fs.readFileSync(".acongm-ui.json", "utf8"));
const action = process.argv[2];
const item = process.argv[3] ?? "core-ui";
const registry = manifest.registry ?? "Acongm/shadcn-ui";
const candidateRef = manifest.ref ?? "main";
const installRef = manifest.installRef ?? candidateRef;
const workspace = manifest.workspace;

function itemAddress(ref) {
  return `${registry}/${item}#${ref}`;
}

let args;
switch (action) {
  case "list":
    args = ["dlx", "shadcn@latest", "list", `${registry}#${candidateRef}`];
    break;
  case "view":
    args = ["dlx", "shadcn@latest", "view", itemAddress(installRef)];
    break;
  case "add":
    if (!workspace) throw new Error(".acongm-ui.json must declare workspace for ui:add");
    args = ["dlx", "shadcn@latest", "add", itemAddress(installRef), "-c", workspace, "--yes"];
    break;
  case "sync":
    if (!workspace) throw new Error(".acongm-ui.json must declare workspace for ui:sync");
    args = ["dlx", "shadcn@latest", "add", itemAddress(installRef), "-c", workspace, "--yes", "--overwrite"];
    break;
  case "diff":
    if (!workspace) throw new Error(".acongm-ui.json must declare workspace for ui:diff");
    args = ["dlx", "shadcn@latest", "add", itemAddress(candidateRef), "-c", workspace, "--dry-run", "--diff"];
    break;
  default:
    console.error("Usage: node scripts/ui-registry.mjs <list|view|add|sync|diff> [item]");
    process.exit(2);
}

const result = spawnSync("pnpm", args, { stdio: "inherit", shell: process.platform === "win32" });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
