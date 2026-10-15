# Content Rules for Broadsheet Landing Pages

These rules were learned building real landing pages with this template.
Follow them and the page reads like it was written by a person who
ships software. Break them and it reads like AI slop.

---

## 1. No dummy data

Every number, name, link, and claim on the page must be **real and
verifiable from the repository**.

- If the repo has 47 entries, the page says 47. Count them with a
  script, do not estimate.
- If there are no open issues, do not invent "good first issues".
  Use the project's real roadmap items from AGENTS.md, TODO, or
  issue tracker, and link each one to the actual file or issue.
- If you do not have a real number for something, **delete that
  element**. An empty space reads better than a fabricated metric.
- Sample terminal sessions and sample output files are allowed as
  demonstrations, but the commands, file paths, provider names, and
  formats inside them must match what the tool really does. Add a
  note that the values are from a sample run.

**Never**: invented star counts, fake impression numbers, placeholder
benchmarks, "10K+ users" without a source.

---

## 2. Write like a human

- **No em dashes (—).** Use a period or a comma.
- **No dot separators (— and ·) in copy.** "30 RPM, 14,400 RPD"
  not "30 RPM · 14,400 RPD".
- No "Unleash the power of". No "seamlessly". No "blazing fast"
  unless there is a benchmark line under it.
- Prefer plain sentences over fragments. "src/config.ts seals your
  keys with AES-256-GCM under a scrypt key derived from your home
  directory, hostname, and platform." beats "AES-256-GCM · scrypt ·
  machine-bound".
- It is fine to start a sentence with And or But. Humans do.

---

## 3. No self-referential chrome

The template originally shipped newspaper furniture: Section II
labels, Pp. 02 folio marks, Folio 2026-A edition stamps. **All of
it is removed from the design.** Do not add it back.

The only metadata worth showing:

- A version in the hero badge (e.g. `v0.2.0`), because readers use
  it to check if a doc is current
- The license in the support card stamp and footer, linked to the
  actual LICENSE file
- A "verified against <source file>" line under hero stats, when
  the stats are transcribed from code

Everything else is decoration that a developer audience reads as
filler.

---

## 4. Structure follows the reader's questions

Build for the target audience (usually developers, AI engineers,
technical users). Order sections by the questions they ask:

1. **What is it, how do I run it** (Hero, install command)
2. **What happens when I run it** (Playground: real session, real
   output formats)
3. **What does it do** (Features: searchable like the tool itself)
4. **Why pick this one** (Benchmarks or comparison table, only real
   data)
5. **How does it work, can I contribute** (Architecture: actual
   source layout, roadmap)
6. **The ask** (Support: star, share, sponsor)

Nav carries **4 items plus GitHub**. If a section is not in the nav
it should earn its scroll position, or get cut.

Things that get cut from the default template: changelog sections,
community boilerplate, any section whose content you would have to
invent.

---

## 5. Cards carry data, not decoration

Feature cards use this anatomy (keep it):

```
[CATEGORY tag, tilted]  [tech stack, plain]

Title in big broadsheet mono
Plain-language description of the capability

↳ src/file.ts          [STAMP LABEL]
fact line, real info    [value]
```

- The corner stamp is for a **real number** (a count, a measured
  latency, a version). Label + value.
- The meta line is **one short real fact** ("node 18+, bun 1.0+"),
  never "@handle · 340★ · 2026 EDITION".
- No bookmark buttons. No impression counters. No "By @handle"
  bylines on capability cards.
- The repo link deep-links to the actual source file, not the repo
  root.
- Title line-height is 1.12. Never lower it to squeeze a card.

---

## 6. Support sections

Two levels, both quiet:

1. **Hero icons**: two borderless icons (star, heart) under the
   telemetry card, same muted color as the "verified against" text.
   Border and ink appear on hover only.
2. **Main support card** at the bottom: full-row postcard with
   horizontal rules only. On hover, 35px vertical crop ticks grow
   from both ends of the rules. Buttons: Star (primary), Share
   (Web Share API with clipboard fallback), Sponsor (hidden until
   `links.sponsor` is set).

Copy should be honest: "If it saved you an afternoon of config
wrangling, star the repo or pass the menu along."

---

## 7. Frontend quality bar (the "iOS-level" list)

The template ships with all of this. Do not remove it while
customizing:

- Anchor jumps land below the sticky header (`scroll-margin-top`)
- Sticky masthead collapses after 40px of scroll
- Scroll-spy highlights the current section in the nav
- `:focus-visible` rings in broadsheet ink
- `prefers-reduced-motion` kills all animation
- Safe-area insets for notched phones
- Touch press feedback (scale 0.97) on devices without hover
- Mobile drawer: scroll-lock, Escape closes, 44px targets
- Print stylesheet
- No horizontal overflow from 320px to 1920px. Test, do not
  assume.

---

## 8. Keep the style, change the content

Everything visual in this template is intentional broadsheet
design: 1px rule cages, Space Mono headlines, Rubik body, tilted
boxed stamps, paper texture, dark night edition. Customize content
through `project.config.ts`. Only touch the CSS when adding a new
component, and match the existing tokens.
