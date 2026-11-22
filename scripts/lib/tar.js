// A minimal, reproducible tar.gz writer (POSIX ustar) for package archives.
//
// The same entries and mtime always produce the same bytes on the same Node.js (zlib) version:
// entries are written in the order given, ownership is 0/0 with no user or group names, modes are
// 0755 for directories and executables and 0644 otherwise, and the gzip header carries no
// timestamp and a fixed OS byte. Only regular files and directories are supported.

import { gzipSync } from "node:zlib";

const BLOCK = 512;
const RECORD = BLOCK * 20;

/**
 * @typedef {object} TarEntry
 * @property {string} path         POSIX path inside the archive; directories end with "/".
 * @property {Buffer} [data]       File content (omit for directories).
 * @property {boolean} [executable]
 */

/**
 * Splits a path into ustar name (<= 100 bytes) and prefix (<= 155 bytes) fields.
 * @param {string} path
 * @returns {{ name: string, prefix: string }}
 */
function splitPath(path) {
  if (Buffer.byteLength(path) <= 100) return { name: path, prefix: "" };
  const trimmed = path.endsWith("/") ? path.slice(0, -1) : path;
  for (let i = trimmed.lastIndexOf("/"); i > 0; i = trimmed.lastIndexOf("/", i - 1)) {
    const prefix = path.slice(0, i);
    const name = path.slice(i + 1);
    if (Buffer.byteLength(prefix) <= 155 && Buffer.byteLength(name) <= 100 && name.length > 0) {
      return { name, prefix };
    }
  }
  throw new Error(`path is too long for a ustar archive: ${path}`);
}

/**
 * Writes an octal number field: zero-padded digits followed by a NUL.
 * @param {Buffer} header @param {number} offset @param {number} length @param {number} value
 */
function octal(header, offset, length, value) {
  const digits = value.toString(8).padStart(length - 1, "0");
  if (digits.length > length - 1) throw new Error(`value ${value} does not fit a ${length}-byte tar field`);
  header.write(`${digits}\0`, offset, length, "ascii");
}

/**
 * @param {TarEntry} entry
 * @param {number} mtime  Seconds since the epoch.
 */
function header(entry, mtime) {
  const directory = entry.path.endsWith("/");
  if (!directory && !entry.data) throw new Error(`file entry ${entry.path} has no data`);
  if (entry.path.startsWith("/") || entry.path.split("/").includes("..")) {
    throw new Error(`unsafe archive path: ${entry.path}`);
  }
  const { name, prefix } = splitPath(entry.path);
  const block = Buffer.alloc(BLOCK);
  block.write(name, 0, 100, "utf8");
  octal(block, 100, 8, directory || entry.executable ? 0o755 : 0o644);
  octal(block, 108, 8, 0); // uid
  octal(block, 116, 8, 0); // gid
  octal(block, 124, 12, directory ? 0 : /** @type {Buffer} */ (entry.data).length);
  octal(block, 136, 12, mtime);
  block.fill(" ", 148, 156); // checksum placeholder
  block.write(directory ? "5" : "0", 156, 1, "ascii");
  block.write("ustar\0", 257, 6, "ascii");
  block.write("00", 263, 2, "ascii");
  block.write(prefix, 345, 155, "utf8");
  let sum = 0;
  for (const byte of block) sum += byte;
  block.write(`${sum.toString(8).padStart(6, "0")}\0 `, 148, 8, "ascii");
  return block;
}

/**
 * Builds an uncompressed ustar archive.
 * @param {TarEntry[]} entries
 * @param {number} mtime  Seconds since the epoch, applied to every entry.
 * @returns {Buffer}
 */
export function tar(entries, mtime) {
  /** @type {Buffer[]} */
  const parts = [];
  const seen = new Set();
  for (const entry of entries) {
    if (seen.has(entry.path)) throw new Error(`duplicate archive path: ${entry.path}`);
    seen.add(entry.path);
    parts.push(header(entry, mtime));
    if (entry.data && !entry.path.endsWith("/")) {
      parts.push(entry.data);
      const padding = (BLOCK - (entry.data.length % BLOCK)) % BLOCK;
      if (padding) parts.push(Buffer.alloc(padding));
    }
  }
  parts.push(Buffer.alloc(BLOCK * 2));
  const length = parts.reduce((total, part) => total + part.length, 0);
  const padding = (RECORD - (length % RECORD)) % RECORD;
  if (padding) parts.push(Buffer.alloc(padding));
  return Buffer.concat(parts);
}

/**
 * Builds a reproducible .tar.gz.
 * @param {TarEntry[]} entries
 * @param {number} mtime  Seconds since the epoch.
 * @returns {Buffer}
 */
export function tarGzip(entries, mtime) {
  const gz = gzipSync(tar(entries, mtime), { level: 9 });
  gz.writeUInt32LE(0, 4); // MTIME: none
  gz[9] = 3; // OS: Unix, whatever platform built it
  return gz;
}
