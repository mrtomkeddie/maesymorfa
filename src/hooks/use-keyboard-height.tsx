'use client';
import { useEffect, useState } from 'react';

export function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let initialViewportHeight = window.innerHeight;
    let currentViewportHeight = window.innerHeight;

    // Method 1: Visual Viewport API (modern browsers)
    if (window.visualViewport) {
      const handleViewportChange = () => {
        const viewport = window.visualViewport!;
        const keyboardHeight = Math.max(0, initialViewportHeight - viewport.height);
        setKeyboardHeight(keyboardHeight);
        setIsKeyboardOpen(keyboardHeight > 0);
        
        // Update CSS custom property
        document.documentElement.style.setProperty('--keyboard-height', `${keyboardHeight}px`);
      };

      window.visualViewport.addEventListener('resize', handleViewportChange);
      window.visualViewport.addEventListener('scroll', handleViewportChange);

      return () => {
        window.visualViewport?.removeEventListener('resize', handleViewportChange);
        window.visualViewport?.removeEventListener('scroll', handleViewportChange);
      };
    }

    // Method 2: Fallback for older browsers
    const handleResize = () => {
      currentViewportHeight = window.innerHeight;
      const heightDifference = initialViewportHeight - currentViewportHeight;
      const keyboardHeight = Math.max(0, heightDifference);
      
      setKeyboardHeight(keyboardHeight);
      setIsKeyboardOpen(keyboardHeight > 50); // 50px threshold
      
      document.documentElement.style.setProperty('--keyboard-height', `${keyboardHeight}px`);
    };

    // Method 3: Focus/blur detection for iOS Safari
    const handleFocusIn = () => {
      setTimeout(() => {
        const newHeight = window.innerHeight;
        const keyboardHeight = Math.max(0, initialViewportHeight - newHeight);

        if (keyboardHeight < 50) {
          // iOS Safari doesn't resize viewport, use estimated height
          const estimatedKeyboardHeight = window.innerWidth > 400 ? 300 : 260;
          setKeyboardHeight(estimatedKeyboardHeight);
          setIsKeyboardOpen(true);
          document.documentElement.style.setProperty('--keyboard-height', `${estimatedKeyboardHeight}px`);
        }
      }, 300);
    };

    const handleFocusOut = () => {
      setTimeout(() => {
        setKeyboardHeight(0);
        setIsKeyboardOpen(false);
        document.documentElement.style.setProperty('--keyboard-height', '0px');
      }, 300);
    };
    

    // Add event listeners
    window.addEventListener('resize', handleResize);
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  return { keyboardHeight, isKeyboardOpen };
}
