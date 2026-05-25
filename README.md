# ONYX

> **Autonomous Execution Intelligence Infrastructure**
> A local-first execution intelligence platform that transforms live software development into a relationally queryable operational graph.

ONYX is not a chatbot, dashboard, or AI wrapper. It is a cybernetic cockpit for the engineering process itself — a Bloomberg Terminal for software execution.

---

## What ONYX does

ONYX continuously intercepts your workspace at five layers, normalises every event into an append-only relational store, and reconstructs the **causal topology** of your engineering loop in real time.

| Layer | Source | Surfaced as |
|------|--------|--------------|
| **Filesystem** | `chokidar` save/edit/delete | `workspace_entropy` |
| **AST** | Tree-sitter structural deltas | `execution_snapshots` |
| **Terminal / Build** | exit codes, retry loops, compiler failures | `replay_events` |
| **System** | CPU / memory / thermal pressure | `system_cybernetics` |
| **Network** | localhost ports, outbound sockets, latency | `network_trajectories` |

Everything flows through the **ONYX Event Bus** into SQLite, where the **Relational Execution Engine** runs cross-source joins to surface failure cascades, friction, and instability *before* humans notice.

---

## Architecture

```mermaid
graph TD
    classDef ui fill:#0a0e14,stroke:#22e8ff,stroke-width:2px,color:#c9d5e3
    classDef agent fill:#070a0e,stroke:#9b6cff,stroke-width:2px,color:#c9d5e3
    classDef db fill:#121922,stroke:#506583,stroke-width:2px,color:#c9d5e3
    
    UI[ONYX Cockpit - Next.js]:::ui
    UI -->|WebSocket & REST ports| AGENT(ONYX Agent - Fastify):::agent
    
    AGENT -->|interceptors| BUS{Event Bus}:::agent
    BUS -->|writes to| DB[(SQLite / onyx_cognition)]:::db
    
    BUS --> ENG[Intelligence Engine]:::agent
    BUS --> CHR[Chrono Replay]:::agent
    BUS --> ANA[Analyst - Mistral/Ollama]:::agent
    BUS --> BO[Blackout Protocol]:::agent
    
    ENG --> DB
    CHR --> DB
    ANA -.->|fallback| BO
```

```text
┌──────────────────────── ONYX Cockpit (Next.js 15) ────────────────────────┐
│  3D Topology Graph · Telemetry Rails · Event Timeline · SQL Intel Feed    │
│  Replay Console · Build Stability · Blackout Indicator · Analyst Ticker   │
└───────────────────────────────────▲───────────────────────────────────────┘
                        WebSocket   │   REST  (port 4311)
┌───────────────────────────────────┴───────────────────────────────────────┐
│                       ONYX Agent (Fastify · TypeScript)                   │
│                                                                           │
│   Interceptors ─► Event Bus ─► SQLite (onyx_cognition schemas)           │
│        │              │                                                   │
│        │              ├─► Intelligence Engine (SQL joins)                 │
│        │              ├─► Chrono Replay (causal reconstruction)           │
│        │              └─► Analyst (Mistral │ Ollama fallback)            │
│        │                                                                  │
│        └─► Blackout Protocol (auto-route inference + cache continuity)   │
└───────────────────────────────────────────────────────────────────────────┘
```

### Coral Source: `onyx_cognition`
See `coral/manifest.yaml`. Six relational tables, JSONL ingestion contract, and DDL ready to register as a Coral custom source.

---

## Run

```bash
cp .env.example .env
npm install
npm run dev
```

This spawns:
- **Agent** at http://127.0.0.1:4311 (Fastify + WebSocket on `/stream`)
- **Cockpit** at http://127.0.0.1:3000

Open the cockpit and press **`D`** (or click *Demo*) to launch the cinematic 4-phase sequence:

1. **Healthy system** — baseline topology pulse
2. **Injected failure** — AST mutation → CPU spike → socket retries → compiler crash cascade
3. **Chrono replay** — causal reconstruction of the failure with scrubber
4. **Blackout protocol** — disconnect inference, fall back to local, preserve continuity

Press **`B`** at any time to toggle the blackout protocol manually.

### Native build prerequisites
`better-sqlite3` compiles a native binding on first install. On Windows, ensure Visual Studio Build Tools (or `npm i -g windows-build-tools`) are present; on macOS, Xcode CLT (`xcode-select --install`); on Linux, `build-essential`.

---

## Stack

**Frontend** Next.js 15 · TypeScript · Tailwind · shadcn/ui · Framer Motion · Zustand · Three.js · React Three Fiber
**Backend** Node 20 · Fastify · `ws` · `better-sqlite3` · `chokidar` · `tree-sitter` · `systeminformation`
**Intelligence** Coral MCP (`onyx_cognition` source) · Mistral `codestral-latest` · Ollama `open-codestral-7b`

---

## Layout

```mermaid
graph LR
    classDef folder fill:transparent,stroke:#506583,stroke-width:1px,color:#c9d5e3,stroke-dasharray: 4 4
    classDef file fill:#1a2230,stroke:#2f3f5f,stroke-width:1px,color:#c9d5e3
    
    Root((ONYX Workspace)):::folder
    
    Root --> Agent[agent/]:::folder
    Agent --> A1[Fastify Backend]:::file
    Agent --> A2[Interceptors]:::file
    Agent --> A3[Intelligence Engine]:::file

    Root --> Web[web/]:::folder
    Web --> W1[Next.js Cockpit]:::file
    Web --> W2[React Three Fiber Topology]:::file
    
    Root --> Coral[coral/]:::folder
    Coral --> C1[manifest.yaml]:::file
    Coral --> C2[onyx_cognition SQL schemas]:::file
```

```text
agent/    Fastify backend, interceptors, intelligence engine, chrono replay
web/      Next.js cockpit
coral/    onyx_cognition source spec (manifest, schemas, fixtures)
```
