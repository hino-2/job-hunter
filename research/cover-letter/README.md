# Cover-letter generation research (paused 2026-08-26)

Feature development is **suspended**. This folder is a frozen snapshot so the work can be
resumed later without repeating it. Nothing here is wired into the application — no backend
module, no endpoint, no UI. `spec/` and `CHANGELOG.md` are untouched.

The whole folder is git-ignored (`.gitignore`: `research/`): `facts.txt` and `resume.txt`
contain the owner's personal career data and the repository is public.

## Goal

Generate a Russian cover letter for a given vacancy from the owner's resume, using a free or
local model. Anthropic models were off-limits for generation during almost the whole
investigation (the owner lifted the ban only at the very end, for one comparison run).

## What is here

| File | What it is |
|---|---|
| `prompt-v12.txt` | The final prompt, fully rendered (fact card + rules), targeting the Clear Mind vacancy. This is the artifact worth keeping. |
| `facts.txt` | The fact card: resume rewritten as facts, each bound to exactly one employer, with the degree of participation preserved (solo / team / maintenance only). |
| `resume.txt` | Source resume the fact card was built from. |
| `clearmind-vacancy.txt` | The vacancy text, scraped from the hh.ru public page (the record lives in the app DB, which stores the URL only — no description column). |
| `gigachat-runner.mjs` | Generator + automated audit. Builds the prompt, calls GigaChat, writes N letters, prints the audit per letter. |
| `audit-file.mjs` | The same audit applied to an existing letter file, for letters produced elsewhere. |
| `sample-gigachat-2-max.txt` | Best GigaChat-2-Max output (prompt v12, run 3). |
| `sample-sonnet5.txt` | Best Sonnet 5 output on the same prompt, for reference. |

## How to run the GigaChat generator

```bash
# TLS: Sber serves a Russian Trusted CA chain that Node does not trust out of the box.
# Build the bundle once (do NOT disable TLS verification):
#   openssl x509 -in russian_trusted_root_ca.cer -outform PEM >  ru-ca-bundle.pem
#   openssl x509 -in russian_trusted_sub_ca.cer  -outform PEM >> ru-ca-bundle.pem
#   tr -d '\r' < ru-ca-bundle.pem > ru-ca.pem
# Certificates: https://gu-st.ru/content/Other/doc/russian_trusted_{root,sub}_ca.cer

NODE_EXTRA_CA_CERTS=/path/to/ru-ca.pem \
GIGACHAT_AUTH_KEY=<base64 client_id:client_secret> \
  node gigachat-runner.mjs <output-dir> 0.5 GigaChat-2-Max 3 <tag>

node audit-file.mjs <letter-file> [...]
```

The key is passed on the command line only and is never written into a file. Rotate it — it
was typed into a chat session during this research.

## What was learned

1. **Quality came from the prompt, not from the model.** The same GigaChat-2-Max, given the
   raw resume plus the vacancy as file attachments and a one-line instruction, produced
   `[Ваше имя]` placeholders, never named the company, mixed employers and invented Kubernetes.
2. **The fact card is the core of the approach.** Feeding the resume verbatim makes the model
   merge employers. Binding every fact to exactly one employer removes most of that.
3. **Degree of participation must be stated explicitly in the card**, otherwise team work is
   rewritten as solo work ("the team built X" becomes "I built X"). This was the single worst
   failure mode and it is invisible to any automated check.
4. **Naming a technology anywhere in the prompt raises the chance the model attributes it to
   the candidate** — hence the explicit blacklist of technologies the vacancy asks for and the
   candidate does not have.
5. **Every new rule shifts the failure elsewhere.** Twelve prompt revisions: tightening
   coverage broke attribution, tightening fabrication rules made the model drop employer names,
   the tone block resurrected banned phrasings, the anti-filler rule cost technology coverage.
   Rules stop paying off around v10 — the model then violates the intent, not the letter.
6. **Model comparison on the identical prompt v12** (3 runs each): GigaChat-2-Max got
   attribution right but dropped 4 of 8 required technologies in its best run; Sonnet 5 kept
   full coverage in all 3 runs and preserved participation degrees unprompted. Local ollama
   models (`qwen3:1.7b` / `4b-instruct` / `8b`, earlier phase) were clearly below both.

## Where to resume

- Coverage is the open defect on GigaChat: make the required-technology list a checklist the
  model verifies before returning, without touching the rest of the prompt.
- The fact card is currently hand-written for one candidate and the prompt is hand-targeted at
  one vacancy. Productising means generating both — the card from the resume once, the vacancy
  block per application — and that needs the vacancy description, which the app does not store.
- Note the §12 constraint before building anything: this feature is not in the spec, so it
  needs a spec section first.
