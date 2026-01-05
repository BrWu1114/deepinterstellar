import React from 'react';
import { Shield, Sword, Terminal, Activity, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Team, SimulationLog, Asset } from './types';
import { NetworkVisualizer } from './components/NetworkVisualizer';
import { soundEngine } from './utils/synth';
import { PacketStream, type PacketData } from './components/PacketStream';
import { CombatHUD } from './components/CombatHUD';

// Components
const TeamCard = ({
  team,
  onSelect,
  isSelected
}: {
  team: 'red' | 'blue',
  onSelect: (t: 'red' | 'blue') => void,
  isSelected: boolean
}) => {
  const isRed = team === 'red';
  const Icon = isRed ? Sword : Shield;
  const accentColor = isRed ? 'var(--red-accent)' : 'var(--blue-accent)';
  const glowClass = isRed ? 'glow-red' : 'glow-blue';

  return (
    <motion.div
      whileHover={{ scale: 1.05, translateY: -5 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => onSelect(team)}
      className={`glass-card p-8 cursor-pointer transition-all duration-300 flex flex-col items-center gap-6 border-2 ${isSelected ? `border-[${accentColor}] ${glowClass}` : 'border-transparent'
        }`}
      style={{ width: '300px', borderColor: isSelected ? accentColor : 'transparent' }}
    >
      <div className="p-4 rounded-full" style={{ backgroundColor: `rgba(${isRed ? '239, 68, 68' : '59, 130, 246'}, 0.1)` }}>
        <Icon size={64} color={accentColor} />
      </div>
      <div className="text-center">
        <h2 className="text-3xl mb-2" style={{ color: accentColor }}>
          {isRed ? 'RED TEAM' : 'BLUE TEAM'}
        </h2>
        <p className="text-sm text-secondary">
          {isRed ? 'Offensive Operations & Breach Simulation' : 'Defensive Hardening & Intrusion Detection'}
        </p>
      </div>
    </motion.div>
  );
};

const Header = ({ currentView, onSetView, isMuted, onToggleMute, isCombatMode, onToggleCombat }: {
  currentView: string,
  onSetView: (v: 'DASHBOARD' | 'OPERATIONS' | 'REPORTS') => void,
  isMuted: boolean,
  onToggleMute: () => void,
  isCombatMode: boolean,
  onToggleCombat: () => void
}) => (
  <header className="w-full py-6 px-12 flex justify-between items-center border-b border-glass glass-card rounded-none mb-12">
    <div className="flex items-center gap-3">
      <Activity className="text-blue-accent" size={32} />
      <h1 className="text-2xl font-black tracking-tighter">DEEP INTERSTELLAR <span className="text-secondary font-light">SIM</span></h1>
    </div>
    <div className="flex items-center gap-8">
      <div className="flex gap-6 text-sm font-medium">
        {['DASHBOARD', 'OPERATIONS', 'REPORTS'].map((view) => (
          <span
            key={view}
            onClick={() => onSetView(view as any)}
            className={`transition-colors cursor-pointer ${currentView === view ? 'text-white border-b-2 border-blue-500' : 'text-secondary hover:text-white'}`}
          >
            {view}
          </span>
        ))}
      </div>
      <button
        onClick={onToggleMute}
        className="p-2 hover:bg-glass rounded-lg transition-colors text-secondary hover:text-white"
        title={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </button>
      <button
        onClick={onToggleCombat}
        className={`px-4 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all border ${isCombatMode ? 'bg-red-500/20 text-red-500 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-glass text-secondary border-glass hover:text-white'}`}
      >
        {isCombatMode ? 'COMBAT ENABLED' : 'ENABLE COMBAT'}
      </button>
    </div>
  </header>
);



export default function App() {
  const [selectedTeam, setSelectedTeam] = React.useState<Team>(null);
  const [logs, setLogs] = React.useState<SimulationLog[]>([]);
  const [isSimulating, setIsSimulating] = React.useState(false);
  const [scannedNodes, setScannedNodes] = React.useState<{ port: number; status: 'open' | 'closed' }[]>([]);
  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [currentView, setCurrentView] = React.useState<'DASHBOARD' | 'OPERATIONS' | 'REPORTS'>('DASHBOARD');
  const [isMuted, setIsMuted] = React.useState(true);
  const [isCombatMode, setIsCombatMode] = React.useState(false);
  const [activeTarget, setActiveTarget] = React.useState<string | null>(null);
  const [isShaking, setIsShaking] = React.useState(false);
  const [isCritical, setIsCritical] = React.useState(false);
  const [isAutomating, setIsAutomating] = React.useState<string | null>(null);

  // Terminal State
  const [terminalInput, setTerminalInput] = React.useState('');
  const [history, setHistory] = React.useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = React.useState(-1);
  const terminalScrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [clearedAt, setClearedAt] = React.useState<number>(0);
  const [activePackets, setActivePackets] = React.useState<PacketData[]>([]);

  // Function to fetch state from backend
  const fetchState = React.useCallback(async () => {
    try {
      const response = await fetch('/api/state');
      const data = await response.json();
      setLogs(data.logs);
      setAssets(data.assets.filter((a: Asset) => !selectedTeam || a.team === selectedTeam));
    } catch (err) {
      console.error('Failed to fetch simulation state:', err);
    }
  }, [selectedTeam]);

  // Initial fetch and polling
  React.useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 3000); // Poll every 3 seconds for updates
    return () => clearInterval(interval);
  }, [fetchState]);

  // Monitor logs for damage triggers
  React.useEffect(() => {
    if (logs.length > 0) {
      const latestLog = logs[0];
      if (latestLog.createdAt > Date.now() - 5000) { // Only trigger for fresh logs
        if (latestLog.type === 'alert' || latestLog.type === 'attack') {
          setIsShaking(true);
          setTimeout(() => setIsShaking(false), 500);

          if (latestLog.type === 'alert') {
            setIsCritical(true);
            setTimeout(() => setIsCritical(false), 2000);
          }
        }
      }
    }
  }, [logs]);

  // Auto-scroll terminal
  React.useEffect(() => {
    if (terminalScrollRef.current) {
      terminalScrollRef.current.scrollTop = terminalScrollRef.current.scrollHeight;
    }
  }, [logs]);

  const triggerPackets = (count: number, type: PacketData['type'], endX: number, endY: number) => {
    const newPackets: PacketData[] = Array.from({ length: count }).map(() => ({
      id: Math.random().toString(36).substring(7),
      type,
      startX: window.innerWidth / 2, // From Terminal/Command Center
      startY: window.innerHeight - 100,
      endX: endX + (Math.random() - 0.5) * 40,
      endY: endY + (Math.random() - 0.5) * 40,
    }));
    setActivePackets(prev => [...prev, ...newPackets]);
  };

  const toggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    soundEngine.setMute(nextMute);
    if (!nextMute) soundEngine.playClick();
  };

  const sendRemoteLog = async (message: string, source = 'system', type: SimulationLog['type'] = 'info') => {
    try {
      await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, source, type })
      });
      fetchState();
    } catch (err) {
      console.error('Failed to send remote log:', err);
    }
  };

  const handleAssetAction = async (assetId: string, action: string) => {
    // Visual packet trigger
    const assetEl = document.getElementById(`asset-${assetId}`);
    if (assetEl) {
      const rect = assetEl.getBoundingClientRect();
      triggerPackets(5, selectedTeam === 'red' ? 'attack' : 'defense', rect.left + rect.width / 2, rect.top + rect.height / 2);

      if (isCombatMode) {
        setActiveTarget(assetId);
        setTimeout(() => setActiveTarget(null), 2000);
      }
    }

    try {
      const response = await fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId, action, team: selectedTeam })
      });
      if (response.ok) {
        soundEngine.playAction();
        fetchState(); // Immediately refresh state
      }
    } catch (err) {
      console.error('Failed to perform tactical action:', err);
    }
  };

  const handleReset = async () => {
    try {
      await fetch('/api/reset', { method: 'POST' });
      soundEngine.playAlert();
      triggerPackets(15, 'alert', window.innerWidth / 2, window.innerHeight / 2);
      fetchState();
      setScannedNodes([]);
      setClearedAt(0);
    } catch (err) {
      console.error('Failed to reset simulation:', err);
    }
  };

  const startSimulation = async (target = '127.0.0.1', start = 80, end = 8080) => {
    setIsSimulating(true);
    soundEngine.playScanStart();
    triggerPackets(10, 'info', window.innerWidth / 2, window.innerHeight / 3);
    setScannedNodes([]); // Clear previous results

    try {
      if (isCombatMode) {
        setActiveTarget('scanner'); // Special case for scanner targeting visual
        setTimeout(() => setActiveTarget(null), 1000);
      }
      const response = await fetch(`/api/scan?target=${target}&start=${start}&end=${end}`);
      const data = await response.json();

      if (data.results.length > 0) soundEngine.playDataFound();
      setScannedNodes(data.results.map((r: { port: number }) => ({ port: r.port, status: 'open' as const })));
      fetchState(); // Refresh logs and state from backend
    } catch (err) {
      console.error('Scan failed:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  const executeSingleCommand = async (cmdString: string) => {
    const cmd = cmdString.trim().toLowerCase();
    const args = cmd.split(' ');
    const baseCmd = args[0];

    // Add local echo to backend logs
    if (!isAutomating) {
      soundEngine.playClick();
    }
    await sendRemoteLog(`> ${cmdString}`, 'user', 'info');

    // Command Logic
    switch (baseCmd) {
      case 'help':
        const helpLines = [
          'AVAILABLE COMMANDS:',
          '  scan [target] [start] [end] - Initiate port scan',
          '  patch [id]                - Harden an asset',
          '  isolate [id]              - Disconnect an asset',
          '  breach [id]               - (Debug) Force compromise',
          '  scripts                   - List available scripts',
          '  run [script_name]         - Execute an automation script',
          '  reset                     - Wipe simulation state',
          '  clear                     - (Local) Clear screen'
        ];
        for (const line of helpLines) {
          await sendRemoteLog(line, 'system', 'info');
        }
        break;

      case 'scan':
        const target = args[1] || '127.0.0.1';
        startSimulation(target);
        break;

      case 'patch':
        if (!args[1]) {
          await sendRemoteLog('Usage: patch [asset_id]', 'error', 'alert');
        } else {
          handleAssetAction(args[1], 'PATCH CVE');
        }
        break;

      case 'isolate':
        if (!args[1]) {
          await sendRemoteLog('Usage: isolate [asset_id]', 'error', 'alert');
        } else {
          handleAssetAction(args[1], 'ISOLATE');
        }
        break;

      case 'breach':
        if (!args[1]) {
          await sendRemoteLog('Usage: breach [asset_id]', 'error', 'alert');
        } else {
          handleAssetAction(args[1], 'BREACH');
        }
        break;

      case 'scripts':
        try {
          const res = await fetch('/api/scripts');
          const scripts = await res.json();
          await sendRemoteLog('AVAILABLE SCRIPTS:', 'system', 'info');
          for (const [name, cmds] of Object.entries(scripts)) {
            await sendRemoteLog(`  ${name} (${(cmds as string[]).length} cmds)`, 'system', 'info');
          }
        } catch (err) {
          await sendRemoteLog('Failed to fetch scripts.', 'error', 'alert');
        }
        break;

      case 'run':
        const scriptName = args[1];
        if (!scriptName) {
          await sendRemoteLog('Usage: run [script_name]', 'error', 'alert');
        } else {
          executeScript(scriptName);
        }
        break;

      case 'reset':
        handleReset();
        break;

      case 'clear':
        setClearedAt(Date.now());
        break;

      default:
        await sendRemoteLog(`Unknown command: ${baseCmd}. Type 'help' for options.`, 'error', 'alert');
    }
  };

  const executeScript = async (scriptName: string) => {
    try {
      const res = await fetch('/api/scripts');
      const scripts = await res.json();
      const commands = scripts[scriptName];

      if (!commands) {
        await sendRemoteLog(`Script not found: ${scriptName}`, 'error', 'alert');
        return;
      }

      setIsAutomating(scriptName);
      await sendRemoteLog(`[AUTOMATOR] Initiating sequence: ${scriptName}`, 'system', 'info');

      for (const cmd of commands) {
        if (!cmd.trim()) continue;
        await new Promise(resolve => setTimeout(resolve, 800)); // Cinematic delay
        await executeSingleCommand(cmd);
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      await sendRemoteLog(`[AUTOMATOR] Sequence complete.`, 'system', 'info');
      soundEngine.playDataFound();
    } catch (err) {
      console.error(err);
      await sendRemoteLog(`Script execution failed.`, 'error', 'alert');
    } finally {
      setIsAutomating(null);
    }
  };

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;

    // Update history
    setHistory(prev => [terminalInput, ...prev]);
    setHistoryIndex(-1);

    await executeSingleCommand(terminalInput);
    setTerminalInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const nextIndex = historyIndex + 1;
      if (nextIndex < history.length) {
        setHistoryIndex(nextIndex);
        setTerminalInput(history[nextIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = historyIndex - 1;
      if (nextIndex >= 0) {
        setHistoryIndex(nextIndex);
        setTerminalInput(history[nextIndex]);
      } else {
        setHistoryIndex(-1);
        setTerminalInput('');
      }
    }
  };

  return (
    <div className={`min-h-screen relative flex flex-col items-center transition-all ${isShaking ? 'shake' : ''}`}>
      {isCritical && <div className="red-alert-pulse" />}
      <div className="grid-background" />
      <div className="vignette" />


      <Header
        currentView={currentView}
        onSetView={setCurrentView}
        isMuted={isMuted}
        onToggleMute={toggleMute}
        isCombatMode={isCombatMode}
        onToggleCombat={() => { setIsCombatMode(!isCombatMode); soundEngine.playClick(); }}
      />

      <main className="flex-1 w-full max-w-7xl px-8 flex flex-col items-center">
        <AnimatePresence mode="wait">
          {!selectedTeam ? (
            <motion.div
              key="selection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-12 mt-20"
            >
              <div className="text-center">
                <h2 className="text-5xl font-bold mb-4">Welcome to the InterStellar</h2>
                <p className="text-secondary max-w-md mx-auto">Pick your side, and Brandon will pick the other.</p>
              </div>

              <div className="flex gap-8">
                <TeamCard team="red" isSelected={false} onSelect={(t) => { setSelectedTeam(t); soundEngine.playClick(); }} />
                <TeamCard team="blue" isSelected={false} onSelect={(t) => { setSelectedTeam(t); soundEngine.playClick(); }} />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full grid grid-cols-12 gap-6"
            >
              <div className="col-span-12 flex justify-between items-center mb-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => { setSelectedTeam(null); setIsSimulating(false); soundEngine.playClick(); }}
                    className="text-xs text-secondary hover:text-white transition-colors"
                  >
                    ← SWITCH TEAM
                  </button>
                  <h2 className="text-2xl font-bold uppercase tracking-wider">
                    {selectedTeam} Command Center
                  </h2>
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={handleReset}
                    className="px-6 py-2 rounded-full font-mono text-xs border border-white/10 hover:bg-white/5 transition-all text-secondary hover:text-white"
                  >
                    RESET SYSTEM
                  </button>
                  <button
                    onClick={() => startSimulation()}
                    disabled={isSimulating}
                    className={`px-8 py-2 rounded-full font-bold transition-all ${isSimulating ? 'bg-secondary/20 text-secondary' : 'bg-white text-black hover:scale-105 active:scale-95'}`}
                  >
                    {isSimulating ? 'SCANNING...' : 'INITIATE SCAN'}
                  </button>
                </div>
              </div>

              {currentView === 'DASHBOARD' && (
                <>
                  {/* Interactive Terminal CLI */}
                  <div
                    className="col-span-12 lg:col-span-8 glass-card border-glass p-1 overflow-hidden min-h-[500px] flex flex-col relative group z-10 focus-within:ring-1 focus-within:ring-blue-500/50"
                    onClick={() => { inputRef.current?.focus(); soundEngine.playClick(); }}
                  >
                    <div className="scanline" />
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 text-xs font-mono text-secondary">
                      <div className="flex items-center gap-2">
                        <Terminal size={14} className="text-blue-400" />
                        CRYPTO-LINK TERMINAL v2.0
                      </div>
                      <div className="flex gap-4">
                        <span className="animate-pulse">● LIVE CONNECTION</span>
                        <span>ENC: AES-256</span>
                      </div>
                    </div>

                    <div
                      ref={terminalScrollRef}
                      className="flex-1 bg-black/60 p-6 overflow-y-auto max-h-[400px] font-mono text-sm space-y-1 custom-scrollbar"
                    >
                      {logs.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-secondary/30 text-xs italic tracking-widest gap-2">
                          <Terminal size={24} className="opacity-20" />
                          AWAITING COMMAND INPUT...
                        </div>
                      ) : (
                        [...logs]
                          .filter(log => log.createdAt >= clearedAt)
                          .reverse()
                          .map(log => (
                            <div key={log.id} className="flex gap-4 animate-in fade-in slide-in-from-left-2 duration-300">
                              <span className="text-secondary opacity-40 shrink-0">[{log.timestamp}]</span>
                              <span className="shrink-0 uppercase font-bold" style={{ color: log.type === 'alert' || log.type === 'attack' ? 'var(--red-accent)' : log.type === 'defense' ? 'var(--blue-accent)' : '#4ade80' }}>
                                {log.source}:
                              </span>
                              <span className={log.source === 'user' ? 'text-white' : 'text-secondary/90'}>
                                {log.message}
                              </span>
                            </div>
                          ))
                      )}
                    </div>

                    <form onSubmit={handleCommand} className="p-4 bg-black/40 border-t border-white/5 flex gap-3 items-center">
                      <span className="text-blue-400 font-bold font-mono ml-2">root@interstellar:~$</span>
                      <input
                        ref={inputRef}
                        type="text"
                        value={terminalInput}
                        onChange={(e) => setTerminalInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="flex-1 bg-transparent border-none outline-none text-white font-mono text-sm p-0 mb-0.5"
                        autoFocus
                        placeholder="Type 'help' to begin..."
                      />
                    </form>
                  </div>

                  {/* Sidebar Info */}
                  <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                    <div className="glass-card p-6 border-glass">
                      <h3 className="text-sm font-bold mb-4 uppercase tracking-widest text-secondary">Active Assets</h3>
                      <div className="space-y-4">
                        {assets.map(asset => {
                          const isPatching = asset.status === 'patching';
                          const isOffline = asset.status === 'offline';
                          const isCompromised = asset.status === 'compromised';
                          const statusColor = isPatching ? '#fbbf24' : isOffline ? '#94a3b8' : isCompromised ? 'var(--red-accent)' : '#4ade80';

                          return (
                            <div
                              key={asset.id}
                              id={`asset-${asset.id}`}
                              className={`flex flex-col bg-white/5 p-4 rounded border border-white/5 gap-3 group transition-all ${isOffline ? 'opacity-50' : 'hover:border-blue-500/30'} ${isCompromised ? 'corrupted' : ''}`}
                            >
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-mono text-secondary opacity-50 shrink-0">{asset.id}</span>
                                <span className="text-sm font-bold flex-1 ml-2">{asset.name}</span>
                                <span
                                  className="text-[10px] px-2 py-0.5 rounded-full border"
                                  style={{
                                    backgroundColor: `${statusColor}20`,
                                    color: statusColor,
                                    borderColor: `${statusColor}30`
                                  }}
                                >
                                  {asset.status.toUpperCase()}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                {asset.team === 'red' ? (
                                  <>
                                    <button
                                      onClick={() => handleAssetAction(asset.id, 'ROTATE IP')}
                                      className="text-[9px] bg-white/10 hover:bg-white/20 px-2 py-1 rounded transition-colors uppercase font-mono"
                                    >
                                      Rotate IP
                                    </button>
                                    <button
                                      onClick={() => handleAssetAction(asset.id, 'ENCRYPT PAYLOAD')}
                                      className="text-[9px] bg-white/10 hover:bg-white/20 px-2 py-1 rounded transition-colors uppercase font-mono"
                                    >
                                      Crypt
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      disabled={isOffline || isPatching}
                                      onClick={() => handleAssetAction(asset.id, 'PATCH CVE')}
                                      className={`text-[9px] bg-white/10 hover:bg-white/20 px-2 py-1 rounded transition-colors uppercase font-mono ${isPatching ? 'animate-pulse' : ''}`}
                                    >
                                      {isPatching ? 'Patching...' : 'Patch'}
                                    </button>
                                    <button
                                      disabled={isOffline}
                                      onClick={() => handleAssetAction(asset.id, 'ISOLATE')}
                                      className="text-[9px] bg-white/10 hover:bg-white/20 px-2 py-1 rounded transition-colors uppercase font-mono"
                                    >
                                      Isolate
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="glass-card p-6 border-glass flex-1 flex flex-col">
                      <h3 className="text-sm font-bold mb-4 uppercase tracking-widest text-secondary">Threat Map</h3>
                      <div className="flex-1 rounded bg-white/5 overflow-hidden relative min-h-[180px]">
                        <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                        <NetworkVisualizer nodes={scannedNodes} />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {currentView === 'OPERATIONS' && (
                <div className="col-span-12 glass-card border-glass p-8 text-center min-h-[500px] flex flex-col justify-center">
                  <h3 className="text-2xl font-bold mb-4 tracking-tighter">OPERATIONAL CONTROL</h3>
                  <p className="text-secondary mb-12 max-w-sm mx-auto text-sm">Real-time health monitoring and tactical orchestration for all active units in the field.</p>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="glass-card p-8 border-glass bg-white/5">
                      <div className="text-4xl font-black text-blue-400 mb-2">{assets.length}</div>
                      <div className="text-[10px] text-secondary uppercase font-mono tracking-widest">Total Assets</div>
                    </div>
                    <div className="glass-card p-8 border-glass bg-white/5">
                      <div className="text-4xl font-black text-green-400 mb-2">{assets.filter(a => a.status === 'online').length}</div>
                      <div className="text-[10px] text-secondary uppercase font-mono tracking-widest">Active Units</div>
                    </div>
                    <div className="glass-card p-8 border-glass bg-white/5">
                      <div className="text-4xl font-black text-red-400 mb-2">{logs.filter(l => l.type === 'alert').length}</div>
                      <div className="text-[10px] text-secondary uppercase font-mono tracking-widest">Critical Alarms</div>
                    </div>
                  </div>
                </div>
              )}

              {currentView === 'REPORTS' && (
                <div className="col-span-12 glass-card border-glass p-10 min-h-[500px]">
                  <div className="flex justify-between items-end mb-8 border-b border-glass pb-6">
                    <div>
                      <h3 className="text-2xl font-bold tracking-widest uppercase mb-1">Incident Report</h3>
                      <p className="text-xs text-secondary font-mono">GEN-ID: {Math.random().toString(36).substring(7).toUpperCase()} // CLASSIFIED</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-secondary mb-1 uppercase">Generated At</div>
                      <div className="text-sm font-mono">{new Date().toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="space-y-3 font-mono text-xs">
                    {logs.length === 0 ? (
                      <div className="text-secondary opacity-30 italic py-20 text-center">NO DATA ACQUIRED FOR THIS SESSION.</div>
                    ) : (
                      logs.map(log => (
                        <div key={log.id} className="flex gap-6 border-b border-white/5 py-3 hover:bg-white/[0.02] transition-colors px-4">
                          <span className="text-secondary w-24 shrink-0">[{log.timestamp}]</span>
                          <span className="w-32 uppercase font-bold shrink-0" style={{ color: log.type === 'alert' || log.type === 'attack' ? 'var(--red-accent)' : 'var(--blue-accent)' }}>{log.source}</span>
                          <span className="flex-1 text-secondary/80">{log.message}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="w-full py-8 text-center text-xs text-secondary/30 mt-12">
        DEEP-INTERSTELLAR CORE v1.0.4-BETA // NO UNAUTHORIZED ACCESS
      </footer>

      <CombatHUD
        isActive={isCombatMode}
        team={selectedTeam}
        targetId={activeTarget}
        isAutomating={isAutomating}
      />

      <PacketStream
        packets={activePackets}
        onComplete={(id) => setActivePackets(prev => prev.filter(p => p.id !== id))}
      />

      <style dangerouslySetInnerHTML={{
        __html: `
        .flex { display: flex; }
        .flex-col { flex-direction: column; }
        .items-center { align-items: center; }
        .justify-center { justify-content: center; }
        .justify-between { justify-content: space-between; }
        .gap-2 { gap: 0.5rem; }
        .gap-3 { gap: 0.75rem; }
        .gap-4 { gap: 1rem; }
        .gap-6 { gap: 1.5rem; }
        .gap-8 { gap: 2rem; }
        .gap-12 { gap: 3rem; }
        .mt-12 { margin-top: 3rem; }
        .mt-20 { margin-top: 5rem; }
        .ml-2 { margin-left: 0.5rem; }
        .mb-0.5 { margin-bottom: 0.125rem; }
        .mb-1 { margin-bottom: 0.25rem; }
        .mb-2 { margin-bottom: 0.5rem; }
        .mb-4 { margin-bottom: 1rem; }
        .mb-8 { margin-bottom: 2rem; }
        .mb-12 { margin-bottom: 3rem; }
        .p-0 { padding: 0; }
        .p-1 { padding: 0.25rem; }
        .p-3 { padding: 0.75rem; }
        .p-4 { padding: 1rem; }
        .p-6 { padding: 1.5rem; }
        .p-8 { padding: 2rem; }
        .p-10 { padding: 2.5rem; }
        .px-4 { padding-left: 1rem; padding-right: 1rem; }
        .px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
        .px-8 { padding-left: 2rem; padding-right: 2rem; }
        .px-12 { padding-left: 3rem; padding-right: 3rem; }
        .py-0.5 { padding-top: 0.125rem; padding-bottom: 0.125rem; }
        .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
        .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
        .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
        .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
        .py-6 { padding-top: 1.5rem; padding-bottom: 1.5rem; }
        .py-8 { padding-top: 2rem; padding-bottom: 2rem; }
        .pb-6 { padding-bottom: 1.5rem; }
        .w-24 { width: 6rem; }
        .w-32 { width: 8rem; }
        .w-full { width: 100%; }
        .max-w-7xl { max-width: 80rem; }
        .max-w-md { max-width: 28rem; }
        .max-w-sm { max-width: 24rem; }
        .min-h-screen { min-height: 100vh; }
        .min-h-\[500px\] { min-height: 500px; }
        .h-full { height: 100%; }
        .h-48 { height: 12rem; }
        .grid { display: grid; }
        .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .grid-cols-12 { grid-template-columns: repeat(12, minmax(0, 1fr)); }
        .col-span-8 { grid-column: span 8 / span 8; }
        .col-span-4 { grid-column: span 4 / span 4; }
        .col-span-12 { grid-column: span 12 / span 12; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-xs { font-size: 0.75rem; }
        .text-sm { font-size: 0.875rem; }
        .text-2xl { font-size: 1.5rem; }
        .text-3xl { font-size: 1.875rem; }
        .text-4xl { font-size: 2.25rem; }
        .text-5xl { font-size: 3rem; }
        .text-blue-400 { color: #60a5fa; }
        .text-green-400 { color: #4ade80; }
        .text-red-400 { color: #f87171; }
        .text-white { color: #ffffff; }
        .font-light { font-weight: 300; }
        .font-medium { font-weight: 500; }
        .font-bold { font-weight: 700; }
        .font-black { font-weight: 900; }
        .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
        .uppercase { text-transform: uppercase; }
        .tracking-tighter { letter-spacing: -0.05em; }
        .tracking-wider { letter-spacing: 0.05em; }
        .tracking-widest { letter-spacing: 0.1em; }
        .rounded { border-radius: 0.25rem; }
        .rounded-lg { border-radius: 0.5rem; }
        .rounded-full { border-radius: 9999px; }
        .bg-white\\/5 { background-color: rgba(255, 255, 255, 0.05); }
        .bg-black\\/40 { background-color: rgba(0, 0, 0, 0.4); }
        .bg-black\\/60 { background-color: rgba(0, 0, 0, 0.6); }
        .bg-transparent { background-color: transparent; }
        .border { border-width: 1px; }
        .border-none { border-style: none; }
        .border-t { border-top-width: 1px; }
        .border-b { border-bottom-width: 1px; }
        .border-glass { border-color: var(--border-glass); }
        .border-white\\/5 { border-color: rgba(255, 255, 255, 0.05); }
        .border-white\\/10 { border-color: rgba(255, 255, 255, 0.1); }
        .outline-none { outline: 2px solid transparent; outline-offset: 2px; }
        .text-blue-accent { color: var(--blue-accent); }
        .text-secondary { color: var(--text-secondary); }
        .text-secondary\\/20 { color: rgba(148, 163, 184, 0.2); }
        .text-secondary\\/30 { color: rgba(148, 163, 184, 0.3); }
        .text-secondary\\/80 { color: rgba(148, 163, 184, 0.8); }
        .text-secondary\\/90 { color: rgba(148, 163, 184, 0.9); }
        .relative { position: relative; }
        .absolute { position: absolute; }
        .inset-0 { top: 0; right: 0; bottom: 0; left: 0; }
        .z-[-1] { z-index: -1; }
        .z-10 { z-index: 10; }
        .z-20 { z-index: 20; }
        .pointer-events-none { pointer-events: none; }
        .pointer-events-auto { pointer-events: auto; }
        .cursor-pointer { cursor: pointer; }
        .overflow-hidden { overflow: hidden; }
        .overflow-y-auto { overflow-y: auto; }
        .max-h-\[400px\] { max-height: 400px; }
        .flex-1 { flex: 1 1 0%; }
        .shrink-0 { flex-shrink: 0; }
        .transition-all { transition-property: all; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
        .transition-colors { transition-property: color, background-color, border-color, text-decoration-color, fill, stroke; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
        .duration-300 { transition-duration: 300ms; }
        .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
        .opacity-20 { opacity: 0.2; }
        .opacity-30 { opacity: 0.3; }
        .opacity-40 { opacity: 0.4; }
        .opacity-50 { opacity: 0.5; }
        .italic { font-style: italic; }
      ` }} />
    </div>
  );
}
