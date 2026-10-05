# Open Historia OHX — Copilot instructions

- Work only in the user's fork/Codespace. Never write to `Open-Historia/open-historia`.
- Before editing, inspect `git status --short`, the current branch and remotes.
- Never overwrite a pre-existing user file. The supplied `install-kit.sh` refuses conflicting destinations.
- Never use `reset --hard`, `clean -fdx`, force-push, destructive rebase, or destructive history rewriting.
- Never request or print secrets, API keys, passwords, access tokens, private keys, or signing credentials.
- Treat `0eec087ce7bad0ec39937c33743a147d82477d94` as the reproducibility base for this kit. Verify the patch applies before any Android build.
- The Android artifact is intentionally a separate debug-signed OHX app with id `io.github.arkniem.paxhistoria.ohx`.
- The OHX build uses `VITE_APP_TRACK=ohx`. The official router has only `stable` and `beta` update feeds; an unregistered `ohx` track therefore intentionally disables the in-app update banner instead of offering an incompatible official APK.
- The workflow builds from the pinned upstream source plus the OHX patch; it does not silently include arbitrary later edits from the fork. Fail clearly if the pinned upstream base is no longer the current upstream `main`.
- Do not integrate the Toxic World scenario in this build mission.
- Only claim success when the relevant command output or GitHub Actions status proves it.
