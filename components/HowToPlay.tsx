import React from 'react';

interface HowToPlayProps {
  onPlay: () => void;
  cardsLoaded: boolean;
}

const HowToPlay: React.FC<HowToPlayProps> = ({ onPlay, cardsLoaded }) => {
  return (
    <div className="w-screen h-screen bg-black/50 backdrop-blur-sm text-neon-yellow/80 p-8 overflow-y-auto font-sans">
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

          <Section title="Advanced Action Keywords">
             <div className="space-y-2">
                <p><strong>Amplify [Cost]:</strong> Offers tactical flexibility. You may play the card for its base effect, or pay an additional Amplify cost to get a more powerful version of the effect.</p>
                <p><strong>Channel [Cost]:</strong> Play a card for an alternate, usually cheaper, cost to get a different, smaller effect. This provides flexibility, allowing you to use a situational card for a simple effect like drawing a card if you can't use its main ability.</p>
                <p><strong>Recall:</strong> An effect that returns one of your units from the field to your hand. This is a powerful way to save a damaged unit, remove negative effects from it, or re-use its powerful "Arrival" abilities.</p>
                <p><strong>Scavenge [Cost]:</strong> Play a card directly from your graveyard by paying its Scavenge cost. A scavenged card is Voided (removed from the game permanently) when it leaves the field, preventing it from being used again.</p>
                <p><strong>Stagnate:</strong> A potent disruption effect that forces your opponent to skip their next Draw Phase, denying them resources.</p>
            </div>
          </Section>

          <Section title="Core Gameplay Keywords">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                <p><strong>Assault (X):</strong> This unit gets +X Strength during your Assault Phase.</p>
                <p><strong>Barrage (X):</strong> Arrival: Deal X damage to each enemy unit.</p>
                <p><strong>Breach:</strong> This unit cannot be targeted by opponent's Events until after it has participated in an Assault.</p>
                <p><strong>Decay:</strong> At the start of your turn, this unit takes 1 damage.</p>
                <p><strong>Echo:</strong> When this unit enters the field, create a token copy of it. Tokens are Voided when they leave the field.</p>
                <p><strong>Entrenched:</strong> This unit does not participate in Assaults.</p>
                <p><strong>Executioner (X):</strong> When this unit destroys a unit with one of its abilities, the opponent loses X Command.</p>
                <p><strong>Fateweave (X):</strong> Arrival: Gain X additional dice rolls this turn.</p>
                <p><strong>Fragile:</strong> This unit takes double damage from Events.</p>
                <p><strong>Haunt (X):</strong> When this unit is destroyed, the opponent loses X Command.</p>
                <p><strong>Immutable:</strong> The ultimate protection. A card with Immutable cannot be targeted, damaged, destroyed, or otherwise affected by an opponent's cards or abilities. It can only be defeated in combat.</p>
                <p><strong>Malice (X):</strong> When this unit is destroyed, its controller loses X Command.</p>
                <p><strong>Martyrdom:</strong> When this unit is destroyed, a bonus effect triggers (e.g., draw a card, deal damage to opponent).</p>
                <p><strong>Overload:</strong> This unit gains bonus Strength based on the number of cards in your graveyard.</p>
                <p><strong>Phasing:</strong> This unit's damage during an Assault cannot be prevented and is dealt directly to the opponent's Command.</p>
                <p><strong>Resonance (X):</strong> A high-risk, high-reward ability. Upon playing the card, you reveal the top card of your deck. If its Command Number is X or higher, a bonus effect triggers.</p>
                <p><strong>Siphon (X):</strong> When this unit deals damage to the opponent during an Assault, you gain X Command.</p>
                <p><strong>Stealth:</strong> This unit cannot be targeted by opponent's Events.</p>
                <p><strong>Venomous:</strong> When this unit deals damage to another unit, the damaged unit is marked for destruction.</p>
                <p><strong>Corrupt (X):</strong> An Event effect that gives a target unit -X Strength.</p>
                <p><strong>Discard (X):</strong> An Event effect that forces the opponent to discard X cards at random.</p>
                <p><strong>Foresight (X):</strong> An Event effect that lets you look at the top X cards of your deck.</p>
                <p><strong>Purge (X):</strong> An Event effect that Voids X random cards from the opponent's graveyard.</p>
                <p><strong>Warp:</strong> An Event effect that lets you take an extra turn after this one (with some restrictions).</p>
            </div>
          </Section>
        </div>

        <div className="text-center mt-8">
          <button
            onClick={onPlay}
            disabled={!cardsLoaded}
            className="bg-cyber-primary text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-cyber-secondary transition-colors text-xl transform hover:scale-105 border-2 border-cyber-border uppercase disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {cardsLoaded ? 'Jack In' : 'Loading...'}
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