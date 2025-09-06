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
      <div className="bg-arcane-surface border-2 border-vivid-cyan rounded-lg shadow-2xl p-8 text-center text-white w-full max-w-md shadow-vivid-cyan bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-arcane-primary/20 to-transparent animate-modal-show">
        <h2 className="text-3xl font-bold text-vivid-cyan mb-4 uppercase tracking-widest">{title}</h2>
        <div className="text-lg mb-6 text-vivid-yellow/80">{children}</div>
        <div className="flex justify-center space-x-4">
            <button
            onClick={onClose}
            className="bg-arcane-primary px-6 py-3 rounded-lg font-bold text-white hover:bg-arcane-secondary transition-all transform hover:scale-105 uppercase border-2 border-arcane-border"
            >
            Play Again
            </button>
            <button
            onClick={onHowToPlay}
            className="bg-arcane-border px-6 py-3 rounded-lg font-bold text-white hover:bg-arcane-primary transition-all transform hover:scale-105 uppercase border-2 border-arcane-border"
            >
            How to Play
            </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;