# UI Components — `components/ui`

This file lists the reusable UI primitives and common exports found in `components/ui`.

Common files and expected exports

- `accordion.tsx`
  - Exports: `Accordion`, `AccordionItem` (or `default Accordion` plus `AccordionItem`).
  - Use: Collapsible sections for details/settings.

- `badge.tsx`
  - Exports: `Badge` component and `BadgeProps` types.
  - Use: Status badges, tags, or small indicators.

- `button.tsx`
  - Exports: `Button` (default), `buttonVariants` helper, and possibly `IconButton`.
  - Use: Standardized button styles (primary, secondary, ghost).

- `card.tsx`
  - Exports: `Card`, `CardHeader`, `CardBody`, `CardFooter`.
  - Use: Grouping content and creating consistent surfaces.

- `input.tsx`
  - Exports: `Input`, `Label`, `InputProps`.
  - Use: Form fields shared across login and lead edit forms.

- `select.tsx`
  - Exports: `Select`, `Option`.
  - Use: Styled dropdowns; use `statusOptions` from domain code when applicable.

- `separator.tsx`
  - Exports: `Separator`.
  - Use: Visual dividers.

- `skeleton.tsx`
  - Exports: `Skeleton`, `SkeletonText`, `SkeletonCircle`.
  - Use: Loading placeholders for async content.

- `sonner.tsx`
  - Exports: `Toaster` wrapper and likely re-exports of `toast` helpers.
  - Use: Notifications and toast messages.

- `table.tsx`
  - Exports: `Table`, `TableRow`, `TableCell`, and helpers like `useTable`.
  - Use: Displaying tabular lead data with sorting and paging.

- `tabs.tsx`
  - Exports: `Tabs`, `TabList`, `TabPanel`.
  - Use: Switching views within pages.

Design guidance

- Keep the primitives unopinionated; page-level components compose them for behavior and data wiring.
- Re-export small helpers (e.g., `buttonVariants`) for consistency when styling outside the component file.
