
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
    // Sort keys by length descending to match longer keywords first (e.g., "Chain Reaction" before "Chain")
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
            <Tooltip
              key={index}
              content={
                <>
                  <h4 className="font-bold text-vivid-cyan uppercase tracking-wider mb-2 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span>{part}</span>
                  </h4>
                  {KEYWORD_DEFINITIONS[keywordMatch]}
                </>
              }
            >
              <span className="text-vivid-cyan underline decoration-dotted cursor-help">{part}</span>
            </Tooltip>
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </>
  );
});

export default KeywordText;
