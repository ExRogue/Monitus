'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

/* ─── Types ─── */
export interface PixelOfficeProps {
  agentStates: {
    marketMonitor: 'idle' | 'working' | 'found';
    signalInterpreter: 'idle' | 'working' | 'found';
    contentWriter: 'idle' | 'working' | 'found';
    briefingPartner: 'idle' | 'working' | 'found';
    performanceAnalyst: 'idle' | 'working' | 'found';
  };
  onAgentClick?: (agent: string) => void;
}

/* ─── Sprite sheet frame definitions ─── */
const CHAR_FRAME_W = 32;
const CHAR_FRAME_H = 32;

/* ─── Agent config ─── */
interface AgentConfig {
  key: keyof PixelOfficeProps['agentStates'];
  label: string;
  route: string;
  charRow: number;
  x: number;
  y: number;
  color: string;
}

/* ─── Canvas dimensions (enlarged) ─── */
const CANVAS_W = 900;
const CANVAS_H = 500;

/* ─── Agent layout: 2 rows, tighter spacing ─── */
const AGENTS: AgentConfig[] = [
  { key: 'marketMonitor',      label: 'Market Monitor',      route: '/signals',       charRow: 0, x: 150,  y: 155, color: '#22d3ee' },
  { key: 'contentWriter',      label: 'Content Writer',      route: '/content',       charRow: 2, x: 450,  y: 155, color: '#a78bfa' },
  { key: 'signalInterpreter',  label: 'Signal Interpreter',  route: '/opportunities', charRow: 1, x: 750,  y: 155, color: '#fbbf24' },
  { key: 'briefingPartner',    label: 'Briefing Partner',    route: '/briefing',      charRow: 3, x: 280,  y: 330, color: '#34d399' },
  { key: 'performanceAnalyst', label: 'Performance Analyst', route: '/learning',      charRow: 0, x: 620,  y: 330, color: '#fb7185' },
];

