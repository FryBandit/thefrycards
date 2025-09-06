import React, { useState, useRef, useEffect } from 'react';
import { GameState, Player } from '../game/types';

interface ActionHistoryProps {
  history: GameState['actionHistory'];
  players: [Player, Player];
}

const ActionHistory: React.FC<ActionHistoryProps> = ({ history, players }) => {
    const [isOpen, setIsOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    return (
        <div className={`absolute top-4 left-0 h-[calc(50%-2rem)] z-30 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-[calc(100%-3rem)]'}`}>
            <div className="relative w-80 h-full flex">
                {/* Panel Content */}
                <div className="w-full h-full bg-arcane-surface/80 backdrop-blur-sm rounded-r-lg p-2 text-white text-xs font-mono flex flex-col border-2 border-l-0 border-arcane-border shadow-lg">
                    <h3 className="text-sm font-bold border-b border-vivid-cyan/50 mb-2 pb-1 text-vivid-cyan uppercase tracking-widest flex-shrink-0">Action History</h3>
                    <div ref={panelRef} className="overflow-y-auto flex-grow pr-2">
                        {/* Newest actions will appear at the top */}
                        <div>
                            {[...history].reverse().filter(t => t.actions.length > 0).map((turnLog, index) => {
                                const player = players[turnLog.playerId];
                                const isPlayer = player.id === 0;
                                return (
                                    <div key={`${turnLog.turn}-${turnLog.playerId}-${index}`} className="mb-3">
                                        <h4 className={`font-bold border-b border-dashed border-white/20 mb-1 ${isPlayer ? 'text-vivid-cyan' : 'text-vivid-pink'}`}>
                                            Turn {turnLog.turn} - {player.name}
                                        </h4>
                                        <ul className="list-none space-y-1 pl-1">
                                            {turnLog.actions.map((action, actionIndex) => (
                                                <li key={actionIndex} className="text-vivid-yellow/90 relative pl-4">
                                                    <span className="absolute left-0 top-0 text-arcane-primary">></span>
                                                    {action}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Toggle Tab */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="absolute top-1/2 right-0 translate-x-full -translate-y-1/2 w-8 h-24 bg-arcane-border/80 rounded-r-lg flex items-center justify-center text-vivid-yellow font-black text-lg transform-gpu hover:bg-arcane-primary transition-colors border-y-2 border-r-2 border-arcane-border"
                    style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                    aria-label={isOpen ? 'Close History' : 'Open History'}
                    aria-expanded={isOpen}
                >
                    HISTORY
                </button>
            </div>
        </div>
    );
};

export default ActionHistory;