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

/* Sprite columns per direction (6 frames each across 24 cols):
   0-5 = down (front-facing), 6-11 = left, 12-17 = right, 18-23 = up */
const DIR_COL_START = { down: 0, left: 6, right: 12, up: 18 };
type Facing = 'down' | 'left' | 'right' | 'up';

/* ─── Agent wandering state (stored in ref, not React state) ─── */
interface AgentAnimState {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  deskX: number;
  deskY: number;
  isAtDesk: boolean;
  facing: Facing;
  walkFrame: number;
  idleTimer: number;       // seconds until next wander target
  lastFrameTime: number;   // for walk animation timing
  returningToDesk: boolean;
}

/* ─── Agent config ─── */
interface AgentConfig {
  key: keyof PixelOfficeProps['agentStates'];
  label: string;
  route: string;
  charRow: number;
  idleFrameCol: number; // distinct idle frame offset for visual variety
  x: number;
  y: number;
  color: string;
}

/* ─── Canvas dimensions ─── */
const CANVAS_W = 900;
const CANVAS_H = 500;

/* ─── Floor area bounds for wandering ─── */
const FLOOR_X_MIN = 60;
const FLOOR_X_MAX = 840;
const FLOOR_Y_MIN = 80;
const FLOOR_Y_MAX = 460;

/* ─── Walk speed (px per second) ─── */
const WALK_SPEED = 35;
const WALK_FPS = 8;
const SNAP_DIST = 3;

/* ─── Agent layout: 2 rows ─── */
// 4 sprite rows (0-3). Agents 0-3 each get a unique row.
// Agent 4 (Performance Analyst) reuses row 1 but with a different idle frame
// offset (col 6 = left-facing idle) so they look visually distinct.
const AGENTS: AgentConfig[] = [
  { key: 'marketMonitor',      label: 'Market Monitor',      route: '/signals',       charRow: 0, idleFrameCol: 0,  x: 150,  y: 155, color: '#22d3ee' },
  { key: 'contentWriter',      label: 'Content Writer',      route: '/content',       charRow: 2, idleFrameCol: 0,  x: 450,  y: 155, color: '#a78bfa' },
  { key: 'signalInterpreter',  label: 'Signal Interpreter',  route: '/opportunities', charRow: 1, idleFrameCol: 0,  x: 750,  y: 155, color: '#fbbf24' },
  { key: 'briefingPartner',    label: 'Briefing Partner',    route: '/briefing',      charRow: 3, idleFrameCol: 0,  x: 280,  y: 330, color: '#34d399' },
  { key: 'performanceAnalyst', label: 'Performance Analyst', route: '/learning',      charRow: 1, idleFrameCol: 12, x: 620,  y: 330, color: '#fb7185' },
];

/* ─── Helpers ─── */
function randBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function initAnimStates(): AgentAnimState[] {
  return AGENTS.map((a) => ({
    x: a.x,
    y: a.y + 8, // character draw offset from desk
    targetX: a.x,
    targetY: a.y + 8,
    deskX: a.x,
    deskY: a.y + 8,
    isAtDesk: true,
    facing: 'down' as Facing,
    walkFrame: 0,
    idleTimer: randBetween(2, 5),
    lastFrameTime: 0,
    returningToDesk: false,
  }));
}

