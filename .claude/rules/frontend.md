---
description: Enforce consistent HTML, CSS, and SCSS layout rules
paths:
  - "**/*.html"
  - "**/*.css"
  - "**/*.scss"
  - "**/*.tsx"
  - "**/*.jsx"
  - "**/*.vue"
alwaysApply: false
---

# Frontend layout and SCSS rules

## Purpose
This rule applies when editing frontend markup and styles.
Prioritize consistency, low complexity, semantic HTML, and reusable SCSS patterns.

## How to work
- Read this file before making changes.
- When touching UI, first inspect nearby components and match existing patterns before introducing anything new.
- Prefer editing existing styles and components over creating parallel variants.
- Keep changes small, predictable, and easy to review.
- Before finishing, verify that spacing, sizing, and component structure are consistent with this file.

## Layout and spacing rules
- Use a 4px spacing scale only: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.
- Do not introduce arbitrary spacing values like 5px, 10px, 14px, 18px, 22px, 27px, 36px.
- Prefer `gap` for layout rhythm inside flex/grid containers instead of margin chains.
- Use margin for separation between blocks, not for internal component layout when `gap` can do it.
- Keep vertical rhythm consistent inside each component: related elements should use the same spacing token.
- Use one container width system across the app. Do not invent a new max-width for each page.
- Default content width should be reused from existing layout tokens or variables.
- Prefer padding values that come from the spacing scale; avoid asymmetric padding unless there is a clear reason.
- Keep section spacing larger than card spacing, and card spacing larger than inline spacing.

## Sizing and consistency rules
- Reuse the same heights for the same component types across the app.
- Buttons of the same size must share the same height, horizontal padding, font size, border radius, and icon size.
- Inputs, selects, and buttons should align visually and usually share a height.
- Cards of the same type must share the same padding and border radius.
- Use a small, fixed size scale for typography and components. Do not create near-duplicate sizes.
- Avoid random values like 13px, 15px, 17px, 19px, 23px, 26px, 30px unless already required by the system.
- Prefer a limited radius scale such as 6, 8, 12, 16, 9999.
- Use line-height values appropriate to the role: tighter for headings, looser for body text.

## HTML rules
- Prefer semantic HTML: `header`, `nav`, `main`, `section`, `article`, `aside`, `footer`, `button`, `label`, `form`, `input`.
- Do not add wrapper `div`s unless they are needed for layout, styling, or accessibility.
- Keep DOM nesting shallow. Avoid more than 3 nested wrapper levels inside a normal section if possible.
- Use buttons for actions and links for navigation.
- Every form control must have a proper label.
- Preserve a logical heading hierarchy.

## CSS and SCSS rules
- Prefer class-based styling. Avoid tag selectors for component styling, except for small document-level defaults.
- Avoid deep selector nesting.
- Nest SCSS to a maximum of 3 levels when possible.
- Do not style through long descendant chains like `.page .section .card .content .title`.
- Keep specificity low. Prefer a flat structure and predictable classes.
- Do not use `!important` unless overriding third-party CSS and no safer option exists.
- Extract repeated values into variables, tokens, or mixins.
- Use SCSS variables for color, spacing, radius, z-index, and breakpoints.
- Use mixins only for real repetition; do not hide simple CSS behind unnecessary abstractions.
- Prefer CSS custom properties for runtime theming, and SCSS variables for compile-time constants.
- Group styles by component, not by property type.
- Keep each component's styles in one place.

## Recommended SCSS structure
- `tokens/` for colors, spacing, radius, shadows, breakpoints, typography.
- `base/` for reset, typography defaults, and utility primitives.
- `components/` for isolated reusable UI parts.
- `layouts/` for page shells, grids, containers, header/sidebar/footer.
- `pages/` only for true page-specific overrides.

## SCSS token guidance
- Create and reuse spacing tokens, for example: `$space-1: 4px; $space-2: 8px; $space-3: 12px; $space-4: 16px; $space-5: 20px; $space-6: 24px; $space-8: 32px;`.
- Create component size tokens for heights such as small / medium / large instead of hardcoding values repeatedly.
- Create radius tokens and font-size tokens. Reuse them everywhere.
- Breakpoints must be centralized; never scatter ad hoc media queries.

## Responsive rules
- Work mobile-first.
- Start from the narrow layout and enhance for larger screens.
- Use flex/grid, `minmax()`, and wrapping before adding many breakpoint-specific overrides.
- Keep breakpoint count small and consistent.
- Do not create component-specific random breakpoints unless necessary.
- Ensure tappable controls remain large enough on mobile.

## Visual consistency checks
- Before finalizing, compare the updated component against similar existing components.
- Check spacing above and below the component.
- Check alignment of text, icons, and controls.
- Check that adjacent components use the same padding, radius, border style, and shadow logic.
- Remove redundant wrappers, redundant declarations, and dead styles.

## What to avoid
- Do not create a new spacing or font-size if an existing one is close enough.
- Do not duplicate a component just to make a tiny visual variation.
- Do not use margins as a substitute for proper flex/grid layout.
- Do not hardcode magic numbers without explaining why.
- Do not over-nest SCSS.
- Do not mix multiple patterns for the same UI role.
- Do not output overly verbose markup when a simpler structure works.

## Done criteria
A frontend change is done only if:
- spacing uses the approved scale,
- component sizes are consistent with existing patterns,
- HTML is semantic and not over-wrapped,
- SCSS stays low-specificity and maintainable,
- repeated values are tokenized,
- the result is responsive and visually consistent.

