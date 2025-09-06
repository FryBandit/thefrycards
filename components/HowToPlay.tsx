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
        return <p><strong className="text-vivid-pink">{name}:</strong> Definition missing.</p>;
    }

    return (
        <p><strong className="text-vivid-cyan">{name}:</strong> <KeywordText text={definition} /></p>
    );
}

const HowToPlay: React.FC<HowToPlayProps> = ({ onPlay }) => {
  // We can group keywords for better organization on the page.
  const keywordGroups = {
      "Unique & Game-Changing": ['Obliterate', 'Vanish', 'Warp', 'Chain Reaction'],
      "Advanced Actions": ['Amplify', 'Evoke', 'Recall', 'Reclaim'],
      "Combat Keywords": ['Strike', 'Breach', 'Entrenched', 'Executioner', 'Phasing', 'Rally', 'Shield', 'Venomous'],
      "Protective & Evasive": ['Immutable', 'Stealth', 'Shield'],
      "Value & Resource Keywords": ['Draw', 'Echo', 'Prophecy', 'Foresight', 'Martyrdom', 'Overload', 'Resonance', 'Siphon'],
      "Disruption Keywords": ['Barrage', 'Weaken', 'Discard', 'Purge', 'Disrupt', 'Exhaust', 'Banish'],
      "Location & Artifact Keywords": ['Augment', 'Consume', 'Fortify', 'Blessing', 'Landmark', 'Spike'],
      "Unit-Specific Keywords": ['Reconstruct', 'Synergy', 'Wild'],
      "Negative Keywords": ['Bounty', 'Decay', 'Fragile', 'Haunt', 'Instability', 'Malice'],
  };

  return (
    <div className="w-screen h-screen bg-black/50 backdrop-blur-sm text-vivid-yellow/80 p-4 md:p-8 overflow-y-auto font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-black text-vivid-cyan mb-2 tracking-widest">DICE COMMAND</h1>
          <p className="text-base md:text-lg text-vivid-pink/80 uppercase">A Cyber-Noir Strategy Card Game</p>
        </div>
        
        <div className="text-center my-8">
            <div className="mb-8">
                <button
                    onClick={onPlay}
                    className="bg-arcane-primary text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-arcane-secondary transition-colors text-xl transform hover:scale-105 border-2 border-arcane-border uppercase"
                >
                    Play Game
                </button>
            </div>
        </div>

        <div className="space-y-6 bg-arcane-surface/70 backdrop-blur-sm p-4 md:p-6 rounded-lg border-2 border-arcane-border">
          <Section title="Objective">
            <p>Reduce the opponent's Morale from 20 to 0. You lose Morale when hit by enemy Units during a Strike, or when an opponent destroys one of your Units (you lose Morale equal to that Unit's Morale Value).</p>
          </Section>

           <Section title="Hand Size">
            <p>You can hold a maximum of 7 cards in your hand. If you would draw a card while your hand is full, the drawn card is sent to your Graveyard instead.</p>
          </Section>

          <Section title="Turn Structure">
            <ol className="list-decimal list-inside space-y-2 font-semibold">
              <li><strong>Mulligan:</strong> At the start of the game, you may redraw your initial 3-card hand once.</li>
              <li><strong>Start Phase:</strong> "Start of turn" effects trigger.</li>
              <li><strong>Roll & Spend Phase:</strong> Roll your five dice up to three times. Spend dice to deploy cards.</li>
              <li><strong>Draw Phase:</strong> Draw one card from your deck.</li>
              <li><strong>Strike Phase:</strong> Choose whether to attack with your deployed Units. This is not automatic.</li>
              <li><strong>End Phase:</strong> "End of turn" effects trigger. Unspent dice are lost.</li>
            </ol>
          </Section>

          <Section title="The Roll & Spend Phase">
            <p>The core of your turn. You have five dice and three rolls.</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>First Roll:</strong> Roll all five dice.</li>
              <li><strong>Assess & Act:</strong> Spend dice on cards, or "keep" dice by clicking them. Kept dice (highlighted in cyan) won't be re-rolled.</li>
              <li><strong>Second & Third Rolls:</strong> Re-roll any dice that are not kept or spent.</li>
              <li><strong>Final Actions:</strong> After your third roll, the results are final. Spend your remaining dice before ending the phase.</li>
            </ul>
          </Section>
          
          <Section title="Card Types">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><strong className="text-unit">Units:</strong> Your operatives and drones. They perform strikes. They have Strength (damage), Durability (health), and a Morale Value.</div>
              <div><strong className="text-event">Events:</strong> One-time programs and tactics. Played for an immediate effect, then sent to the archive (graveyard).</div>
              <div><strong className="text-location">Locations:</strong> Fortified subnets and data havens that provide continuous advantages.</div>
              <div><strong className="text-artifact">Artifacts:</strong> Hardware and wetware that provide ongoing benefits, sometimes with activated abilities.</div>
            </div>
          </Section>

          <Section title="Game Zones">
            <div className="space-y-2">
                <p><strong>Graveyard (Archive):</strong> When your non-token cards are destroyed, played as an Event, or discarded, they go here. Cards in the Graveyard can be brought back with abilities like <strong>Reclaim</strong>.</p>
                <p><strong>Oblivion (The Aether):</strong> The "removed from game" zone. Cards sent here cannot be retrieved. The following are sent to Oblivion: <strong>Tokens</strong> when they leave the field, cards played via <strong>Reclaim</strong> when they leave the field, and any card affected by an ability that specifically says to "Banish" it (like <strong>Obliterate</strong>).</p>
            </div>
          </Section>

          {Object.entries(keywordGroups).map(([groupTitle, keywords]) => (
            <Section key={groupTitle} title={`${groupTitle}`}>
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
    <h2 className="text-2xl font-bold text-vivid-cyan border-b-2 border-vivid-cyan/30 pb-1 mb-3 uppercase tracking-wider">{title}</h2>
    <div className="text-vivid-yellow/90 space-y-2">
      {children}
    </div>
  </div>
);

export default HowToPlay;