import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { tmpdir } from "node:os";

const root = fileURLToPath(new URL("../", import.meta.url));
const dist = join(root, "dist-demo");
await access(join(dist, "index.html"));
await writeFile(join(dist, ".nojekyll"), "");
const git = (args, opts = {}) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8", ...opts }).trim();
const gitDir = git(["rev-parse", "--absolute-git-dir"]);
const ref = git(["ls-remote", "--heads", "origin", "refs/heads/gh-pages"]);
let parent;
if (ref) {
  git(["fetch", "--no-tags", "origin", "refs/heads/gh-pages"]);
  parent = git(["rev-parse", "FETCH_HEAD"]);
}
const temp = await mkdtemp(join(tmpdir(), "dareme-pages-"));
try {
  const env = {
    ...process.env,
    GIT_DIR: gitDir,
    GIT_WORK_TREE: dist,
    GIT_INDEX_FILE: join(temp, "index"),
  };
  const artifactGit = (args) => git(args, { env, cwd: dist });
  artifactGit(["read-tree", "--empty"]);
  artifactGit(["add", "--all"]);
  const tree = artifactGit(["write-tree"]);
  const commit = git([
    "commit-tree",
    tree,
    ...(parent ? ["-p", parent] : []),
    "-m",
    "Publish no-login Dareme demo",
  ]);
  git(["push", "origin", `${commit}:refs/heads/gh-pages`], {
    stdio: ["ignore", "pipe", "inherit"],
  });
  console.log(`Published static demo commit ${commit} to gh-pages.`);
  console.log(
    "GitHub Pages source must be gh-pages / (root). Publishing this branch does not itself prove the site is enabled.",
  );
} finally {
  await rm(temp, { recursive: true, force: true });
}
