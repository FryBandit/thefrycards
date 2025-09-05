import React from 'react';

interface HowToPlayProps {
  onPlay: () => void;
}

const HowToPlay: React.FC<HowToPlayProps> = ({ onPlay }) => {
  return (
    <div className="w-screen h-screen bg-cyber-bg text-neon-yellow/80 p-8 overflow-y-auto font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black text-neon-cyan mb-2 tracking-widest">DICE COMMAND</h1>
          <p className="text-lg text-neon-pink/80 uppercase">A Cyber-Noir Strategy Card Game</p>
        </div>
        
        <div className="space-y-6 bg-cyber-surface/70 backdrop-blur-sm p-6 rounded-lg border-2 border-cyber-border">
          <Section title="Objective">
            <p>Reduce the opponent's Command from 20 to 0. You lose Command when hit by enemy Units during an Assault, or when an opponent destroys one of your Units (you lose Command equal to that Unit's Command Number).</p>
          </Section>

          <Section title="Turn Structure">
            <ol className="list-decimal list-inside space-y-2 font-semibold">
              <li><strong>Start Phase:</strong> "Start of turn" effects trigger.</li>
              <li><strong>Roll & Spend Phase:</strong> Roll your four Command Dice up to three times. Spend dice to deploy cards.</li>
              <li><strong>Draw Phase:</strong> Draw one card from your deck.</li>
              <li><strong>Assault Phase:</strong> Choose whether to attack with your deployed Units. This is not automatic.</li>
              <li><strong>End Phase:</strong> "End of turn" effects trigger. Unspent dice are lost.</li>
            </ol>
          </Section>

          <Section title="The Roll & Spend Phase">
            <p>The core of your turn. You have four Command Dice and three rolls.</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>First Roll:</strong> Roll all four dice.</li>
              <li><strong>Assess & Act:</strong> Spend dice on cards, or "keep" dice by clicking them. Kept dice (highlighted in cyan) won't be re-rolled.</li>
              <li><strong>Second & Third Rolls:</strong> Re-roll any dice that are not kept or spent.</li>
              <li><strong>Final Actions:</strong> After your third roll, the results are final. Spend your remaining dice before ending the phase.</li>
            </ul>
          </Section>
          
          <Section title="Card Types">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><strong className="text-unit">Units:</strong> Your operatives and drones. They perform assaults. They have Strength (damage), Durability (health), and a Command Number.</div>
              <div><strong className="text-event">Events:</strong> One-time programs and tactics. Played for an immediate effect, then sent to the archive (graveyard).</div>
              <div><strong className="text-location">Locations:</strong> Fortified subnets and data havens that provide continuous advantages.</div>
              <div><strong className="text-artifact">Artifacts:</strong> Hardware and wetware that provide ongoing benefits, sometimes with activated abilities.</div>
            </div>
          </Section>

          <Section title="Advanced Keywords">
             <div className="space-y-2">
                <p><strong>Channel [Cost]:</strong> Play a card for an alternate, usually cheaper, cost to get a different, smaller effect. This provides flexibility, allowing you to use a situational card for a simple effect like drawing a card if you can't use its main ability.</p>
                <p><strong>Scavenge [Cost]:</strong> Play a card directly from your graveyard by paying its Scavenge cost. A scavenged card is Voided (removed from the game permanently) when it leaves the field, preventing it from being used again.</p>
                <p><strong>Recall [Cost]:</strong> An effect that returns one of your units from the field to your hand. This is a powerful way to save a damaged unit, remove negative effects from it, or re-use its powerful "Arrival" abilities.</p>
                <p><strong>Stagnate:</strong> A potent disruption effect that forces your opponent to skip their next Draw Phase, denying them resources.</p>
            </div>
          </Section>
        </div>

        <div className="text-center mt-8">
          <button
            onClick={onPlay}
            className="bg-cyber-primary text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-cyber-secondary transition-colors text-xl transform hover:scale-105 border-2 border-cyber-border uppercase"
          >
            Jack In
          </button>
        </div>
      </div>
    </div>
  );
};

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, children }) => (
  <div>
    <h2 className="text-2xl font-bold text-neon-cyan border-b-2 border-neon-cyan/30 pb-1 mb-3 uppercase tracking-wider">{title}</h2>
    <div className="text-neon-yellow/90 space-y-2">
      {children}
    </div>
  </div>
);

export default HowToPlay;