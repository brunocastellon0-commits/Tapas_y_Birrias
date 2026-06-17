'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, Trash2 } from 'lucide-react';
import { C } from './tokens';

export type TableState = 'available' | 'occupied' | 'attention' | 'ready';

export interface TableData {
  id: number;
  numero: number;
  shape: 'circle' | 'square';
  sillas: number;
  state: TableState;
  zona: string;
  pos_x: number;
  pos_y: number;
  tamano: number;
}

interface TableMapViewProps {
  onTableSelect: (table: TableData | null) => void;
  selectedTableId: number | null;
  occupiedTableIds: Set<number>;
}

const GRID = 40;
const ZONES = ['Interior', 'Terraza', 'VIP', 'Barra'];

const COLORS: Record<TableState, { fill: string; stroke: string; chair: string; text: string }> = {
  available: { fill: 'rgba(255,255,255,0.03)', stroke: C.br2, chair: 'rgba(255,255,255,0.08)', text: C.t3 },
  occupied: { fill: C.goldDim, stroke: C.goldBorder, chair: C.gold, text: C.goldLight },
  attention: { fill: 'rgba(240, 82, 82, 0.1)', stroke: '#F05252', chair: 'rgba(240, 82, 82, 0.4)', text: '#F98080' },
  ready: { fill: C.tealDim, stroke: C.tealBorder, chair: C.teal, text: '#5EEAD4' },
};

const STATE_LABELS: Record<TableState, string> = {
  available: 'Libre',
  occupied: 'Ocupada',
  attention: 'Atención',
  ready: 'Lista',
};

