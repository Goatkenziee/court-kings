"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";

// ─── Types ───────────────────────────────────────────────────────────
interface Vec2 {
  x: number;
  y: number;
}

interface Ball {
  pos: Vec2;
  vel: Vec2;
  radius: number;
  active: boolean;
  trail: Vec2[];
}

interface Player {
  pos: Vec2;
  radius: number;
  hasBall: boolean;
  facing: 1 | -1; // 1 = right (toward hoop), -1 = left
}

interface Hoop {
  x: number;
  rimY: number;
  backboardX: number;
  rimWidth: number;
}

interface Particle {
  pos: Vec2;
  vel: Vec2;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

// ─── Constants ───────────────────────────────────────────────────────
const COURT_W = 900;
const COURT_H = 500;
const GRAVITY = 0.35;
const PLAYER_SPEED = 3.8;
const SHOOT_POWER = 7.5;
const BALL_RADIUS = 10;
const PLAYER_RADIUS = 18;
const SHOT_CLOCK = 24;
const GAME_DURATION = 60; // seconds

const HOOP: Hoop = {
  x: COURT_W - 60,
  rimY: 180,
  backboardX: COURT_W - 45,
  rimWidth: 50,
};

const THREE_PT_LINE_RADIUS = 180;

// ─── Game Component ──────────────────────────────────────────────────
export default function BasketballGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const gameRef = useRef<{
    player: Player;
    ball: Ball;
    score: number;
    shots: number;
    made: number;
    timeLeft: number;
    shotClock: number;
    particles: Particle[];
    gameOver: boolean;
    gameStarted: boolean;
    combo: number;
  } | null>(null);
  const animRef = useRef<number>(0);

  const [score, setScore] = useState(0);
  const [shots, setShots] = useState(0);
  const [made, setMade] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [shotClock, setShotClock] = useState(SHOT_CLOCK);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [combo, setCombo] = useState(0);
  const [message, setMessage] = useState("");

