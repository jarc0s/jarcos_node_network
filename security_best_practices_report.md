# Security Best Practices Report

## Executive Summary

Date of review: 2026-05-03

The project has known npm vulnerabilities in its resolved dependency tree and a few security posture issues in code and documentation. The most important practical issue is the broad `axios` compatibility and development resolution, because this library is built around `axios` and currently permits consumers to install vulnerable versions. The second issue is insecure-by-default token storage guidance using `localStorage`. There is also unsafe documentation that explicitly disables TLS certificate validation.

`npm audit --package-lock-only --json` reported 15 vulnerabilities in the current lockfile:

- 1 critical
- 9 high
- 4 moderate
- 1 low

Most findings are in development tooling (`eslint`, `ts-jest`, test/coverage stack), but one high-severity direct dependency issue affects the library's core transport dependency (`axios`).

## Critical Findings

### SBP-001: Library permits vulnerable `axios` versions through peer dependency range

Impact: Consumers of this library can satisfy the peer dependency with vulnerable `axios` versions, exposing them to known DoS and SSRF-related issues in the HTTP client the library is built on.

Evidence:

- [package.json](/home/isamu/Develop/node/jarcos_node_network/package.json:58) declares `"axios": "^1.0.0"` as a peer dependency.
- [package.json](/home/isamu/Develop/node/jarcos_node_network/package.json:66) also resolves `axios` as a dev dependency.
- [package-lock.json](/home/isamu/Develop/node/jarcos_node_network/package-lock.json:1662) currently resolves `axios@1.12.2`.

`npm audit` reported:

- `GHSA-43fc-jf86-j433`: Axios vulnerable to DoS via `__proto__` key in `mergeConfig`
- `GHSA-3p68-rc4w-qgx5`: NO_PROXY normalization bypass leading to SSRF
- `GHSA-fvcv-3m26-pcqx`: Cloud metadata exfiltration via header injection chain

Why this matters:

- This package is an API client library whose security posture is tightly coupled to `axios`.
- Even if the repo itself only uses `axios` in development, the published package advertises compatibility with `axios` versions that are now known-vulnerable.

Recommended action:

- Raise the peer dependency floor to a non-vulnerable range, preferably `^1.15.0` or newer after validating compatibility.
- Align the dev dependency to the same patched major/minor line.
- Publish a patch release after verification.

## High Findings

### SBP-002: Tooling dependency tree contains critical/high vulnerabilities in test/build stack

Impact: Local CI, test, lint, and release environments remain exposed to vulnerable packages, increasing supply-chain and workstation risk even if production runtime impact is limited.

Evidence:

- [package.json](/home/isamu/Develop/node/jarcos_node_network/package.json:64) uses `@typescript-eslint/eslint-plugin` and [package.json](/home/isamu/Develop/node/jarcos_node_network/package.json:65) uses `@typescript-eslint/parser`.
- [package-lock.json](/home/isamu/Develop/node/jarcos_node_network/package-lock.json:2323) shows `eslint` pulling vulnerable tooling such as `ajv`, `js-yaml`, and `minimatch`.
- [package-lock.json](/home/isamu/Develop/node/jarcos_node_network/package-lock.json:4854) shows `ts-jest` pulling `handlebars`.

`npm audit` reported:

- `handlebars` critical/high advisories through `ts-jest`
- `@typescript-eslint/*` high advisories
- `minimatch`, `picomatch`, `flatted` and others in the tooling graph

Recommended action:

- Upgrade `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `eslint`, `jest`, and `ts-jest` together as a coordinated toolchain refresh.
- Rebuild the lockfile and rerun `npm audit`.
- Treat this as high priority for maintainers even if not directly exploitable in the published runtime package.

### SBP-003: Browser token storage is insecure by default and recommended in docs

Impact: Access and refresh tokens stored in `localStorage` are exposed to any XSS that lands in the consuming app, which materially raises account/session compromise risk.

Evidence:

- [src/auth/auth-manager.ts](/home/isamu/Develop/node/jarcos_node_network/src/auth/auth-manager.ts:22) defaults `tokenStorage` to `localStorage`.
- [QUICK-START.md](/home/isamu/Develop/node/jarcos_node_network/QUICK-START.md:42) recommends `tokenStorage: 'localStorage'` in the quick-start path.

Why this matters:

- This library targets Node.js and Next.js, where safer defaults should bias toward in-memory handling unless the consumer explicitly opts into persistent browser storage.
- `refreshToken` handling is also supported by the library, so the blast radius is larger than a short-lived access token alone.

Recommended action:

- Change the default storage recommendation to `memory`.
- If keeping `localStorage` as an option, document it as a tradeoff and not the default recommendation.
- Consider requiring explicit opt-in for persistent browser token storage.

## Medium Findings

### SBP-004: Documentation includes `rejectUnauthorized: false`

Impact: Consumers who copy this example may disable TLS certificate validation, enabling man-in-the-middle interception of API traffic.

Evidence:

- [docs/CONFIGURATION.md](/home/isamu/Develop/node/jarcos_node_network/docs/CONFIGURATION.md:596) includes `rejectUnauthorized: false` in an `https.Agent` example.

Why this matters:

- Disabling certificate validation should only exist in narrowly scoped troubleshooting examples, clearly labeled as unsafe.
- In a library that presents itself as production-ready, this example is likely to be copied verbatim.

Recommended action:

- Remove the example or replace it with a safe TLS example.
- If there is a debugging-only use case, add an explicit warning that it must never be used in production.

## Low Findings

### SBP-005: Request path logs headers and bodies by default at debug level

Impact: Sensitive request metadata could still be exposed in logs if consuming applications use non-standard secret field names or pass secrets in unexpected structures.

Evidence:

- [src/interceptors/request.ts](/home/isamu/Develop/node/jarcos_node_network/src/interceptors/request.ts:55) logs request method, URL, headers, and body.
- [src/logging/logger.ts](/home/isamu/Develop/node/jarcos_node_network/src/logging/logger.ts:48) redacts a fixed list of field names.
- [src/logging/logger.ts](/home/isamu/Develop/node/jarcos_node_network/src/logging/logger.ts:220) redaction depends on field-name matching.

Why this is low severity:

- There is already a sanitization layer, which is good.
- The remaining risk is mainly from unusual secret field names or opaque nested payload shapes.

Recommended action:

- Keep logging disabled or below debug in production by default.
- Expand documentation to warn users to extend `sensitiveFields` when their payloads use custom secret names.

## Priority Remediation Plan

1. Raise the `axios` peer dependency floor and dev dependency version, then publish a patch release.
2. Refresh the lint/test toolchain (`eslint`, `@typescript-eslint/*`, `jest`, `ts-jest`) and regenerate the lockfile.
3. Change docs and defaults to stop recommending `localStorage` as the default token store.
4. Remove or hard-warn the `rejectUnauthorized: false` example.

## Validation Notes

Commands used:

- `npm audit --package-lock-only --json --registry=https://registry.npmjs.org/`
- `npm outdated --json`
- targeted source and lockfile inspection with line references

Observed update state:

- `npm outdated --json` returned `{}`, so the current semver ranges already resolve to the newest versions allowed by the present manifest.
- That means some fixes require changing dependency ranges, not just reinstalling.
