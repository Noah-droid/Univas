import { useState, useRef, useCallback, useEffect } from "react";
import { api, connectWS } from "../api";
import Star from "./Star";
import StarDetail from "./StarDetail";
import "./Universe.css";

const UNIVERSE_SIZE = 4000;

function generateBackgroundStars(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `bg_${i}`,
    x: Math.random(),
    y: Math.random(),
    size: Math.random() * 2 + 0.5,
    opacity: Math.random() * 0.6 + 0.2,
    twinkleSpeed: Math.random() * 3 + 2,
  }));
}

const backgroundStars = generateBackgroundStars(300);

export default function Universe({ universeId, universeName, onOpenActivity, onLeave }) {
  const [stars, setStars] = useState([]);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedStar, setSelectedStar] = useState(null);
  const [partnerCursors, setPartnerCursors] = useState({});
  const [universeData, setUniverseData] = useState(null);
  const [showInvite, setShowInvite] = useState(false);
  const [copied, setCopied] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const offsetStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const lastTouch = useRef(null);
  const velocity = useRef({ x: 0, y: 0 });
  const animFrame = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    if (!universeId) return;

    api.getStars(universeId).then(setStars).catch(console.error);
    api.getUniverse(universeId).then(setUniverseData).catch(console.error);

    wsRef.current = connectWS(universeId, (msg) => {
      switch (msg.type) {
        case "STAR_CREATED":
          setStars((prev) => [...prev, msg.star]);
          break;
        case "STAR_UPDATED":
          setStars((prev) => prev.map((s) => (s.id === msg.star.id ? msg.star : s)));
          break;
        case "STAR_DELETED":
          setStars((prev) => prev.filter((s) => s.id !== msg.starId));
          break;
        case "CURSOR_MOVE":
          setPartnerCursors((prev) => ({
            ...prev,
            [msg.userId]: { x: msg.x, y: msg.y, username: msg.username },
          }));
          break;
        case "USER_LEFT":
          setPartnerCursors((prev) => {
            const next = { ...prev };
            delete next[msg.userId];
            return next;
          });
          break;
      }
    });

    return () => {
      wsRef.current?.close();
    };
  }, [universeId]);

  const clampOffset = useCallback((ox, oy, z) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const maxX = (UNIVERSE_SIZE * z - vw) / 2;
    const maxY = (UNIVERSE_SIZE * z - vh) / 2;
    return {
      x: Math.max(-maxX, Math.min(maxX, ox)),
      y: Math.max(-maxY, Math.min(maxY, oy)),
    };
  }, []);

  const handleWheel = useCallback(
    (e) => {
      e.preventDefault();
      const delta = e.deltaY * -0.001;
      setZoom((prev) => {
        const next = Math.max(0.3, Math.min(3, prev + delta));
        setOffset((o) => clampOffset(o.x, o.y, next));
        return next;
      });
    },
    [clampOffset]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const handlePointerDown = useCallback(
    (e) => {
      if (e.button !== 0) return;
      setIsDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY };
      offsetStart.current = { ...offset };
      velocity.current = { x: 0, y: 0 };
      if (animFrame.current) cancelAnimationFrame(animFrame.current);
    },
    [offset]
  );

  const handlePointerMove = useCallback(
    (e) => {
      if (isDragging) {
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        velocity.current = { x: dx * 0.1, y: dy * 0.1 };
        setOffset(clampOffset(offsetStart.current.x + dx, offsetStart.current.y + dy, zoom));
      }

      if (wsRef.current?.readyState === 1) {
        const x = (e.clientX - offset.x) / (UNIVERSE_SIZE * zoom);
        const y = (e.clientY - offset.y) / (UNIVERSE_SIZE * zoom);
        wsRef.current.send(JSON.stringify({ type: "CURSOR_MOVE", x, y }));
      }
    },
    [isDragging, zoom, clampOffset, offset]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    const decay = () => {
      velocity.current.x *= 0.95;
      velocity.current.y *= 0.95;
      if (Math.abs(velocity.current.x) < 0.1 && Math.abs(velocity.current.y) < 0.1) return;
      setOffset((prev) =>
        clampOffset(prev.x + velocity.current.x, prev.y + velocity.current.y, zoom)
      );
      animFrame.current = requestAnimationFrame(decay);
    };
    animFrame.current = requestAnimationFrame(decay);
  }, [zoom, clampOffset]);

  const handleTouchStart = useCallback(
    (e) => {
      if (e.touches.length === 1) {
        lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        setIsDragging(true);
        dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        offsetStart.current = { ...offset };
      }
    },
    [offset]
  );

  const handleTouchMove = useCallback(
    (e) => {
      if (e.touches.length === 1 && lastTouch.current) {
        e.preventDefault();
        const dx = e.touches[0].clientX - dragStart.current.x;
        const dy = e.touches[0].clientY - dragStart.current.y;
        setOffset(clampOffset(offsetStart.current.x + dx, offsetStart.current.y + dy, zoom));
      }
    },
    [zoom, clampOffset]
  );

  const handleTouchEnd = useCallback(() => {
    lastTouch.current = null;
    setIsDragging(false);
  }, []);

  const handleStarClick = useCallback((star) => {
    setSelectedStar(star);
  }, []);

  return (
    <div
      ref={containerRef}
      className="universe"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ cursor: isDragging ? "grabbing" : "grab" }}
    >
      <div className="nebula-layer" />

      <div
        className="universe-canvas"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
        }}
      >
        {backgroundStars.map((s) => (
          <div
            key={s.id}
            className="bg-star"
            style={{
              left: `${s.x * UNIVERSE_SIZE}px`,
              top: `${s.y * UNIVERSE_SIZE}px`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              opacity: s.opacity,
              animationDuration: `${s.twinkleSpeed}s`,
            }}
          />
        ))}

        {stars.map((star) => (
          <Star key={star.id} star={star} universeSize={UNIVERSE_SIZE} onClick={handleStarClick} />
        ))}

        {stars.length === 0 && (
          <div className="universe-empty">
            <div className="universe-empty-icon">✦</div>
            <h3>Your universe is empty</h3>
            <p>Tap <span className="empty-plus">+</span> below to create your first star</p>
          </div>
        )}

        {Object.entries(partnerCursors).map(([userId, cursor]) => (
          <div
            key={userId}
            className="partner-cursor"
            style={{
              left: `${cursor.x * UNIVERSE_SIZE}px`,
              top: `${cursor.y * UNIVERSE_SIZE}px`,
            }}
          >
            <div className="cursor-dot" />
            <div className="cursor-label">{cursor.username}</div>
          </div>
        ))}
      </div>

      <div className="hud">
        <div className="hud-top-bar">
          <button className="back-btn" onClick={onLeave}>←</button>
          <div className="hud-title">{universeName || "Your Universe"}</div>
          <button className="hud-invite-btn" onClick={() => setShowInvite(true)}>
            Invite
          </button>
        </div>
        <div className="hud-hint">drag to explore / scroll to zoom</div>
      </div>

      <button className="fab-activity" onClick={onOpenActivity}>
        +
      </button>

      <div className="hud-zoom">{Math.round(zoom * 100)}%</div>

      {showInvite && universeData?.invite_code && (
        <div className="invite-overlay" onClick={() => setShowInvite(false)}>
          <div className="invite-card" onClick={(e) => e.stopPropagation()}>
            <h3>Invite your partner</h3>
            <p>Share this code so they can join your universe</p>
            <div className="invite-code">{universeData.invite_code}</div>
            <button
              className="invite-copy-btn"
              onClick={() => {
                navigator.clipboard.writeText(
                  `${window.location.origin}/join/${universeData.invite_code}`
                );
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? "Copied!" : "Copy Invite Link"}
            </button>
            <button
              className="back-btn"
              style={{ marginTop: 8 }}
              onClick={() => setShowInvite(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {selectedStar && (
        <StarDetail star={selectedStar} onClose={() => setSelectedStar(null)} />
      )}
    </div>
  );
}