/* ─── Main Component ─── */
export default function PixelOffice({ agentStates, onAgentClick }: PixelOfficeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [images, setImages] = useState<Record<string, HTMLImageElement>>({});
  const [loaded, setLoaded] = useState(false);
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  // Load all sprite sheets
  useEffect(() => {
    const srcs: Record<string, string> = {
      characters: '/pixels/characters.png',
      monitors: '/pixels/monitors.png',
      desks: '/pixels/desks.png',
      tiles: '/pixels/tiles.png',
      plants: '/pixels/plants.png',
      shelves: '/pixels/shelves.png',
      lights: '/pixels/lights.png',
      wallDecor: '/pixels/wall-decor.png',
      furniture: '/pixels/furniture.png',
    };

    const loaded: Record<string, HTMLImageElement> = {};
    let count = 0;
    const total = Object.keys(srcs).length;

    Object.entries(srcs).forEach(([key, src]) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        loaded[key] = img;
        count++;
        if (count === total) {
          setImages(loaded);
          setLoaded(true);
        }
      };
      img.onerror = () => {
        count++;
        if (count === total) {
          setImages(loaded);
          setLoaded(true);
        }
      };
    });
  }, []);

  /* ─── Drawing helpers ─── */

  const drawTileFloor = useCallback((ctx: CanvasRenderingContext2D, tilesImg: HTMLImageElement) => {
    const tileSize = 32;
    const srcX = 64;
    const srcY = 32;

    for (let x = 0; x < CANVAS_W; x += tileSize) {
      for (let y = 0; y < CANVAS_H; y += tileSize) {
        ctx.drawImage(tilesImg, srcX, srcY, tileSize, tileSize, x, y, tileSize, tileSize);
      }
    }

    // Lighter overlay — let tile colors show through
    ctx.fillStyle = 'rgba(17, 25, 39, 0.45)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }, []);

  const drawWall = useCallback((ctx: CanvasRenderingContext2D) => {
    // Taller wall with gradient
    const wallH = 64;
    const grad = ctx.createLinearGradient(0, 0, 0, wallH);
    grad.addColorStop(0, '#1e2d40');
    grad.addColorStop(0.5, '#1a2836');
    grad.addColorStop(1, '#16212e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, wallH);

    // Wall bottom border (thicker, more visible)
    ctx.fillStyle = '#3a5068';
    ctx.fillRect(0, wallH - 3, CANVAS_W, 3);
    // Baseboard highlight
    ctx.fillStyle = '#4a6078';
    ctx.fillRect(0, wallH - 1, CANVAS_W, 1);
  }, []);

  const drawWallDecor = useCallback((ctx: CanvasRenderingContext2D, decorImg: HTMLImageElement) => {
    // Bigger paintings (48x48) on the wall
    const fw = 32;
    const fh = 32;
    const drawSize = 48;
    const positions = [
      { sx: 0,   dx: 80,  dy: 6 },
      { sx: 64,  dx: 420, dy: 6 },
      { sx: 128, dx: 720, dy: 6 },
    ];
    positions.forEach(({ sx, dx, dy }) => {
      ctx.drawImage(decorImg, sx, 0, fw, fh, dx, dy, drawSize, drawSize);
    });
  }, []);

  const drawDesk = useCallback((ctx: CanvasRenderingContext2D, desksImg: HTMLImageElement, x: number, y: number) => {
    // 2x desk: 128x96
    const dw = 128;
    const dh = 96;
    ctx.drawImage(desksImg, 0, 4, 80, 56, x - dw / 2, y - 16, dw, dh);
  }, []);

  const drawMonitor = useCallback((ctx: CanvasRenderingContext2D, monitorsImg: HTMLImageElement, x: number, y: number, agentState: string, time: number) => {
    // 2x monitor: 56x56
    const mw = 56;
    const mh = 56;
    ctx.drawImage(monitorsImg, 2, 4, 44, 44, x - mw / 2, y - 52, mw, mh);

    // Screen glow effect when working
    if (agentState === 'working' || agentState === 'found') {
      const pulse = Math.sin(time * 3) * 0.3 + 0.5;
      const glowColor = agentState === 'found'
        ? `rgba(52, 211, 153, ${pulse * 0.4})`
        : `rgba(100, 180, 255, ${pulse * 0.3})`;
      ctx.fillStyle = glowColor;
      ctx.fillRect(x - 16, y - 46, 32, 24);
    }
  }, []);

  const drawChair = useCallback((ctx: CanvasRenderingContext2D, furnitureImg: HTMLImageElement, x: number, y: number) => {
    // 2x chair: 48x56
    const cw = 48;
    const ch = 56;
    ctx.drawImage(furnitureImg, 320, 4, 32, 48, x - cw / 2, y + 32, cw, ch);
  }, []);

  const drawCharacter = useCallback((
    ctx: CanvasRenderingContext2D,
    charsImg: HTMLImageElement,
    row: number,
    x: number,
    y: number,
    state: string,
    time: number
  ) => {
    let frameCol = 0;

    if (state === 'working') {
      frameCol = Math.floor(time * 4) % 2 === 0 ? 0 : 1;
    } else if (state === 'found') {
      frameCol = Math.floor(time * 2) % 3;
    }

    // Breathing bob for idle
    const bobY = state === 'idle' ? Math.sin(time * 2) * 1.5 : 0;

    const sx = frameCol * CHAR_FRAME_W;
    const sy = row * CHAR_FRAME_H;
    // 2x characters: 56x56
    const drawW = 56;
    const drawH = 56;

    ctx.drawImage(
      charsImg,
      sx, sy, CHAR_FRAME_W, CHAR_FRAME_H,
      x - drawW / 2, y - drawH / 2 + bobY, drawW, drawH
    );
  }, []);

  const drawPlant = useCallback((ctx: CanvasRenderingContext2D, plantsImg: HTMLImageElement, x: number, y: number, variant: number) => {
    // 2x plants: 48x72
    const cellW = 64;
    const drawW = 48;
    const drawH = 72;
    const sx = (variant % 6) * cellW;
    ctx.drawImage(plantsImg, sx + 16, 16, 32, 64, x, y, drawW, drawH);
  }, []);

  const drawLamp = useCallback((ctx: CanvasRenderingContext2D, lightsImg: HTMLImageElement, x: number, y: number, variant: number) => {
    // 1.5x lamps: 30x42
    const cellW = 64;
    const drawW = 30;
    const drawH = 42;
    const sx = (variant % 6) * cellW;
    ctx.drawImage(lightsImg, sx + 16, 8, 32, 48, x, y, drawW, drawH);
  }, []);

  const drawLampGlow = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, time: number) => {
    // Warm ambient glow circle near lamps
    const pulse = Math.sin(time * 1.5) * 0.04 + 0.12;
    const grad = ctx.createRadialGradient(x + 15, y + 10, 4, x + 15, y + 10, 60);
    grad.addColorStop(0, `rgba(255, 200, 100, ${pulse})`);
    grad.addColorStop(1, 'rgba(255, 200, 100, 0)');
    ctx.save();
    ctx.fillStyle = grad;
    ctx.fillRect(x - 50, y - 50, 130, 120);
    ctx.restore();
  }, []);

  const drawShelf = useCallback((ctx: CanvasRenderingContext2D, shelvesImg: HTMLImageElement, x: number, y: number, variant: number) => {
    // 1.5x shelves: 60x72
    const cellW = 64;
    const drawW = 60;
    const drawH = 72;
    const sx = (variant % 9) * cellW;
    ctx.drawImage(shelvesImg, sx + 8, 16, 48, 64, x, y, drawW, drawH);
  }, []);

  const drawAgentLabel = useCallback((
    ctx: CanvasRenderingContext2D,
    agent: AgentConfig,
    state: string,
    isHovered: boolean,
    time: number
  ) => {
    const labelY = agent.y + 76;
    const labelFont = '11px "Press Start 2P", "Courier New", monospace';
    const statusFont = '9px "Press Start 2P", "Courier New", monospace';

    ctx.save();
    // Enable smoothing just for text
    ctx.imageSmoothingEnabled = true;

    // Measure label
    ctx.font = labelFont;
    const labelMetrics = ctx.measureText(agent.label);
    const labelW = labelMetrics.width + 12;
    const labelH = 16;

    // Dark background rect for name
    const labelX = agent.x - labelW / 2;
    ctx.fillStyle = 'rgba(10, 16, 27, 0.85)';
    ctx.beginPath();
    ctx.roundRect(labelX, labelY - 12, labelW, labelH, 3);
    ctx.fill();

    // Name text
    ctx.fillStyle = isHovered ? agent.color : 'rgba(148, 163, 184, 0.85)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = labelFont;
    ctx.fillText(agent.label, agent.x, labelY - 4);

    // Status text below name
    let statusText = 'Idle';
    let statusColor = 'rgba(100, 116, 139, 0.7)';
    if (state === 'working') {
      // Animate dots
      const dots = '.'.repeat(Math.floor(time * 2) % 4);
      statusText = `Scanning${dots}`;
      statusColor = agent.color;
    } else if (state === 'found') {
      statusText = 'Active';
      statusColor = '#34d399';
    }

    ctx.font = statusFont;
    const statusMetrics = ctx.measureText(statusText);
    const statusW = statusMetrics.width + 10;
    const statusH = 14;
    const statusY = labelY + 8;

    // Dark background rect for status
    ctx.fillStyle = 'rgba(10, 16, 27, 0.75)';
    ctx.beginPath();
    ctx.roundRect(agent.x - statusW / 2, statusY - 6, statusW, statusH, 3);
    ctx.fill();

    ctx.fillStyle = statusColor;
    ctx.fillText(statusText, agent.x, statusY + 1);

    ctx.restore();
  }, []);

  /* ─── Main render loop ─── */
  const render = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !loaded) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const time = timestamp / 1000;
    timeRef.current = time;

    // Disable image smoothing for pixelated look
    ctx.imageSmoothingEnabled = false;

    // Clear
    ctx.fillStyle = '#111927';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Floor tiles
    if (images.tiles) {
      drawTileFloor(ctx, images.tiles);
    }

    // Wall
    drawWall(ctx);

    // Wall decorations
    if (images.wallDecor) {
      drawWallDecor(ctx, images.wallDecor);
    }

    // Shelves along wall (bigger, repositioned)
    if (images.shelves) {
      drawShelf(ctx, images.shelves, 10,  52, 3);
      drawShelf(ctx, images.shelves, 830, 52, 4);
      drawShelf(ctx, images.shelves, 540, 52, 5);
    }

    // Lamps (drawn before workstations so glow is behind)
    if (images.lights) {
      drawLamp(ctx, images.lights, 295, 64, 0);
      drawLampGlow(ctx, 295, 64, time);
      drawLamp(ctx, images.lights, 575, 64, 1);
      drawLampGlow(ctx, 575, 64, time);
    }

    // Draw each workstation
    AGENTS.forEach((agent) => {
      const state = agentStates[agent.key];
      const ax = agent.x;
      const ay = agent.y;

      // Desk
      if (images.desks) {
        drawDesk(ctx, images.desks, ax, ay);
      }

      // Monitor on desk
      if (images.monitors) {
        drawMonitor(ctx, images.monitors, ax, ay, state, time);
      }

      // Chair behind desk
      if (images.furniture) {
        drawChair(ctx, images.furniture, ax, ay);
      }

      // Character sitting at desk
      if (images.characters) {
        drawCharacter(ctx, images.characters, agent.charRow, ax, ay + 8, state, time);
      }

      // Status indicator glow under character
      if (state === 'working' || state === 'found') {
        const pulse = Math.sin(time * 4) * 0.2 + 0.4;
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.fillStyle = agent.color;
        ctx.beginPath();
        ctx.ellipse(ax, ay + 44, 32, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Hover highlight (scaled up hit area)
      if (hoveredAgent === agent.key) {
        ctx.save();
        ctx.strokeStyle = agent.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.6 + Math.sin(time * 5) * 0.3;
        ctx.strokeRect(ax - 68, ay - 56, 136, 120);
        ctx.restore();
      }

      // Agent name + status label on canvas
      drawAgentLabel(ctx, agent, state, hoveredAgent === agent.key, time);
    });

    // Plants (bigger, positioned to fill edges and gaps)
    if (images.plants) {
      drawPlant(ctx, images.plants, 50,  80, 0);
      drawPlant(ctx, images.plants, 840, 80, 3);
      drawPlant(ctx, images.plants, 340, 240, 1);
      drawPlant(ctx, images.plants, 510, 240, 2);
      drawPlant(ctx, images.plants, 5,   400, 4);
      drawPlant(ctx, images.plants, 845, 400, 0);
    }

    animFrameRef.current = requestAnimationFrame(render);
  }, [loaded, images, agentStates, hoveredAgent, drawTileFloor, drawWall, drawWallDecor, drawDesk, drawMonitor, drawChair, drawCharacter, drawPlant, drawLamp, drawLampGlow, drawShelf, drawAgentLabel]);

  // Start / stop animation loop
  useEffect(() => {
    if (loaded) {
      animFrameRef.current = requestAnimationFrame(render);
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [loaded, render]);

  /* ─── Click / hover detection ─── */
  const getAgentAtPos = useCallback((clientX: number, clientY: number): AgentConfig | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    const cx = (clientX - rect.left) * scaleX;
    const cy = (clientY - rect.top) * scaleY;

    for (const agent of AGENTS) {
      const dx = cx - agent.x;
      const dy = cy - agent.y;
      if (Math.abs(dx) < 70 && Math.abs(dy) < 60) {
        return agent;
      }
    }
    return null;
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const agent = getAgentAtPos(e.clientX, e.clientY);
    if (agent && onAgentClick) {
      onAgentClick(agent.route);
    }
  }, [getAgentAtPos, onAgentClick]);

  const handleCanvasMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const agent = getAgentAtPos(e.clientX, e.clientY);
    setHoveredAgent(agent?.key ?? null);
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = agent ? 'pointer' : 'default';
    }
  }, [getAgentAtPos]);

  const handleCanvasLeave = useCallback(() => {
    setHoveredAgent(null);
  }, []);

  return (
    <div ref={containerRef} className="pixel-office-wrapper" style={{ position: 'relative', width: '100%', maxWidth: 900, margin: '0 auto' }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMove}
        onMouseLeave={handleCanvasLeave}
        style={{
          width: '100%',
          height: 'auto',
          imageRendering: 'pixelated',
          borderRadius: 12,
          border: '2px solid var(--border, #1e293b)',
        }}
      />

      {/* Loading state */}
      {!loaded && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#111927',
            borderRadius: 12,
          }}
        >
          <span
            style={{
              fontFamily: '"Press Start 2P", "Courier New", monospace',
              fontSize: 10,
              color: '#64748b',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          >
            Loading office...
          </span>
        </div>
      )}
    </div>
  );
}
