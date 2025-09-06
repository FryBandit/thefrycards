
import React from 'react';
import { CardInGame, Player } from '../game/types';
import { getEffectiveStats } from '../game/utils';

interface CombatPreviewTooltipProps {
    attacker: CardInGame;
    blocker: CardInGame;
    attackerPlayer: Player;
    blockerPlayer: Player;
}

// FIX: Implemented the component to return JSX, resolving the 'not assignable to FC' type error.
export const CombatPreviewTooltip: React.FC<CombatPreviewTooltipProps> = ({ attacker, blocker, attackerPlayer, blockerPlayer }) => {
    const { strength: attackerStrength } = getEffectiveStats(attacker, attackerPlayer, { isStrikePhase: true });
    const { durability: attackerDurability } = getEffectiveStats(attacker, attackerPlayer);
    const { strength: blockerStrength, durability: blockerDurability } = getEffectiveStats(blocker, blockerPlayer);

    const damageToAttacker = blockerStrength;
    const damageToBlocker = attackerStrength;

    const attackerCurrentHealth = attackerDurability - attacker.damage;
    const blockerCurrentHealth = blockerDurability - blocker.damage;

    const attackerResultHealth = attackerCurrentHealth - damageToAttacker;
    const blockerResultHealth = blockerCurrentHealth - damageToBlocker;

    const attackerWillBeDestroyed = attackerResultHealth <= 0;
    const blockerWillBeDestroyed = blockerResultHealth <= 0;

// FIX: Implemented the sub-component to return JSX, resolving the type error.
// FIX: Corrected a typo from `willBe` to `willBeDestroyed`.
    const OutcomeText: React.FC<{ name: string; willBeDestroyed: boolean; resultHealth: number; initialHealth: number }> = ({ name, willBeDestroyed, resultHealth, initialHealth }) => {
        if (willBeDestroyed) {
            return <p className="text-red-400">{name} will be destroyed ({initialHealth} → {resultHealth <= 0 ? 0 : resultHealth})</p>;
        }
        return <p className="text-green-400">{name} will survive ({initialHealth} → {resultHealth})</p>;
    };
    
    return (
        <div className="fixed top-1/2 -translate-y-1/2 right-4 w-72 p-4 bg-arcane-surface/90 backdrop-blur-sm border-2 border-vivid-pink rounded-lg shadow-2xl shadow-vivid-pink/20 z-40 text-sm font-mono text-white pointer-events-none animate-fade-in-right">
            <h3 className="text-lg font-bold text-vivid-pink uppercase tracking-wider mb-3 text-center border-b border-vivid-pink/30 pb-2">Combat Preview</h3>
            <div className="grid grid-cols-3 gap-2 items-center text-center mb-3">
                <div className="font-bold text-vivid-cyan truncate" title={blocker.name}>{blocker.name}</div>
                <div className="font-bold text-white">vs</div>
                <div className="font-bold text-vivid-pink truncate" title={attacker.name}>{attacker.name}</div>
            </div>
            <div className="grid grid-cols-3 gap-2 items-center text-center mb-2">
                <div>{blockerStrength} <span className="opacity-70">STR</span></div>
                <div><span className="text-xs text-white/50">Strength</span></div>
                <div>{attackerStrength} <span className="opacity-70">STR</span></div>
            </div>
            <div className="grid grid-cols-3 gap-2 items-center text-center mb-4">
                <div>{blockerCurrentHealth} <span className="opacity-70">HP</span></div>
                <div><span className="text-xs text-white/50">Health</span></div>
                <div>{attackerCurrentHealth} <span className="opacity-70">HP</span></div>
            </div>

            <div className="border-t border-vivid-pink/30 pt-3 space-y-1 text-center">
                <OutcomeText name={blocker.name} willBeDestroyed={blockerWillBeDestroyed} resultHealth={blockerResultHealth} initialHealth={blockerCurrentHealth} />
                <OutcomeText name={attacker.name} willBeDestroyed={attackerWillBeDestroyed} resultHealth={attackerResultHealth} initialHealth={attackerCurrentHealth} />
            </div>
        </div>
    );
};
