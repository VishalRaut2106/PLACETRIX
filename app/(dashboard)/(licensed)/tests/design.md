# Design & Layout Specification: Institute Tests Client

> **Reference Specification Document**  
> **Source Component**: `app/(dashboard)/(licensed)/tests/InstituteTestsClient.tsx`  
> **Target Usage**: Reference guide for layout, typography, padding, colors, interactive states, and component hierarchy within dashboard assessment pages.

---

## 1. Page Shell & Root Container Layout

| Property | Value / Tailwind Class | Exact Pixel / CSS Value | Description |
| :--- | :--- | :--- | :--- |
| **Element** | `<div>` | — | Root page wrapper |
| **Display & Flow** | `flex flex-col` | `display: flex; flex-direction: column` | Vertical flow |
| **Section Gap** | `gap-6` | `24px` (`1.5rem`) | Vertical gap between Header, Controls, and Card List |
| **Horizontal Padding** | `px-4 sm:px-4 md:px-8` | `16px` (<768px), `32px` (≥768px) | Responsive side padding |
| **Vertical Padding** | `py-6 sm:py-8` | `24px` (<640px), `32px` (≥640px) | Top padding |
| **Bottom Padding** | `pb-24 sm:pb-8` | `96px` (<640px), `32px` (≥640px) | Extra bottom clearance on mobile for floating FAB |
| **Width & Overflow** | `max-w-full overflow-x-hidden` | `max-width: 100%; overflow-x: hidden` | Prevents horizontal viewport scrollbars |

```html
<div className="flex flex-col gap-6 px-4 py-6 sm:py-8 md:px-8 pb-24 sm:pb-8 max-w-full overflow-x-hidden">
  <!-- Page Header -->
  <!-- Controls Toolbar -->
  <!-- Test Cards List Area -->
  <!-- Mobile Floating Action Button -->
</div>
```

---

## 2. Page Header

Responsive header containing the page title, descriptor, and desktop primary action button.

```
┌────────────────────────────────────────────────────────┬──────────────────────┐
│  Tests                                                 │  [+] Create Test     │
│  Manage, schedule, and review assessment tests...      │  (Hidden on mobile)  │
└────────────────────────────────────────────────────────┴──────────────────────┘
```

### Layout & Styles
- **Container**: `flex flex-col sm:flex-row sm:items-center justify-between gap-4`
- **Title (`<h1>`)**:
  - **Font**: `font-cirka` (display serif typeface)
  - **Size**: `text-3xl` (`30px` / `1.875rem`, `line-height: 2.25rem` / `36px`)
  - **Weight**: `font-bold` (`700`)
  - **Letter Spacing**: `tracking-tight` (`-0.025em`)
  - **Color**: `text-foreground`
- **Subtitle (`<p>`)**:
  - **Size**: `text-sm` (`14px` / `0.875rem`, `line-height: 1.25rem` / `20px`)
  - **Margin**: `mt-0.5` (`2px`)
  - **Color**: `text-muted-foreground`
- **Desktop Create Button** (`Button`):
  - **Display**: `hidden sm:inline-flex gap-2 shrink-0`
  - **Variant**: `default` (`h-9 px-4 py-2 text-sm font-medium rounded-md`)
  - **Icon**: `Plus` (`size-4` / `16px × 16px`)
  - **Text**: `"Create Test"`

---

## 3. Controls Toolbar & Search

A unified controls bar featuring an input search group with keyboard shortcuts and a slide-over filter sheet trigger.

```
┌───────────────────────────────────────────────────────────────────────┬──────────────┐
│ [🔍] Search tests by title or description...                     [⌘K] │ [⚙ Filters 2]│
└───────────────────────────────────────────────────────────────────────┴──────────────┘
 [Active filters: Status: Live ✕] [Author: Me ✕] [Clear all]
```

