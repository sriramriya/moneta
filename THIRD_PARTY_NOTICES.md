# Third-party notices

This inventory accompanies an internal source-release candidate, not a commercial legal-clearance statement. Retain each applicable notice and full license when redistributing dependencies or bundled code. Do not assume an SPDX label alone satisfies every obligation.

## Bundled code

- Sites Vite integration: MIT; full notice in `scripts/vite/sites-vite-plugin.LICENSE` (copyright OpenAI).
- shadcn-derived template/styles: MIT; full notice in `vendor/shadcn-tailwind-4.13.0.LICENSE.md`.
- Other package evidence: [complete inventory](audit/DEPENDENCY_LICENSES.md) and accompanying `audit/license-evidence/` full texts.

## Hosted assets

No font binaries or third-party photos are included in the product. The prior Google Fonts CSS import has been removed in the local audited source; system fonts require no font-file redistribution. Original favicon and CSS dashboard illustrations are application-authored; ownership and the commercial application license remain owner decisions. The user-supplied design reference is not bundled.

## Redistribution review

Optional dependencies absent on this host may have metadata-only evidence. MPL, Apache, BSD, ISC, dual-license and other obligations must be reviewed per component. Runtime and build dependencies differ, and a hosted product can still distribute client-side JavaScript. See LICENSE_AUDIT.md for unresolved items and scope.
