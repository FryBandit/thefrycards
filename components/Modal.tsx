import React from 'react';

interface ModalProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onHowToPlay: () => void;
}

const Modal: React.FC<ModalProps> = ({ title, children, onClose, onHowToPlay }) => {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 font-sans">
      <div className="bg-cyber-surface border-2 border-neon-cyan rounded-lg shadow-2xl p-8 text-center text-white w-full max-w-md shadow-neon-cyan">
        <h2 className="text-3xl font-bold text-neon-cyan mb-4 uppercase tracking-widest">{title}</h2>
        <div className="text-lg mb-6 text-neon-yellow/80">{children}</div>
        <div className="flex justify-center space-x-4">
            <button
            onClick={onClose}
            className="bg-cyber-primary px-6 py-3 rounded-lg font-bold text-white hover:bg-cyber-secondary transition-colors uppercase"
            >
            Play Again
            </button>
            <button
            onClick={onHowToPlay}
            className="bg-cyber-border px-6 py-3 rounded-lg font-bold text-white hover:bg-cyber-primary transition-colors uppercase"
            >
            How to Play
            </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;