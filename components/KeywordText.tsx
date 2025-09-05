
import React from 'react';
import { KEYWORD_DEFINITIONS } from '../game/keywords';
import Tooltip from './Tooltip';

interface KeywordTextProps {
  text: string;
}

// Memoize to avoid re-calculating on every render if text is the same
const KeywordText: React.FC<KeywordTextProps> = React.memo(({ text }) => {
  if (!text) return null;

  // Pre-compile regex for performance
  const keywordRegex = React.useMemo(() => {
    // Sort keys by length descending to match longer keywords first (e.g., "VoidTarget" before "Void")
    const sortedKeywords = Object.keys(KEYWORD_DEFINITIONS).sort((a, b) => b.length - a.length);
    return new RegExp(`\\b(${sortedKeywords.join('|')})\\b`, 'gi');
  }, []);

  const parts = text.split(keywordRegex);

  return (
    <>
      {parts.map((part, index) => {
        // Find the original casing of the keyword for display, but match case-insensitively
        const keywordMatch = Object.keys(KEYWORD_DEFINITIONS).find(k => k.toLowerCase() === part.toLowerCase());

        if (keywordMatch) {
          return (
            <Tooltip key={index} content={KEYWORD_DEFINITIONS[keywordMatch]}>
              {part}
            </Tooltip>
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </>
  );
});

export default KeywordText;
