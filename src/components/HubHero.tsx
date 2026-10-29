import { Link } from "@tanstack/react-router";
import type { CSSProperties } from "react";
import mark from "@/assets/brand-mark.webp";
import { localPhoto } from "@/lib/product-media";

// The hero's signature: the Newton's Hub mark drawn live, its spokes reaching out to
// photographs of real stock on the shelf. Positions are in a 100×100 coordinate space.
const NODES = [
  {
    sku: "NWH-013",
    label: "Earbuds",
    category: "Earbuds & Earpieces",
    color: "#2e9bf0",
    angle: -90,
  },
  {
    sku: "NWH-011",
    label: "Headsets",
    category: "Headsets & Neckbands",
    color: "#8b5cf6",
    angle: -30,
  },
  {
    sku: "NWH-022",
    label: "Power banks",
    category: "Gadgets & Accessories",
    color: "#e83f9a",
    angle: 30,
  },
  { sku: "NWH-007", label: "Chargers", category: "Chargers & Cables", color: "#f7882f", angle: 90 },
  {
    sku: "NWH-015",
    label: "Gamepads",
    category: "Gadgets & Accessories",
    color: "#f6c21c",
    angle: 150,
  },
  { sku: "NWH-005", label: "Cases", category: "Cases & Covers", color: "#3ccb6e", angle: 210 },
] as const;

const R = 37; // node orbit radius
const INNER = 13; // spoke start (edge of the centre mark)

export function HubHero() {
  return (
    <div
      className="relative mx-auto aspect-square w-full max-w-[34rem]"
      aria-label="Newton's Hub product categories"
    >
      {/* soft spectrum glow behind the hub */}
      <div
        aria-hidden
        className="absolute inset-[18%] rounded-full opacity-50 blur-3xl"
        style={{
          background:
            "conic-gradient(from 210deg, #2e9bf033, #8b5cf640, #e83f9a33, #f7882f33, #f6c21c33, #3ccb6e33, #2e9bf033)",
        }}
      />
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden>
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke="rgb(147 164 184 / 0.12)"
          strokeWidth="0.25"
          strokeDasharray="0.8 1.6"
        />
        {NODES.map((n, i) => {
          const a = (n.angle * Math.PI) / 180;
          const x1 = 50 + INNER * Math.cos(a);
          const y1 = 50 + INNER * Math.sin(a);
          const x2 = 50 + (R - 9.5) * Math.cos(a);
          const y2 = 50 + (R - 9.5) * Math.sin(a);
          const len = Math.hypot(x2 - x1, y2 - y1);
          return (
            <g key={n.sku}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={n.color}
                strokeWidth="0.9"
                strokeLinecap="round"
                strokeDasharray={len}
                style={
                  {
                    "--len": len,
                    animation: `spoke-draw 900ms cubic-bezier(.3,.7,.2,1) ${300 + i * 90}ms both`,
                  } as CSSProperties
                }
              />
              <circle
                cx={x2}
                cy={y2}
                r="1.3"
                fill="#050e17"
                stroke={n.color}
                strokeWidth="0.7"
                style={{
                  animation: `node-pop 400ms ease-out ${900 + i * 90}ms both`,
                  transformOrigin: `${x2}px ${y2}px`,
                }}
              />
            </g>
          );
        })}
      </svg>

      <img
        src={mark}
        alt=""
        width={256}
        height={256}
        className="absolute left-1/2 top-1/2 w-[24%] -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_0_30px_rgba(139,92,246,0.35)]"
        style={{ animation: "node-pop 700ms cubic-bezier(.2,.9,.3,1.2) 100ms both" }}
      />

      {NODES.map((n, i) => {
        const a = (n.angle * Math.PI) / 180;
        const photo = localPhoto(n.sku);
        return (
          <Link
            key={n.sku}
            to="/shop"
            search={{ category: n.category }}
            className="group absolute w-[21%] -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${50 + R * Math.cos(a)}%`, top: `${50 + R * Math.sin(a)}%` }}
          >
            <span
              className="block"
              style={{
                animation: `node-pop 500ms cubic-bezier(.2,.9,.3,1.3) ${1000 + i * 110}ms both`,
              }}
            >
              <span
                className="block animate-float motion-reduce:animate-none"
                style={{ animationDelay: `${i * -1.1}s` }}
              >
                <span
                  className="relative block aspect-square overflow-hidden rounded-full p-[2px] transition-transform duration-300 group-hover:scale-110"
                  style={{ background: n.color }}
                >
                  <img
                    src={photo?.src.replace("-900.", "-480.")}
                    alt={`${n.label} at Newton's Hub`}
                    width={240}
                    height={240}
                    fetchPriority={i < 2 ? "high" : "auto"}
                    className="size-full rounded-full bg-[#102030] object-cover"
                  />
                </span>
                <span className="mt-1.5 block whitespace-nowrap text-center text-[11px] font-semibold text-foreground/90 sm:text-xs">
                  {n.label}
                </span>
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