### A. Search & Filter Bar Container
- **Container**: `flex items-center gap-2 w-full min-w-0`
- **Search Group** (`InputGroup`):
  - **Classes**: `flex-1 min-w-0`
  - **Start Addon** (`InputGroupAddon align="inline-start"`):
    - Default Icon: `Search` (`size-4 text-muted-foreground` / `16px`)
    - Pending / Loading Icon: `Loader2` (`size-4 text-primary animate-spin` / `16px`)
  - **Input** (`InputGroupInput`):
    - **Classes**: `min-w-0`
    - **Placeholder**: `"Search tests by title or description..."`
  - **End Addon** (`InputGroupAddon align="inline-end"`):
    - Active Search Clear Button (`InputGroupButton`):
      - **Size / Variant**: `size="icon-xs" variant="ghost"`
      - **Icon**: `X` (`size-3.5` / `14px`)
    - Inactive Keyboard Hint (`Kbd`):
      - **Classes**: `hidden sm:inline-flex items-center gap-0.5 text-[11px] px-1.5 h-5 border border-border/80 bg-muted/80 font-medium`
      - **Icon**: `Command` (`size-3` / `12px`) + `"K"`

### B. Filter Sheet Trigger Button (`Button` via `SheetTrigger`)
- **Variant / Size**: `variant="outline" size="sm"`
- **Classes**: `h-9 gap-1.5 shrink-0 px-2.5 sm:px-3`
- **Icon**: `SlidersHorizontal` (`size-4` / `16px`)
- **Label**: `<span>Filters</span>`
- **Active Counter Badge** (`Badge`):
  - **Variant**: `secondary`
  - **Classes**: `h-4 px-1 text-[10px] font-semibold`

### C. Active Filter Badges Bar
- **Visibility**: Rendered only when `activeFilterCount > 0`
- **Container**: `flex flex-wrap items-center gap-1.5 pt-1`
- **Prefix Text**: `<span className="text-xs text-muted-foreground">Active filters:</span>`
- **Filter Pill** (`Badge`):
  - **Variant**: `secondary`
  - **Classes**: `gap-1 font-normal`
  - **Label Layout**: `Key: <span className="font-medium capitalize">{value}</span>`
  - **Remove Button**: `<button type="button" className="hover:opacity-70 ml-0.5 rounded-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"><X className="size-3" /></button>`
- **Clear All Button** (`Button`):
  - **Variant / Size**: `variant="ghost" size="xs"`
  - **Classes**: `h-5 text-muted-foreground hover:text-foreground text-xs`
  - **Text**: `"Clear all"`

---

## 4. Filter & Sorting Sheet (`SheetContent`)

Side slide-over sheet managing local draft filters with separate Reset & Apply actions.

- **Sheet Side & Width**: `side="right" className="flex flex-col gap-0 p-0 sm:max-w-md"` (`max-width: 28rem` / `448px`)

### A. Sheet Header (`SheetHeader`)
- **Padding & Border**: `p-5 sm:p-6 border-b` (`20px` / `24px` padding)
- **Title Row**: `flex items-center justify-between`
  - Title Group: `flex items-center gap-2`
    - `SheetTitle`: `text-base font-semibold` (`16px`, `600`) - `"Filters & Sorting"`
    - Active Badge (`Badge`): `variant="secondary" className="h-4.5 px-1.5 text-[10px] font-semibold"` - `"{count} active"`
  - Reset Action (`Button`):
    - `variant="ghost" size="xs" className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"`
    - Icon: `RotateCcw` (`size-3 mr-1` / `12px`)
    - Label: `"Reset"`
- **SheetDescription**: `text-xs text-muted-foreground` (`12px`) - `"Refine test catalog and customize list ordering."`

### B. Sheet Body & Filter Groups
- **Scroll Container**: `flex-1 overflow-y-auto p-5 sm:p-6 space-y-5`
- **Section Headers (`Label`)**: `text-xs font-semibold uppercase tracking-wider text-muted-foreground`
- **Inter-Section Separator**: `<Separator />`