  const showMessage = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 1500);
  }, []);

  // ─── Initialize game state ────────────────────────────────────────
  const initGame = useCallback(() => {
    gameRef.current = {
      player: {
        pos: { x: 150, y: COURT_H - 80 },
        radius: PLAYER_RADIUS,
        hasBall: true,
        facing: 1,
      },
      ball: {
        pos: { x: 150, y: COURT_H - 80 },
        vel: { x: 0, y: 0 },
        radius: BALL_RADIUS,
        active: false,
        trail: [],
      },
      score: 0,
      shots: 0,
      made: 0,
      timeLeft: GAME_DURATION,
      shotClock: SHOT_CLOCK,
      particles: [],
      gameOver: false,
      gameStarted: true,
      combo: 0,
    };
    setScore(0);
    setShots(0);
    setMade(0);
    setTimeLeft(GAME_DURATION);
    setShotClock(SHOT_CLOCK);
    setGameOver(false);
    setGameStarted(true);
    setCombo(0);
    setMessage("🏀 Game on!");
    setTimeout(() => setMessage(""), 1500);
  }, []);

  // ─── Spawn particles ──────────────────────────────────────────────
  const spawnParticles = useCallback(
    (x: number, y: number, color: string, count: number) => {
      const g = gameRef.current;
      if (!g) return;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 4;
        g.particles.push({
          pos: { x, y },
          vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed - 2 },
          life: 1,
          maxLife: 0.5 + Math.random() * 0.5,
          color,
          size: 2 + Math.random() * 4,
        });
      }
    },
    [],
  );

  // ─── Shoot the ball ───────────────────────────────────────────────
  const shoot = useCallback(() => {
    const g = gameRef.current;
    if (!g || g.ball.active || !g.player.hasBall || g.gameOver) return;

    const dx = HOOP.x - g.player.pos.x;
    const dy = HOOP.rimY - g.player.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Calculate arc — higher arc for longer shots
    const angle = Math.atan2(dy, dx) - 0.3;
    const power = Math.min(SHOOT_POWER + dist * 0.008, 11);

    g.ball.pos = { ...g.player.pos };
    g.ball.vel = {
      x: Math.cos(angle) * power,
      y: Math.sin(angle) * power - 2.5,
    };
    g.ball.active = true;
    g.ball.trail = [];
    g.player.hasBall = false;
    g.shots++;
    setShots(g.shots);
    g.shotClock = SHOT_CLOCK;

    spawnParticles(g.player.pos.x, g.player.pos.y, "#bb86fc", 5);
  }, [spawnParticles]);

  // ─── Reset ball to player ────────────────────────────────────────
  const resetBall = useCallback(() => {
    const g = gameRef.current;
    if (!g) return;
    g.ball.active = false;
    g.ball.vel = { x: 0, y: 0 };
    g.ball.trail = [];
    g.player.hasBall = true;
    g.shotClock = SHOT_CLOCK;
    // Place ball near player
    g.ball.pos = { ...g.player.pos };
  }, []);

  // ─── Score a basket ──────────────────────────────────────────────
  const scoreBasket = useCallback(
    (value: number) => {
      const g = gameRef.current;
      if (!g) return;
      g.score += value;
      g.made++;
      g.combo++;
      setScore(g.score);
      setMade(g.made);
      setCombo(g.combo);

      const msg = value === 3 ? "🔥 THREE POINTER!" : value === 2 ? "🎯 2 points!" : "🏀 Score!";
      showMessage(g.combo >= 3 ? `${msg} ${g.combo}x combo!` : msg);

      spawnParticles(HOOP.x, HOOP.rimY, "#ffd700", 20);
      spawnParticles(HOOP.x, HOOP.rimY, "#bb86fc", 15);

      resetBall();
    },
    [showMessage, spawnParticles, resetBall],
  );

  // ─── Miss ─────────────────────────────────────────────────────────
  const missShot = useCallback(() => {
    const g = gameRef.current;
    if (!g) return;
    g.combo = 0;
    setCombo(0);
    showMessage("❌ Miss!");
    spawnParticles(g.ball.pos.x, g.ball.pos.y, "#ff6b6b", 8);

    // Reset ball after a short delay
    setTimeout(() => {
      resetBall();
    }, 800);
  }, [showMessage, spawnParticles, resetBall]);

  // ─── Update game logic ────────────────────────────────────────────
  const update = useCallback(() => {
    const g = gameRef.current;
    if (!g || g.gameOver || !g.gameStarted) return;

    const keys = keysRef.current;
    const p = g.player;
    const b = g.ball;

    // ── Player movement ──
    if (!g.gameOver) {
      let dx = 0;
      let dy = 0;
      if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A")) dx -= 1;
      if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) dx += 1;
      if (keys.has("ArrowUp") || keys.has("w") || keys.has("W")) dy -= 1;
      if (keys.has("ArrowDown") || keys.has("s") || keys.has("S")) dy += 1;

      // Normalize diagonal
      if (dx !== 0 && dy !== 0) {
        const len = Math.sqrt(dx * dx + dy * dy);
        dx /= len;
        dy /= len;
      }

      p.pos.x += dx * PLAYER_SPEED;
      p.pos.y += dy * PLAYER_SPEED;

      // Facing direction
      if (dx > 0) p.facing = 1;
      else if (dx < 0) p.facing = -1;

      // Court bounds
      p.pos.x = Math.max(p.radius, Math.min(COURT_W - p.radius, p.pos.x));
      p.pos.y = Math.max(80, Math.min(COURT_H - p.radius, p.pos.y));

      // Ball follows player
      if (p.hasBall) {
        b.pos = { x: p.pos.x + p.facing * 12, y: p.pos.y - 4 };
      }
    }

    // ── Ball physics ──
    if (b.active) {
      b.vel.y += GRAVITY;
      b.pos.x += b.vel.x;
      b.pos.y += b.vel.y;

      // Trail
      b.trail.push({ ...b.pos });
      if (b.trail.length > 12) b.trail.shift();

      // Bounce off walls
      if (b.pos.x - b.radius < 0) {
        b.pos.x = b.radius;
        b.vel.x *= -0.6;
      }
      if (b.pos.x + b.radius > COURT_W) {
        b.pos.x = COURT_W - b.radius;
        b.vel.x *= -0.6;
      }
      if (b.pos.y - b.radius < 0) {
        b.pos.y = b.radius;
        b.vel.y *= -0.6;
      }

      // Bounce off backboard
      if (
        b.pos.x + b.radius > HOOP.backboardX - 5 &&
        b.pos.x - b.radius < HOOP.backboardX + 5 &&
        b.pos.y > HOOP.rimY - 50 &&
        b.pos.y < HOOP.rimY + 50
      ) {
        b.vel.x *= -0.7;
        b.pos.x = HOOP.backboardX - b.radius - 2;
        spawnParticles(HOOP.backboardX, b.pos.y, "#ffffff", 3);
      }

      // Check rim collision (left rim)
      const rimLeftX = HOOP.x - HOOP.rimWidth / 2;
      const rimRightX = HOOP.x + HOOP.rimWidth / 2;
      const rimY = HOOP.rimY;

      if (
        b.pos.y + b.radius > rimY - 3 &&
        b.pos.y - b.radius < rimY + 3 &&
        b.pos.x > rimLeftX &&
        b.pos.x < rimRightX &&
        b.vel.y > 0
      ) {
        // Going through the hoop!
        if (
          b.pos.x > rimLeftX + 5 &&
          b.pos.x < rimRightX - 5 &&
          b.vel.y > 0.5
        ) {
          // SCORE!
          const dist = Math.sqrt(
            (b.pos.x - p.pos.x) ** 2 + (b.pos.y - p.pos.y) ** 2
          );
          const isThree = dist > THREE_PT_LINE_RADIUS;
          scoreBasket(isThree ? 3 : 2);
          b.active = false;
          return;
        }
      }

      // Rim bounce (hitting rim from the side)
      const rimHitX1 = rimLeftX;
      const rimHitX2 = rimRightX;
      if (
        Math.abs(b.pos.y - rimY) < 12 &&
        ((b.pos.x > rimHitX1 - 6 && b.pos.x < rimHitX1 + 6) ||
          (b.pos.x > rimHitX2 - 6 && b.pos.x < rimHitX2 + 6))
      ) {
        b.vel.y = -Math.abs(b.vel.y) * 0.5;
        b.vel.x = (b.pos.x > HOOP.x ? 1 : -1) * 2;
        spawnParticles(b.pos.x, rimY, "#ff6b6b", 4);
      }

      // Floor bounce
      if (b.pos.y + b.radius > COURT_H) {
        b.pos.y = COURT_H - b.radius;
        b.vel.y *= -0.4;
        b.vel.x *= 0.8;
        if (Math.abs(b.vel.y) < 0.5 && Math.abs(b.vel.x) < 0.5) {
          b.vel.x = 0;
          b.vel.y = 0;
        }
      }

      // Check if ball stopped moving (miss)
      if (
        Math.abs(b.vel.x) < 0.3 &&
        Math.abs(b.vel.y) < 0.3 &&
        b.active &&
        b.pos.y + b.radius >= COURT_H - 2
      ) {
        b.active = false;
        missShot();
        return;
      }

      // Ball went out of bounds on sides — miss
      if (b.pos.x < -20 || b.pos.x > COURT_W + 20 || b.pos.y > COURT_H + 30) {
        b.active = false;
        missShot();
        return;
      }
    }

    // ── Shot clock ──
    if (g.player.hasBall) {
      g.shotClock -= 1 / 60;
      if (g.shotClock <= 0) {
        g.shotClock = 0;
        showMessage("⏰ Shot clock violation!");
        resetBall();
      }
      setShotClock(Math.ceil(g.shotClock));
    } else if (b.active) {
      // Keep showing current value
      setShotClock(Math.ceil(g.shotClock));
    }

    // ── Particles ──
    g.particles = g.particles
      .map((pt) => ({
        ...pt,
        pos: { x: pt.pos.x + pt.vel.x, y: pt.pos.y + pt.vel.y },
        vel: { x: pt.vel.x * 0.96, y: pt.vel.y * 0.96 + 0.05 },
        life: pt.life - 0.02,
      }))
      .filter((pt) => pt.life > 0);

    // ── Timer ──
    g.timeLeft -= 1 / 60;
    if (g.timeLeft <= 0) {
      g.timeLeft = 0;
      g.gameOver = true;
      setGameOver(true);
      setTimeLeft(0);
      showMessage("🏁 Game Over!");
    } else {
      setTimeLeft(Math.ceil(g.timeLeft));
    }
  }, [scoreBasket, missShot, showMessage, spawnParticles, resetBall]);

  // ─── Draw ─────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const g = gameRef.current;
    if (!g) return;

    const { player: p, ball: b, particles } = g;

    // Clear
    ctx.clearRect(0, 0, COURT_W, COURT_H);

    // ── Court floor ──
    // Wood floor gradient
    const floorGrad = ctx.createLinearGradient(0, 0, 0, COURT_H);
    floorGrad.addColorStop(0, "#c8954a");
    floorGrad.addColorStop(0.5, "#d4a056");
    floorGrad.addColorStop(1, "#b8843a");
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, 0, COURT_W, COURT_H);

    // Court border
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, COURT_W - 20, COURT_H - 20);

    // Half-court line
    ctx.beginPath();
    ctx.moveTo(COURT_W / 2, 10);
    ctx.lineTo(COURT_W / 2, COURT_H - 10);
    ctx.stroke();

    // Center circle
    ctx.beginPath();
    ctx.arc(COURT_W / 2, COURT_H / 2, 60, 0, Math.PI * 2);
    ctx.stroke();

    // Three-point arc (semi-circle on the right)
    ctx.beginPath();
    ctx.arc(HOOP.x, HOOP.rimY + 30, THREE_PT_LINE_RADIUS, -Math.PI * 0.4, Math.PI * 0.4);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    // ── Key area (paint) ──
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(HOOP.x - 80, HOOP.rimY - 50, 160, 200);

    // Key outline
    ctx.strokeStyle = "#ffffff44";
    ctx.lineWidth = 2;
    ctx.strokeRect(HOOP.x - 80, HOOP.rimY - 50, 160, 200);

    // ── Hoop / Backboard ──
    // Backboard
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(HOOP.backboardX - 3, HOOP.rimY - 50, 6, 70);
    // Backboard outline
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    ctx.strokeRect(HOOP.backboardX - 3, HOOP.rimY - 50, 6, 70);

    // Rim (net)
    const rimLeftX = HOOP.x - HOOP.rimWidth / 2;
    const rimRightX = HOOP.x + HOOP.rimWidth / 2;

    // Rim
    ctx.strokeStyle = "#ff4444";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(rimLeftX, HOOP.rimY);
    ctx.lineTo(rimRightX, HOOP.rimY);
    ctx.stroke();

    // Rim support
    ctx.strokeStyle = "#888";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rimLeftX, HOOP.rimY);
    ctx.lineTo(HOOP.backboardX, HOOP.rimY - 10);
    ctx.moveTo(rimRightX, HOOP.rimY);
    ctx.lineTo(HOOP.backboardX, HOOP.rimY - 10);
    ctx.stroke();

    // Net (simple lines)
    ctx.strokeStyle = "#ffffff55";
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const t = i / 5;
      const nx = rimLeftX + t * HOOP.rimWidth;
      const ny = HOOP.rimY + 15 + Math.sin(t * Math.PI) * 10;
      ctx.beginPath();
      ctx.moveTo(nx, HOOP.rimY);
      ctx.lineTo(nx + (t - 0.5) * 8, ny);
      ctx.stroke();
    }

    // ── Ball trail ──
    b.trail.forEach((tpos, i) => {
      const alpha = (i / b.trail.length) * 0.4;
      ctx.beginPath();
      ctx.arc(tpos.x, tpos.y, b.radius * (0.3 + (i / b.trail.length) * 0.7), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 140, 50, ${alpha})`;
      ctx.fill();
    });

    // ── Ball ──
    if (b.active || p.hasBall) {
      // Glow
      const glow = ctx.createRadialGradient(b.pos.x, b.pos.y, 0, b.pos.x, b.pos.y, 25);
      glow.addColorStop(0, "rgba(255, 140, 50, 0.3)");
      glow.addColorStop(1, "rgba(255, 140, 50, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(b.pos.x, b.pos.y, 25, 0, Math.PI * 2);
      ctx.fill();

      // Ball
      ctx.beginPath();
      ctx.arc(b.pos.x, b.pos.y, b.radius, 0, Math.PI * 2);
      const ballGrad = ctx.createRadialGradient(
        b.pos.x - 3,
        b.pos.y - 3,
        0,
        b.pos.x,
        b.pos.y,
        b.radius,
      );
      ballGrad.addColorStop(0, "#ff8c32");
      ballGrad.addColorStop(0.7, "#e06020");
      ballGrad.addColorStop(1, "#b04010");
      ctx.fillStyle = ballGrad;
      ctx.fill();
      ctx.strokeStyle = "#222";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Ball lines
      ctx.strokeStyle = "#22222266";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(b.pos.x - b.radius, b.pos.y);
      ctx.lineTo(b.pos.x + b.radius, b.pos.y);
      ctx.moveTo(b.pos.x, b.pos.y - b.radius);
      ctx.lineTo(b.pos.x, b.pos.y + b.radius);
      ctx.stroke();
    }

    // ── Player ──
    // Player glow
    const pGlow = ctx.createRadialGradient(p.pos.x, p.pos.y, 0, p.pos.x, p.pos.y, 40);
    pGlow.addColorStop(0, "rgba(187, 134, 252, 0.2)");
    pGlow.addColorStop(1, "rgba(187, 134, 252, 0)");
    ctx.fillStyle = pGlow;
    ctx.beginPath();
    ctx.arc(p.pos.x, p.pos.y, 40, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.beginPath();
    ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2);
    const playerGrad = ctx.createRadialGradient(
      p.pos.x - 4,
      p.pos.y - 4,
      0,
      p.pos.x,
      p.pos.y,
      p.radius,
    );
    playerGrad.addColorStop(0, "#d4a0ff");
    playerGrad.addColorStop(0.5, "#9c5cf0");
    playerGrad.addColorStop(1, "#6a2bb0");
    ctx.fillStyle = playerGrad;
    ctx.fill();
    ctx.strokeStyle = "#bb86fc";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Jersey number
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("23", p.pos.x, p.pos.y);

    // ── Particles ──
    particles.forEach((pt) => {
      ctx.globalAlpha = pt.life;
      ctx.beginPath();
      ctx.arc(pt.pos.x, pt.pos.y, pt.size * pt.life, 0, Math.PI * 2);
      ctx.fillStyle = pt.color;
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // ── 3pt line indicator ──
    if (p.hasBall) {
      const distToHoop = Math.sqrt(
        (p.pos.x - HOOP.x) ** 2 + (p.pos.y - HOOP.rimY) ** 2
      );
      if (distToHoop > THREE_PT_LINE_RADIUS) {
        ctx.fillStyle = "#ffd700";
        ctx.font = "bold 13px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("🔥 3PT", p.pos.x, p.pos.y - 30);
      }
    }
  }, []);

  // ─── Game loop ─────────────────────────────────────────────────────
  useEffect(() => {
    const loop = () => {
      update();
      draw();
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [update, draw]);

  // ─── Keyboard handlers ────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
      if (
        e.key === " " ||
        e.key === "ArrowUp" ||
        e.key === "ArrowDown" ||
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight"
      ) {
        e.preventDefault();
      }
      if (e.key === " " || e.key === "Space") {
        shoot();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [shoot]);

  // ─── Format time ──────────────────────────────────────────────────
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const fgPct = shots > 0 ? Math.round((made / shots) * 100) : 0;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Scoreboard */}
      <Card className="w-full max-w-[900px] border-none bg-gradient-to-r from-card/90 to-card/60 p-0">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Score</div>
              <div className="text-3xl font-bold gradient-text">{score}</div>
            </div>
            <div className="h-10 w-px bg-border" />
            <div className="text-center">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Time</div>
              <div className={`text-2xl font-mono font-bold ${timeLeft <= 10 ? "text-red-400" : "text-foreground"}`}>
                {formatTime(timeLeft)}
              </div>
            </div>
            <div className="h-10 w-px bg-border" />
            <div className="text-center">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Shot Clock</div>
              <div className={`text-2xl font-mono font-bold ${shotClock <= 5 ? "text-red-400" : "text-foreground"}`}>
                {shotClock}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="text-center">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">FG%</div>
              <div className="text-lg font-bold">{fgPct}%</div>
            </div>
            <div className="text-center">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Made</div>
              <div className="text-lg font-bold">{made}/{shots}</div>
            </div>
            {combo >= 2 && (
              <div className="animate-fade-up text-center">
                <div className="text-xs uppercase tracking-wider text-accent">Combo</div>
                <div className="text-lg font-bold text-accent">x{combo}</div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Game Canvas */}
      <div className="relative overflow-hidden rounded-xl border glow">
        <canvas
          ref={canvasRef}
          width={COURT_W}
          height={COURT_H}
          className="block"
          style={{ width: "100%", height: "auto", aspectRatio: `${COURT_W}/${COURT_H}` }}
        />

        {/* Overlay message */}
        {message && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="animate-fade-up rounded-xl bg-background/80 px-6 py-3 text-lg font-bold backdrop-blur-sm">
              {message}
            </div>
          </div>
        )}

        {/* Game over overlay */}
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/70 backdrop-blur-sm">
            <div className="animate-fade-up text-center">
              <div className="text-5xl mb-2">🏀</div>
              <h2 className="text-3xl font-bold gradient-text">Game Over</h2>
              <p className="mt-2 text-lg text-muted-foreground">
                Final Score: <span className="font-bold text-foreground">{score}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                {made}/{shots} FG ({fgPct}%)
              </p>
              <button
                onClick={initGame}
                className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-primary px-8 text-sm font-medium text-primary-foreground transition hover:opacity-90 glow"
              >
                Play Again
              </button>
            </div>
          </div>
        )}

        {/* Start screen */}
        {!gameStarted && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="animate-fade-up text-center">
              <div className="text-6xl mb-4">🏀</div>
              <h1 className="text-4xl font-bold gradient-text">Court Kings</h1>
              <p className="mt-3 text-muted-foreground max-w-md mx-auto">
                Use <kbd className="rounded border bg-muted px-2 py-0.5 text-sm">W A S D</kbd> or arrow keys to move.
                Press <kbd className="rounded border bg-muted px-2 py-0.5 text-sm">Space</kbd> to shoot.
              </p>
              <div className="mt-2 text-xs text-muted-foreground">
                Score from beyond the arc for <span className="text-yellow-400 font-bold">3 points</span>!
              </div>
              <button
                onClick={initGame}
                className="mt-8 inline-flex h-12 items-center justify-center rounded-lg bg-primary px-10 text-base font-medium text-primary-foreground transition hover:opacity-90 glow"
              >
                Start Game
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Controls hint */}
      <div className="flex items-center gap-6 text-xs text-muted-foreground">
        <span><kbd className="rounded border bg-muted px-1.5 py-0.5">W A S D</kbd> Move</span>
        <span><kbd className="rounded border bg-muted px-1.5 py-0.5">Space</kbd> Shoot</span>
        <span className="text-primary/60">🏀 Score from deep for 3pts</span>
      </div>
    </div>
  );
}
