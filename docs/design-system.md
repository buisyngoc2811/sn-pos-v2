# SN POS V2 design system

Status: source of truth  
Theme: premium retail, pink + white  
Default mode: light  
Audience: one cashier operating a small clothing store

## Direction

The interface should feel like a well-run clothing counter: bright, composed, tactile, and quick. White is the merchandising surface, warm ink carries information, and raspberry pink identifies the action or state that matters now.

The signature device is the **selection rail**: active navigation items, selected product variants, and focused order rows may use a 3px pink inset edge plus a pale rose background. Use it only for current selection, never as decoration.

Avoid gradients, glass effects, oversized cards, decorative blur, large empty areas, and pink on every surface. Premium comes from precision and restraint.

## Colors

All product code uses semantic tokens; raw palette values stay in `src/index.css`.

| Token | Light | Purpose |
|---|---:|---|
| `background` | `#F8F7F8` | App canvas |
| `card` / `popover` | `#FFFFFF` | Main surfaces and overlays |
| `foreground` | `#211A1E` | Primary text |
| `muted-foreground` | `#6E6369` | Secondary text; minimum body-text neutral |
| `border` | `#E6E1E4` | Dividers and surface boundaries |
| `input` | `#D8D1D5` | Input borders |
| `primary` | `#D92D73` | Primary actions, selection, focus |
| `primary-foreground` | `#FFFFFF` | Text/icons on primary |
| `accent` | `#FBE8F0` | Selected and highlighted backgrounds |
| `accent-foreground` | `#9D2356` | Text/icons on accent |
| `secondary` | `#F7E9EF` | Quiet pink controls |
| `destructive` | `#C92A3A` | Delete, cancel sale, critical errors |
| `success` | `#18794E` | Paid, completed, in stock |
| `warning` | `#A15C00` | Low stock and attention states |

Pink communicates priority or selection, not status. Success, warning, and destructive states keep their own colors and always pair color with text or an icon.

The optional dark token set is provided for future use, but the pink-and-white light theme is the product default.

## Typography

Use **Geist Variable** for every interface role. It is already local to the project, highly legible at cashier density, and keeps the product fast and cohesive. Use tabular numerals globally so prices, quantities, and totals align.

| Role | Size / line | Weight | Use |
|---|---:|---:|---|
| Display | `30 / 36px` | 650 | Rare top-level overview only |
| Page title | `24 / 30px` | 650 | One per view |
| Section title | `18 / 24px` | 600 | Panels and dialogs |
| Body | `14 / 20px` | 400 | Default UI copy |
| Body strong | `14 / 20px` | 550 | Labels and emphasized values |
| Small | `13 / 18px` | 450 | Dense table support text |
| Caption | `12 / 16px` | 500 | Metadata and helper text |
| Price total | `24 / 28px` | 700 | Checkout totals only |

Use sentence case. Labels are direct nouns; actions use plain verbs such as “Add product”, “Hold sale”, and “Pay now”. Never use uppercase paragraphs or letter-spaced headings.

## Spacing

Base unit: `4px`.

| Token | Value | Typical use |
|---|---:|---|
| `1` | 4px | Icon-to-label micro gap |
| `2` | 8px | Related controls |
| `3` | 12px | Compact cell/control padding |
| `4` | 16px | Default panel padding and field gap |
| `5` | 20px | Mobile page gutter |
| `6` | 24px | Desktop page gutter and section gap |
| `8` | 32px | Major section separation |
| `10` | 40px | Dialog breathing room |
| `12` | 48px | Rare top-level separation |

Keep neighboring content compact. Do not use spacing above `48px` inside the application shell. Dense tables may use 10–12px vertical cell padding; touch layouts use at least 12px.

## Radius

| Token | Value | Use |
|---|---:|---|
| `xs` | 4px | Tiny badges and color swatches |
| `sm` | 6px | Checkboxes, segmented items |
| `md` | 8px | Inputs and buttons |
| `lg` | 10px | Cards and menus |
| `xl` | 12px | Dialogs and drawers |
| `2xl` | 16px | Large mobile sheets only |

Do not use pill shapes for ordinary buttons or cards. Reserve full pills for status badges, compact filters, and variant chips.

## Shadows

Borders create structure; shadows indicate elevation.

| Token | Use |
|---|---|
| `shadow-xs` | Subtle raised control |
| `shadow-sm` | Hovered card or sticky panel |
| `shadow-md` | Menus, popovers, drawers |
| `shadow-lg` | Dialogs only |

