# Codex Project Instructions

These instructions apply to the entire Dungeon Escape repository.

## Phase discipline

- Implement only the phase explicitly requested by the user.
- Do not pull mechanics forward from later phases, even when the architecture could support them.
- Preserve existing playable behaviour unless the requested phase explicitly changes it.
- Prefer small, testable extensions over speculative systems.

## Verification and delivery

- Run every check required by the active phase before committing.
- Fix in-scope failures; never commit a phase with failing required checks.
- Review the staged diff and exclude secrets, local browser binaries, reports, build artifacts, logs, and `node_modules`.
- Automatically commit, tag when required, and push a completed phase after all required checks pass.
- Never force-push or silently rewrite a published tag.
- Never claim a test, build, commit, tag, or push succeeded without command evidence.
- Every verified push to `main` deploys production through GitHub Pages; never disable deployment checks merely to make a run pass.
- Run the production audit before deployment and the live smoke suite after a production deployment when the domain is ready.

## Repository safety

- Never commit secrets, credentials, `.env` files containing secrets, or machine-specific configuration.
- Do not replace the configured GitHub remote or create a nested Git repository.
- Do not delete or overwrite unrelated user work.
- Do not introduce copyrighted game assets or runtime CDN dependencies.
- Do not commit `dist`, create a `gh-pages` branch, or add test-only bridge code to the production build.
- Keep the Vite production base at `/` and keep canonical metadata aligned with `https://meiirorazalin.com/`.

## Documentation

- Update `docs/PHASE_STATUS.md` after each phase with completed and deferred requirements, exact verification commands, results, limitations, commit information, and the version tag.
- Keep `README.md` controls and setup commands synchronized with the implementation.
- Keep `docs/IMPLEMENTATION_PLAN.md` honest: only completed phases may be marked complete.
