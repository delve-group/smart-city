# Agent working rules

## Goal

We are building a Smart City project for a hackathon. The current phase is a **proof of concept**: ship small, working slices of the product quickly, with code that is easy to understand, maintain and extend later.

## Code and architecture

- Organise code by business feature. Separate UI, domain rules and data access; add layers only when they are needed.
- Keep module responsibilities narrow and dependencies explicit. Business logic should work without React, the DOM and the network.
- Choose the simplest solution that meets the current requirements. A new abstraction must solve an existing problem; a little duplication beats a premature framework.
- Prefer readable names, explicit types at boundaries and composition. Validate data from external sources and handle errors where you can react to them.
- Use Appica UI (`@appica/ui-react`) as the component base; frontend rules are in [apps/frontend/AGENTS.md](apps/frontend/AGENTS.md). Colours and shapes come from theme tokens; one theme with light and dark mode; do not duplicate components per mode.
- Limit dependencies and the scope of each change. Microservices, custom frameworks and optimisations without a concrete problem are postponed.
- Keep secrets out of the repository. Label demo data unambiguously; never present mocks as production integrations.

## Verification

- PoC phase: **do not write tests** unless explicitly asked. Focus on a working product.
- Check appearance, responsiveness, keyboard use and error states with a short manual review. Run the available lint, type check and build.
- Report what was actually checked and what could not be verified.

## Git, PRs and integrating changes

- **Never push or force-push directly to `main`. All changes reach `main` only through a Pull Request.** Do not bypass this with a local merge followed by a push to `main`.
- Work and commit on a separate branch named `<type>/<short-description>`, e.g. `feature/event-heatmap`, `fix/map-loading`, `docs/libraries`. Do not prefix branch names with `codex/` or a tool name. Push the branch and open a PR to the target branch.
- Before submitting a PR for merge, fetch the current remote target branch and integrate it into your branch by merge or rebase. Resolve conflicts preserving the intent of both changes; never overwrite someone else's work just to clear a conflict.
- Check that the incoming code works with the current target code: contracts, calls, types, dependencies and data flows touched by the change. No Git conflicts does not mean correct integration.
- After integrating, run the checks relevant to the change (see "Verification"). Describe the result, the checks and the limitations in the PR. If the target branch changes before merging, repeat the integration and checks for the affected areas.
- Merge through the PR once required checks and repository rules pass. If there is no remote or no access to open a PR, keep the changes on the working branch and report the blocker; never replace a PR with a push to `main`.

## Knowledge base and delivery

1. When starting work, read the [knowledge index](docs/knowledge-base/README.md) and the [project context](docs/knowledge-base/project.md).
2. Before changing module boundaries, data flow or integrations, read the [architecture](docs/architecture.md). Before UI work, read the [design system](docs/design-system.md) and use the [tokens](apps/frontend/src/shared/styles/appica-theme.css).
3. Deliver the smallest complete scope. Ask only about missing information that materially affects the product; make reversible decisions yourself and state your assumptions.
4. After a significant decision or discovery, update the relevant document and add the decision with its rationale to the [decision log](docs/knowledge-base/decisions.md). Keep a single source of truth.
5. Finish with a short summary of the result, the verification and real limitations. Do not claim deployments, integrations or tests that did not happen.

**Write everything in English**: documentation, code, comments, commit messages, PR descriptions and UI copy. The file name `AGENTS.md` is intentional — it is the instruction file for agent tools.
