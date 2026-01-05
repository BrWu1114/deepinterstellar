import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface PacketData {
    id: string;
    type: 'info' | 'attack' | 'defense' | 'alert';
    startX: number;
    startY: number;
    endX: number;
    endY: number;
}

interface PacketStreamProps {
    packets: PacketData[];
    onComplete: (id: string) => void;
}

export const PacketStream: React.FC<PacketStreamProps> = ({ packets, onComplete }) => {
    return (
        <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
            <AnimatePresence>
                {packets.map((packet) => (
                    <Packet
                        key={packet.id}
                        data={packet}
                        onComplete={() => onComplete(packet.id)}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
};

const Packet: React.FC<{ data: PacketData; onComplete: () => void }> = ({ data, onComplete }) => {
    const color =
        data.type === 'attack' ? 'var(--red-accent)' :
            data.type === 'defense' ? 'var(--blue-accent)' :
                data.type === 'alert' ? '#fbbf24' : '#4ade80';

    return (
        <motion.div
            initial={{ x: data.startX, y: data.startY, opacity: 0, scale: 0.5 }}
            animate={{
                x: data.endX,
                y: data.endY,
                opacity: [0, 1, 1, 0],
                scale: [0.5, 1.2, 1.2, 0.5]
            }}
            exit={{ opacity: 0 }}
            transition={{
                duration: 0.8,
                ease: "anticipate",
            }}
            onAnimationComplete={onComplete}
            className="absolute w-2 h-2 rounded-full blur-[1px]"
            style={{
                backgroundColor: color,
                boxShadow: `0 0 10px ${color}, 0 0 20px ${color}40`,
            }}
        >
            <div
                className="absolute inset-0 rounded-full animate-pulse"
                style={{ backgroundColor: color, filter: 'blur(4px)' }}
            />
        </motion.div>
    );
};
