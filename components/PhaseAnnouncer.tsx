import React, { useState, useEffect } from 'react';

interface PhaseAnnouncerProps {
  phase: string | null;
}

const PhaseAnnouncer: React.FC<PhaseAnnouncerProps> = ({ phase }) => {
  const [visible, setVisible] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(phase);

  useEffect(() => {
    if (phase) {
      setCurrentPhase(phase);
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 2000); // Display for 2 seconds
      return () => clearTimeout(timer);
    }
  }, [phase]);

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center z-40 pointer-events-none transition-opacity duration-500 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="bg-black/60 backdrop-blur-sm text-neon-cyan font-black text-5xl md:text-7xl uppercase tracking-[0.3em] p-6 rounded-lg border-2 border-neon-cyan/50">
        {currentPhase}
      </div>
    </div>
  );
};

export default PhaseAnnouncer;