import React, { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";

export default function TypewriterText({ text, delay = 50, pause = 1000, className }) {
  const [currentText, setCurrentText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setCurrentText(prevText => prevText + text[currentIndex]);
        setCurrentIndex(prevIndex => prevIndex + 1);
      }, delay);
      return () => clearTimeout(timeout);
    } else if (pause > 0) {
      // Optional: pause at the end of typing before reset or loop (if implemented)
      // For now, it just stops. If looping is desired, add logic here.
    }
  }, [currentIndex, delay, text, pause]);

  return (
    <span className={cn("font-mono", className)}>{currentText}</span>
  );
}