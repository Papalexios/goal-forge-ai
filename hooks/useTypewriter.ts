
import { useState, useEffect } from 'react';

export const useTypewriter = (text: string, speed: number = 50, onComplete?: () => void) => {
  const [displayText, setDisplayText] = useState('');
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    setDisplayText('');
    setIsDone(false);
    let i = 0;
    const typingInterval = setInterval(() => {
      if (i < text.length) {
        setDisplayText(prevText => prevText + text.charAt(i));
        i++;
      } else {
        clearInterval(typingInterval);
        setIsDone(true);
        if (onComplete) {
            onComplete();
        }
      }
    }, speed);

    return () => {
      clearInterval(typingInterval);
    };
  }, [text, speed, onComplete]);

  return {displayText, isDone};
};
