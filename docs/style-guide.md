Project Style Guide (Student-Friendly)

Tone
- Be humble and straightforward.
- Keep wording simple and short.
- Avoid hype or AI mentions.

Code Style
- Prefer clarity over cleverness.
- Keep functions small and readable.
- Avoid heavy abstractions unless necessary.
- Use consistent naming (snake_case for Python).
- Add brief comments when intent is not obvious.
- Avoid non-ASCII unless the file already uses it.

Comments
- Explain "why" or "what for", not obvious mechanics.
- Example: "Guard against empty outputs" not "Loop over items".
- Keep comments short and specific.

Commits
- Format: feat:/fix:/style:
- One-line message, short and clear.
- Incremental commits; avoid huge, mixed changes.
- Never mention AI or tooling in commit messages.

Examples
- feat: add codegen runner
- fix: handle empty outputs
- style: update gitignore

Repo Hygiene
- Keep data, runs, and metrics out of git (use .gitignore).
- Track key text artifacts (e.g., background.txt).
- Update README when you add new scripts.
