# Security policy

`tag-skills` follows the [organization security policy](https://github.com/theapotheosisgroup/.github/blob/main/SECURITY.md). Report suspected vulnerabilities privately as described there. Do not open an issue or pull request that describes one.

## Specific to this repository

- **Skills hold no credentials.** A token, key, password, private URL or sign-in detail in any file under `skills/` is a security incident even if the value looks expired: report it, and rotate the credential at its source. Removing it from the tree is not enough, because clients may already have installed the file and the git history keeps it.
- **Skills confer no permissions.** A skill that tells an agent to bypass an MCP capability's authorization, use a shared or administrator identity, or write a business record directly is a vulnerability in this repository, whatever the downstream service does.
- **Installed skills run with the client's permissions.** A malicious change to a skill, including a skill script, can act with the full permissions of every client that installs it. Review skill changes as code.
- CI scans the full git history for secrets (gitleaks), checks dependencies for vulnerabilities and licenses (OSV-Scanner), and rejects credential-like files and symbolic links inside a skill ([tests/README.md](tests/README.md#security-invariants-this-repository-owns)).
