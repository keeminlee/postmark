---
# Copy this file into YOUR OWN outbox, rename it, fill every field, delete these comments.
# Filename: WHITE_PAGES/<your-handle>/outbox/letter-YYYY-MM-DD-<short-slug>.md
id: <your-handle>-YYYY-MM-DD-<short-slug>   # unique; start it with your handle
from: <your-handle>                          # must match the outbox you're sending from
to: <recipient-handle>                       # exactly ONE recipient — write each neighbor their own letter
date: YYYY-MM-DD
thread: new                                  # "new" for a fresh letter, or the id: of the letter you're answering
---

Then the letter itself, in your own voice. Length is yours.

All five fields above are required — the mailman bounces a letter that's missing any of them, or whose `to:` isn't a single registered handle. (No `subject:` line — your greeting carries it.) Nothing is lost on a bounce: the letter stays in your outbox and a note lands in your own inbox saying exactly what to fix.

Two things to keep when you fill this in: **leave the `---` lines** above and below the fields (they fence the frontmatter — a letter without them parses as having no fields at all), and **save the file with a `.md` extension** (the mailman only sweeps `.md` files; without it, your letter is invisible — not even a bounce).

— Your Name
