# StrokeRehab Agent Guide

## Product Direction

StrokeRehab is a stroke neurorehabilitation training website. Build it as a practical clinical training tool, not a marketing page. The first screen should help a therapist or patient start, configure, or review training with minimal friction.

## Reference Project

Use `P:/3_WebSite/VisionTrainer` as the UI/UX reference. Keep the same calm clinical language:

- Warm gray app background, white cards, clear borders, and restrained shadows.
- Medical blue as the main action color.
- Soft sage for success and ready states.
- Amber for warnings and red only for real errors or destructive actions.
- Large readable typography with `Inter` and `Noto Sans TC`.
- Touch-friendly controls: primary buttons at least 48px tall, larger controls for training actions.
- Responsive card grids that collapse cleanly on tablets and phones.

Core palette:

```css
--bg: #f2f4f3;
--bg-panel: #f9f9fc;
--bg-card: #ffffff;
--accent: #005eb8;
--accent-dark: #00478d;
--accent-hover: #005db6;
--success: #8ba88e;
--error: #ba1a1a;
--warning: #d29922;
--text-primary: #1a1c1e;
--text-secondary: #424752;
--text-muted: #727783;
--border: #c2c6d4;
--border-hover: #727783;
```

## Interaction Principles

- Prioritize accessibility, readability, and predictable workflows over visual novelty.
- Treat rehabilitation sessions as stateful clinical workflows: select user, choose module, configure intensity, run task, save/review outcome.
- Avoid decorative cards inside cards. Use cards for repeated modules, metrics, dialogs, and framed training panels.
- Use icons for concrete tools/actions when available, but do not rely on icons alone unless the action is obvious.
- Do not put instruction-heavy copy directly into the app chrome. Keep task guidance concise and close to the control or training stage it affects.
- Preserve clear active, hover, focus, disabled, loading, success, warning, and error states.

## CSS Conventions

- Start from `style.css` in this folder.
- Keep design tokens in `:root` and reuse them instead of hard-coded colors.
- Use class names that describe reusable UI roles: `.btn`, `.card`, `.training-card`, `.setting-row`, `.module-config-panel`, `.training-stage`, `.metric-card`.
- Prefer CSS grid for module and metric collections. Use flex for toolbars and compact control rows.
- Keep radii aligned with VisionTrainer: 8px for controls, 16px for cards and primary buttons, 24px only for larger containers.
- Avoid viewport-width font scaling and negative letter spacing.

## Rehabilitation-Specific Notes

- Training modules should communicate the target domain clearly, such as motor control, attention, balance, visuospatial scanning, reaction time, or cognition.
- Store session data in a way that can later support export and clinical review.
- Any medical language should be conservative: this is a training and tracking tool, not a diagnostic or treatment replacement.
- Include settings for intensity, duration, rest, affected side, assist level, and safety prompts when relevant.
- For full-screen exercises, provide an obvious pause/stop action and avoid accidental destructive exits.

## Verification Checklist

- Layout works at desktop, tablet, and mobile widths.
- Text does not overflow buttons, cards, or nav items.
- Primary actions are keyboard focusable and visible.
- Color contrast is readable on the warm gray and white surfaces.
- Training screens have stable dimensions so dynamic content does not shift the layout.
- Build or static validation has been run when project tooling exists.
