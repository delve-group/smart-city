# Project foundation — 2026-10-03

Scope from the user's request: local Git repository, knowledge base, agent instructions and a shadcn/ui design system with two themes. App features were not defined yet.

We chose a specification + CSS tokens + a lightweight preview: it gives material for immediate review and later implementation. Documentation alone does not allow judging the look. Two independent apps would be harder to maintain; shared components with tokens are enough.

Details are maintained in the [architecture](../architecture.md) and the [design system](../design-system.md). Working decisions and unknowns stay explicit in the [project context](../knowledge-base/project.md).

Completion criteria: Git recognises the project; documents are linked from an index; instructions reflect hackathon constraints; both themes have a full set of semantic tokens, palettes and a preview; no presentation tests or pretend business logic were added.

Note: shadcn/ui was later replaced by Appica UI (D010) and the app was built with Next.js (D011).
