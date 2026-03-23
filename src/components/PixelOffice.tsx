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
// characters.png: 768x128 → 4 rows of 32px height, 24 columns of 32px width
// Each row = different suit character, columns = animation frames
// Layout per row: 6 frames down, 6 frames left, 6 frames right, 6 frames up
const CHAR_FRAME_W = 32;
const CHAR_FRAME_H = 32;

/* ─── Agent config ─── */
interface AgentConfig {
  key: keyof PixelOfficeProps['agentStates'];
  label: string;
  route: string;
  charRow: number; // which row in characters.png (0-3)
  x: number; // workstation center X in canvas coords (800 base)
  y: number; // workstation center Y in canvas coords (400 base)
  color: string;
}

const AGENTS: AgentConfig[] = [
  { key: 'marketMonitor',      label: 'Market Monitor',      route: '/signals',       charRow: 0, x: 160, y: 120, color: '#22d3ee' },
  { key: 'signalInterpreter',  label: 'Signal Interpreter',  route: '/opportunities', charRow: 1, x: 640, y: 120, color: '#fbbf24' },
  { key: 'contentWriter',      label: 'Content Writer',      route: '/content',       charRow: 2, x: 400, y: 200, color: '#a78bfa' },
  { key: 'briefingPartner',    label: 'Briefing Partner',    route: '/briefing',      charRow: 3, x: 200, y: 310, color: '#34d399' },
  { key: 'performanceAnalyst', label: 'Performance Analyst', route: '/learning',      charRow: 0, x: 600, y: 310, color: '#fb7185' },
];

