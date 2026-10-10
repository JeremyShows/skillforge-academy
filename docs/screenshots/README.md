# Documentation screenshots

The PNGs in this folder show the legacy certification study workspace. They do not represent every current or experimental course-platform surface and are not used in the README or the current learner getting-started guide. Refresh and review the images before presenting them as current product screenshots.

## How they're produced

The capture script uses deterministic demo data and Playwright. Demo data is generated locally and must not contain real learner state. Screenshots are captured from the view in the running app; do not treat an old PNG as evidence for a new course-runtime feature.

To regenerate them, install the locked project dependencies, install Playwright Chromium if needed, run `npm run dev`, and capture with `npm run screenshots`. The capture flow writes PNGs under this directory.

## Current scope

| File | Legacy view |
| --- | --- |
| `01-command-center.png` | Study dashboard |
| `02-learning-paths.png` | Certification learning paths |
| `03-practice-lab.png` | Practice question |
| `04-mock-exam.png` | Mock question |
| `05-recall-deck.png` | Recall card |
| `06-performance.png` | Certification analytics |
| `07-multi-select.png` | Multi-select question |
| `08-track-switcher.png` | Certification track selector |