| Filter Group | Layout / Grid | Control Element & Styling | Options |
| :--- | :--- | :--- | :--- |
| **1. Sort By** | `space-y-2` | `Select` trigger: `w-full h-9 text-xs`<br>`SelectContent`: grouped with `SelectLabel` (`text-xs font-semibold`) & `SelectSeparator` | Default, Newest Created, Oldest Created, Title (A→Z, Z→A), Most/Fewest Qs, Duration, Submissions, Ending Soonest/Latest |
| **2. Test Status** | `grid grid-cols-2 sm:grid-cols-3 gap-1.5` | `Button`: `variant={active ? "default" : "outline"} size="sm" className="h-8 justify-between px-2.5 text-xs font-normal"`<br>`Badge`: `variant={active ? "secondary" : "outline"} className="ml-1 h-4 px-1 text-[10px] font-medium shrink-0"` | All, Live, Upcoming, Ended, Drafts (with counts) |
| **3. Author** | `grid grid-cols-3 gap-1.5` | `Button`: `variant={active ? "default" : "outline"} size="sm" className="h-8 justify-center px-2 text-xs font-normal"` | All Creators, Created by Me, Other Staff |
| **4. Duration** | `grid grid-cols-2 sm:grid-cols-3 gap-1.5` | `Button`: `variant={active ? "default" : "outline"} size="sm" className="h-8 justify-center px-2 text-xs font-normal"` | All, Untimed, < 30m, 30–60m, > 60m |
| **5. Questions** | `grid grid-cols-1 sm:grid-cols-3 gap-1.5` | `Button`: `variant={active ? "default" : "outline"} size="sm" className="h-8 justify-center px-2 text-xs font-normal"` | All, Has Questions (≥ 1), Empty (0 Qs) |
| **6. Submissions** | `grid grid-cols-1 sm:grid-cols-3 gap-1.5` | `Button`: `variant={active ? "default" : "outline"} size="sm" className="h-8 justify-center px-2 text-xs font-normal"` | All, With Attempts, No Attempts |
| **7. Visibility** | `space-y-3` (2 sub-rows)<br>Sub-row: `grid grid-cols-3 gap-1.5` | Subheading: `text-[11px] font-medium text-muted-foreground`<br>`Button`: `variant={active ? "default" : "outline"} size="sm" className="h-7 justify-center px-2 text-xs font-normal"` | Results: All / Visible / Hidden<br>Marks: All / Visible / Hidden |

### C. Sheet Footer (`SheetFooter`)
- **Container**: `p-4 border-t flex flex-row items-center justify-between gap-2 bg-muted/20 shrink-0`
- **Reset All Button** (`Button`): `variant="outline" size="sm" className="h-8 text-xs font-normal"` (disabled when count is 0)
- **Apply Button** (`Button`):
  - **Size / Styling**: `size="sm" className="h-8 text-xs font-medium gap-1.5 px-4"`
  - **Badge**: `<Badge variant="secondary" className="h-4 px-1 text-[10px] font-semibold bg-primary-foreground/20 text-primary-foreground">{count}</Badge>`

---

## 5. Status Badge Specification (`StatusBadge`)

Custom-styled badges with micro-icons and semantic color mappings.

| Status Key | Badge Variant | Class Overrides | Icon Component | Rendered Label |
| :--- | :--- | :--- | :--- | :--- |
| **`live`** | `success` | *(standard)* | *(none)* | `Live` |
| **`upcoming`** | `info` | `className="gap-1"` | `CalendarClock` (`size-3`) | `Upcoming` |
| **`past`** | `secondary` | `className="gap-1"` | `CheckCircle2` (`size-3`) | `Ended` |
| **`draft`** | `warning` | `className="gap-1"` | `PenLine` (`size-3`) | `Draft` |

### Badge Color Tokens:
- **`success`**: `bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-800/80`
- **`info`**: `bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200/80 dark:border-blue-800/80`
- **`warning`**: `bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200/80 dark:border-amber-800/80`
- **`secondary`**: `bg-secondary text-secondary-foreground/80`

---

## 6. Test Card Component Structure (`TestCard`)

Every test card is an interactive, collapsible accordion row wrapped in a context menu.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Mid-Term Placement Assessment                                [Live]         │
│ Comprehensive assessment covering Algorithms, Data Structures...            │
│ 🕒 1h 30m   📋 45 Qs   🏆 100 marks   👥 128 attempts                   ▼   │
├─────────────────────────────────────────────────────────────────────────────┤
│ (Expanded State: AccordionContent)                                          │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ 📊 Average Score: 78%           👤 Publisher: Dr. Sarah Jenkins (hover) │ │
│ │ 📅 Starts: Oct 12, 2026, 10:00  📅 Deadline: Oct 14, 2026, 18:00        │ │
│ │ 👁 Results: Visible             👁 Marks: Visible                       │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│ [ 📋 Copy Link ] [ ✏ Edit Test ]                           [ View Test ↗ ]  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### A. Root Card Container (`Card`)
- **Component**: `Card` wrapped by `ContextMenuTrigger asChild`
- **Classes**: `overflow-hidden transition-all hover:border-foreground/20 hover:shadow-xs group w-full min-w-0`
- **Accordion Wrapper**: `<Accordion type="single" collapsible className="w-full min-w-0"><AccordionItem value="details" className="border-none w-full min-w-0">`

