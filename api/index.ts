import express from 'express';
import cors from 'cors';
import net from 'net';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// --- Types ---
interface SimulationLog {
    id: string;
    timestamp: string;
    createdAt: number;
    source: string;
    message: string;
    type: 'info' | 'attack' | 'defense' | 'alert';
}

interface Asset {
    id: string;
    name: string;
    type: 'server' | 'proxy' | 'workstation' | 'firewall';
    status: 'online' | 'offline' | 'compromised' | 'patching';
    team: 'red' | 'blue';
}

interface AiState {
    enabled: boolean;
    role: 'red' | 'blue';
    difficulty: number;
    lastActionAt: number;
}

interface SimulationState {
    assets: Asset[];
    logs: SimulationLog[];
    scripts: Record<string, string[]>;
    ai: AiState;
}

interface ScanResult {
    port: number;
    status: 'open' | 'closed';
}

// --- Initial State ---
const INITIAL_ASSETS: Asset[] = [
    { id: 'red-1', name: 'Redirector-7', type: 'proxy', status: 'online', team: 'red' },
    { id: 'red-2', name: 'Staging-Alpha', type: 'server', status: 'online', team: 'red' },
    { id: 'red-3', name: 'C2-Primary', type: 'server', status: 'online', team: 'red' },
    { id: 'blue-1', name: 'Main-DB', type: 'server', status: 'online', team: 'blue' },
    { id: 'blue-2', name: 'Auth-Gateway', type: 'firewall', status: 'online', team: 'blue' },
    { id: 'blue-3', name: 'Sentinel-API', type: 'server', status: 'online', team: 'blue' },
];

let simulationState: SimulationState = {
    assets: [...INITIAL_ASSETS],
    logs: [],
    scripts: {
        "sweep.sh": ["scan 127.0.0.1", "patch blue-1", "patch blue-2", "patch blue-3"],
        "overclock.sh": ["rotate ip", "encrypt payload", "breach blue-1"]
    },
    ai: {
        enabled: false,
        role: 'red', // Default AI is Red Team (User plays Blue)
        difficulty: 3000, // 3 seconds
        lastActionAt: 0
    }
};

// --- Helper functions ---
const addLog = (source: string, message: string, type: SimulationLog['type']) => {
    const newLog: SimulationLog = {
        id: Math.random().toString(36).substring(7),
        timestamp: new Date().toLocaleTimeString(),
        createdAt: Date.now(),
        source,
        message,
        type
    };
    simulationState.logs = [newLog, ...simulationState.logs].slice(0, 100); // Keep last 100 logs
};

const checkPort = (port: number, host: string): Promise<ScanResult> => {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(500);

        socket.on('connect', () => {
            socket.destroy();
            resolve({ port, status: 'open' });
        });

        socket.on('timeout', () => {
            socket.destroy();
            resolve({ port, status: 'closed' });
        });

        socket.on('error', () => {
            socket.destroy();
            resolve({ port, status: 'closed' });
        });

        socket.connect(port, host);
    });
};

// --- API Endpoints ---

// Get current simulation state
app.get('/api/state', (req, res) => {
    // --- AI LOGIC HOOK ---
    // Piggyback on client polling to trigger AI moves
    if (simulationState.ai.enabled) {
        const now = Date.now();
        if (now - simulationState.ai.lastActionAt > simulationState.ai.difficulty) {
            // It's time for an AI move
            simulationState.ai.lastActionAt = now;
            const aiRole = simulationState.ai.role;
            const targetTeam = aiRole === 'red' ? 'blue' : 'red';

            // Find potential targets
            const potentialTargets = simulationState.assets.filter(a => a.team === targetTeam);

            if (potentialTargets.length > 0) {
                const target = potentialTargets[Math.floor(Math.random() * potentialTargets.length)];

                if (aiRole === 'red') {
                    // Red AI Logic (Attacker)
                    const action = Math.random() > 0.3 ? 'BREACH' : 'ENCRYPT PAYLOAD'; // Prefer breach
                    if (target.status !== 'compromised') {
                        if (action === 'BREACH') {
                            target.status = 'compromised';
                            addLog('AI_OVERLORD', `SYSTEM BREACH: ${target.name} compromised by Opposing Force.`, 'alert');
                        } else {
                            addLog('AI_OVERLORD', `SIGNATURE DETECTED: ${target.name} under encryption attack.`, 'attack');
                        }
                    }
                } else {
                    // Blue AI Logic (Defender) -- If user plays Red
                    if (target.status === 'compromised') {
                        target.status = 'online'; // Insta-patch for AI
                        addLog('AI_DEFENSE', `COUNTERMEASURE: ${target.name} patched by AI Defense.`, 'defense');
                    } else if (target.status === 'online') {
                        addLog('AI_DEFENSE', `HARDENING: ${target.name} reinforced by AI Defense.`, 'defense');
                    }
                }
            }
        }
    }

    res.json(simulationState);
});