/* ─── Canvas dimensions ─── */
const CANVAS_W = 800;
const CANVAS_H = 400;

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
    // Use a dark floor tile from tiles.png
    // The dark teal tile is around row 1, col 2 in the tiles sheet (each tile ~32x32)
    const tileSize = 32;
    const srcX = 64; // dark tile
    const srcY = 32;

    for (let x = 0; x < CANVAS_W; x += tileSize) {
      for (let y = 0; y < CANVAS_H; y += tileSize) {
        ctx.drawImage(tilesImg, srcX, srcY, tileSize, tileSize, x, y, tileSize, tileSize);
      }
    }

    // Darken overlay to match app theme
    ctx.fillStyle = 'rgba(17, 25, 39, 0.75)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }, []);

  const drawWall = useCallback((ctx: CanvasRenderingContext2D) => {
    // Draw a wall along the top
    const wallH = 48;
    ctx.fillStyle = '#1a2332';
    ctx.fillRect(0, 0, CANVAS_W, wallH);
    // Wall bottom border
    ctx.fillStyle = '#2a3a4e';
    ctx.fillRect(0, wallH - 2, CANVAS_W, 2);
    // Baseboard
    ctx.fillStyle = '#3a4a5e';
    ctx.fillRect(0, wallH - 1, CANVAS_W, 1);
  }, []);

  const drawWallDecor = useCallback((ctx: CanvasRenderingContext2D, decorImg: HTMLImageElement) => {
    // Place a few wall paintings from wall-decor.png (320x32, 10 frames at 32x32)
    const fw = 32;
    const fh = 32;
    // Place 3 paintings on the wall
    const positions = [
      { sx: 0, dx: 100, dy: 8 },   // painting 1
      { sx: 64, dx: 380, dy: 8 },  // painting 3
      { sx: 128, dx: 660, dy: 8 }, // painting 5
    ];
    positions.forEach(({ sx, dx, dy }) => {
      ctx.drawImage(decorImg, sx, 0, fw, fh, dx, dy, fw, fh);
    });
  }, []);

  const drawDesk = useCallback((ctx: CanvasRenderingContext2D, desksImg: HTMLImageElement, x: number, y: number) => {
    // desks.png: 192x96 → first desk at (0,0) roughly 80x50
    // Draw desk centered at x, y+10 (below character)
    const dw = 64;
    const dh = 48;
    ctx.drawImage(desksImg, 0, 4, 80, 56, x - dw / 2, y - 8, dw, dh);
  }, []);

  const drawMonitor = useCallback((ctx: CanvasRenderingContext2D, monitorsImg: HTMLImageElement, x: number, y: number, agentState: string, time: number) => {
    // monitors.png: 256x96
    // First monitor (small CRT) is at roughly (0, 0) ~48x48
    const mw = 28;
    const mh = 28;
    ctx.drawImage(monitorsImg, 2, 4, 44, 44, x - mw / 2, y - 28, mw, mh);

    // Screen glow effect when working
    if (agentState === 'working' || agentState === 'found') {
      const pulse = Math.sin(time * 3) * 0.3 + 0.5;
      const glowColor = agentState === 'found' ? `rgba(52, 211, 153, ${pulse * 0.4})` : `rgba(100, 180, 255, ${pulse * 0.3})`;
      ctx.fillStyle = glowColor;
      ctx.fillRect(x - 8, y - 24, 16, 12);
    }
  }, []);

  const drawChair = useCallback((ctx: CanvasRenderingContext2D, furnitureImg: HTMLImageElement, x: number, y: number) => {
    // furniture.png: 640x64 — chairs are the pink ones around col 5-6 (~32x32 each)
    // Chair sprites around x=256..320 in the sheet
    const cw = 24;
    const ch = 28;
    ctx.drawImage(furnitureImg, 320, 4, 32, 48, x - cw / 2, y + 16, cw, ch);
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
    // characters.png: 768x128, 32x32 frames
    // 24 cols per row, 4 rows
    // Front-facing idle is frame 0 of each row
    // For "working" we alternate frames 0 and 1 quickly
    // For "found" we use frame 2 (or a slight variant)

    let frameCol = 0;

    if (state === 'working') {
      // Rapid alternation between front-facing frames (typing)
      frameCol = Math.floor(time * 4) % 2 === 0 ? 0 : 1;
    } else if (state === 'found') {
      // Celebration — cycle through frames 0,1,2
      frameCol = Math.floor(time * 2) % 3;
    }

    // Breathing bob for idle
    const bobY = state === 'idle' ? Math.sin(time * 2) * 1 : 0;

    const sx = frameCol * CHAR_FRAME_W;
    const sy = row * CHAR_FRAME_H;
    const drawW = 28;
    const drawH = 28;

    ctx.drawImage(
      charsImg,
      sx, sy, CHAR_FRAME_W, CHAR_FRAME_H,
      x - drawW / 2, y - drawH / 2 + bobY, drawW, drawH
    );
  }, []);

  const drawPlant = useCallback((ctx: CanvasRenderingContext2D, plantsImg: HTMLImageElement, x: number, y: number, variant: number) => {
    // plants.png: 384x96, 6 plants (~64x96 each cell, plant centered)
    const cellW = 64;
    const cellH = 96;
    const drawW = 24;
    const drawH = 36;
    const sx = (variant % 6) * cellW;
    ctx.drawImage(plantsImg, sx + 16, 16, 32, 64, x, y, drawW, drawH);
  }, []);

  const drawLamp = useCallback((ctx: CanvasRenderingContext2D, lightsImg: HTMLImageElement, x: number, y: number, variant: number) => {
    // lights.png: 384x64, 6 lamps (~64x64 each)
    const cellW = 64;
    const drawW = 20;
    const drawH = 28;
    const sx = (variant % 6) * cellW;
    ctx.drawImage(lightsImg, sx + 16, 8, 32, 48, x, y, drawW, drawH);
  }, []);

  const drawShelf = useCallback((ctx: CanvasRenderingContext2D, shelvesImg: HTMLImageElement, x: number, y: number, variant: number) => {
    // shelves.png: 576x96, ~9 shelves at 64x96
    const cellW = 64;
    const cellH = 96;
    const drawW = 40;
    const drawH = 48;
    const sx = (variant % 9) * cellW;
    ctx.drawImage(shelvesImg, sx + 8, 16, 48, 64, x, y, drawW, drawH);
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

    // Shelves along wall
    if (images.shelves) {
      drawShelf(ctx, images.shelves, 25, 36, 3); // bookshelf left
      drawShelf(ctx, images.shelves, 735, 36, 4); // bookshelf right
      drawShelf(ctx, images.shelves, 480, 36, 5); // bookshelf center-right
    }

    // Draw each workstation (desk + monitor + chair + character)
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
        drawCharacter(ctx, images.characters, agent.charRow, ax, ay + 4, state, time);
      }

      // Status indicator glow under character
      if (state === 'working' || state === 'found') {
        const pulse = Math.sin(time * 4) * 0.2 + 0.4;
        const color = state === 'found' ? agent.color : agent.color;
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(ax, ay + 24, 18, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Hover highlight
      if (hoveredAgent === agent.key) {
        ctx.save();
        ctx.strokeStyle = agent.color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.6 + Math.sin(time * 5) * 0.3;
        ctx.strokeRect(ax - 38, ay - 32, 76, 70);
        ctx.restore();
      }
    });

    // Plants
    if (images.plants) {
      drawPlant(ctx, images.plants, 60, 86, 0);
      drawPlant(ctx, images.plants, 290, 270, 1);
      drawPlant(ctx, images.plants, 500, 270, 2);
      drawPlant(ctx, images.plants, 745, 86, 3);
      drawPlant(ctx, images.plants, 10, 340, 4);
      drawPlant(ctx, images.plants, 770, 340, 0);
    }

    // Lamps
    if (images.lights) {
      drawLamp(ctx, images.lights, 260, 58, 0);
      drawLamp(ctx, images.lights, 520, 58, 1);
    }

    animFrameRef.current = requestAnimationFrame(render);
  }, [loaded, images, agentStates, hoveredAgent, drawTileFloor, drawWall, drawWallDecor, drawDesk, drawMonitor, drawChair, drawCharacter, drawPlant, drawLamp, drawShelf]);

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
      if (Math.abs(dx) < 40 && Math.abs(dy) < 36) {
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
    <div ref={containerRef} className="pixel-office-wrapper" style={{ position: 'relative', width: '100%', maxWidth: 800, margin: '0 auto' }}>
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
          border: '1px solid var(--border, #1e293b)',
        }}
      />

      {/* Agent name labels overlaid on canvas */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        {AGENTS.map((agent) => {
          const state = agentStates[agent.key];
          // Convert canvas coords to percentage positions
          const leftPct = (agent.x / CANVAS_W) * 100;
          const topPct = ((agent.y + 38) / CANVAS_H) * 100;
          return (
            <div
              key={agent.key}
              style={{
                position: 'absolute',
                left: `${leftPct}%`,
                top: `${topPct}%`,
                transform: 'translate(-50%, 0)',
                textAlign: 'center',
                whiteSpace: 'nowrap',
              }}
            >
              <span
                style={{
                  fontFamily: '"Press Start 2P", "Courier New", monospace',
                  fontSize: 6,
                  color: hoveredAgent === agent.key ? agent.color : 'rgba(148, 163, 184, 0.7)',
                  letterSpacing: '0.5px',
                  textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                  transition: 'color 0.2s',
                }}
              >
                {agent.label}
              </span>
              {(state === 'working' || state === 'found') && (
                <div
                  style={{
                    fontSize: 5,
                    color: state === 'found' ? '#34d399' : agent.color,
                    fontFamily: '"Press Start 2P", "Courier New", monospace',
                    marginTop: 2,
                    opacity: 0.8,
                  }}
                >
                  {state === 'found' ? 'FOUND' : 'ACTIVE'}
                </div>
              )}
            </div>
          );
        })}
      </div>

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
