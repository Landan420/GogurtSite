import { useRef, useCallback, useEffect } from 'react';
import './BorderGlow.css';

function parseHSL(hslStr) {
  const match = hslStr.match(/([\d.]+)\s*([\d.]+)%?\s*([\d.]+)%?/);
  if (!match) return { h: 200, s: 100, l: 78 };
  return { h: parseFloat(match[1]), s: parseFloat(match[2]), l: parseFloat(match[3]) };
}

const BorderGlow = ({
  children,
  className = '',
  edgeSensitivity = 72,
  glowColor = '200 100 78',
  backgroundColor = '#120F17',
  borderRadius = 8,
  glowRadius = 24,
  glowIntensity = 0.55,
  coneSpread = 8,
  disabled = false,
  colors = ['#8fd8ff', '#b0d8ff', '#6ec8ff'],
  fillOpacity = 0.5,
}) => {
  const cardRef = useRef(null);

  const getEdgeProximity = useCallback((el, x, y) => {
    const { width, height } = el.getBoundingClientRect();
    const cx = width / 2;
    const cy = height / 2;
    const dx = x - cx;
    const dy = y - cy;
    if (dx === 0 && dy === 0) return 0;
    const kx = dx !== 0 ? cx / Math.abs(dx) : Infinity;
    const ky = dy !== 0 ? cy / Math.abs(dy) : Infinity;
    return Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
  }, []);

  const getCursorAngle = useCallback((el, x, y) => {
    const { width, height } = el.getBoundingClientRect();
    const dx = x - width / 2;
    const dy = y - height / 2;
    if (dx === 0 && dy === 0) return 0;
    let deg = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (deg < 0) deg += 360;
    return deg;
  }, []);

  const handlePointerMove = useCallback((e) => {
    const card = cardRef.current;
    if (!card || disabled) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const edge = getEdgeProximity(card, x, y);
    const intensity = Math.max(0, (edge * 100 - edgeSensitivity) / (100 - edgeSensitivity));

    if (intensity <= 0) {
      card.style.boxShadow = '';
      return;
    }

    const angle = getCursorAngle(card, x, y);
    const rad = angle * Math.PI / 180;
    const ox = Math.sin(rad) * 22 * intensity;
    const oy = -Math.cos(rad) * 22 * intensity;
    const f = (n) => n.toFixed(1) + 'px';

    const { h, s, l } = parseHSL(glowColor);
    const hsl = `${h}deg ${s}% ${l}%`;
    const a = (base) => Math.min(base * intensity * glowIntensity, 1).toFixed(3);

    card.style.boxShadow = [
      `0 0 14px 3px hsl(${hsl} / ${a(0.30)})`,
      `${f(ox)} ${f(oy)} 28px 5px hsl(${hsl} / ${a(0.22)})`,
      `${f(ox * 1.5)} ${f(oy * 1.5)} 50px 8px hsl(${hsl} / ${a(0.14)})`,
      `${f(ox * 2)} ${f(oy * 2)} 80px 12px hsl(${hsl} / ${a(0.07)})`,
    ].join(', ');
  }, [disabled, edgeSensitivity, glowColor, glowIntensity, getEdgeProximity, getCursorAngle]);

  const handlePointerLeave = useCallback(() => {
    const card = cardRef.current;
    if (card) card.style.boxShadow = '';
  }, []);

  useEffect(() => {
    if (disabled && cardRef.current) {
      cardRef.current.style.boxShadow = '';
    }
  }, [disabled]);

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`border-glow-card ${className}`}
      style={{
        '--card-bg': backgroundColor,
        '--border-radius': `${borderRadius}px`,
      }}
    >
      {children}
    </div>
  );
};

export default BorderGlow;