// Process a tactical action
app.post('/api/action', (req, res) => {
    const { assetId, action, team } = req.body;
    const asset = simulationState.assets.find(a => a.id === assetId);

    if (asset) {
        addLog(asset.name, `TACTICAL ACTION: ${action} sequence initiated.`, team === 'red' ? 'attack' : 'defense');

        // Logic to actually change the asset status
        if (action === 'PATCH CVE') {
            asset.status = 'patching';
            setTimeout(() => {
                if (asset.status === 'patching') {
                    asset.status = 'online';
                    addLog(asset.name, `SUCCESS: Security patch applied. Asset is now hardened.`, 'info');
                }
            }, 10000); // Reset to online after 10 seconds
        } else if (action === 'ISOLATE') {
            asset.status = 'offline';
            addLog(asset.name, `ALERT: Asset has been isolated from the network.`, 'alert');
        } else if (action === 'ROTATE IP') {
            addLog(asset.name, `NETWORK: IP space rotation complete. Footprint reduced.`, 'info');
        } else if (action === 'ENCRYPT PAYLOAD') {
            addLog(asset.name, `CRYPT: Payload obfuscation complete. AV evasion active.`, 'attack');
        } else if (action === 'BREACH') {
            asset.status = 'compromised';
            addLog(asset.name, `CRITICAL: System breach detected. Privilege escalation successful.`, 'alert');
        }

        res.json({ success: true, asset });
    } else {
        res.status(404).json({ error: 'Asset not found' });
    }
});

// Record a manual log entry
app.post('/api/log', (req, res) => {
    const { message, source, type } = req.body;
    addLog(source || 'system', message, type || 'info');
    res.json({ success: true });
});

// Toggle AI
app.post('/api/ai', (req, res) => {
    const { enabled, role } = req.body;
    simulationState.ai.enabled = !!enabled;
    if (role) simulationState.ai.role = role;

    // Reset timer when enabling
    if (simulationState.ai.enabled) {
        simulationState.ai.lastActionAt = Date.now();
        addLog('system', `SURVIVAL MODE ACTIVE. OPPOSING FORCE (${simulationState.ai.role.toUpperCase()}) ENGAGED.`, 'alert');
    } else {
        addLog('system', 'Survival Mode deactivated. Threat level normalizing.', 'info');
    }

    res.json(simulationState.ai);
});

// Reset simulation state
app.post('/api/reset', (req, res) => {
    simulationState = {
        assets: INITIAL_ASSETS.map(a => ({ ...a })), // Shallow copy to reset statuses
        logs: [],
        scripts: { ...simulationState.scripts }, // Preserve scripts on reset
        ai: { ...simulationState.ai, enabled: false } // Reset AI
    };
    addLog('system', 'Simulation state reset to default.', 'info');
    res.json({ success: true });
});

// Get available scripts
app.get('/api/scripts', (req, res) => {
    res.json(simulationState.scripts);
});

// Save a script
app.post('/api/scripts', (req, res) => {
    const { name, commands } = req.body;
    if (name && Array.isArray(commands)) {
        simulationState.scripts[name] = commands;
        addLog('system', `Script '${name}' saved to storage.`, 'info');
        res.json({ success: true });
    } else {
        res.status(400).json({ error: 'Invalid script data' });
    }
});

app.get('/api/scan', async (req, res) => {
    const target = (req.query.target as string) || '127.0.0.1';
    const startPort = parseInt(req.query.start as string) || 80;
    const endPort = parseInt(req.query.end as string) || 5180; // Default range includes vite dev port

    addLog('system', `Initializing port scan on ${target} (ports ${startPort}-${endPort})...`, 'info');

    const results: ScanResult[] = [];
    // Only scan a few ports to keep it fast but relevant
    const portsToScan = [80, 443, 3000, 3001, 5173, 8080];

    for (const port of portsToScan) {
        if (port >= startPort && port <= endPort) {
            const result = await checkPort(port, target);
            results.push(result);
        }
    }

    const findings = results.filter(r => r.status === 'open');
    findings.forEach(f => {
        addLog('scanner', `OPEN PORT DETECTED: ${f.port}`, 'attack');
    });

    if (findings.length === 0) {
        addLog('scanner', 'Scan completed. No open ports found in specified range.', 'info');
    }

    res.json({
        target,
        timestamp: new Date().toISOString(),
        results: findings
    });
});

// Export for Vercel
export default app;

// Start server if running directly or via ts-node in development
// Check if we are in a development environment or if this file is the entry point
if (process.env.NODE_ENV !== 'production' || require.main === module) {
    app.listen(PORT, () => {
        console.log(`Scan backend running at http://localhost:${PORT}`);
    });
}
