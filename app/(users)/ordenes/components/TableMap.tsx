'use client';

import React, { useEffect, useRef, useState, useCallback } from "react";
import { C } from './tokens'; // ← Consumiendo tus tokens de diseño

// ─── TYPES & INTERFACES ─────────────────────────────────────────────────────────

export type TableState = 'available' | 'occupied' | 'attention' | 'ready';
export type TableShape = 'circle' | 'square';

export interface Table {
    id: number;
    number: number;
    shape: TableShape;
    chairs: number;
    state: TableState;
    zone: string;
    x: number;
    y: number;
    size: number;
}

interface EditorState {
    tables: Table[];
    selectedId: number | null;
    activeZone: string;
    showGrid: boolean;
    scale: number;
    offsetX: number;
    offsetY: number;
    drag: { id: number; offX: number; offY: number } | null;
    resizing: { id: number; startSX: number; startSY: number; startSize: number } | null;
    nextId: number;
}

// ─── CONSTANTS & CONFIG ─────────────────────────────────────────────────────────

const GRID = 40;
const ZONES = ["Interior", "Terraza", "VIP", "Barra"];

// Colores adaptados al dark theme usando tus tokens
const COLORS: Record<TableState, { fill: string; stroke: string; chair: string; text: string }> = {
    available: { fill: 'rgba(255,255,255,0.03)', stroke: C.br2, chair: 'rgba(255,255,255,0.08)', text: C.t3 },
    occupied: { fill: C.goldDim, stroke: C.goldBorder, chair: C.gold, text: C.goldLight },
    attention: { fill: 'rgba(240, 82, 82, 0.1)', stroke: '#F05252', chair: 'rgba(240, 82, 82, 0.4)', text: '#F98080' },
    ready: { fill: C.tealDim, stroke: C.tealBorder, chair: C.teal, text: '#5EEAD4' },
};

const STATE_LABELS: Record<TableState, string> = {
    available: "Libre",
    occupied: "Ocupada",
    attention: "Atención",
    ready: "Lista",
};

const STATE_COLORS: Record<TableState, string> = {
    available: C.t3,
    occupied: C.gold,
    attention: "#F05252",
    ready: C.teal,
};

function snapToGrid(v: number): number {
    return Math.round(v / GRID) * GRID;
}

// ─── CANVAS DRAWING ────────────────────────────────────────────────────────────

