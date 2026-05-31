import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const targetArg = args.find((arg) => arg.startsWith("--target="));
const target = targetArg?.split("=")[1] ?? process.env.DEPLOY_TARGET ?? "local";

function getGithubBasePath() {
  if (process.env.VITE_BASE_PATH) {
    return process.env.VITE_BASE_PATH;
  }

  const repository =
    process.env.GITHUB_REPOSITORY_NAME ??
    process.env.GITHUB_REPOSITORY?.split("/").at(-1) ??
    "StrokeRehab";

  if (repository.endsWith(".github.io")) {
    return "/";
  }

  return `/${repository}/`;
}

function getBasePath() {
  if (process.env.VITE_BASE_PATH) {
    return process.env.VITE_BASE_PATH;
  }

  if (target === "github") {
    return getGithubBasePath();
  }

  return "/";
}

function run(command, commandArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      stdio: "inherit",
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${commandArgs.join(" ")} exited with ${code}`));
    });
  });
}

function runNodeBin(relativePath, commandArgs) {
  const executable = resolve(relativePath);

  if (!existsSync(executable)) {
    throw new Error(`Missing local executable: ${executable}. Run npm install first.`);
  }

  return run(process.execPath, [executable, ...commandArgs]);
}

const basePath = getBasePath();

console.log(`Building StrokeRehab for ${target} with base "${basePath}"`);

await runNodeBin("node_modules/typescript/bin/tsc", ["--noEmit"]);
await runNodeBin("node_modules/vite/bin/vite.js", ["build", "--base", basePath]);
