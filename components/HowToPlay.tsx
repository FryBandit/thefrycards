import React from 'react';
import { KEYWORD_DEFINITIONS } from '../game/keywords';
import KeywordText from './KeywordText';

interface HowToPlayProps {
  onPlay: () => void;
}

const KeywordDefinition: React.FC<{ name: string }> = ({ name }) => {
    const definition = KEYWORD_DEFINITIONS[name];
    if (!definition) {
        console.warn(`Keyword definition for "${name}" not found.`);
        return <p><strong className="text-neon-pink">{name}:</strong> Definition missing.</p>;
    }

    return (
        <p><strong className="text-neon-cyan">{name}:</strong> <KeywordText text={definition} /></p>
    );
}

const HowToPlay: React.FC<HowToPlayProps> = ({ onPlay }) => {
  // We can group keywords for better organization on the page.
  const keywordGroups = {
    "High-Rarity & Mythic": ['Annihilate', 'Riftwalk'],
    "Location & Artifact": ['Augment', 'Consume', 'Fortify', 'Generator', 'Landmark'],
    "Advanced Action": ['Amplify', 'Channel', 'Recall', 'Scavenge', 'Stagnate'],
    "Unit-Specific": ['Reconstruct', 'Synergy', 'Wild'],
    "Negative": ['Bounty', 'Instability', 'Malice', 'Decay'],
    "Core Gameplay": [
      'Assault', 'Barrage', 'Breach', 'Echo', 'Entrenched', 'Executioner', 
      'Fateweave', 'Fragile', 'Haunt', 'Immutable', 'Martyrdom', 'Overload', 
      'Phasing', 'Rally', 'Resonance', 'Siphon', 'Stealth', 'Venomous', 'Shield'
    ],
    "Event-Specific": [
        'Chain Reaction', 'Corrupt', 'Discard', 'Draw', 'Foresight', 
        'Purge', 'Sabotage', 'VoidTarget', 'Warp'
    ],
     "Ability-Specific": ['Spike'],
  };

  return (
    <div className="w-screen h-screen bg-black/50 backdrop-blur-sm text-neon-yellow/80 p-4 md:p-8 overflow-y-auto font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-black text-neon-cyan mb-2 tracking-widest">DICE COMMAND</h1>
          <p className="text-base md:text-lg text-neon-pink/80 uppercase">A Cyber-Noir Strategy Card Game</p>
        </div>
        
        <div className="text-center my-8">
            <div className="mb-8">
                <button
                    onClick={onPlay}
                    className="bg-cyber-primary text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-cyber-secondary transition-colors text-xl transform hover:scale-105 border-2 border-cyber-border uppercase"
                >
                    Play Game
                </button>
            </div>
        </div>

        <div className="space-y-6 bg-cyber-surface/70 backdrop-blur-sm p-4 md:p-6 rounded-lg border-2 border-cyber-border">
          <Section title="Objective">
            <p>Reduce the opponent's Command from 20 to 0. You lose Command when hit by enemy Units during an Assault, or when an opponent destroys one of your Units (you lose Command equal to that Unit's Command Number).</p>
          </Section>

          <Section title="Turn Structure">
            <ol className="list-decimal list-inside space-y-2 font-semibold">
              <li><strong>Mulligan:</strong> At the start of the game, you may redraw your initial 3-card hand once.</li>
              <li><strong>Start Phase:</strong> "Start of turn" effects trigger.</li>
              <li><strong>Roll & Spend Phase:</strong> Roll your five Command Dice up to three times. Spend dice to deploy cards.</li>
              <li><strong>Draw Phase:</strong> Draw one card from your deck.</li>
              <li><strong>Assault Phase:</strong> Choose whether to attack with your deployed Units. This is not automatic.</li>
              <li><strong>End Phase:</strong> "End of turn" effects trigger. Unspent dice are lost.</li>
            </ol>
          </Section>

          <Section title="The Roll & Spend Phase">
            <p>The core of your turn. You have five Command Dice and three rolls.</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>First Roll:</strong> Roll all five dice.</li>
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

          <Section title="Game Zones">
            <div className="space-y-2">
                <p><strong>Graveyard (Archive):</strong> When your non-token cards are destroyed, played as an Event, or discarded, they go here. Cards in the Graveyard can be brought back with abilities like <strong>Scavenge</strong>.</p>
                <p><strong>Void (The Static):</strong> The "removed from game" zone. Cards sent here cannot be retrieved. The following are sent to the Void: <strong>Tokens</strong> when they leave the field, cards played via <strong>Scavenge</strong> when they leave the field, and any card affected by an ability that specifically says to "Void" it (like <strong>Annihilate</strong>).</p>
            </div>
          </Section>

          {Object.entries(keywordGroups).map(([groupTitle, keywords]) => (
            <Section key={groupTitle} title={`${groupTitle} Keywords`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                {keywords.sort().map(keyword => (
                  <KeywordDefinition key={keyword} name={keyword} />
                ))}
              </div>
            </Section>
          ))}
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