import React from 'react';
import { useImageOrientation } from '../hooks/useImageOrientation';

function SmartImage({ src, alt, className = '', imgClassName = '', style = {}, ...props }) {
  const orientation = useImageOrientation(src);
  
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
        onError={(e) => {
          e.target.style.display = 'none';
        }}
      />
    </div>
  );
}

export default SmartImage;
