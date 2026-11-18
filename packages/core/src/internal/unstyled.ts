/**
 * While its external stylesheet loads, a host shows its static fallback
 * through a slot and hides its own shadow nodes (see attachStyledShadow). The
 * sheet applies before the hold is released, and its `display` rules override
 * `hidden`, so on a slow frame both would show and the layout would double.
 * This rule, part of the sheet itself, keeps them hidden until the release.
 */
export const unstyledHold =
  ':host(:state(unstyled)) > :not(slot){display:none!important}';
