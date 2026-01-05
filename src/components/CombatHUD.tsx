import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CombatHUDProps {
    isActive: boolean;
    team: 'red' | 'blue' | null;
    targetId: string | null;
    isAutomating?: string | null;
}

export const CombatHUD: React.FC<CombatHUDProps> = ({ isActive, team, targetId, isAutomating }) => {
    const color = team === 'red' ? 'var(--red-accent)' : 'var(--blue-accent)';

    return (
        <AnimatePresence>
            {isActive && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 pointer-events-none z-[80] overflow-hidden"
                >
                    {/* Tactical Corners */}
                    <div className="absolute top-0 left-0 w-32 h-32 border-t-2 border-l-2 opacity-40 p-2" style={{ borderColor: color }}>
                        <span className="text-[10px] font-mono" style={{ color }}>SYS_SEC: ACTIVE</span>
                    </div>
                    <div className="absolute top-0 right-0 w-32 h-32 border-t-2 border-r-2 opacity-40 p-2 text-right" style={{ borderColor: color }}>
                        <span className="text-[10px] font-mono" style={{ color }}>{team?.toUpperCase()} NEURAL_LINK</span>
                    </div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 border-b-2 border-l-2 opacity-40 p-2 flex items-end" style={{ borderColor: color }}>
                        <span className="text-[10px] font-mono" style={{ color }}>ENC_V: TRACE_ON</span>
                    </div>
                    <div className="absolute bottom-0 right-0 w-32 h-32 border-b-2 border-r-2 opacity-40 p-2 flex items-end justify-end" style={{ borderColor: color }}>
                        <span className="text-[10px] font-mono" style={{ color }}>LOC: INTERSTELLAR_CORE</span>
                    </div>

                    {/* Center Crosshair (Subtle) */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10">
                        <div className="w-16 h-[1px]" style={{ backgroundColor: color }} />
                        <div className="h-16 w-[1px] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ backgroundColor: color }} />
                    </div>

                    {/* Glitch Overlay Effect */}
                    <motion.div
                        animate={{
                            opacity: [0.05, 0.1, 0.05],
                            x: [0, 1, -1, 0]
                        }}
                        transition={{ repeat: Infinity, duration: 0.2 }}
                        className="absolute inset-0 bg-white/5 mix-blend-overlay"
                    />

                    {/* Asset Targeting Reticle */}
                    {targetId && (
                        <TargetingBox targetId={targetId} color={color} />
                    )}

                    {/* Automation Status Overlay */}
                    {isActive && isAutomating && (
                        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-black/80 border border-white/20 px-6 py-2 rounded text-center">
                            <div className="text-[10px] text-secondary tracking-widest mb-1">AUTOMATION ENGINE ACTIVE</div>
                            <div className="text-xs font-mono font-bold animate-pulse" style={{ color }}>
                                EXECUTING: {isAutomating.toUpperCase()}
                            </div>
                        </div>
                    )}

                    {/* Floating Data Readouts */}
                    <div className="absolute left-10 top-1/2 -translate-y-1/2 space-y-2 text-[8px] font-mono opacity-30" style={{ color }}>
                        <div>PX_77: {Math.random().toString(16).slice(2, 8).toUpperCase()}</div>
                        <div>ST_RT: 0.04ms</div>
                        <div>B_TR: {Math.floor(Math.random() * 1000)}kbps</div>
                    </div>

                    <div className="absolute right-10 top-1/2 -translate-y-1/2 space-y-2 text-[8px] font-mono opacity-30 text-right" style={{ color }}>
                        <div>SIGNAL: STABLE</div>
                        <div>BUFFER: {Math.floor(Math.random() * 100)}%</div>
                        <div>W_PR: {Math.random().toString(16).slice(2, 6).toUpperCase()}</div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const TargetingBox = ({ targetId, color }: { targetId: string, color: string }) => {
    const [rect, setRect] = React.useState<DOMRect | null>(null);

    React.useEffect(() => {
        const el = document.getElementById(`asset-${targetId}`);
        if (el) {
            setRect(el.getBoundingClientRect());
        }
    }, [targetId]);

    if (!rect) return null;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 1.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute border-2 pointer-events-none z-[100]"
            style={{
                left: rect.left - 10,
                top: rect.top - 10,
                width: rect.width + 20,
                height: rect.height + 20,
                borderColor: color,
                boxShadow: `0 0 20px ${color}40`,
            }}
        >
            <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 translate-x-[-4px] translate-y-[-4px]" style={{ borderColor: color }} />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 translate-x-[4px] translate-y-[-4px]" style={{ borderColor: color }} />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 translate-x-[-4px] translate-y-[4px]" style={{ borderColor: color }} />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 translate-x-[4px] translate-y-[4px]" style={{ borderColor: color }} />

            <div className="absolute -top-6 left-0 text-[10px] font-bold px-2 py-0.5" style={{ backgroundColor: color, color: 'black' }}>
                LOCK_ON: {targetId.toUpperCase()}
            </div>
        </motion.div>
    );
};
