"use client";

import * as React from "react";
import { useReducedMotion } from "framer-motion";

// ---------------------------------------------------------------------------
// AntidoteVial — a canvas-based particle antidote capsule: a wide rounded
// pill-shaped body topped with a stepped valve assembly (collar, stem,
// rounded knob), spinning on its own vertical axis, tilted 25°. Shape only —
// no logos, text, or brand-specific coloring — rendered purely as an
// abstract particle silhouette in MedBAY's own palette. Built as a surface
// of revolution: a 2D radius profile swept around the y-axis and sampled
// with particles. Pure Canvas 2D + a hand-rolled perspective projection —
// zero extra dependencies. Nudges its rotation toward the pointer for a
// light interactive feel, and freezes to a static, still-legible pose when
// the user prefers reduced motion.
// ---------------------------------------------------------------------------

const AXIAL_TILT_DEG = 25;
const TARGET_PARTICLE_COUNT = 680;
const BASE_SPIN_SPEED = 0.0014; // radians / ms, around the capsule's own axis
const NEIGHBOR_LINK_DISTANCE = 0.15; // in unit-capsule space
const MAX_LINKS_PER_POINT = 3;

// Capsule silhouette breakpoints (fraction of height, 0 = base, 1 = knob top)
const BASE_END = 0.08; // rounded bottom cap
const BODY_END = 0.62; // cylindrical pill body
const SHOULDER_END = 0.74; // body curves in to the collar
const COLLAR_END = 0.82; // flat collar/washer disc
const STEM_END = 0.9; // thin connecting stem
// above STEM_END: rounded knob button

const MAX_RADIUS = 0.5; // body radius
const COLLAR_RADIUS = 0.22;
const STEM_RADIUS = 0.09;
const KNOB_RADIUS = 0.155;

// Color threshold: everything from the collar up reads as the "valve"
const VALVE_START = SHOULDER_END;

type Vec3 = { x: number; y: number; z: number };

type Particle = {
    base: Vec3; // fixed position on the capsule surface (pre-rotation)
    t: number; // 0 (base) .. 1 (knob top), used for shading/region
    size: number;
    twinkleOffset: number;
};

type Link = [number, number]; // indices into the particle array

function smoothstep(x: number): number {
    return x * x * (3 - 2 * x);
}

/** Radius of the capsule's surface of revolution at height fraction t (0..1). */
function vialRadius(t: number): number {
    if (t < BASE_END) {
        // Rounded bottom, rising from 0 to full body radius.
        return MAX_RADIUS * Math.sin((t / BASE_END) * (Math.PI / 2));
    }
    if (t < BODY_END) {
        // Cylindrical pill body with a whisper of taper.
        const local = (t - BASE_END) / (BODY_END - BASE_END);
        return MAX_RADIUS * (1 - 0.04 * local);
    }
    if (t < SHOULDER_END) {
        // Shoulder curves inward from the body down to the collar radius.
        const local = smoothstep((t - BODY_END) / (SHOULDER_END - BODY_END));
        const bodyR = MAX_RADIUS * 0.96;
        return bodyR + (COLLAR_RADIUS - bodyR) * local;
    }
    if (t < COLLAR_END) {
        // Flat collar / washer disc sitting on the shoulder.
        return COLLAR_RADIUS;
    }
    if (t < STEM_END) {
        // Thin stem connecting the collar to the knob.
        return STEM_RADIUS;
    }
    // Rounded knob button on top, flaring out from the stem then domes to a point.
    const local = (t - STEM_END) / (1 - STEM_END);
    return KNOB_RADIUS * Math.cos(local * (Math.PI / 2));
}

/** Sample the capsule surface with particles, weighted by circumference so density stays even. */
function generateVialPoints(targetCount: number): { pos: Vec3; t: number }[] {
    const layers = 60;
    const layerT: number[] = [];
    const layerR: number[] = [];
    let totalWeight = 0;

    for (let i = 0; i < layers; i++) {
        const t = i / (layers - 1);
        const r = vialRadius(t);
        layerT.push(t);
        layerR.push(r);
        totalWeight += r;
    }

    const points: { pos: Vec3; t: number }[] = [];
    for (let i = 0; i < layers; i++) {
        const t = layerT[i];
        const r = layerR[i];
        const y = 1 - t * 2; // map 0..1 height to 1..-1 (knob/point faces up on screen)
        const layerCount = Math.max(4, Math.round((targetCount * r) / totalWeight));
        const angleOffset = Math.random() * Math.PI * 2;

        for (let k = 0; k < layerCount; k++) {
            const angle = (k / layerCount) * Math.PI * 2 + angleOffset;
            const jitterR = r * (1 + (Math.random() - 0.5) * 0.035);
            const x = jitterR * Math.cos(angle);
            const z = jitterR * Math.sin(angle);
            points.push({ pos: { x, y, z }, t });
        }
    }
    return points;
}

