import { useState, useEffect } from 'react';

export function useImageOrientation(src) {
  const [orientation, setOrientation] = useState('landscape'); // Default fallback

  useEffect(() => {
    if (!src) return;
    
    // Check if it's a relative path in dev or a full URL
    const img = new Image();
    img.src = src;
    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      
      if (width === height) {
        setOrientation('square');
      } else if (width < height) {
        setOrientation('portrait');
      } else {
        setOrientation('landscape');
      }
    };
  }, [src]);

  return orientation;
}
