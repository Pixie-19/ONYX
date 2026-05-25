import si from 'systeminformation';
import { nanoid } from 'nanoid';
import { bus, SESSION_ID } from '../bus/eventBus.js';
import type { SystemCyberneticsRow, ThermalState } from '../types.js';

// Exponentially weighted memory-pressure proxy.
let memEwma = 0;

/**
 * Thermal classification — driven by *temperature* (when available) with CPU
 * load as a secondary signal. Memory is intentionally excluded: it has its
 * own MEMORY_PRESSURE event and conflating it here makes the platform
 * mis-report thermal state on any laptop running a browser + dev servers.
 *
 * On Windows, `cpuTemperature()` commonly returns null without elevated
 * privileges, so we fall back to CPU load alone in that case — at a higher
 * threshold than the dedicated CPU_SPIKE event so the two don't overlap.
 */
function thermalFor(load: number, temp: number | null): ThermalState {
  if (typeof temp === 'number' && temp > 0) {
    if (temp >= 95) return 'critical';
    if (temp >= 85) return 'hot';
    if (temp >= 75) return 'warm';
    return 'nominal';
  }
  // no thermometer — fall back to sustained CPU load
  if (load >= 0.98) return 'critical';
  if (load >= 0.95) return 'hot';
  if (load >= 0.85) return 'warm';
  return 'nominal';
}

// ── transition gates ──
// Each alert kind fires once per state transition into the bad band, with a
// hard cooldown to prevent a flapping signal from spamming the bus.
interface Gate {
  inBand: boolean;
  lastEmitted: number;
  cooldownMs: number;
}
const cpuGate:     Gate = { inBand: false, lastEmitted: 0, cooldownMs: 60_000 };
const memGate:     Gate = { inBand: false, lastEmitted: 0, cooldownMs: 60_000 };
const thermalGate: Gate = { inBand: false, lastEmitted: 0, cooldownMs: 60_000 };

function shouldEmit(gate: Gate, currentlyInBand: boolean): boolean {
  const now = Date.now();
  if (currentlyInBand && !gate.inBand) {
    // transition into bad band — emit
    gate.inBand = true;
    gate.lastEmitted = now;
    return true;
  }
  if (!currentlyInBand && gate.inBand) {
    gate.inBand = false;
    return false;
  }
  // sustained — emit at most once per cooldown
  if (currentlyInBand && now - gate.lastEmitted > gate.cooldownMs) {
    gate.lastEmitted = now;
    return true;
  }
  return false;
}

export function startSystem(): void {
  const tick = async () => {
    try {
      const [load, mem, disksIO, temps, procs] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.disksIO().catch(() => null),
        si.cpuTemperature().catch(() => ({ main: null })),
        si.processes().catch(() => ({ all: 0 })),
      ]);
      const cpu = Math.max(0, Math.min(1, load.currentLoad / 100));
      const memUsed = mem.total > 0 ? mem.active / mem.total : 0;
      const swap = mem.swaptotal > 0 ? mem.swapused / mem.swaptotal : 0;
      memEwma = memEwma * 0.7 + memUsed * 0.3;
      const memPressure = Math.max(0, memUsed - memEwma) * 2;

      const cpuTemp: number | null = typeof (temps as any).main === 'number' ? (temps as any).main : null;
      const thermal = thermalFor(cpu, cpuTemp);

      const row: SystemCyberneticsRow = {
        id: `sc_${nanoid(10)}`,
        ts: Date.now(),
        cpu_load: Number(cpu.toFixed(3)),
        cpu_temp_c: cpuTemp,
        mem_used_pct: Number(memUsed.toFixed(3)),
        mem_pressure: Number(memPressure.toFixed(3)),
        swap_used_pct: Number(swap.toFixed(3)),
        disk_busy_pct: disksIO ? Number(((disksIO.tIO ?? 0) / Math.max(1, (disksIO.tIO ?? 1))).toFixed(3)) : 0,
        disk_iops: disksIO ? Number((disksIO.tIO_sec ?? 0).toFixed(1)) : 0,
        thermal_state: thermal,
        process_count: (procs as any).all ?? 0,
        session_id: SESSION_ID,
      };
      bus.emitTelemetry(row);

      // ── alert gating: only emit on transition or cooldown ──
      const cpuBad = cpu > 0.92;
      if (shouldEmit(cpuGate, cpuBad)) {
        bus.emitReplayEvent({
          kind: 'CPU_SPIKE',
          severity: cpu > 0.98 ? 'critical' : 'warn',
          source: 'interceptor.system',
          target: 'host.cpu',
          payload: { cpu_load: row.cpu_load },
        });
      }

      const memBad = memUsed > 0.92;
      if (shouldEmit(memGate, memBad)) {
        bus.emitReplayEvent({
          kind: 'MEMORY_PRESSURE',
          severity: memUsed > 0.97 ? 'critical' : 'warn',
          source: 'interceptor.system',
          target: 'host.memory',
          payload: { mem_used_pct: row.mem_used_pct, mem_pressure: row.mem_pressure },
        });
      }

      const thermalBad = thermal === 'hot' || thermal === 'critical';
      if (shouldEmit(thermalGate, thermalBad)) {
        bus.emitReplayEvent({
          kind: 'THERMAL_ALERT',
          severity: thermal === 'critical' ? 'critical' : 'warn',
          source: 'interceptor.system',
          target: 'host.thermal',
          payload: { thermal, cpu_temp_c: cpuTemp, cpu_load: row.cpu_load },
        });
      }
    } catch {
      // swallow — system interceptor must be resilient
    }
  };

  void tick();
  setInterval(tick, 1000).unref();
}
