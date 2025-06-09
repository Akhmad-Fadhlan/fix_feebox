
import { useState, useEffect } from 'react';

interface BreakpointValues<T> {
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  '2xl'?: T;
}

export function useResponsive() {
  const [screenSize, setScreenSize] = useState<'sm' | 'md' | 'lg' | 'xl' | '2xl'>('lg');

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      
      if (width < 640) {
        setScreenSize('sm');
      } else if (width < 768) {
        setScreenSize('md');
      } else if (width < 1024) {
        setScreenSize('lg');
      } else if (width < 1280) {
        setScreenSize('xl');
      } else {
        setScreenSize('2xl');
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const getResponsiveValue = <T,>(values: BreakpointValues<T>, defaultValue: T): T => {
    switch (screenSize) {
      case 'sm':
        return values.sm ?? defaultValue;
      case 'md':
        return values.md ?? values.sm ?? defaultValue;
      case 'lg':
        return values.lg ?? values.md ?? values.sm ?? defaultValue;
      case 'xl':
        return values.xl ?? values.lg ?? values.md ?? values.sm ?? defaultValue;
      case '2xl':
        return values['2xl'] ?? values.xl ?? values.lg ?? values.md ?? values.sm ?? defaultValue;
      default:
        return defaultValue;
    }
  };

  return {
    screenSize,
    isMobile: screenSize === 'sm',
    isTablet: screenSize === 'md',
    isDesktop: screenSize === 'lg' || screenSize === 'xl' || screenSize === '2xl',
    getResponsiveValue
  };
}
