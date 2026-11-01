# DevC Git Protocol

```bash
git clone git@github.com:yashwandhare/vanik.git
cd vanik
git fetch origin
git switch main
git pull --ff-only origin main

if git show-ref --verify --quiet refs/remotes/origin/devc; then
  git switch --track -c devc origin/devc
else
  git switch -c devc main
fi
git merge origin/main
```

Before work, confirm `git branch --show-current` prints `devc` and the tree is clean.

Commit focused changes, run checks, then:

```bash
git push -u origin devc
```

Open a PR from `devc` to `main`. Never push/merge `main`, force-push, commit `.env`/secrets, or edit DevA/DevB-owned files.