Cards at rest use a 1px border and no shadow. Never stack a strong border with a strong shadow.

## Component rules

### Buttons

- Heights: 36px compact, 40px default, 44px touch-critical.
- Primary pink is reserved for the single most important action in a region.
- Secondary buttons are white with a visible border; tertiary buttons are text/ghost.
- Destructive actions are red and require confirmation only when loss is not reversible.
- Icons are Lucide, 16–18px, with consistent 1.75–2px stroke.
- Hover changes color or shadow without scaling or shifting layout.
- Disabled controls remain readable and do not rely on opacity below 45%.

### Inputs and search

- Default height is 40px; labels sit above controls.
- Search may include a leading icon and a visible clear action.
- Focus uses the pink ring plus border change; error adds text below the field.
- Placeholder text is an example, never a replacement for a label.
- Use `inputmode="numeric"` or `decimal` for quantity, price, and payment fields.

### Cards and panels

- Use cards only to group related controls or data.
- Default padding is 16px; dense panels may use 12px.
- Card titles and actions share one compact header row.
- Nested cards are prohibited; use dividers or muted subsections instead.

### Tables and lists

- Row height: 44px compact, 48px default.
- Align text left, quantities center, and money/numbers right.
- Keep headers visible in long lists.
- Selected rows use the pink selection rail, pale accent fill, and an accessible selected state.
- Row actions appear on focus as well as hover.
- On narrow screens, preserve the primary columns and move secondary details into an expandable row/card; do not squeeze every desktop column.

### Badges

- Height 22–24px, compact label, status color plus readable text.
- Pink badges mean selected or featured, never success.
- Do not use badges as buttons unless they are explicitly filter chips.

### Navigation

- Active navigation uses the selection rail and accent surface.
- One level of navigation is sufficient; avoid nested enterprise menus.
- Icon and label remain visible on desktop. Tablet may collapse labels. Mobile uses a drawer or bottom-level navigation with only core destinations.

### Overlays and feedback

- Popovers close with Escape and restore focus.
- Dialog width follows its task; avoid one oversized universal dialog.
- Use a right-side sheet for contextual detail and a centered dialog for decisions.
- Toasts confirm completed actions; inline messages explain errors where they occur.
- Motion is 150ms for hover/focus and 200–240ms for overlays, with reduced-motion support.

## Layout rules

- Application canvas fills the viewport; avoid a centered marketing-site container.
- Desktop shell: 224px navigation rail, flexible content, optional 360–420px task panel for checkout/detail workflows.
- Main content gutter: 24px desktop, 20px tablet/mobile.
- Content max width is 1600px; data-heavy areas may fill available width.
- Top bars are 56px. Keep key actions visible without an oversized header.
- Use a 12-column grid for overview content and CSS grid/flex for task flows.
- Maintain one primary scroll region per view. Sticky totals and actions must not cover content.
- Minimum pointer target is 40×40px on desktop and 44×44px on touch layouts.
- Z-index layers: base `0`, sticky `10`, dropdown `30`, sheet `40`, dialog `50`, toast `60`.

## Responsive rules

Breakpoints follow Tailwind defaults and are content-driven:

| Range | Behavior |
|---|---|
| `< 640px` mobile | Single column; 20px gutters; navigation hidden behind a trigger; sheets become near-fullscreen; checkout actions may stick to bottom safe area |
| `640–1023px` tablet | Compact/collapsible navigation; 8-column grid; split panes stack when either side would fall below 320px |
| `1024–1279px` compact desktop | Full navigation; 12-column grid; optional detail panel can overlay if space is constrained |
| `≥ 1280px` desktop | Full shell and simultaneous work panels; 24px gutters; maximum information density |

Required verification widths: 320, 375, 768, 1024, and 1440px.

- No page may create viewport-level horizontal scrolling.
- Tables may scroll within their own labeled region when card conversion would hide essential comparison.
- Never hide a critical action solely to make a layout fit.
- Preserve logical DOM and keyboard order when visual columns rearrange.
- Account for mobile safe-area insets on sticky bottom controls.

## Accessibility and quality gates

- Text and interactive controls meet WCAG AA contrast.
- Every interactive element is keyboard reachable with visible focus.
- Color is never the only state indicator.
- Tab order follows visual order; navigation-heavy shells provide a skip link.
- Icons have accessible names when meaningful and are hidden when decorative.
- Loading, empty, error, and disabled states are defined for every data component.
- Test both pointer and touch behavior; hover-only actions must also appear on focus.
