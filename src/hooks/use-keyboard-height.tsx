'use client';
import { useEffect, useState } from 'react';

export function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);

      if (window.visualViewport) {
          const keyboardHeight = Math.max(0, window.innerHeight - window.visualViewport.height);
          document.documentElement.style.setProperty('--keyboard-height', `${keyboardHeight}px`);
          setIsKeyboardOpen(keyboardHeight > 0);
      }
    };
    
    window.addEventListener('resize', handleResize);
    if(window.visualViewport) {
        window.visualViewport.addEventListener('resize', handleResize);
    }

    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
       if(window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  return { keyboardHeight, isKeyboardOpen };
}
