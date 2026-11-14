import { useEffect } from 'react';

/**
 * Custom hook to lock background scrolling when a modal or sheet is open.
 * Works seamlessly across desktop and mobile touch webviews (iOS Safari, Android Chrome, Zalo WebView).
 */
export const useModalScrollLock = (isOpen: boolean) => {
  useEffect(() => {
    if (!isOpen) return;

    // Save previous styles
    const originalBodyOverflow = document.body.style.overflow;
    const originalBodyTouchAction = document.body.style.touchAction;
    const mainEl = document.querySelector('main');
    const originalMainOverflow = mainEl ? mainEl.style.overflow : '';

    // Lock body and main container
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    if (mainEl) {
      mainEl.style.overflow = 'hidden';
    }

    // Touch event preventer for background
    const preventDefaultTouch = (e: TouchEvent) => {
      // Allow scrolling if touch is inside a scrollable element of the modal
      const target = e.target as HTMLElement;
      if (target && target.closest('.modal-scrollable')) {
        return;
      }
      if (e.cancelable) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchmove', preventDefaultTouch, { passive: false });

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.touchAction = originalBodyTouchAction;
      if (mainEl) {
        mainEl.style.overflow = originalMainOverflow;
      }
      document.removeEventListener('touchmove', preventDefaultTouch);
    };
  }, [isOpen]);
};

