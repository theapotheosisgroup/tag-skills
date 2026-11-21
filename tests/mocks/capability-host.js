// MOCK, not an implementation. A stand-in for the TAG runtime boundary (tag-harness calling TAG MCP
// capabilities, with aletia deciding authority) that follows the contract in
// docs/integration/capability-contract.md, so skills' handling of unavailable, refused and
// unauthorized calls can be tested here. Real enforcement is tested in the owning runtime.

/**
 * @typedef {object} RunContext  The TAG context model (docs/integration/context-model.md).
 * @property {string} organization   aletia organization id
 * @property {string} principal      acting person or agent identifier
 * @property {string} mandate        delegation or mandate id granting authority
 * @property {string} [nexus]        aletia nexus, when relevant
 * @property {string} [matter]       PROPOSED: no Matter model exists yet
 * @property {string} correlationId
 */

/**
 * @typedef {{ status: "ok", capability: string, correlationId: string, data: unknown }
 *   | { status: "unavailable" | "denied", capability: string, correlationId: string, reason: string }} CallResult
 */

export class MockCapabilityHost {
  /**
   * @param {object} options
   * @param {{ capabilities: { name: string, kind: string, requiresReview?: boolean }[] }} options.registry
   * @param {Record<string, (request: any, context: RunContext) => unknown>} options.bindings
   *   capability name -> handler; an absent name is "unavailable" (no binding)
   * @param {Record<string, string[]>} options.grants  mandate id -> capability names it grants
   */
  constructor({ registry, bindings, grants }) {
    this.registry = new Map(registry.capabilities.map((c) => [c.name, c]));
    this.bindings = bindings;
    this.grants = grants;
    /** @type {{ capability: string, status: string, correlationId: string }[]} */
    this.audit = [];
  }

  /**
   * @param {string} name
   * @param {any} request  must carry `organization`, the organization the call is about
   * @param {RunContext} context
   * @returns {Promise<CallResult>}
   */
  async call(name, request, context) {
    const capability = this.registry.get(name);
    if (!capability) throw new Error(`contract violation: "${name}" is not a registered capability`);
    const base = { capability: name, correlationId: context.correlationId };
    /** @param {CallResult} result */
    const record = (result) => {
      this.audit.push({ capability: name, status: result.status, correlationId: context.correlationId });
      return result;
    };
    if (!(name in this.bindings))
      return record({ ...base, status: "unavailable", reason: "no binding for this capability" });
    if (request?.organization !== context.organization) {
      return record({
        ...base,
        status: "denied",
        reason: "the request names another organization than the run context",
      });
    }
    if (!(this.grants[context.mandate] ?? []).includes(name)) {
      return record({ ...base, status: "denied", reason: `mandate ${context.mandate} does not grant ${name}` });
    }
    if (capability.kind === "write" && capability.requiresReview && request?.review?.status !== "approved") {
      return record({
        ...base,
        status: "denied",
        reason: "a write that requires review needs an approved review state",
      });
    }
    return record({ ...base, status: "ok", data: await this.bindings[name](request, context) });
  }
}
