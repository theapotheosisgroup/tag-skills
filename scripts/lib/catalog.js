// Builds catalog.json: a deterministic index of the published skills and the profiles.
// No timestamps and a fixed key order, so the same tree always produces the same bytes.

import { hashDirectory } from "./hash.js";
import { expandProfiles } from "./repository.js";

export const REPOSITORY = "theapotheosisgroup/tag-skills";

/**
 * @param {import("./repository.js").Repository} repository
 * @returns {Promise<string>} catalog.json content, newline-terminated.
 */
export async function buildCatalog(repository) {
  const skills = [];
  for (const skill of [...repository.skills].sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const meta = skill.meta;
    if (!meta) throw new Error(`${skill.path}: tag-skill.json is missing or invalid`);
    skills.push({
      name: skill.name,
      description: skill.description,
      path: skill.path,
      version: meta.version,
      domain: meta.domain,
      priority: meta.priority,
      audiences: meta.audiences,
      invocation: meta.invocation,
      sideEffects: meta.sideEffects,
      capabilities: meta.capabilities.map((c) => c.name),
      dependencies: meta.dependencies.skills,
      provenance: meta.provenance,
      contentHash: (await hashDirectory(skill.dir)).hash,
    });
  }
  const profiles = [...repository.profiles]
    .sort((a, b) => (a.name < b.name ? -1 : 1))
    .map((p) => ({
      name: p.name,
      description: p.description,
      skills: expandProfiles([p.name], repository.profiles, repository.skills),
    }));
  const catalog = {
    catalogVersion: 1,
    generatedBy: "npm run catalog:generate",
    repository: REPOSITORY,
    skills,
    profiles,
  };
  return `${JSON.stringify(catalog, null, 2)}\n`;
}