function drawTable(
  ctx: CanvasRenderingContext2D,
  t: TableData,
  sel: boolean,
  scale: number,
  offsetX: number,
  offsetY: number,
  activeZone: string
) {
  const sx = t.pos_x * scale + offsetX;
  const sy = t.pos_y * scale + offsetY;
  const w = t.tamano * scale;
  const h = t.tamano * scale;
  const cx = sx + w / 2;
  const cy = sy + h / 2;
  const c = COLORS[t.state];
  const chairSz = Math.max(5, 9 * scale);

  ctx.save();

  if (activeZone !== 'all' && t.zona !== activeZone) {
    ctx.globalAlpha = 0.2;
  }

  if (sel) {
    ctx.shadowColor = C.gold;
    ctx.shadowBlur = 12;
  }

  if (t.shape === 'circle') {
    const angles =
      t.sillas === 2 ? [0, 180] :
      t.sillas === 4 ? [0, 90, 180, 270] :
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
      t.sillas === 2
        ? [
            { x: cx - chairSz * 0.7, y: sy + 1, w: chairSz * 1.4, h: chairSz * 0.8 },
            { x: cx - chairSz * 0.7, y: sy + h - 1 - chairSz * 0.8, w: chairSz * 1.4, h: chairSz * 0.8 },
          ]
        : t.sillas === 4
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
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`M${t.numero}`, cx, cy - fs * 0.3);

  const fss = Math.max(8, 9 * scale);
  ctx.font = `400 ${fss}px ${C.sans}`;
  ctx.globalAlpha = (ctx.globalAlpha ?? 1) * 0.7;
  ctx.fillText(t.zona, cx, cy + fs * 0.8);

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

export default function TableMapView({ onTableSelect, selectedTableId, occupiedTableIds }: TableMapViewProps) {
  const supabase = createClient();
  const gridRef = useRef<HTMLCanvasElement>(null);
  const mainRef = useRef<HTMLCanvasElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  const [tables, setTables] = useState<TableData[]>([]);
  const [activeZone, setActiveZone] = useState('all');
  const [showGrid, setShowGrid] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [zonas, setZonas] = useState<{ id: number; nombre: string; sucursal_id: number }[]>([]);
  const [newTable, setNewTable] = useState({ zona_id: 0, forma: 'square' as 'circle' | 'square', sillas: 4 });

  const scaleRef = useRef(1);
  const offsetXRef = useRef(0);
  const offsetYRef = useRef(0);
  const panning = useRef<{ startX: number; startY: number; offX: number; offY: number } | null>(null);
  const [, forceRender] = useState(0);
  const rerender = useCallback(() => forceRender((n) => n + 1), []);

  async function cargarMesas() {
    const { data } = await supabase
      .from('mesas')
      .select('*, zona:zona_id(nombre)')
      .eq('activa', true);

    if (data) {
      setTables(
        data.map((m: any) => ({
          id: m.id,
          numero: m.numero,
          shape: m.forma as 'circle' | 'square',
          sillas: m.sillas,
          state: occupiedTableIds.has(m.id) ? 'occupied' : 'available',
          zona: m.zona?.nombre ?? 'Interior',
          pos_x: m.pos_x,
          pos_y: m.pos_y,
          tamano: m.tamano,
        }))
      );
    }
    setLoading(false);
  }

  useEffect(() => {
    cargarMesas();
    cargarZonas();
  }, [occupiedTableIds]);

  async function cargarZonas() {
    const { data } = await supabase.from('zonas').select('*');
    if (data && data.length > 0) {
      setZonas(data);
      setNewTable((prev) => ({ ...prev, zona_id: data[0].id }));
    }
  }

  useEffect(() => {
    rerender();
  }, [tables]);

  const drawAll = useCallback(() => {
    const gc = gridRef.current;
    const mc = mainRef.current;
    if (!gc || !mc) return;
    const w = gc.width, h = gc.height;
    const scale = scaleRef.current;
    const offsetX = offsetXRef.current;
    const offsetY = offsetYRef.current;

    const gCtx = gc.getContext('2d');
    if (!gCtx) return;

    if (showGrid) {
      drawGrid(gCtx, w, h, scale, offsetX, offsetY);
    } else {
      gCtx.clearRect(0, 0, w, h);
    }

    const mctx = mc.getContext('2d');
    if (!mctx) return;

    mctx.clearRect(0, 0, w, h);
    tables.forEach((t) =>
      drawTable(mctx, t, t.id === selectedTableId, scale, offsetX, offsetY, activeZone)
    );
  }, [tables, selectedTableId, activeZone, showGrid]);

  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    const ro = new ResizeObserver(() => {
      const w = area.clientWidth, h = area.clientHeight;
      [gridRef.current, mainRef.current].forEach((c) => { if (c) { c!.width = w; c!.height = h; } });
      drawAll();
    });
    ro.observe(area);
    return () => ro.disconnect();
  }, [drawAll]);

  useEffect(() => { drawAll(); }, [drawAll]);

  const getTableAt = useCallback(
    (sx: number, sy: number) => {
      const scale = scaleRef.current;
      const offsetX = offsetXRef.current;
      const offsetY = offsetYRef.current;
      for (let i = tables.length - 1; i >= 0; i--) {
        const t = tables[i];
        const tx = t.pos_x * scale + offsetX;
        const ty = t.pos_y * scale + offsetY;
        const tw = t.tamano * scale, th = t.tamano * scale;
        if (sx >= tx && sx <= tx + tw && sy >= ty && sy <= ty + th) return t;
      }
      return null;
    },
    [tables]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!mainRef.current) return;
      const rect = mainRef.current.getBoundingClientRect();
      const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
      const t = getTableAt(sx, sy);
      if (t) {
        onTableSelect(t);
      } else {
        panning.current = { startX: sx, startY: sy, offX: offsetXRef.current, offY: offsetYRef.current };
      }
    },
    [getTableAt, onTableSelect]
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!panning.current || !mainRef.current) return;
      const rect = mainRef.current.getBoundingClientRect();
      const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
      offsetXRef.current = panning.current.offX + (sx - panning.current.startX);
      offsetYRef.current = panning.current.offY + (sy - panning.current.startY);
      drawAll();
    };
    const onUp = () => { panning.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [drawAll]);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      if (!mainRef.current) return;
      const rect = mainRef.current.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const newScale = Math.max(0.4, Math.min(2.5, scaleRef.current - e.deltaY * 0.001));
      offsetXRef.current = mx - (mx - offsetXRef.current) * (newScale / scaleRef.current);
      offsetYRef.current = my - (my - offsetYRef.current) * (newScale / scaleRef.current);
      scaleRef.current = newScale;
      drawAll();
    },
    [drawAll]
  );

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handleAddTable = async () => {
    const zonaSel = zonas.find((z) => z.id === newTable.zona_id);
    if (!zonaSel) { alert('Selecciona una zona'); return; }

    const maxNum = tables.reduce((m, t) => Math.max(m, t.numero), 0);
    const canvasW = mainRef.current?.width ?? 600;
    const canvasH = mainRef.current?.height ?? 400;
    const centerX = Math.round((canvasW / 2 - offsetXRef.current) / scaleRef.current / GRID) * GRID;
    const centerY = Math.round((canvasH / 2 - offsetYRef.current) / scaleRef.current / GRID) * GRID;
    const offset = Math.floor(Math.random() * 3) * GRID;

    await supabase.from('mesas').insert({
      numero: maxNum + 1,
      zona_id: zonaSel.id,
      forma: newTable.forma,
      sillas: newTable.sillas,
      pos_x: centerX + offset,
      pos_y: centerY + offset,
      tamano: 100,
      activa: true,
      sucursal_id: zonaSel.sucursal_id,
    });
    setShowAddForm(false);
    cargarMesas();
  };

  const handleDeleteTable = async () => {
    if (!selectedTableId || !window.confirm('¿Desactivar esta mesa?')) return;
    await supabase.from('mesas').update({ activa: false }).eq('id', selectedTableId);
    onTableSelect(null);
    cargarMesas();
  };

  const handleCursor = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!mainRef.current) return;
      const rect = mainRef.current.getBoundingClientRect();
      const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
      mainRef.current.style.cursor = getTableAt(sx, sy) ? 'pointer' : 'grab';
    },
    [getTableAt]
  );

  const selectedTable = tables.find((t) => t.id === selectedTableId) ?? null;
  const counts = {
    occupied: tables.filter((t) => t.state === 'occupied').length,
    available: tables.filter((t) => t.state === 'available').length,
    attention: tables.filter((t) => t.state === 'attention').length,
    ready: tables.filter((t) => t.state === 'ready').length,
  };

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: C.t3, fontFamily: C.sans, fontSize: 13 }}>
        Cargando mesas...
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <div style={styles.sidebar}>
        <div style={styles.sidebarHead}>
          <p style={styles.sidebarTitle}>Mapa de Salón</p>
          <p style={styles.sidebarSub}>
            {timeStr} · {tables.length} mesas
          </p>
        </div>

        <div style={styles.statsGrid}>
          {[
            { label: 'Ocupadas', count: counts.occupied, color: C.gold },
            { label: 'Libres', count: counts.available, color: C.t2 },
            { label: 'Atención', count: counts.attention, color: '#F05252' },
            { label: 'Listas', count: counts.ready, color: C.teal },
          ].map(({ label, count, color }) => (
            <div key={label} style={styles.statCard}>
              <span style={{ ...styles.statNum, color }}>{count}</span>
              <span style={styles.statLabel}>{label}</span>
            </div>
          ))}
        </div>

        <div style={styles.section}>
          <p style={styles.sectionTitle}>Acciones</p>
          <button style={styles.actionBtn} onClick={() => setShowAddForm(!showAddForm)}>
            <Plus size={13} /> Añadir mesa
          </button>
          {selectedTable && (
            <button style={{ ...styles.actionBtn, color: '#F05252', borderColor: 'rgba(240,82,82,0.3)' }} onClick={handleDeleteTable}>
              <Trash2 size={13} /> Eliminar mesa {selectedTable.numero}
            </button>
          )}
        </div>

        {showAddForm && (
          <div style={styles.section}>
            <p style={styles.sectionTitle}>Nueva mesa</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <label style={styles.fieldLabel}>Zona</label>
                <select
                  style={styles.input}
                  value={newTable.zona_id}
                  onChange={(e) => setNewTable({ ...newTable, zona_id: parseInt(e.target.value) })}
                >
                  {zonas.map((z) => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                </select>
              </div>
              <div>
                <label style={styles.fieldLabel}>Forma</label>
                <select
                  style={styles.input}
                  value={newTable.forma}
                  onChange={(e) => setNewTable({ ...newTable, forma: e.target.value as 'circle' | 'square' })}
                >
                  <option value="square">Cuadrada</option>
                  <option value="circle">Redonda</option>
                </select>
              </div>
              <div>
                <label style={styles.fieldLabel}>Sillas</label>
                <select
                  style={styles.input}
                  value={newTable.sillas}
                  onChange={(e) => setNewTable({ ...newTable, sillas: parseInt(e.target.value) })}
                >
                  {[2, 4, 6].map((n) => <option key={n} value={n}>{n} sillas</option>)}
                </select>
              </div>
              <button style={styles.addBtn} onClick={handleAddTable}>
                ✓ Crear Mesa
              </button>
            </div>
          </div>
        )}

        <div style={styles.section}>
          <p style={styles.sectionTitle}>Estado</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { dot: C.t3, label: 'Libre' },
              { dot: C.gold, label: 'Ocupada' },
              { dot: '#F05252', label: 'Atención' },
              { dot: C.teal, label: 'Lista' },
            ].map(({ dot, label }) => (
              <div key={label} style={styles.legItem}>
                <div style={{ ...styles.legDot, background: dot }} />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={styles.canvasWrap}>
        <div style={styles.toolbar}>
          <span style={styles.toolbarLabel}>Zona:</span>
          {['all', ...ZONES].map((z) => (
            <button
              key={z}
              style={{
                ...styles.zoneBtn,
                ...(activeZone === z ? styles.zoneBtnActive : {}),
              }}
              onClick={() => { setActiveZone(z); rerender(); }}
            >
              {z === 'all' ? 'Todas' : z}
            </button>
          ))}
          <label style={styles.gridToggle}>
            <input
              type="checkbox"
              defaultChecked
              onChange={(e) => { setShowGrid(e.target.checked); rerender(); }}
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
            onMouseMove={handleCursor}
          />
          <div style={styles.hint}>Click en mesa para seleccionar · Arrastra fondo para mover · Scroll para zoom</div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    display: 'flex',
    height: 620,
    overflow: 'hidden',
    borderRadius: 12,
    border: `1px solid ${C.br}`,
    background: C.bgCard,
    fontFamily: C.sans,
  },
  sidebar: {
    width: 220,
    flexShrink: 0,
    borderRight: `1px solid ${C.br}`,
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    background: C.bgCard,
  },
  sidebarHead: {
    padding: '16px 16px 14px',
    borderBottom: `1px solid ${C.br}`,
  },
  sidebarTitle: { fontSize: 14, fontWeight: 600, color: C.t1, margin: 0, lineHeight: 1.2 },
  sidebarSub: { fontSize: 11, color: C.t3, marginTop: 4, lineHeight: 1.2 },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
    padding: '14px 16px',
    borderBottom: `1px solid ${C.br}`,
  },
  statCard: {
    background: C.bg,
    border: `1px solid ${C.br}`,
    borderRadius: 8,
    padding: 8,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  statNum: { fontSize: 18, fontWeight: 600, lineHeight: 1 },
  statLabel: { fontSize: 10, color: C.t3, lineHeight: 1 },
  section: {
    padding: '16px',
    borderBottom: `1px solid ${C.br}`,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 600,
    color: C.t3,
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    marginBottom: 12,
    lineHeight: 1,
  },
  actionBtn: {
    width: '100%',
    padding: '8px 10px',
    background: C.bg,
    border: `1px solid ${C.br}`,
    borderRadius: 8,
    fontSize: 12,
    color: C.t2,
    cursor: 'pointer',
    textAlign: 'left',
    marginBottom: 6,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    transition: 'all 0.15s ease',
  },
  addBtn: {
    width: '100%',
    padding: '8px 10px',
    background: C.goldDim,
    border: `1px solid ${C.goldBorder}`,
    borderRadius: 8,
    fontSize: 12,
    color: C.goldLight,
    cursor: 'pointer',
    textAlign: 'center',
    fontWeight: 600,
  },
  legItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 12,
    color: C.t2,
  },
  legDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    flexShrink: 0,
  },
  fieldLabel: {
    fontSize: 11,
    color: C.t3,
    display: 'block',
    marginBottom: 4,
  },
  input: {
    width: '100%',
    padding: '6px 8px',
    border: `1px solid ${C.br2}`,
    borderRadius: 8,
    fontSize: 12,
    background: C.bg,
    color: C.t1,
    outline: 'none',
  },
  canvasWrap: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  toolbar: {
    padding: '10px 16px',
    borderBottom: `1px solid ${C.br}`,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: C.bgCard2,
    flexWrap: 'wrap',
  },
  toolbarLabel: { fontSize: 11, color: C.t3 },
  zoneBtn: {
    padding: '4px 12px',
    borderRadius: 20,
    border: `1px solid ${C.br2}`,
    background: C.bg,
    fontSize: 11,
    color: C.t2,
    cursor: 'pointer',
  },
  zoneBtnActive: {
    background: C.goldDim,
    borderColor: C.goldBorder,
    color: C.goldLight,
    fontWeight: 600,
  },
  gridToggle: {
    marginLeft: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    color: C.t3,
    cursor: 'pointer',
  },
  canvasArea: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    background: C.bg,
  },
  canvasLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  hint: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    fontSize: 10,
    color: C.t3,
    background: C.bgCard,
    padding: '6px 10px',
    borderRadius: 6,
    border: `1px solid ${C.br}`,
    pointerEvents: 'none',
  },
};
