import React, { useState, useEffect } from 'react';
import { useImageOrientation } from '../hooks/useImageOrientation';

function SmartImage({ src, alt, className = '', imgClassName = '', style = {}, ...props }) {
  const orientation = useImageOrientation(src);
  const [hasError, setHasError] = useState(false);

  // Reset error state when src changes so the image can attempt to load again
  useEffect(() => {
    setHasError(false);
  }, [src]);
  
  return (
    <div 
      className={`img-container-custom ${className}`} 
      style={{ width: '100%', height: '100%', ...style }} 
      {...props}
    >
      <img 
        src={src} 
        alt={alt} 
        className={`image-${orientation} ${imgClassName}`} 
        style={hasError ? { display: 'none' } : undefined}
        onError={() => {
          setHasError(true);
        }}
      />
    </div>
  );
}

export default SmartImage;
