import { useEffect, useRef, useState } from 'react';

export const useCountUp = (end, duration = 2000, delay = 0) => {
  const [count, setCount] = useState(0);
  const requestRef = useRef();
  const startTimeRef = useRef();

  useEffect(() => {
    // Ensure end is a number, default to 0 if not
    const numericEnd = typeof end === 'number' ? end : parseFloat(end);
    if (isNaN(numericEnd)) {
      setCount(0);
      return;
    }

    setCount(0); // Reset count when `end` changes
    startTimeRef.current = null;

    const animate = (currentTime) => {
      if (!startTimeRef.current) {
        startTimeRef.current = currentTime;
      }

      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const animatedValue = progress * numericEnd;

      setCount(Math.floor(animatedValue));

      if (progress < 1) {
        requestRef.current = requestAnimationFrame(animate);
      } else {
        setCount(numericEnd); // Ensure final value is exact
      }
    };

    const startAnimation = () => {
      requestRef.current = requestAnimationFrame(animate);
    };

    const timeoutId = setTimeout(startAnimation, delay);

    return () => {
      clearTimeout(timeoutId);
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [end, duration, delay]);

  return count;
};