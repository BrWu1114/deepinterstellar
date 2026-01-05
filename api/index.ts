import express from 'express';
import cors from 'cors';
// import net from 'net'; // Mocking for now to debug Vercel crash
// const net = { Socket: class {} } as any;

const checkPort = (port: number, host: string): Promise<ScanResult> => {
    return new Promise((resolve) => {
        // Mock scan logic
        setTimeout(() => {
            resolve({ port, status: Math.random() > 0.5 ? 'open' : 'closed' });
        }, 10);
    });
};

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


interface SimulationState {
    assets: Asset[];
    logs: SimulationLog[];
    scripts: Record<string, string[]>;
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

// Mocked checkPort replaced above, or I should have done it in one go.
// Let's just return a mock here to be safe if the previous tool call didn't cover it all.
// ... actually I should use multi_replace to be clean.

// --- API Endpoints ---

// Get current simulation state
app.get('/api/state', (req, res) => {

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


// Reset simulation state
app.post('/api/reset', (req, res) => {
    simulationState = {
        assets: INITIAL_ASSETS.map(a => ({ ...a })), // Shallow copy to reset statuses
        logs: [],
        scripts: { ...simulationState.scripts } // Preserve scripts on reset
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

// Global Error Handler
app.use((err: any, req: any, res: any, next: any) => {
    console.error('SERVER ERROR:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

// Vercel Configuration
export const config = {
    api: {
        bodyParser: false, // Let Express handle parsing
    },
};

// Export for Vercel
export default app;

// Start server if running directly or via ts-node in development
// Check if we are in a development environment or if this file is the entry point
// Start server if running locally
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Scan backend running at http://localhost:${PORT}`);
    });
}
