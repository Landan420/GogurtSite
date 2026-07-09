import { useRef, useCallback, useEffect } from 'react';
import './BorderGlow.css';

const BorderGlow = ({
  children,
  className = '',
  edgeSensitivity = 30,
  glowColor = null, // "R, G, B" override; defaults to site accent via --accent-rgb
  backgroundColor = '#120F17',
  borderRadius = 8,
  glowRadius = 40,
  glowIntensity = 1,
  coneSpread = 25,
  disabled = false,
}) => {
  const cardRef = useRef(null);
  const fxRef = useRef(null);
  const rafRef = useRef(0);
  const pointRef = useRef(null);

  const getEdgeProximity = useCallback((width, height, x, y) => {
    const cx = width / 2;
    const cy = height / 2;
    const dx = x - cx;
    const dy = y - cy;
    if (dx === 0 && dy === 0) return 0;
    const kx = dx !== 0 ? cx / Math.abs(dx) : Infinity;
    const ky = dy !== 0 ? cy / Math.abs(dy) : Infinity;
    return Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
  }, []);

  const getCursorAngle = useCallback((width, height, x, y) => {
    const dx = x - width / 2;
    const dy = y - height / 2;
    if (dx === 0 && dy === 0) return 0;
    let deg = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (deg < 0) deg += 360;
    return deg;
  }, []);

  const applyGlow = useCallback(() => {
    rafRef.current = 0;
    const card = cardRef.current;
    const fx = fxRef.current;
    const point = pointRef.current;
    if (!card || !fx || !point || disabled) return;

    const rect = card.getBoundingClientRect();
    const x = point.x - rect.left;
    const y = point.y - rect.top;

    const edge = getEdgeProximity(rect.width, rect.height, x, y);
    const angle = getCursorAngle(rect.width, rect.height, x, y);

    fx.style.setProperty('--edge-proximity', (edge * 100).toFixed(3));
    fx.style.setProperty('--cursor-angle', `${angle.toFixed(3)}deg`);
  }, [disabled, getEdgeProximity, getCursorAngle]);

  const handlePointerMove = useCallback((e) => {
    pointRef.current = { x: e.clientX, y: e.clientY };
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(applyGlow);
    }
  }, [applyGlow]);

  const handlePointerLeave = useCallback(() => {
    pointRef.current = null;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    if (fxRef.current) fxRef.current.style.setProperty('--edge-proximity', '0');
  }, []);

  useEffect(() => {
    if (disabled && fxRef.current) {
      fxRef.current.style.setProperty('--edge-proximity', '0');
    }
  }, [disabled]);

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`border-glow-card ${disabled ? 'glow-disabled' : ''} ${className}`}
      style={{
        '--card-bg': backgroundColor,
        '--border-radius': `${borderRadius}px`,
        '--glow-padding': `${glowRadius}px`,
        '--edge-sensitivity': edgeSensitivity,
        '--cone-spread': coneSpread,
        '--glow-intensity': glowIntensity,
        ...(glowColor ? { '--glow-rgb': glowColor } : {}),
      }}
    >
      <span ref={fxRef} className="border-glow-fx" aria-hidden="true">
        <span className="glow-ring" />
        <span className="edge-light" />
      </span>
      {children}
    </div>
  );
};

export default BorderGlow;