### B. Card Header (Collapsible Trigger Row)
- **Element**: `<div role="button" tabIndex={0} ...>`
- **Classes**: `p-3.5 sm:p-5 flex items-start justify-between gap-2.5 sm:gap-3 text-left w-full min-w-0 cursor-pointer select-none focus-visible:outline-none focus-visible:bg-muted/30 hover:bg-muted/15 transition-colors`
- **Column 1: Content Body (`flex-1 min-w-0 w-full space-y-2.5 sm:space-y-3`)**:
  - **Top Row (Title, Description & Status Badge)**:
    - Container: `flex items-start justify-between gap-2 w-full min-w-0`
    - Title (`Link`):
      - Classes: `font-semibold text-sm sm:text-base leading-tight truncate hover:text-primary hover:underline transition-colors inline-block max-w-full text-foreground`
    - Description (`<p>`):
      - Classes: `line-clamp-2 text-xs text-muted-foreground font-normal`
    - Badge Container:
      - Classes: `flex items-center shrink-0 self-start`
      - Content: `<StatusBadge status={test.derived_status} />`
  - **Bottom Summary Row (Quick Metrics)**:
    - Container: `flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground font-normal`
    - Metric Icon: `size-3.5 shrink-0 text-muted-foreground/70`
    - Metric Item: `<span className="flex items-center gap-1.5"><Icon ... />{label}</span>`
    - Metrics rendered:
      - Duration: `Clock` + formatted duration (`"1h 30m"` or `"Untimed"`)
      - Questions: `ListCheck` + `"{count} Qs"`
      - Total Marks (if > 0): `Award` + `"{marks} marks"`
      - Submissions: `Users` + `"{count} attempt(s)"`
- **Column 2: Animated Chevron Indicator**:
  - Container: `pt-0.5 shrink-0 text-muted-foreground/70 transition-transform duration-200`
  - Icon: `ChevronDown` (`size-4 shrink-0 transition-transform duration-200`, toggles `rotate-180 text-foreground` when expanded)

### C. Expanded Content Area (`AccordionContent`)
- **Accordion Content Wrapper**: `px-4 pb-4 sm:px-5 sm:pb-5 pt-0`
- **Inner Wrapper**: `space-y-3 pt-3 border-t`

#### 1. Secondary Info Grid Box
- **Container**: `rounded-lg bg-muted/40 p-3 text-xs border space-y-2`
- **Grid Layout**: `grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground`
- **Data Item Pattern**: `flex items-center gap-2`
- **Icon**: `size-3.5 shrink-0 text-muted-foreground/70`
- **Value**: `font-medium text-foreground`
- **HoverCard for Publisher (`HoverCard openDelay={200} closeDelay={150}`)**:
  - Trigger Text: `font-medium text-foreground truncate hover:text-primary underline decoration-dotted underline-offset-2 transition-colors cursor-pointer`
  - Content (`HoverCardContent`):
    - Classes: `w-72 p-3.5 shadow-xl border border-border/60 bg-popover text-popover-foreground rounded-xl`
    - Layout: `flex items-start gap-3`
    - Avatar (`Avatar`): `size-10 shrink-0 border border-border/50 shadow-xs`
    - Fallback (`AvatarFallback`): `text-xs font-semibold bg-primary/10 text-primary`
    - Name: `text-sm font-semibold text-foreground truncate leading-tight`
    - Email: `text-xs text-muted-foreground truncate flex items-center gap-1` (with `Mail className="size-3 shrink-0 text-muted-foreground/70"`)

