import {
  ColorType,
  mm2pt,
  Schema,
} from '@pdfme/common';

import { hex2PrintingColor } from '../utils.js';
import type { Spacing } from './types.js';

type BorderStyle = 'solid' | 'dotted' | 'dashed';


export const BORDER_STYLE_CONSTANTS = {
  dotted: {
    // For circle-based dotted (CSS-like round dots)
    dotSpacingFactor: 1.7, // center-to-center spacing ≈ 2.0 × thickness (2.2 looks looser)
    minDotSpacingPt: 1.0,  // minimum center spacing (pt), avoids extreme crowding
  },
  dashed: {
    dashFactor: 1.8,     // dash ≈ dashFactor × thickness (longer than dotted)
    gapFactor: 0.9,      // gap ≈ gapFactor × thickness
    minDashPt: 1.2,      // minimum dash length (pt)
    minGapPt: 0.5,       // minimum gap length (pt)
    patchCorner: true,   // patch the tiny void at corners
    useSquareCapIfAvailable: true, // set line cap to Square (2) when possible
  },
  solid: {
    // currently no tunables; kept for symmetry/extension
  },
} as const;


const TEXT_SCHEMA_TYPES = new Set([
  'text',
  'multiVariableText',
]);

export const normalizeBorderWidth = (borderWidth: Spacing | undefined | null): Spacing => {
  if (!borderWidth) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
  return borderWidth;
};

export const isTextSchema = (schema: Schema): boolean => {
  return TEXT_SCHEMA_TYPES.has(schema.type);
}