/* ─── Main Component ─── */
export default function PixelOffice({ agentStates, onAgentClick }: PixelOfficeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [images, setImages] = useState<Record<string, HTMLImageElement>>({});
  const [loaded, setLoaded] = useState(false);
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const animStatesRef = useRef<AgentAnimState[]>(initAnimStates());

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

  const drawTileFloor = useCallback((ctx: CanvasRenderingContext2D) => {
    // Checkerboard floor with visible contrast against the navy background
    const tileSize = 32;
    const colorA = '#1e2d3d';
    const colorB = '#243548';

    const floorTop = 64; // below wall
    for (let x = 0; x < CANVAS_W; x += tileSize) {
      for (let y = floorTop; y < CANVAS_H; y += tileSize) {
        const col = Math.floor(x / tileSize);
        const row = Math.floor((y - floorTop) / tileSize);
        ctx.fillStyle = (col + row) % 2 === 0 ? colorA : colorB;
        ctx.fillRect(x, y, tileSize, tileSize);
      }
    }

    // Floor border — 2px lighter line around the entire floor area
    ctx.strokeStyle = '#3a5068';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, floorTop, CANVAS_W - 2, CANVAS_H - floorTop - 1);

    // Inner highlight line at top of floor
    ctx.strokeStyle = '#4a6078';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, floorTop + 1);
    ctx.lineTo(CANVAS_W, floorTop + 1);
    ctx.stroke();
  }, []);

  const drawWall = useCallback((ctx: CanvasRenderingContext2D) => {
    const wallH = 64;
    const grad = ctx.createLinearGradient(0, 0, 0, wallH);
    grad.addColorStop(0, '#1e2d40');
    grad.addColorStop(0.5, '#1a2836');
    grad.addColorStop(1, '#16212e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, wallH);

    // Wall bottom border
    ctx.fillStyle = '#3a5068';
    ctx.fillRect(0, wallH - 3, CANVAS_W, 3);
    ctx.fillStyle = '#4a6078';
    ctx.fillRect(0, wallH - 1, CANVAS_W, 1);
  }, []);

  const drawWallDecor = useCallback((ctx: CanvasRenderingContext2D, decorImg: HTMLImageElement) => {
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
    const dw = 128;
    const dh = 96;
    ctx.drawImage(desksImg, 0, 4, 80, 56, x - dw / 2, y - 16, dw, dh);
  }, []);

  const drawMonitor = useCallback((ctx: CanvasRenderingContext2D, monitorsImg: HTMLImageElement, x: number, y: number, agentState: string, time: number) => {
    const mw = 56;
    const mh = 56;
    ctx.drawImage(monitorsImg, 2, 4, 44, 44, x - mw / 2, y - 52, mw, mh);

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
    const cw = 48;
    const ch = 56;
    ctx.drawImage(furnitureImg, 320, 4, 32, 48, x - cw / 2, y + 32, cw, ch);
  }, []);

  const drawCharacterSprite = useCallback((
    ctx: CanvasRenderingContext2D,
    charsImg: HTMLImageElement,
    row: number,
    frameCol: number,
    x: number,
    y: number,
    bobY: number
  ) => {
    // Source coords: frameCol is the column index (0-23), row is 0-3
    const sx = frameCol * CHAR_FRAME_W;
    const sy = row * CHAR_FRAME_H;
    const drawW = 56;
    const drawH = 56;

    ctx.drawImage(
      charsImg,
      sx, sy, CHAR_FRAME_W, CHAR_FRAME_H,
      x - drawW / 2, y - drawH / 2 + bobY, drawW, drawH
    );
  }, []);

  const drawPlant = useCallback((ctx: CanvasRenderingContext2D, plantsImg: HTMLImageElement, x: number, y: number, variant: number) => {
    const cellW = 64;
    const drawW = 48;
    const drawH = 72;
    const sx = (variant % 6) * cellW;
    ctx.drawImage(plantsImg, sx + 16, 16, 32, 64, x, y, drawW, drawH);
  }, []);

  const drawLamp = useCallback((ctx: CanvasRenderingContext2D, lightsImg: HTMLImageElement, x: number, y: number, variant: number) => {
    const cellW = 64;
    const drawW = 30;
    const drawH = 42;
    const sx = (variant % 6) * cellW;
    ctx.drawImage(lightsImg, sx + 16, 8, 32, 48, x, y, drawW, drawH);
  }, []);

  const drawLampGlow = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, time: number) => {
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
    // Labels always render at desk position
    const labelY = agent.y + 76;
    const labelFont = '11px "Press Start 2P", "Courier New", monospace';
    const statusFont = '9px "Press Start 2P", "Courier New", monospace';

    ctx.save();
    ctx.imageSmoothingEnabled = true;

    ctx.font = labelFont;
    const labelMetrics = ctx.measureText(agent.label);
    const labelW = labelMetrics.width + 12;
    const labelH = 16;

    const labelX = agent.x - labelW / 2;
    ctx.fillStyle = 'rgba(10, 16, 27, 0.85)';
    ctx.beginPath();
    ctx.roundRect(labelX, labelY - 12, labelW, labelH, 3);
    ctx.fill();

    ctx.fillStyle = isHovered ? agent.color : 'rgba(148, 163, 184, 0.85)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = labelFont;
    ctx.fillText(agent.label, agent.x, labelY - 4);

    let statusText = 'Idle';
    let statusColor = 'rgba(100, 116, 139, 0.7)';
    if (state === 'working') {
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

    ctx.fillStyle = 'rgba(10, 16, 27, 0.75)';
    ctx.beginPath();
    ctx.roundRect(agent.x - statusW / 2, statusY - 6, statusW, statusH, 3);
    ctx.fill();

    ctx.fillStyle = statusColor;
    ctx.fillText(statusText, agent.x, statusY + 1);

    ctx.restore();
  }, []);

  /* ─── Wandering logic (called each frame) ─── */
  const updateWandering = useCallback((dt: number, time: number) => {
    const states = animStatesRef.current;

    AGENTS.forEach((agent, i) => {
      const anim = states[i];
      const agentState = agentStates[agent.key];
      // Detect state transition to working/found: start returning to desk
      if (agentState !== 'idle' && !anim.isAtDesk && !anim.returningToDesk) {
        anim.targetX = anim.deskX;
        anim.targetY = anim.deskY;
        anim.returningToDesk = true;
      }

      // If idle and currently at desk, start the wander countdown
      if (agentState === 'idle' && anim.isAtDesk) {
        anim.idleTimer -= dt;
        if (anim.idleTimer <= 0) {
          // Pick random wander point within office bounds
          anim.targetX = randBetween(FLOOR_X_MIN, FLOOR_X_MAX);
          anim.targetY = randBetween(FLOOR_Y_MIN, FLOOR_Y_MAX);
          anim.isAtDesk = false;
          anim.returningToDesk = false;
        }
        return; // at desk, nothing to move
      }

      // If at desk and working/found, nothing to do (desk animation handles it)
      if (agentState !== 'idle' && anim.isAtDesk) {
        return;
      }

      // Move toward target
      const dx = anim.targetX - anim.x;
      const dy = anim.targetY - anim.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < SNAP_DIST) {
        // Arrived at target
        anim.x = anim.targetX;
        anim.y = anim.targetY;
        anim.walkFrame = 0;

        if (anim.returningToDesk) {
          // Arrived back at desk
          anim.isAtDesk = true;
          anim.returningToDesk = false;
          anim.facing = 'down';
          anim.idleTimer = randBetween(2, 5);
        } else if (agentState === 'idle') {
          // Arrived at random wander point, pause then pick new target
          anim.idleTimer -= dt;
          if (anim.idleTimer <= 0) {
            anim.targetX = randBetween(FLOOR_X_MIN, FLOOR_X_MAX);
            anim.targetY = randBetween(FLOOR_Y_MIN, FLOOR_Y_MAX);
            anim.idleTimer = randBetween(1, 3);
          }
        }
      } else {
        // Move toward target
        const moveX = (dx / dist) * WALK_SPEED * dt;
        const moveY = (dy / dist) * WALK_SPEED * dt;
        anim.x += moveX;
        anim.y += moveY;

        // Determine facing from movement vector (pick dominant axis)
        if (Math.abs(dx) > Math.abs(dy)) {
          anim.facing = dx > 0 ? 'right' : 'left';
        } else {
          anim.facing = dy > 0 ? 'down' : 'up';
        }

        // Advance walk animation frame
        if (time - anim.lastFrameTime > 1 / WALK_FPS) {
          anim.walkFrame = (anim.walkFrame + 1) % 6;
          anim.lastFrameTime = time;
        }
      }
    });

  }, [agentStates]);

  /* ─── Main render loop ─── */
  const render = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !loaded) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const time = timestamp / 1000;
    const dt = lastTimeRef.current > 0 ? Math.min(time - lastTimeRef.current, 0.1) : 0.016;
    lastTimeRef.current = time;
    timeRef.current = time;

    // Update wandering positions
    updateWandering(dt, time);

    // Disable image smoothing for pixelated look
    ctx.imageSmoothingEnabled = false;

    // Clear with dark background
    ctx.fillStyle = '#0c1220';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Floor (checkerboard)
    drawTileFloor(ctx);

    // Wall
    drawWall(ctx);

    // Wall decorations
    if (images.wallDecor) {
      drawWallDecor(ctx, images.wallDecor);
    }

    // Shelves
    if (images.shelves) {
      drawShelf(ctx, images.shelves, 10,  52, 3);
      drawShelf(ctx, images.shelves, 830, 52, 4);
      drawShelf(ctx, images.shelves, 540, 52, 5);
    }

    // Lamps
    if (images.lights) {
      drawLamp(ctx, images.lights, 295, 64, 0);
      drawLampGlow(ctx, 295, 64, time);
      drawLamp(ctx, images.lights, 575, 64, 1);
      drawLampGlow(ctx, 575, 64, time);
    }

    // Draw each workstation (desk, monitor, chair always at fixed position)
    const animStates = animStatesRef.current;

    AGENTS.forEach((agent, i) => {
      const state = agentStates[agent.key];
      const ax = agent.x;
      const ay = agent.y;
      const anim = animStates[i];

      // Desk (always at fixed position)
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

      // Character — at desk or wandering
      if (images.characters) {
        if (anim.isAtDesk) {
          // At desk: use desk animation
          let frameCol: number;
          if (state === 'working') {
            // Typing animation: alternate between first two front-facing frames
            frameCol = Math.floor(time * 4) % 2 === 0 ? 0 : 1;
          } else if (state === 'found') {
            // Active animation: cycle through first 3 front-facing frames
            frameCol = Math.floor(time * 2) % 3;
          } else {
            // Idle at desk: use the agent's designated idle frame
            frameCol = agent.idleFrameCol;
          }

          const bobY = state === 'idle' ? Math.sin(time * 2) * 1.5 : 0;
          drawCharacterSprite(ctx, images.characters, agent.charRow, frameCol, anim.deskX, anim.deskY, bobY);
        } else {
          // Wandering: draw at current animated position with walk animation
          const dirStart = DIR_COL_START[anim.facing];
          const frameCol = dirStart + anim.walkFrame;

          // Check if actually moving (not paused at a waypoint)
          const dx = anim.targetX - anim.x;
          const dy = anim.targetY - anim.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < SNAP_DIST) {
            // Standing still at a wander point — use idle front-facing frame
            const idleCol = agent.idleFrameCol; // front-facing idle
            const bobY = Math.sin(time * 2) * 1.5;
            drawCharacterSprite(ctx, images.characters, agent.charRow, idleCol, anim.x, anim.y, bobY);
          } else {
            drawCharacterSprite(ctx, images.characters, agent.charRow, frameCol, anim.x, anim.y, 0);
          }
        }
      }

      // Status indicator glow under character (at desk only when working/found)
      if ((state === 'working' || state === 'found') && anim.isAtDesk) {
        const pulse = Math.sin(time * 4) * 0.2 + 0.4;
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.fillStyle = agent.color;
        ctx.beginPath();
        ctx.ellipse(ax, ay + 44, 32, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Hover highlight — check both desk area and current wander position
      if (hoveredAgent === agent.key) {
        ctx.save();
        ctx.strokeStyle = agent.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.6 + Math.sin(time * 5) * 0.3;
        if (anim.isAtDesk) {
          ctx.strokeRect(ax - 68, ay - 56, 136, 120);
        } else {
          ctx.strokeRect(anim.x - 34, anim.y - 34, 68, 68);
        }
        ctx.restore();
      }

      // Agent label (always at desk position)
      drawAgentLabel(ctx, agent, state, hoveredAgent === agent.key, time);
    });

    // Plants
    if (images.plants) {
      drawPlant(ctx, images.plants, 50,  80, 0);
      drawPlant(ctx, images.plants, 840, 80, 3);
      drawPlant(ctx, images.plants, 340, 240, 1);
      drawPlant(ctx, images.plants, 510, 240, 2);
      drawPlant(ctx, images.plants, 5,   400, 4);
      drawPlant(ctx, images.plants, 845, 400, 0);
    }

    animFrameRef.current = requestAnimationFrame(render);
  }, [loaded, images, agentStates, hoveredAgent, updateWandering, drawTileFloor, drawWall, drawWallDecor, drawDesk, drawMonitor, drawChair, drawCharacterSprite, drawPlant, drawLamp, drawLampGlow, drawShelf, drawAgentLabel]);

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

    const animStates = animStatesRef.current;

    for (let i = 0; i < AGENTS.length; i++) {
      const agent = AGENTS[i];
      const anim = animStates[i];

      if (anim.isAtDesk) {
        // Check desk area
        const dx = cx - agent.x;
        const dy = cy - agent.y;
        if (Math.abs(dx) < 70 && Math.abs(dy) < 60) {
          return agent;
        }
      } else {
        // Check current wandering position
        const dx = cx - anim.x;
        const dy = cy - anim.y;
        if (Math.abs(dx) < 36 && Math.abs(dy) < 36) {
          return agent;
        }
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
