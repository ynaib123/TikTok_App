import { useEffect } from 'react';
import type { RefObject } from 'react';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

/**
 * Trap keyboard focus inside `containerRef` while `isActive` is true. Pressing
 * Escape calls `onEscape`. Tabbing past the last (or before the first) element
 * wraps. Used by accessible modals so screen-reader users cannot tab out
 * behind the backdrop.
 *
 * Resolves several Phase 1.9 a11y warnings without changing visible UI.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  isActive: boolean,
  onEscape?: () => void,
): void {
  useEffect(() => {
    if (!isActive || !containerRef.current) return undefined;

    const containerElement = containerRef.current;
    const focusableElements = Array.from(
      containerElement.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    firstFocusable?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onEscape?.();
        return;
      }

      if (event.key !== 'Tab' || focusableElements.length === 0) return;

      if (event.shiftKey && document.activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable?.focus();
      } else if (!event.shiftKey && document.activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [containerRef, isActive, onEscape]);
}