function rotateX({ x, y, z }: Vec3, rad: number): Vec3 {
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return { x, y: y * cos - z * sin, z: y * sin + z * cos };
}

function rotateY({ x, y, z }: Vec3, rad: number): Vec3 {
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return { x: x * cos + z * sin, y, z: -x * sin + z * cos };
}

function dist3(a: Vec3, b: Vec3): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function buildNeighborLinks(points: Vec3[]): Link[] {
    const links: Link[] = [];
    for (let i = 0; i < points.length; i++) {
        const candidates: { j: number; d: number }[] = [];
        for (let j = 0; j < points.length; j++) {
            if (i === j) continue;
            const d = dist3(points[i], points[j]);
            if (d < NEIGHBOR_LINK_DISTANCE) candidates.push({ j, d });
        }
        candidates.sort((a, b) => a.d - b.d);
        for (const c of candidates.slice(0, MAX_LINKS_PER_POINT)) {
            if (c.j > i) links.push([i, c.j]);
        }
    }
    return links;
}

// Brand palette (kept in sync with tailwind.config brand/azure scales)
const BRAND_RGB: [number, number, number] = [15, 122, 108]; // brand-600 — "antidote" glass/liquid
const AZURE_RGB: [number, number, number] = [29, 95, 166]; // azure-600 — glass/liquid, cooler end
const CAP_RGB: [number, number, number] = [40, 58, 82]; // ink-700-ish — stopper cap
const CORE_RGB: [number, number, number] = [71, 184, 169]; // brand-400 (core glow)

function mixColor(a: [number, number, number], b: [number, number, number], t: number): string {
    const r = Math.round(a[0] + (b[0] - a[0]) * t);
    const g = Math.round(a[1] + (b[1] - a[1]) * t);
    const bl = Math.round(a[2] + (b[2] - a[2]) * t);
    return `${r}, ${g}, ${bl}`;
}

/** Color for a particle based on its height along the capsule (liquid gradient vs. valve). */
function colorForT(t: number): string {
    if (t >= VALVE_START) {
        // Collar / stem / knob — muted ink tone, slightly lighter near the very top.
        const local = (t - VALVE_START) / (1 - VALVE_START);
        return mixColor(CAP_RGB, [90, 108, 132], local * 0.6);
    }
    // Body — vertical liquid gradient from azure (base) to brand teal (top).
    return mixColor(AZURE_RGB, BRAND_RGB, Math.min(1, t / VALVE_START));
}

