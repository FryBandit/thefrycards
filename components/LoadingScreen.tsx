import React, { useState, useEffect } from 'react';

const tips = [
  "You can 'keep' dice by clicking on them to save them from your next roll.",
  "Locations and Artifacts can provide powerful ongoing advantages.",
  "Don't forget to Assault! Damage to the opponent's Command isn't automatic.",
  "Some cards have Scavenge, allowing you to play them from your graveyard.",
  "Mulligan your starting hand if you don't have a good mix of cards.",
  "Pay attention to a unit's Command Number. You'll lose that much Command if it's destroyed!",
  "Use Events to surprise your opponent and disrupt their strategy.",
  "Building a board of units with Rally can create a powerful, snowballing army."
];

const backgroundImages = [
    "https://cdn.midjourney.com/766953b0-6e17-4efd-be65-dd51be8750f1/0_2.png", // Shadow of the Dreadnought
    "https://cdn.midjourney.com/cd9b7d16-2ae3-4fc1-837f-329f2e3e223d/0_2.png", // Nightmare Nebula
    "https://cdn.midjourney.com/aae70056-b607-4e5c-a491-06073792d420/0_0.png", // Primordial Forest
    "https://cdn.midjourney.com/34f66d6c-de29-4100-b3c6-406ed5937e33/0_2.png"  // Underground Rainbow
];

interface LoadingScreenProps {
  loadingError: string | null;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ loadingError }) => {
  const [tip, setTip] = useState('');
  const [bgImage] = useState(() => backgroundImages[Math.floor(Math.random() * backgroundImages.length)]);

  useEffect(() => {
    setTip(tips[Math.floor(Math.random() * tips.length)]);
    const tipInterval = setInterval(() => {
      setTip(tips[Math.floor(Math.random() * tips.length)]);
    }, 5000);

    return () => clearInterval(tipInterval);
  }, []);

  return (
    <div 
        className="w-screen h-screen bg-cover bg-center flex flex-col items-center justify-center text-white p-8"
        style={{ backgroundImage: `linear-gradient(rgba(13, 2, 33, 0.8), rgba(13, 2, 33, 0.95)), url(${bgImage})` }}
    >
      <div className="text-center">
        <h1 className="text-5xl md:text-6xl font-black text-neon-cyan mb-2 tracking-widest animate-pulse">DICE COMMAND</h1>
        <p className="text-lg text-neon-pink/80 uppercase">A Cyber-Noir Strategy Card Game</p>
      </div>

      <div className="mt-16 text-center w-full max-w-lg">
        {loadingError ? (
            <div className="bg-red-900/50 border-2 border-red-500 p-6 rounded-lg">
                <h2 className="text-2xl font-bold text-red-400 mb-2">Loading Failed</h2>
                <p className="text-red-300">{loadingError}</p>
                <p className="text-red-400/70 mt-4 text-sm">Please check your connection and try refreshing the page.</p>
            </div>
        ) : (
            <>
                <div className="relative w-24 h-24 mx-auto mb-6">
                    <div className="absolute inset-0 border-4 border-cyber-primary rounded-full animate-spin"></div>
                    <div className="absolute inset-2 border-4 border-neon-cyan rounded-full animate-spin" style={{animationDirection: 'reverse'}}></div>
                </div>
                <h2 className="text-2xl font-semibold text-neon-yellow tracking-wider">Loading Assets...</h2>

                <div className="mt-8 bg-black/30 p-4 rounded-lg border border-cyber-border min-h-[6rem]">
                    <p className="text-lg italic text-neon-yellow/80 transition-opacity duration-500">{tip}</p>
                </div>
            </>
        )}
      </div>
    </div>
  );
};

export default LoadingScreen;