function drawTable(
    ctx: CanvasRenderingContext2D,
    t: Table,
    sel: boolean,
    scale: number,
    offsetX: number,
    offsetY: number,
    activeZone: string
) {
    const sx = t.x * scale + offsetX;
    const sy = t.y * scale + offsetY;
    const w = t.size * scale;
    const h = t.size * scale;
    const cx = sx + w / 2;
    const cy = sy + h / 2;
    const c = COLORS[t.state];
    const chairSz = Math.max(5, 9 * scale);

    ctx.save();

    if (activeZone !== "all" && t.zone !== activeZone) {
        ctx.globalAlpha = 0.2;
    }

    if (sel) {
        ctx.shadowColor = C.gold; // Glow usando el token de acento
        ctx.shadowBlur = 12;
    }

    if (t.shape === "circle") {
        const angles =
            t.chairs === 2 ? [0, 180] :
            t.chairs === 4 ? [0, 90, 180, 270] :
            [0, 60, 120, 180, 240, 300];

        angles.forEach((a) => {
            const rad = (a * Math.PI) / 180;
            const chx = cx + Math.cos(rad) * (w / 2 + chairSz / 1.5 + 1);
            const chy = cy + Math.sin(rad) * (w / 2 + chairSz / 1.5 + 1);
            ctx.save();
            ctx.translate(chx, chy);
            ctx.rotate(rad + Math.PI / 2);
            const cw = chairSz * 1.4, ch = chairSz * 0.8;
            ctx.beginPath();
            ctx.roundRect(-cw / 2, -ch / 2, cw, ch, ch / 2);
            ctx.fillStyle = c.chair;
            ctx.fill();
            ctx.strokeStyle = c.stroke;
            ctx.lineWidth = 0.5;
            ctx.stroke();
            ctx.restore();
        });

        ctx.beginPath();
        ctx.arc(cx, cy, w / 2, 0, Math.PI * 2);
        ctx.fillStyle = c.fill;
        ctx.fill();
        ctx.strokeStyle = sel ? C.gold : c.stroke;
        ctx.lineWidth = sel ? 2 : 1;
        ctx.stroke();
    } else {
        const sqX = sx + chairSz + 2;
        const sqY = sy + chairSz + 2;
        const sqW = w - (chairSz + 2) * 2;
        const sqH = h - (chairSz + 2) * 2;

        const chairPositions =
            t.chairs === 2
                ? [
                    { x: cx - chairSz * 0.7, y: sy + 1, w: chairSz * 1.4, h: chairSz * 0.8 },
                    { x: cx - chairSz * 0.7, y: sy + h - 1 - chairSz * 0.8, w: chairSz * 1.4, h: chairSz * 0.8 },
                ]
                : t.chairs === 4
                ? [
                    { x: cx - chairSz * 0.7, y: sy + 1, w: chairSz * 1.4, h: chairSz * 0.8 },
                    { x: cx - chairSz * 0.7, y: sy + h - 1 - chairSz * 0.8, w: chairSz * 1.4, h: chairSz * 0.8 },
                    { x: sx + 1, y: cy - chairSz * 0.7, w: chairSz * 0.8, h: chairSz * 1.4 },
                    { x: sx + w - 1 - chairSz * 0.8, y: cy - chairSz * 0.7, w: chairSz * 0.8, h: chairSz * 1.4 },
                ]
                : [
                    { x: sx + sqW * 0.1 + chairSz + 2, y: sy + 1, w: sqW * 0.35, h: chairSz * 0.8 },
                    { x: sx + sqW * 0.5 + chairSz + 2, y: sy + 1, w: sqW * 0.35, h: chairSz * 0.8 },
                    { x: sx + sqW * 0.1 + chairSz + 2, y: sy + h - 1 - chairSz * 0.8, w: sqW * 0.35, h: chairSz * 0.8 },
                    { x: sx + sqW * 0.5 + chairSz + 2, y: sy + h - 1 - chairSz * 0.8, w: sqW * 0.35, h: chairSz * 0.8 },
                    { x: sx + 1, y: cy - chairSz * 0.7, w: chairSz * 0.8, h: chairSz * 1.4 },
                    { x: sx + w - 1 - chairSz * 0.8, y: cy - chairSz * 0.7, w: chairSz * 0.8, h: chairSz * 1.4 },
                ];

        chairPositions.forEach((cp) => {
            ctx.beginPath();
            ctx.roundRect(cp.x, cp.y, cp.w, cp.h, 4);
            ctx.fillStyle = c.chair;
            ctx.fill();
            ctx.strokeStyle = c.stroke;
            ctx.lineWidth = 0.5;
            ctx.stroke();
        });

        ctx.beginPath();
        ctx.roundRect(sqX, sqY, sqW, sqH, 8);
        ctx.fillStyle = c.fill;
        ctx.fill();
        ctx.strokeStyle = sel ? C.gold : c.stroke;
        ctx.lineWidth = sel ? 2 : 1;
        ctx.stroke();
    }

    ctx.shadowBlur = 0;

    const fs = Math.max(9, 11 * scale);
    ctx.font = `600 ${fs}px ${C.sans}`;
    ctx.fillStyle = c.text;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`M${t.number}`, cx, cy - fs * 0.3);

    const fss = Math.max(8, 9 * scale);
    ctx.font = `400 ${fss}px ${C.sans}`;
    ctx.globalAlpha = (ctx.globalAlpha ?? 1) * 0.7;
    ctx.fillText(t.zone, cx, cy + fs * 0.8);

    if (sel) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = C.gold;
        ctx.beginPath();
        ctx.moveTo(sx + w - 8 * scale, sy + h);
        ctx.lineTo(sx + w, sy + h - 8 * scale);
        ctx.lineTo(sx + w, sy + h);
        ctx.closePath();
        ctx.fill();
    }

    ctx.restore();
}

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number, scale: number, offsetX: number, offsetY: number) {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = C.br;
    ctx.lineWidth = 0.5;
    const step = GRID * scale;
    const startX = ((offsetX % step) + step) % step;
    const startY = ((offsetY % step) + step) % step;
    for (let x = startX; x < w; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = startY; y < h; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
}

// ─── EDIT PANEL COMPONENT ──────────────────────────────────────────────────────

interface EditPanelProps {
    table: Table | null;
    onUpdate: (key: keyof Table, val: string | number) => void;
    onDelete: () => void;
}

function EditPanel({ table, onUpdate, onDelete }: EditPanelProps) {
    if (!table) {
        return (
            <div style={styles.editPanel}>
                <p style={styles.editHint}>Selecciona una mesa para editarla.</p>
            </div>
        );
    }

    return (
        <div style={styles.editPanel}>
            <p style={styles.sectionTitle}>Mesa {table.number}</p>

            <Field label="Número">
                <input
                    type="number"
                    style={styles.input}
                    value={table.number}
                    min={1}
                    onChange={(e) => onUpdate("number", +e.target.value)}
                />
            </Field>

            <Field label="Zona">
                <select style={styles.input} value={table.zone} onChange={(e) => onUpdate("zone", e.target.value)}>
                    {ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
                </select>
            </Field>

            <Field label="Forma">
                <select style={styles.input} value={table.shape} onChange={(e) => onUpdate("shape", e.target.value as TableShape)}>
                    <option value="circle">Redonda</option>
                    <option value="square">Cuadrada</option>
                </select>
            </Field>

            <Field label="Sillas">
                <select style={styles.input} value={table.chairs} onChange={(e) => onUpdate("chairs", +e.target.value)}>
                    {[2, 4, 6].map((n) => <option key={n} value={n}>{n} sillas</option>)}
                </select>
            </Field>

            <Field label={`Tamaño (${Math.round(table.size)}px)`}>
                <input
                    type="range"
                    min={60} max={200} step={10}
                    value={table.size}
                    style={{ width: "100%", accentColor: C.gold }}
                    onChange={(e) => onUpdate("size", snapToGrid(+e.target.value))}
                />
            </Field>

            <Field label="Estado">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                    {(Object.entries(STATE_LABELS) as [TableState, string][]).map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => onUpdate("state", key)}
                            style={{
                                ...styles.stateBtn,
                                ...(table.state === key ? {
                                    borderColor: STATE_COLORS[key],
                                    color: STATE_COLORS[key],
                                    background: COLORS[key].fill,
                                    borderWidth: 1.5,
                                } : {}),
                            }}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </Field>

            <button style={styles.deleteBtn} onClick={onDelete}>
                🗑 Eliminar mesa
            </button>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div style={{ marginBottom: 12 }}>
            <label style={styles.fieldLabel}>{label}</label>
            {children}
        </div>
    );
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────

let _nextId = 1;

const SEED_TABLES: Table[] = [
    { n: 1, shape: "square", chairs: 4, state: "occupied", zone: "Interior", gx: 1, gy: 1 },
    { n: 2, shape: "square", chairs: 4, state: "occupied", zone: "Interior", gx: 4, gy: 1 },
    { n: 3, shape: "circle", chairs: 2, state: "available", zone: "Interior", gx: 7, gy: 1 },
    { n: 4, shape: "square", chairs: 6, state: "attention", zone: "Interior", gx: 1, gy: 4 },
    { n: 5, shape: "circle", chairs: 4, state: "ready", zone: "Interior", gx: 5, gy: 4 },
    { n: 6, shape: "square", chairs: 2, state: "available", zone: "Terraza", gx: 9, gy: 1 },
    { n: 7, shape: "circle", chairs: 6, state: "occupied", zone: "VIP", gx: 9, gy: 4 },
    { n: 8, shape: "square", chairs: 4, state: "available", zone: "Barra", gx: 1, gy: 7 },
].map((d) => ({
    id: _nextId++,
    number: d.n,
    shape: d.shape as TableShape,
    chairs: d.chairs,
    state: d.state as TableState,
    zone: d.zone,
    x: d.gx * GRID,
    y: d.gy * GRID,
    size: GRID * 2.5,
}));

export default function TableMapEditor() {
    const gridRef = useRef<HTMLCanvasElement>(null);
    const mainRef = useRef<HTMLCanvasElement>(null);
    const areaRef = useRef<HTMLDivElement>(null);
    
    const stateRef = useRef<EditorState>({
        tables: SEED_TABLES,
        selectedId: null,
        activeZone: "all",
        showGrid: true,
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        drag: null,
        resizing: null,
        nextId: _nextId,
    });

    const [, forceRender] = useState(0);
    const rerender = useCallback(() => forceRender((n) => n + 1), []);

    const S = stateRef.current;

    // ── DRAW ──────────────────────────────────────────────────────────────────
    const drawAll = useCallback(() => {
        const gc = gridRef.current;
        const mc = mainRef.current;
        if (!gc || !mc) return;
        const w = gc.width, h = gc.height;
        const { tables, selectedId, showGrid, scale, offsetX, offsetY, activeZone } = S;

        const gCtx = gc.getContext("2d");
        if (!gCtx) return;

        if (showGrid) {
            drawGrid(gCtx, w, h, scale, offsetX, offsetY);
        } else {
            gCtx.clearRect(0, 0, w, h);
        }

        const mctx = mc.getContext("2d");
        if (!mctx) return;
        
        mctx.clearRect(0, 0, w, h);
        tables.forEach((t) => drawTable(mctx, t, t.id === selectedId, scale, offsetX, offsetY, activeZone));
    }, [S]);

    // ── RESIZE OBSERVER ────────────────────────────────────────────────────────
    useEffect(() => {
        const area = areaRef.current;
        if (!area) return;
        const ro = new ResizeObserver(() => {
            const w = area.clientWidth, h = area.clientHeight;
            [gridRef.current, mainRef.current].forEach((c) => { if (c) { c.width = w; c.height = h; } });
            drawAll();
        });
        ro.observe(area);
        return () => ro.disconnect();
    }, [drawAll]);

    // ── MOUSE EVENTS ──────────────────────────────────────────────────────────
    const getTableAt = useCallback((sx: number, sy: number) => {
        const { tables, scale, offsetX, offsetY } = S;
        for (let i = tables.length - 1; i >= 0; i--) {
            const t = tables[i];
            const tx = t.x * scale + offsetX;
            const ty = t.y * scale + offsetY;
            const tw = t.size * scale, th = t.size * scale;
            if (sx >= tx && sx <= tx + tw && sy >= ty && sy <= ty + th) return t;
        }
        return null;
    }, [S]);

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!mainRef.current) return;
        const rect = mainRef.current.getBoundingClientRect();
        const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
        const t = getTableAt(sx, sy);
        if (t) {
            S.selectedId = t.id;
            const tx = t.x * S.scale + S.offsetX;
            const ty = t.y * S.scale + S.offsetY;
            const tw = t.size * S.scale, th = t.size * S.scale;
            if (sx > tx + tw - 16 && sy > ty + th - 16) {
                S.resizing = { id: t.id, startSX: sx, startSY: sy, startSize: t.size };
            } else {
                S.drag = { id: t.id, offX: sx - tx, offY: sy - ty };
            }
        } else {
            S.selectedId = null;
        }
        drawAll(); rerender();
    }, [S, getTableAt, drawAll, rerender]);

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!S.drag && !S.resizing) return;
            const rect = mainRef.current?.getBoundingClientRect();
            if (!rect) return;
            const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
            if (S.drag) {
                const t = S.tables.find((t) => t.id === S.drag!.id);
                if (!t) return;
                t.x = snapToGrid((sx - S.drag.offX - S.offsetX) / S.scale);
                t.y = snapToGrid((sy - S.drag.offY - S.offsetY) / S.scale);
                drawAll();
            }
            if (S.resizing) {
                const t = S.tables.find((t) => t.id === S.resizing!.id);
                if (!t) return;
                const delta = Math.max(sx - S.resizing.startSX, sy - S.resizing.startSY);
                t.size = snapToGrid(Math.max(60, Math.min(200, S.resizing.startSize + delta / S.scale)));
                drawAll(); rerender();
            }
        };
        const onUp = () => { S.drag = null; S.resizing = null; };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    }, [S, drawAll, rerender]);

    const handleWheel = useCallback((e: WheelEvent) => {
        e.preventDefault();
        if (!mainRef.current) return;
        const rect = mainRef.current.getBoundingClientRect();
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        const newScale = Math.max(0.4, Math.min(2.5, S.scale - e.deltaY * 0.001));
        S.offsetX = mx - (mx - S.offsetX) * (newScale / S.scale);
        S.offsetY = my - (my - S.offsetY) * (newScale / S.scale);
        S.scale = newScale;
        drawAll();
    }, [S, drawAll]);

    useEffect(() => {
        const el = mainRef.current;
        if (!el) return;
        el.addEventListener("wheel", handleWheel, { passive: false });
        return () => el.removeEventListener("wheel", handleWheel);
    }, [handleWheel]);

    // ── CURSOR ────────────────────────────────────────────────────────────────
    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!mainRef.current) return;
        const rect = mainRef.current.getBoundingClientRect();
        const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
        const t = getTableAt(sx, sy);
        if (t) {
            const tx = t.x * S.scale + S.offsetX;
            const ty = t.y * S.scale + S.offsetY;
            const tw = t.size * S.scale, th = t.size * S.scale;
            mainRef.current.style.cursor =
                sx > tx + tw - 16 && sy > ty + th - 16 ? "nwse-resize" : "grab";
        } else {
            mainRef.current.style.cursor = "default";
        }
    }, [S, getTableAt]);

    // ── ACTIONS ───────────────────────────────────────────────────────────────
    const addTable = useCallback((shape: TableShape, chairs: number) => {
        const cx = (mainRef.current?.width ?? 600) / 2;
        const cy = (mainRef.current?.height ?? 400) / 2;
        S.tables.push({
            id: S.nextId++,
            number: S.tables.length + 1,
            shape, chairs,
            state: "available",
            zone: "Interior",
            x: snapToGrid((cx - S.offsetX) / S.scale - GRID),
            y: snapToGrid((cy - S.offsetY) / S.scale - GRID),
            size: GRID * 2.5,
        });
        S.selectedId = S.tables[S.tables.length - 1].id;
        drawAll(); rerender();
    }, [S, drawAll, rerender]);

    const updateProp = useCallback((key: keyof Table, val: string | number) => {
        const t = S.tables.find((t) => t.id === S.selectedId);
        if (!t) return;
        // @ts-ignore - type safety bypassed for dynamic assignment
        t[key] = key === "size" ? snapToGrid(val as number) : val;
        drawAll(); rerender();
    }, [S, drawAll, rerender]);

    const deleteSelected = useCallback(() => {
        S.tables = S.tables.filter((t) => t.id !== S.selectedId);
        S.selectedId = null;
        drawAll(); rerender();
    }, [S, drawAll, rerender]);

    const selectedTable = S.tables.find((t) => t.id === S.selectedId) ?? null;
    const counts = {
        occupied: S.tables.filter((t) => t.state === "occupied").length,
        available: S.tables.filter((t) => t.state === "available").length,
        attention: S.tables.filter((t) => t.state === "attention").length,
        ready: S.tables.filter((t) => t.state === "ready").length,
    };

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    return (
        <div style={styles.app}>
            {/* ── Sidebar ── */}
            <div style={styles.sidebar}>
                <div style={styles.sidebarHead}>
                    <p style={styles.sidebarTitle}>Mapa de Salón</p>
                    <p style={styles.sidebarSub}>{timeStr} · {S.tables.length} mesas</p>
                </div>

                <div style={styles.statsGrid}>
                    {[
                        { label: "Ocupadas", count: counts.occupied, color: C.gold },
                        { label: "Libres", count: counts.available, color: C.t2 },
                        { label: "Atención", count: counts.attention, color: "#F05252" },
                        { label: "Listas", count: counts.ready, color: C.teal },
                    ].map(({ label, count, color }) => (
                        <div key={label} style={styles.statCard}>
                            <span style={{ ...styles.statNum, color }}>{count}</span>
                            <span style={styles.statLabel}>{label}</span>
                        </div>
                    ))}
                </div>

                <div style={styles.section}>
                    <p style={styles.sectionTitle}>Agregar mesa</p>
                    {(
                        [
                            ["square", 2, "⬛ Cuadrada · 2"],
                            ["square", 4, "⬛ Cuadrada · 4"],
                            ["circle", 2, "⭕ Redonda · 2"],
                            ["circle", 4, "⭕ Redonda · 4"],
                            ["circle", 6, "⭕ Redonda · 6"],
                        ] as [TableShape, number, string][]
                    ).map(([shape, chairs, label]) => (
                        <button key={label} style={styles.addBtn} onClick={() => addTable(shape, chairs)}>
                            {label} sillas
                        </button>
                    ))}
                </div>

                <div style={styles.section}>
                    <p style={styles.sectionTitle}>Estado</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {[
                            { dot: C.t3, label: "Libre" },
                            { dot: C.gold, label: "Ocupada" },
                            { dot: "#F05252", label: "Atención" },
                            { dot: C.teal, label: "Lista" },
                        ].map(({ dot, label }) => (
                            <div key={label} style={styles.legItem}>
                                <div style={{ ...styles.legDot, background: dot }} />
                                {label}
                            </div>
                        ))}
                    </div>
                </div>

                <EditPanel table={selectedTable} onUpdate={updateProp} onDelete={deleteSelected} />
            </div>

            {/* ── Canvas area ── */}
            <div style={styles.canvasWrap}>
                <div style={styles.toolbar}>
                    <span style={styles.toolbarLabel}>Zona:</span>
                    {["all", ...ZONES].map((z) => (
                        <button
                            key={z}
                            style={{
                                ...styles.zoneBtn,
                                ...(S.activeZone === z ? styles.zoneBtnActive : {}),
                            }}
                            onClick={() => { S.activeZone = z; drawAll(); rerender(); }}
                        >
                            {z === "all" ? "Todas" : z}
                        </button>
                    ))}
                    <label style={styles.gridToggle}>
                        <input
                            type="checkbox"
                            defaultChecked
                            onChange={(e) => { S.showGrid = e.target.checked; drawAll(); }}
                        />
                        Cuadrícula
                    </label>
                </div>

                <div ref={areaRef} style={styles.canvasArea}>
                    <canvas ref={gridRef} style={styles.canvasLayer} />
                    <canvas
                        ref={mainRef}
                        style={styles.canvasLayer}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                    />
                    <div style={styles.hint}>Arrastra · Click para editar · Scroll para zoom</div>
                </div>
            </div>
        </div>
    );
}

