# Pencil & Prompt Lab

The evidence room for Pencil & Prompt's experiment series. Every Drop and Rig episode gets a page here, with every take playable and unedited.

- **Drop:** a new model on the same setup, run on every model release.
- **Rig:** the same model on a new setup, run between Drops.

## What is here

Each episode folder holds:

- `takes/<brief>/<letter>/attempt-<n>.*`: the model's output, byte for byte as returned. The one exception is disclosed on the page: where a reply invented a file listing that carries the account name, the name is replaced with `[name]`.
- `data.json`: the page before the reveal, letters only.
- `reveal.json`: which model is which, the verdicts, the consistency notes, the method and the fingerprints.
- `footnotes/`: anything the episode's page calls a footnote.

The briefs themselves stay sealed. Each is published as the SHA-256 of the exact message sent to the model, and a brief's text is released when it retires, so anyone can check it against its fingerprint.

## How it is made

A private export script writes this site. It copies only what the episode's publication manifest allows, and it refuses to write anything if a personal name or an email address appears in its output.

The site is served by GitHub Pages straight from this folder. It has no build step.

## Takes run in a sandbox

Every take is HTML written by a model. The pages show them in sandboxed frames: scripts run, but the frame has no access to this site's origin.