#### 2. Bottom CTA Action Bar
- **Container**: `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1`
- **Left Button Group**: `grid grid-cols-2 gap-1.5 w-full sm:w-auto`
  - Copy Link (`Button`): `variant="outline" size="xs" className="h-8 gap-1.5 text-xs font-normal justify-center"` (Icon: `Copy size-3.5`)
  - Edit Test (`Button` asChild `Link`): `variant="outline" size="xs" className="h-8 gap-1.5 text-xs font-normal justify-center"` (Icon: `PenLine size-3.5`)
- **Right Button**:
  - View Test (`Button` asChild `Link`): `size="xs" className="w-full sm:w-auto h-8 gap-1.5 text-xs font-medium justify-center px-3"` (Icon: `ExternalLink size-3.5`)

### D. Context Menu (`ContextMenuContent`)
- **Classes**: `w-48`
- **Menu Items (`ContextMenuItem`)**:
  - Open in New Tab: `ExternalLink className="size-4 mr-2"`
  - Copy Link: `Copy className="size-4 mr-2"`
  - Edit Settings: `PenLine className="size-4 mr-2"` (asChild `Link`)

---

## 7. List Container, Loading States & Empty State

### A. List Container & Transitions
- **List Wrapper**: `relative`
- **Pending Loading Overlay**:
  - Overlay: `absolute inset-0 z-50 bg-background/50 backdrop-blur-[1px] rounded-lg flex items-center justify-center min-h-48`
  - Center Pill: `flex items-center gap-2 rounded-md border bg-popover px-4 py-2 shadow-sm`
  - Spinner: `Loader2 className="size-4 animate-spin text-primary"`
  - Label: `text-xs text-muted-foreground` (`"Updating tests..."`)
- **Cards Grid**: `space-y-3 transition-opacity duration-150` (`opacity-40 pointer-events-none` when pending) -> `grid gap-3` (`12px` card spacing)

### B. Empty State (`Empty` Component)
- **Container**: `border border-dashed rounded-xl p-12`
- **Media (`EmptyMedia variant="icon"`)**: `FlaskConical className="size-5"`
- **Title (`EmptyTitle`)**: Dynamic based on filter status (`"No matching tests found"` vs `"No tests created yet"`)
- **Description (`EmptyDescription`)**: Clear explanatory text
- **Actions (`EmptyContent`)**:
  - Filtered: `<Button variant="outline" size="sm">Clear Filters</Button>`
  - Empty Database: `<Button size="sm" className="gap-1.5"><Plus className="size-4" />Create Test</Button>`

### C. Infinite Scroll Trigger & Counter
- **Sentinel**: `<div ref={observerTarget} className="flex justify-center items-center py-6 w-full min-h-12">`
- **Loading More**: `flex items-center gap-2 text-xs text-muted-foreground` + `Loader2 className="size-4 animate-spin text-primary"`
- **List Completed Label**: `<span className="text-xs text-muted-foreground">Showing all {totalCount} tests</span>`

---

## 8. Mobile Floating Action Button (FAB)

- **Container**: `fixed bottom-6 right-6 z-40 sm:hidden` (`24px` from bottom & right edge)
- **Button Component**:
  - **Component**: `Button`
  - **Size**: `icon`
  - **Classes**: `size-12 rounded-full shadow-lg hover:shadow-xl transition-all active:scale-95 bg-primary text-primary-foreground flex items-center justify-center` (`48px × 48px`)
  - **Icon**: `Plus` (`size-6` / `24px × 24px`)
  - **Accessibility**: `aria-label="Create Test"`

---

## 9. Typography, Sizing & Spacing Scale Reference

### Typography

| Token / Class | Font Family | Size | Line Height | Weight | Tracking | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `text-3xl font-cirka font-bold` | Cirka (Serif) | `30px` (`1.875rem`) | `36px` (`2.25rem`) | 700 | `-0.025em` | Main Page Heading (`<h1>`) |
| `text-base font-semibold` | Default Sans | `16px` (`1rem`) | `24px` (`1.5rem`) | 600 | Normal | Card Titles (Desktop), Sheet Title |
| `text-sm font-semibold` | Default Sans | `14px` (`0.875rem`) | `20px` (`1.25rem`) | 600 | Normal | Card Titles (Mobile), User Names |
| `text-sm text-muted-foreground`| Default Sans | `14px` (`0.875rem`) | `20px` (`1.25rem`) | 400 | Normal | Page Subtitle |
| `text-xs font-semibold uppercase`| Default Sans | `12px` (`0.75rem`) | `16px` (`1rem`) | 600 | Wider | Filter Section Labels |
| `text-xs text-muted-foreground`| Default Sans | `12px` (`0.75rem`) | `16px` (`1rem`) | 400 | Normal | Card Descriptions, Metadata, Secondary Rows |
| `text-[11px]` | Default Sans | `11px` (`0.6875rem`) | `14px` | 400–500 | Normal | Keyboard Hints, Badges, Visibility Subheadings |
| `text-[10px] font-semibold` | Default Sans | `10px` (`0.625rem`) | `12px` | 600 | Normal | Filter Counter Badges |

