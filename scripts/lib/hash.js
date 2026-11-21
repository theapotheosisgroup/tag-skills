// Content hashes for skill directories and upstream folders.
//
// A directory hash is sha256 over one line per regular file, sorted by relative POSIX path:
// "<path>\0<sha256 of the file's bytes>\n". File modes and timestamps are ignored, so the hash is
// the same for a git checkout, an installed copy and a tarball of the same content.

import { createHash } from "node:crypto";
import { lstat, readdir, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

/** @param {Buffer | string} data */
export function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

/**
 * Lists the regular files under a directory, as sorted POSIX paths relative to it.
 * Symbolic links are listed as errors by the validator and skipped here.
 * @param {string} dir
 * @param {(relativePath: string) => boolean} [include]
 * @returns {Promise<string[]>}
 */
export async function listFiles(dir, include = () => true) {
  /** @type {string[]} */
  const files = [];
  /** @param {string} current */
  async function visit(current) {
    for (const entry of await readdir(current)) {
      const path = join(current, entry);
      const stat = await lstat(path);
      if (stat.isDirectory()) await visit(path);
      else if (stat.isFile()) {
        const rel = relative(dir, path).split(sep).join("/");
        if (include(rel)) files.push(rel);
      }
    }
  }
  await visit(dir);
  return files.sort();
}

/**
 * Hashes every file under a directory.
 * @param {string} dir
 * @param {(relativePath: string) => boolean} [include]
 * @returns {Promise<{ hash: string, files: { path: string, sha256: string }[] }>}
 */
export async function hashDirectory(dir, include) {
  const files = [];
  for (const path of await listFiles(dir, include)) {
    files.push({ path, sha256: sha256(await readFile(join(dir, path))) });
  }
  return { hash: hashFileList(files), files };
}

/**
 * Combines per-file hashes into a directory hash.
 * @param {{ path: string, sha256: string }[]} files
 */
export function hashFileList(files) {
  const lines = [...files]
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
    .map((f) => `${f.path}\0${f.sha256}\n`)
    .join("");
  return `sha256:${sha256(lines)}`;
}
