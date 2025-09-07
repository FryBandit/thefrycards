import React, { useState, useRef, useEffect } from 'react';
import { GameState, Player } from '../game/types';

interface ActionHistoryProps {
  history: GameState['actionHistory'];
  players: [Player, Player];
}

const ActionHistory: React.FC<ActionHistoryProps> = ({ history, players }) => {
    const [isOpen, setIsOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (panelRef.current) {
            panelRef.current.scrollTop = 0;
        }
    }, [history]);

    return (
        <div className={`fixed top-1/2 -translate-y-1/2 left-0 w-80 h-3/4 max-h-[700px] z-40 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-[calc(100%-2.5rem)]'}`}>
            <div className="relative w-full h-full flex">
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
                                        <ul className="list-none space-y-0.5 pl-1">
                                            {turnLog.actions.map((action, actionIndex) => (
                                                <li key={actionIndex} className={`text-vivid-yellow/90 relative pl-4 p-1 rounded ${actionIndex % 2 === 0 ? 'bg-black/10' : 'bg-black/20'}`}>
                                                    <span className="absolute left-1 top-1 text-arcane-primary">></span>
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
                    className="absolute top-1/2 right-0 -translate-y-1/2 w-10 h-24 bg-arcane-border/80 rounded-r-lg flex items-center justify-center text-vivid-yellow font-black text-lg transform-gpu hover:bg-arcane-primary transition-colors border-y-2 border-r-2 border-arcane-border"
                    aria-label={isOpen ? 'Close History' : 'Open History'}
                    aria-expanded={isOpen}
                >
                    <div className="flex flex-col items-center justify-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }} className="uppercase text-sm tracking-widest">History</span>
                    </div>
                </button>
            </div>
        </div>
    );
};

export default ActionHistory;