import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 font-sans">
      <div className="bg-arcane-surface border-2 border-vivid-cyan rounded-lg shadow-2xl p-8 text-center text-white w-full max-w-md shadow-vivid-cyan">
        <h2 className="text-2xl font-bold text-vivid-cyan mb-4 uppercase tracking-widest">{title}</h2>
        <p className="text-lg mb-6 text-vivid-yellow/80">{message}</p>
        <div className="flex justify-center space-x-4">
          <button
            onClick={onCancel}
            className="bg-arcane-border px-6 py-3 rounded-lg font-bold text-white hover:bg-arcane-primary transition-colors uppercase"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="bg-vivid-pink px-6 py-3 rounded-lg font-bold text-arcane-bg hover:bg-opacity-90 transition-colors uppercase"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;