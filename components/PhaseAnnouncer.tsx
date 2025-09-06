import React, { useState, useEffect } from 'react';

interface PhaseAnnouncerProps {
  phase: string | null;
}

const PhaseAnnouncer: React.FC<PhaseAnnouncerProps> = ({ phase }) => {
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    // Only update and trigger animation if the phase actually changes to a new non-null value
    if (phase && phase !== currentPhase) {
      setCurrentPhase(phase);
      setAnimationKey(prev => prev + 1);
    }
  }, [phase, currentPhase]);

  if (!currentPhase) return null;

  return (
    <div
      key={animationKey}
      className="fixed inset-0 flex items-center justify-center z-40 pointer-events-none animate-zoom-announce"
      // Using onAnimationEnd to clear the phase could be an option, but resetting the key is cleaner
      // as it allows back-to-back announcements of the same phase (e.g. extra turn)
    >
      <div className="bg-black/60 backdrop-blur-sm text-neon-cyan font-black text-5xl md:text-7xl uppercase tracking-[0.3em] p-6 rounded-lg border-2 border-neon-cyan/50">
        {currentPhase}
      </div>
    </div>
  );
};

export default PhaseAnnouncer;