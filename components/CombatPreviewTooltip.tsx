import React from 'react';
import { CardInGame, Player } from '../game/types';
import { getEffectiveStats } from '../game/utils';

interface CombatPreviewTooltipProps {
    attacker: CardInGame;
    blocker: CardInGame;
    attackerPlayer: Player;
    blockerPlayer: Player;
}

const CombatPreviewTooltip: React.FC<CombatPreviewTooltipProps> = ({ attacker, blocker, attackerPlayer, blockerPlayer }) => {
    const { strength: attackerStrength } = getEffectiveStats(attacker, attackerPlayer, { isAssaultPhase: true });
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

    const OutcomeText: React.FC<{ name: string; willBeDestroyed: boolean; resultHealth: number; initialHealth: number }> = ({ name, willBeDestroyed, resultHealth, initialHealth }) => {
        if (willBeDestroyed) {
            return <span className="text-red-400">{name} is destroyed.</span>;
        }
        return <span className="text-green-400">{name} survives with {resultHealth}/{initialHealth} health.</span>;
    };

    return (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
            <div className="bg-cyber-surface/90 backdrop-blur-md border-2 border-neon-cyan p-4 rounded-lg shadow-2xl shadow-neon-cyan/50 text-white font-mono text-center">
                <h3 className="text-lg font-bold text-neon-cyan uppercase tracking-wider mb-3">Combat Preview</h3>
                <div className="space-y-2 text-sm">
                    <p>
                        <span className="font-semibold text-neon-pink">{attacker.name}</span> ({attackerStrength} STR) attacks{' '}
                        <span className="font-semibold text-neon-cyan">{blocker.name}</span> ({blockerStrength} STR).
                    </p>
                    <div className="border-t border-cyber-border my-2"></div>
                    <div className="text-left space-y-1">
                        <div>
                            <span className="font-bold text-neon-pink">Attacker: </span>
                            <OutcomeText name={attacker.name} willBeDestroyed={attackerWillBeDestroyed} resultHealth={attackerResultHealth} initialHealth={attackerDurability} />
                        </div>
                        <div>
                            <span className="font-bold text-neon-cyan">Blocker: </span>
                             <OutcomeText name={blocker.name} willBeDestroyed={blockerWillBeDestroyed} resultHealth={blockerResultHealth} initialHealth={blockerDurability} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CombatPreviewTooltip;
