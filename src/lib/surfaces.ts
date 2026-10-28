/**
 * The kit's surfaces as class names, for a host that composes a surface of its
 * own — a hand-built search panel, a backdrop under someone else's animation.
 * These are public API: renaming one is a breaking change and goes in the
 * CHANGELOG under **Breaking**. `inputVariants` lives with `Input`, next to
 * the component that wears it, the way `buttonVariants` does.
 */

/** The frosted floating surface every dialog, menu and popover is drawn on. */
export const panelClass = 'mz-panel'

/** The dialog backdrop: the veil and its blur. Fixed, full-viewport, z 50. */
export const overlayClass = 'mz-dialog-overlay'
