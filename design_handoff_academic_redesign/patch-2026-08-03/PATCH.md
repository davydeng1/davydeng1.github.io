# Patch — 2026-08-03

Two changes on top of the redesign already in this repo.

## 1. Bigger, anatomically real *C. elegans* hero figure

**`_layouts/home.html`** — inside `.hero-inner`, delete the whole
`<div class="worm-marker"> … </div>` block (the 108×26 squiggle) and paste
`worm-figure.html` in its place.

The figure is pure SVG, no JS, no image asset. Structure:

| layer | what it is |
|---|---|
| stroke group 1 (`--accent`, 0.5 α) | tapered cuticle outline, built from 6 overlapping dashed segments so the body narrows head→tail |
| stroke group 2 (`--paper`) | same paths, 2.6px thinner — knocks out the interior so the outline reads as a body wall |
| stroke group 3 (`--accent`) | pharynx wash, dorsal + ventral nerve cords, and dashed cords whose dashes are the neuron cell bodies |
| ellipse + circle | nerve ring and anterior sensory neuron |
| leader lines + `.wf-label` text | NERVE RING / VENTRAL NERVE CORD / TAIL callouts and the ≈1 MM scale bar |

Fully fluid — `viewBox="0 0 580 172"`, width 100%, capped by
`.worm-fig { max-width: 660px }`.

**Caption:** *Caenorhabditis elegans*: 302 neurons, ~7,000 synapses.
(The old `302 neurons` stat line is gone — it lived in `.worm-label`.)

## 2. Accent color is one token

Right now the accent is hardcoded as `--terra: #b56a3f` in CSS and as five
rgb literals in `connectome.js`. `accent-tokens.css` collapses that into
`--accent` + five `--accent-rgb-*` triplets, with three ready themes:

| theme | hex | set with |
|---|---|---|
| terracotta (current) | `#b56a3f` | default |
| navy | `#2f4d80` | `<html data-accent="navy">` |
| sage | `#5f7f62` | `<html data-accent="sage">` |

Append `accent-tokens.css` to `assets/css/style.css`, then replace every
`var(--terra)` with `var(--accent)` (the shim alias keeps the old name
working in the meantime). To ship one theme permanently, just edit the
`:root` values and drop the two `[data-accent]` blocks.

For the switchable version, set the attribute in `_layouts/default.html`:

```liquid
<html lang="en" data-accent="{{ site.accent | default: 'terracotta' }}">
```

and add `accent: navy` to `_config.yml`.

## 3. `assets/js/connectome.js` — read the token

Add near the top of the animation setup:

```js
var cs = getComputedStyle(document.documentElement);
var AC = {
  base:   cs.getPropertyValue('--accent-rgb').trim()        || '196,116,78',
  mid:    cs.getPropertyValue('--accent-rgb-mid').trim()    || '214,150,108',
  bright: cs.getPropertyValue('--accent-rgb-bright').trim() || '224,164,120',
  glow:   cs.getPropertyValue('--accent-rgb-glow').trim()   || '212,140,96',
  hot:    cs.getPropertyValue('--accent-rgb-hot').trim().split(',').map(Number)
};
```

Then swap the five literals (line numbers from the current file):

| line | from | to |
|---|---|---|
| 115 | `'rgba(196,116,78,'` | `'rgba(' + AC.base + ','` |
| 129 | `'rgba(214,150,108,0.7)'` | `'rgba(' + AC.mid + ',0.7)'` |
| 131 | `'rgba(224,164,120,0.95)'` | `'rgba(' + AC.bright + ',0.95)'` |
| 144–145 | `'rgba(212,140,96,'` | `'rgba(' + AC.glow + ','` |
| 161 | `'rgba(196,116,78,'` | `'rgba(' + AC.base + ','` |

If there is a neuron-fill interpolation from resting blue to accent, drive its
target from `AC.hot[0..2]` instead of the hardcoded `204, 128, 84`.

The resting edge/neuron blue (`74,108,164`) is intentionally **not** themed —
it's the ink-blue link color and stays constant across all three accents.

## Files here

- `worm-figure.html` — drop-in hero figure markup
- `accent-tokens.css` — accent tokens, three themes, `.worm-fig` styles