// ─── STYLES (Adaptados para Dark Theme) ────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
    app: {
        display: "flex",
        height: 620,
        overflow: "hidden",
        borderRadius: 12,
        border: `1px solid ${C.br}`,
        background: C.bgCard,
        fontFamily: C.sans,
    },
    sidebar: {
        width: 220,
        flexShrink: 0,
        borderRight: `1px solid ${C.br}`,
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        background: C.bgCard,
    },
    sidebarHead: {
        padding: "16px 16px 14px",
        borderBottom: `1px solid ${C.br}`,
    },
    sidebarTitle: { fontSize: 14, fontWeight: 600, color: C.t1, margin: 0, lineHeight: 1.2 },
    sidebarSub: { fontSize: 11, color: C.t3, marginTop: 4, lineHeight: 1.2 },
    statsGrid: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 8,
        padding: "14px 16px",
        borderBottom: `1px solid ${C.br}`,
    },
    statCard: {
        background: C.bg,
        border: `1px solid ${C.br}`,
        borderRadius: 8,
        padding: 8,
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        gap: 4,
    },
    statNum: { fontSize: 18, fontWeight: 600, lineHeight: 1 },
    statLabel: { fontSize: 10, color: C.t3, lineHeight: 1 },
    section: {
        padding: "16px",
        borderBottom: `1px solid ${C.br}`,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: 600,
        color: C.t3,
        textTransform: "uppercase",
        letterSpacing: "0.6px",
        marginBottom: 12,
        lineHeight: 1,
    },
    addBtn: {
        width: "100%",
        padding: "8px 10px",
        background: C.bg,
        border: `1px solid ${C.br}`,
        borderRadius: 8,
        fontSize: 12,
        color: C.t2,
        cursor: "pointer",
        textAlign: "left",
        marginBottom: 6,
        transition: "all 0.15s ease",
    },
    legItem: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 12,
        color: C.t2,
    },
    legDot: {
        width: 10,
        height: 10,
        borderRadius: "50%",
        flexShrink: 0,
    },
    editPanel: {
        padding: "16px",
        flex: 1,
    },
    editHint: {
        fontSize: 12,
        color: C.t3,
        marginTop: 8,
    },
    fieldLabel: {
        fontSize: 11,
        color: C.t3,
        display: "block",
        marginBottom: 6,
    },
    input: {
        width: "100%",
        padding: "8px",
        border: `1px solid ${C.br2}`,
        borderRadius: 8,
        fontSize: 12,
        background: C.bg,
        color: C.t1,
        outline: "none",
    },
    stateBtn: {
        padding: "6px 4px",
        borderRadius: 8,
        border: `1px solid ${C.br2}`,
        background: C.bg,
        fontSize: 11,
        cursor: "pointer",
        color: C.t3,
    },
    deleteBtn: {
        width: "100%",
        padding: 8,
        border: "1px solid rgba(240, 82, 82, 0.3)",
        borderRadius: 8,
        background: "rgba(240, 82, 82, 0.05)",
        color: "#F05252",
        fontSize: 12,
        fontWeight: 500,
        cursor: "pointer",
        marginTop: 12,
    },
    canvasWrap: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
    },
    toolbar: {
        padding: "10px 16px",
        borderBottom: `1px solid ${C.br}`,
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: C.bgCard2,
        flexWrap: "wrap",
    },
    toolbarLabel: { fontSize: 11, color: C.t3 },
    zoneBtn: {
        padding: "4px 12px",
        borderRadius: 20,
        border: `1px solid ${C.br2}`,
        background: C.bg,
        fontSize: 11,
        color: C.t2,
        cursor: "pointer",
    },
    zoneBtnActive: {
        background: C.goldDim,
        borderColor: C.goldBorder,
        color: C.goldLight,
        fontWeight: 600,
    },
    gridToggle: {
        marginLeft: "auto",
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: 11,
        color: C.t3,
        cursor: "pointer",
    },
    canvasArea: {
        flex: 1,
        position: "relative",
        overflow: "hidden",
        background: C.bg,
    },
    canvasLayer: {
        position: "absolute",
        top: 0,
        left: 0,
    },
    hint: {
        position: "absolute",
        bottom: 12,
        right: 12,
        fontSize: 10,
        color: C.t3,
        background: C.bgCard,
        padding: "6px 10px",
        borderRadius: 6,
        border: `1px solid ${C.br}`,
        pointerEvents: "none",
    },
};