export function renderBorder(
  page: any,
  x: number,
  y: number,
  width: number,
  height: number,
  borderStyle: BorderStyle, // 'solid' | 'dotted' | 'dashed'
  borderWidth: Spacing, // unit: mm
  borderColor: string,
  rotate: any,
  opacity: number,
  colorType?: ColorType
) {
  const color = hex2PrintingColor(borderColor, colorType);
  const bw = normalizeBorderWidth(borderWidth);     // ✅ 確保是 Spacing

  // Thickness per edge (mm -> pt)
  const tTop = mm2pt(bw.top);
  const tRight = mm2pt(bw.right);
  const tBottom = mm2pt(bw.bottom);
  const tLeft = mm2pt(bw.left);

  // Line-center positions (respect per-side thickness)
  const Xl = x + Math.max(tLeft, 0) / 2;
  const Xr = x + width - Math.max(tRight, 0) / 2;
  const Yb = y + Math.max(tBottom, 0) / 2;
  const Yt = y + height - Math.max(tTop, 0) / 2;

  // Effective lengths (subtract opposite half-thickness so corners join neatly)
  const topLen = Math.max(0, (x + width - Math.max(tRight, 0) / 2) - (x + Math.max(tLeft, 0) / 2));
  const bottomLen = topLen;
  const leftLen = Math.max(0, (y + height - Math.max(tTop, 0) / 2) - (y + Math.max(tBottom, 0) / 2));
  const rightLen = leftLen;

  // ---------- SOLID ----------
  const drawSolid = () => {
    if (tTop > 0) {
      page.drawRectangle({ x, y: y + height - tTop, width, height: tTop, rotate, color, opacity });
    }
    if (tRight > 0) {
      page.drawRectangle({ x: x + width - tRight, y, width: tRight, height, rotate, color, opacity });
    }
    if (tBottom > 0) {
      page.drawRectangle({ x, y, width, height: tBottom, rotate, color, opacity });
    }
    if (tLeft > 0) {
      page.drawRectangle({ x, y, width: tLeft, height, rotate, color, opacity });
    }
  };



  // ---------- DOTTED (Round dots like CSS dotted, with mm-based fallback to square) ----------
  const drawDotted = () => {
    const {
      dotSpacingFactor,
      minDotSpacingPt,
    } = BORDER_STYLE_CONSTANTS.dotted;

    const ROUND_THRESHOLD_MM = 0.529166; // 2px
    const isSquareDot = (mm: number) => {
      if (mm < ROUND_THRESHOLD_MM) return true; // thin → square
      if (mm === 1.0) return true;              // exactly 1mm → square (your observed behavior)
      return false;                              // otherwise → round
    };

    const drawDot = (cx: number, cy: number, thicknessPt: number, thicknessMM: number) => {
      if (isSquareDot(thicknessMM)) {
        const size = thicknessPt;
        page.drawRectangle({
          x: cx - size / 2,
          y: cy - size / 2,
          width: size,
          height: size,
          color,
          opacity,
          borderWidth: 0,
        });
      } else {
        const r = thicknessPt / 2;
        page.drawEllipse({
          x: cx,
          y: cy,
          xScale: r,
          yScale: r,
          color,
          opacity,
          borderWidth: 0,
        });
      }
    };

    // Place interior dots along one edge (exclude the corner positions)
    const placeEdgeDots = (
      sideLenPt: number,
      thicknessPt: number,
      thicknessMM: number,
      placePoint: (offsetPt: number) => { cx: number; cy: number }
    ) => {
      if (thicknessPt <= 0 || sideLenPt <= 0) return;

      // Spacing is proportional to *thickness in pt* (visual density control)
      const targetSpacing = Math.max(dotSpacingFactor * thicknessPt, minDotSpacingPt);
      const N = Math.max(1, Math.round(sideLenPt / targetSpacing));
      const s = sideLenPt / N;

      for (let i = 1; i <= N - 1; i += 1) {
        const { cx, cy } = placePoint(i * s);
        drawDot(cx, cy, thicknessPt, thicknessMM);
      }
    };

    // --- Side interior dots ---
    // NOTE: bw.* is in mm; t* is in pt
    if (bw.top > 0 && topLen > 0) placeEdgeDots(topLen, tTop, bw.top, (offset) => ({ cx: Xl + offset, cy: Yt }));
    if (bw.right > 0 && rightLen > 0) placeEdgeDots(rightLen, tRight, bw.right, (offset) => ({ cx: Xr, cy: Yb + offset }));
    if (bw.bottom > 0 && bottomLen > 0) placeEdgeDots(bottomLen, tBottom, bw.bottom, (offset) => ({ cx: Xl + offset, cy: Yb }));
    if (bw.left > 0 && leftLen > 0) placeEdgeDots(leftLen, tLeft, bw.left, (offset) => ({ cx: Xl, cy: Yb + offset }));

    // --- Corner dots (draw once to avoid duplicates) ---
    const corners = [
      { mm: Math.max(bw.top, bw.left), pt: Math.max(tTop, tLeft), cx: Xl, cy: Yt },
      { mm: Math.max(bw.top, bw.right), pt: Math.max(tTop, tRight), cx: Xr, cy: Yt },
      { mm: Math.max(bw.bottom, bw.right), pt: Math.max(tBottom, tRight), cx: Xr, cy: Yb },
      { mm: Math.max(bw.bottom, bw.left), pt: Math.max(tBottom, tLeft), cx: Xl, cy: Yb },
    ];

    for (const c of corners) {
      if (c.pt <= 0) continue;
      drawDot(c.cx, c.cy, c.pt, c.mm);
    }
  };

  // ---------- DASHED (longer segments, corners closed) ----------
  const drawDashed = () => {
    const {
      dashFactor, gapFactor, minDashPt, minGapPt, patchCorner, useSquareCapIfAvailable
    } = BORDER_STYLE_CONSTANTS.dashed;

    // Try square caps to reduce visible voids at corners
    const hasSetLineCap = typeof page.setLineCap === 'function';
    const prevLineCap =
      hasSetLineCap && typeof page.getLineCap === 'function' ? page.getLineCap() : undefined;
    if (useSquareCapIfAvailable && hasSetLineCap) {
      try { page.setLineCap(2 as any); } catch { }
    }

    // Enforce: start with dash (phase=0) and L = D + n*(D+G)
    function calcDashedForSide(L: number, t: number) {
      if (t <= 0 || L <= 0) return null;

      let D = Math.max(dashFactor * t, minDashPt);
      const gap0 = Math.max(gapFactor * t, minGapPt);

      if (L <= D + minGapPt) {
        D = Math.min(D, Math.max(minDashPt, L - minGapPt));
        const G = Math.max(L - D, minGapPt);
        return { dash: D, gap: G, dashPhase: 0 };
      }

      const P0 = D + gap0;
      const nEst = Math.max(1, (L - D) / P0);

      let best: { n: number; G: number; err: number } | null = null;
      const candidates = [Math.floor(nEst) - 2, Math.floor(nEst) - 1, Math.floor(nEst), Math.ceil(nEst), Math.ceil(nEst) + 1, Math.ceil(nEst) + 2];
      for (const nCand of candidates) {
        const n = Math.max(1, nCand);
        const G = (L - D) / n - D; // L = D + n*(D+G)
        if (G < minGapPt) continue;
        const err = Math.abs(G - gap0);
        if (!best || err < best.err) best = { n, G, err };
      }

      if (!best) {
        const Dmax = Math.max(minDashPt, (L - minGapPt) / 2); // L = 2D + G
        D = Math.min(D, Dmax);
        const G = Math.max(L - 2 * D, minGapPt);
        return { dash: D, gap: G, dashPhase: 0 };
      }

      return { dash: D, gap: best.G, dashPhase: 0 };
    }

    const topP = tTop > 0 ? calcDashedForSide(topLen, tTop) : null;
    const rightP = tRight > 0 ? calcDashedForSide(rightLen, tRight) : null;
    const bottomP = tBottom > 0 ? calcDashedForSide(bottomLen, tBottom) : null;
    const leftP = tLeft > 0 ? calcDashedForSide(leftLen, tLeft) : null;

    if (topP) page.drawLine({ start: { x: Xl, y: Yt }, end: { x: Xr, y: Yt }, thickness: tTop, color, opacity, dashArray: [topP.dash, topP.gap], dashPhase: topP.dashPhase });
    if (rightP) page.drawLine({ start: { x: Xr, y: Yb }, end: { x: Xr, y: Yt }, thickness: tRight, color, opacity, dashArray: [rightP.dash, rightP.gap], dashPhase: rightP.dashPhase });
    if (bottomP) page.drawLine({ start: { x: Xl, y: Yb }, end: { x: Xr, y: Yb }, thickness: tBottom, color, opacity, dashArray: [bottomP.dash, bottomP.gap], dashPhase: bottomP.dashPhase });
    if (leftP) page.drawLine({ start: { x: Xl, y: Yb }, end: { x: Xl, y: Yt }, thickness: tLeft, color, opacity, dashArray: [leftP.dash, leftP.gap], dashPhase: leftP.dashPhase });

    if (patchCorner) {
      const drawCornerPatch = (cx: number, cy: number, size: number) => {
        if (size <= 0) return;
        page.drawRectangle({ x: cx - size / 2, y: cy - size / 2, width: size, height: size, color, opacity, borderWidth: 0 });
      };
      const sizeTL = Math.max(tTop, tLeft);
      const sizeTR = Math.max(tTop, tRight);
      const sizeBR = Math.max(tBottom, tRight);
      const sizeBL = Math.max(tBottom, tLeft);
      if (sizeTL > 0) drawCornerPatch(Xl, Yt, sizeTL);
      if (sizeTR > 0) drawCornerPatch(Xr, Yt, sizeTR);
      if (sizeBR > 0) drawCornerPatch(Xr, Yb, sizeBR);
      if (sizeBL > 0) drawCornerPatch(Xl, Yb, sizeBL);
    }

    if (useSquareCapIfAvailable && hasSetLineCap) {
      if (prevLineCap !== undefined) {
        try { page.setLineCap(prevLineCap); } catch { }
      } else {
        try { page.setLineCap(0 as any); } catch { } // Butt
      }
    }
  };

  // ---------- Dispatch by style ----------
  switch (borderStyle) {
    case 'solid': drawSolid(); break;
    case 'dotted': drawDotted(); break;
    case 'dashed': drawDashed(); break;
    default: drawSolid(); break;
  }
}