export function AntidoteVial({ className }: { className?: string }) {
    const shouldReduceMotion = useReducedMotion();
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
    const wrapRef = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
        const canvas = canvasRef.current;
        const wrap = wrapRef.current;
        if (!canvas || !wrap) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const sampled = generateVialPoints(TARGET_PARTICLE_COUNT);
        const basePoints = sampled.map((s) => s.pos);
        const links = buildNeighborLinks(basePoints);
        const particles: Particle[] = sampled.map((s) => ({
            base: s.pos,
            t: s.t,
            size: 1.0 + Math.random() * 1.5,
            twinkleOffset: Math.random() * Math.PI * 2,
        }));

        const tiltRad = (AXIAL_TILT_DEG * Math.PI) / 180;

        let width = 0;
        let height = 0;
        let dpr = 1;

        const resize = () => {
            const rect = wrap.getBoundingClientRect();
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            width = rect.width;
            height = rect.height;
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resize();

        const ro = new ResizeObserver(resize);
        ro.observe(wrap);

        // Pointer-driven parallax: target offsets the spin, current lerps toward it.
        let targetYaw = 0;
        let targetPitch = 0;
        let currentYaw = 0;
        let currentPitch = 0;

        const handlePointerMove = (e: PointerEvent) => {
            const rect = wrap.getBoundingClientRect();
            const nx = (e.clientX - rect.left) / rect.width - 0.5; // -0.5..0.5
            const ny = (e.clientY - rect.top) / rect.height - 0.5;
            targetYaw = nx * 0.9;
            targetPitch = ny * 0.35;
        };
        const handlePointerLeave = () => {
            targetYaw = 0;
            targetPitch = 0;
        };
        wrap.addEventListener("pointermove", handlePointerMove);
        wrap.addEventListener("pointerleave", handlePointerLeave);

        let raf = 0;
        let spinAngle = shouldReduceMotion ? 0.6 : 0;
        let last = performance.now();

        const render = (now: number) => {
            const dt = Math.min(now - last, 48);
            last = now;

            if (!shouldReduceMotion) {
                spinAngle += BASE_SPIN_SPEED * dt;
                currentYaw += (targetYaw - currentYaw) * 0.04;
                currentPitch += (targetPitch - currentPitch) * 0.04;
            }

            ctx.clearRect(0, 0, width, height);

            const cx = width / 2;
            const cy = height / 2;
            const radius = Math.min(width, height) * 0.42;
            const perspective = radius * 4.2;

            // Project every particle: tilt on X (fixed 25°), spin on Y (the vial's
            // own vertical axis, continuous), then a small pointer-driven
            // yaw/pitch on top for interactivity.
            const projected: { x: number; y: number; scale: number; depth: number; p: Particle }[] = [];
            for (const particle of particles) {
                let v = rotateX(particle.base, tiltRad + currentPitch);
                v = rotateY(v, spinAngle + currentYaw);

                const scale = perspective / (perspective + v.z * radius);
                const sx = cx + v.x * radius * scale;
                const sy = cy + v.y * radius * scale;
                projected.push({ x: sx, y: sy, scale, depth: v.z, p: particle });
            }

            // Faint neighbor links first (glass-lattice look), so particles render on top.
            ctx.lineWidth = 1;
            for (const [i, j] of links) {
                const a = projected[i];
                const b = projected[j];
                const avgDepth = (a.depth + b.depth) / 2;
                if (avgDepth > 0.35) continue; // hide links on the far side
                const alpha = 0.14 * (1 - (avgDepth + 1) / 2);
                if (alpha <= 0.01) continue;
                const avgT = (a.p.t + b.p.t) / 2;
                ctx.strokeStyle = `rgba(${colorForT(avgT)}, ${alpha.toFixed(3)})`;
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.stroke();
            }

            // Sort back-to-front so near particles draw over far ones.
            projected.sort((a, b) => a.depth - b.depth);

            const twinkleT = shouldReduceMotion ? 0 : now * 0.0022;
            for (const { x, y, scale, depth, p } of projected) {
                const depthT = (depth + 1) / 2; // 0 near .. 1 far
                const alpha = 0.28 + (1 - depthT) * 0.62;
                const twinkle = shouldReduceMotion ? 1 : 0.78 + 0.22 * Math.sin(twinkleT + p.twinkleOffset);
                const color = colorForT(p.t);
                const r = Math.max(0.4, p.size * scale * twinkle);

                ctx.beginPath();
                ctx.fillStyle = `rgba(${color}, ${(alpha * twinkle).toFixed(3)})`;
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fill();
            }

            // Soft core glow centered on the body (the "liquid" glowing inside glass).
            const glowCenterY = cy + radius * 0.08;
            const glowRadius = radius * 0.5;
            const glow = ctx.createRadialGradient(cx, glowCenterY, 0, cx, glowCenterY, glowRadius);
            glow.addColorStop(0, `rgba(${CORE_RGB.join(", ")}, 0.18)`);
            glow.addColorStop(1, `rgba(${CORE_RGB.join(", ")}, 0)`);
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(cx, glowCenterY, glowRadius, 0, Math.PI * 2);
            ctx.fill();

            raf = requestAnimationFrame(render);
        };

        raf = requestAnimationFrame(render);

        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
            wrap.removeEventListener("pointermove", handlePointerMove);
            wrap.removeEventListener("pointerleave", handlePointerLeave);
        };
    }, [shouldReduceMotion]);

    return (
        <div
            ref={wrapRef}
            className={className}
            role="img"
            aria-label="Rotating particle antidote capsule, decorative"
        >
            <canvas ref={canvasRef} className="block h-full w-full touch-none" />
        </div>
    );
}