### Icon Dimensions

| Icon Size Token | Dimensions | Typical Context |
| :--- | :--- | :--- |
| `size-3` | `12px × 12px` | Status badges, Keyboard command icon, Reset buttons, Remove filter icon |
| `size-3.5` | `14px × 14px` | Card metadata (Clock, ListCheck, Users, Award, BarChart3, Mail, Eye), Card Action Buttons (Copy, Edit, View) |
| `size-4` | `16px × 16px` | Search icon, Filter icon, Section trigger chevron, Context menu icons, Page header buttons |
| `size-5` | `20px × 20px` | Empty state icon container |
| `size-6` | `24px × 24px` | Mobile FAB Plus icon |

### Spacing & Padding Tokens

| Token | Pixels | CSS Value | Usage |
| :--- | :--- | :--- | :--- |
| `p-0.5` / `gap-0.5` | `2px` | `0.125rem` | Keyboard shortcut icon gap, Name/email vertical spacing |
| `p-1.5` / `gap-1.5` | `6px` | `0.375rem` | Filter grid gap, Metadata icon gap, Action button gaps |
| `p-2` / `gap-2` | `8px` | `0.5rem` | Control bar gap, Grid data rows, Filter title groups |
| `p-2.5` / `gap-2.5` | `10px` | `0.625rem` | Mobile card gap, Filter button horizontal padding |
| `p-3` / `gap-3` | `12px` | `0.75rem` | Secondary card info box, Test card list vertical gap |
| `p-3.5` | `14px` | `0.875rem` | Mobile card header padding, HoverCard padding |
| `p-4` | `16px` | `1rem` | Page horizontal padding (mobile), Sheet footer padding |
| `p-5` | `20px` | `1.25rem` | Desktop card header padding, Sheet header & body padding |
| `p-6` | `24px` | `1.5rem` | Sheet padding on desktop, Page root vertical gap |
| `p-8` | `32px` | `2rem` | Page horizontal padding on desktop (`md:px-8`), Top/Bottom padding on desktop |
| `p-12` | `48px` | `3rem` | Empty state container padding |
| `pb-24` | `96px` | `6rem` | Mobile bottom clearance padding for FAB |

---

## 10. Summary of Used shadcn UI Components

*Only component names and slot imports are listed (implementation details excluded).*

- **`Sheet`**: `Sheet`, `SheetContent`, `SheetDescription`, `SheetHeader`, `SheetTitle`, `SheetTrigger`, `SheetFooter`
- **`Card`**: `Card`
- **`Button`**: `Button`
- **`Badge`**: `Badge`
- **`Avatar`**: `Avatar`, `AvatarFallback`, `AvatarImage`
- **`HoverCard`**: `HoverCard`, `HoverCardTrigger`, `HoverCardContent`
- **`InputGroup`**: `InputGroup`, `InputGroupAddon`, `InputGroupInput`, `InputGroupButton`
- **`Kbd`**: `Kbd`
- **`Label`**: `Label`
- **`Separator`**: `Separator`
- **`Select`**: `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectGroup`, `SelectItem`, `SelectLabel`, `SelectSeparator`
- **`Accordion`**: `Accordion`, `AccordionItem`, `AccordionContent`
- **`Empty`**: `Empty`, `EmptyHeader`, `EmptyTitle`, `EmptyDescription`, `EmptyContent`, `EmptyMedia`
- **`ContextMenu`**: `ContextMenu`, `ContextMenuContent`, `ContextMenuItem`, `ContextMenuTrigger`
