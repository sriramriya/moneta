# Dependency and asset license audit

2026-11-02; evidence inventory, not legal clearance. Reproduce with node scripts/audit-licenses.mjs after npm ci. Complete path-level name/version/source/SPDX/evidence inventory: audit/dependency-licenses.json and audit/DEPENDENCY_LICENSES.md. Full detected license and NOTICE texts: audit/license-evidence/. See THIRD_PARTY_NOTICES.md.

Vercel preview refresh (2026-11-03): the current lock contains 907 dependency paths, including 49 direct declarations. Full local text evidence exists for 691 paths; 216 have metadata evidence only (notably absent optional platform packages). Clerk, Neon and Blob evidence is included. Zero UNKNOWN SPDX metadata does not mean all redistribution permissions are resolved. Versions are pinned in package-lock.json; packages can appear at more than one path. The public notice collection was regenerated from 314 exact evidence files with source bytes retained.

| License group | Review required before distribution |
|---|---|
| MIT, ISC, BSD, Apache, Python, BlueOak and alternatives | Retain applicable copyright, license, NOTICE, disclaimer and any modification notices; select permitted alternatives explicitly |
| MPL-2.0 (28 paths) | Review file-level source availability and modification notices for distributed covered code; identify source and method of compliance |
| LGPL-3.0-or-later and combined licenses (14 paths) | Sharp/libvips platform binaries need linkage/source, license and replacement/relinking review when bundled; do not treat npm metadata as compliance |
| CC-BY-4.0 (caniuse-lite) | Retain attribution, license link and required change indication |
| CC0 / 0BSD | Preserve provenance; check bundled component licenses separately |

Hosted use and downloadable redistribution differ. A browser receives shipped JS/CSS even for SaaS, so applicable client notices still matter. Server-only use does not automatically trigger every source-distribution requirement. A download of application source, lockfiles and optional binaries needs its own component review; this internal archive excludes node_modules and compiled binaries but does not resolve downstream obligations.

| Asset | Source and evidence | Status |
|---|---|---|
| public/favicon.svg, inline SVG, CSS artwork and synthetic demo | Authored in project; no raster stock assets bundled | Verify application author ownership and MONETA mark before sale |
| User-provided dashboard screenshot | Design reference only, not distributed in public/ or candidate | No permission assumed for redistribution |
| System UI fonts | Installed on visitor device; no font binaries included | Remote Google Fonts imports removed locally |
| scripts/vite/sites-vite-plugin.* | Bundled OpenAI scaffold; adjacent sites-vite-plugin.LICENSE | MIT text retained |
| vendor/shadcn-tailwind-4.13.0.css | Bundled shadcn stylesheet; adjacent LICENSE.md | MIT text retained |
| npm icons, UI and template packages | Path-level inventory; includes lucide-react, shadcn, Radix etc. | Preserve underlying notices; verify final build artifacts |

Launch blockers: application root license/contract absent; provenance and trademark rights need owner confirmation; 213 metadata-only paths require evidence for target platforms; mixed LGPL/MPL compliance decision and source locations unresolved; hosting platform transfer/resale rights unverified. THIRD_PARTY_NOTICES.md is an evidence index, not a declaration that every obligation has been discharged.

## Follow-up authoritative evidence

Inspected 44 installed metadata-only package versions using official npm publication metadata. Exact-version tarballs were checked against registry SHA512 where downloaded; bounded archive parsing saved only license/NOTICE texts and executed no package code. Fifteen package versions now have extra evidence, including two archive sources and pinned upstream GitHub license texts from the publication gitHead. Duplicate dependency paths produce 659 evidence-backed paths and 213 still metadata-only. See audit/registry-license-evidence.json for exact URLs, pins, integrity, file hashes and failed/timeout/no-text outcomes. A repository root license does not prove the completeness of all bundled binary licenses: those rows explicitly retain component-coverage review status.

Remaining examples include Cloudflare SDK/Drizzle/Next packages whose archives omit license texts or publication pins, missing-repository client-only/css-box-shadow, and absent native platform packages. No permission is inferred for them from a similar package or an unpinned current branch. No dependency was confirmed prohibited for commercial use from the evidence obtained, but this is not permission to redistribute unresolved components or the unlicensed application. Excluding dependency binaries from the source candidate narrows the shipped artifacts; buyers installing dependencies still need valid notices and compliance.

Captured texts are preserved in public/third-party-notices.txt for hosted notice access and THIRD_PARTY_NOTICES plus the path-level evidence index for source review. System font fallbacks were corrected locally after visual QA. Existing screenshot remains only an external design reference and is not in the source package. Application copyright/trademark/resale rights and commercial source agreement remain owner decisions.
