/**
 * Skip-to-content link for keyboard and screen reader users.
 *
 * Visually hidden until focused — pressing Tab as the first action on a page
 * reveals a link that jumps the user past navigation directly to the main
 * content area. This is a WCAG 2.1 Level A requirement (2.4.1 Bypass Blocks).
 */
export default function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-white focus:text-primary-700 focus:rounded-lg focus:shadow-lg focus:ring-2 focus:ring-primary-400 focus:text-sm focus:font-medium"
    >
      Skip to main content
    </a>
  );
}
