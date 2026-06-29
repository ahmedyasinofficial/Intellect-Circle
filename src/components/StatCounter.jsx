import React, { useState, useEffect, useRef } from 'react';

function StatCounter({ target, label }) {
  const [count, setCount] = useState(0);
  const elementRef = useRef(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          
          const strTarget = String(target);
          const numericValue = parseInt(strTarget.replace(/[^0-9]/g, ''), 10);
          
          if (isNaN(numericValue) || numericValue <= 0) {
            setCount(target);
            return;
          }

          const duration = 1500; // Total animation time: 1.5 seconds
          const frameDuration = 1000 / 60; // ~60fps
          const totalFrames = Math.round(duration / frameDuration);
          let frame = 0;

          const timer = setInterval(() => {
            frame++;
            // Ease-out quad formula
            const progress = frame / totalFrames;
            const easeOutProgress = progress * (2 - progress);
            const currentCount = Math.round(easeOutProgress * numericValue);

            if (frame >= totalFrames) {
              clearInterval(timer);
              setCount(numericValue);
            } else {
              setCount(currentCount);
            }
          }, frameDuration);
        }
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      if (elementRef.current) {
        observer.unobserve(elementRef.current);
      }
    };
  }, [target]);

  const strTarget = String(target);
  const suffix = strTarget.replace(/[0-9]/g, '');

  return (
    <div className="stat-item" ref={elementRef}>
      <div className="stat-number">
        {count}
        {suffix}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export default StatCounter;
