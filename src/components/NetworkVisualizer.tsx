import { motion } from 'framer-motion';

interface Node {
    port: number;
    status: 'open' | 'closed';
}

export const NetworkVisualizer = ({ nodes }: { nodes: Node[] }) => {
    return (
        <div className="w-full h-full relative flex items-center justify-center p-4">
            {nodes.length === 0 ? (
                <div className="text-secondary/30 text-xs font-mono italic animate-pulse">
                    SCANNING FOR TARGETS...
                </div>
            ) : (
                <div className="grid grid-cols-4 gap-3 w-full max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                    {nodes.map((node, i) => (
                        <motion.div
                            key={`${node.port}-${i}`}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                            className="flex flex-col items-center justify-center gap-1 p-2 rounded border border-blue-500/20 bg-blue-500/5 relative group"
                        >
                            <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.5)] group-hover:animate-ping" />
                            <span className="text-[10px] font-mono text-blue-300">:{node.port}</span>
                            <div className="absolute inset-0 bg-blue-400/10 opacity-0 group-hover:opacity-100 transition-opacity rounded" />
                        </motion.div>
                    ))}
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.3);
          border-radius: 10px;
        }
        .grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        .pr-2 { padding-right: 0.5rem; }
      `}} />
        </div>
    );
};
