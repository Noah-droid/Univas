import { useState, useRef, useCallback, useEffect } from "react";
import { useActivityWS } from "../../hooks/useActivityWS";
import "./JigsawPuzzle.css";

const GRID_SIZES = { easy: 3, medium: 4, hard: 5 };

function generatePieces(img, grid_size) {
  const piece_w = img.width / grid_size;
  const piece_h = img.height / grid_size;
  const pieces = [];

  for (let r = 0; r < grid_size; r++) {
    for (let c = 0; c < grid_size; c++) {
      const canvas = document.createElement("canvas");
      canvas.width = piece_w;
      canvas.height = piece_h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, c * piece_w, r * piece_h, piece_w, piece_h, 0, 0, piece_w, piece_h);

      pieces.push({
        id: r * grid_size + c,
        row: r,
        col: c,
        dataUrl: canvas.toDataURL(),
        placed: false,
        x: 0,
        y: 0,
      });
    }
  }

  for (let i = pieces.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
  }

  return pieces;
}

export default function JigsawPuzzle({ universeId, onComplete, onBack }) {
  const [image, setImage] = useState(null);
  const [difficulty, setDifficulty] = useState("medium");
  const [pieces, setPieces] = useState([]);
  const [boardPieces, setBoardPieces] = useState([]);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [completion, setCompletion] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const boardRef = useRef(null);
  const timerRef = useRef(null);
  const imgRef = useRef(null);
  const completionRef = useRef(0);

  const { send } = useActivityWS(universeId, (msg) => {
    if (msg.type === "PUZZLE_MOVE") {
      setBoardPieces((prev) =>
        prev.map((p) =>
          p.id === msg.pieceId ? { ...p, x: msg.x, y: msg.y } : p
        )
      );
    } else if (msg.type === "PUZZLE_PLACE") {
      setBoardPieces((prev) => {
        const updated = prev.map((p) =>
          p.id === msg.pieceId
            ? { ...p, x: msg.x, y: msg.y, placed: true }
            : p
        );
        checkCompletion(updated);
        return updated;
      });
    }
  });

  useEffect(() => {
    if (started && !finished) {
      timerRef.current = setInterval(() => setElapsed((t) => t + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [started, finished]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
    };
    img.src = url;
  };

  const startGame = () => {
    if (!imgRef.current) return;
    const grid = GRID_SIZES[difficulty];
    const newPieces = generatePieces(imgRef.current, grid);
    setPieces(newPieces);
    setBoardPieces(newPieces.map((p) => ({ ...p, x: 0, y: 0 })));
    setStarted(true);
    setCompletion(0);
    completionRef.current = 0;
    setElapsed(0);
    setFinished(false);
    setSelectedPiece(newPieces[0] || null);
  };

  const unplacedPieces = boardPieces.filter((p) => !p.placed);
  const placedPieces = boardPieces.filter((p) => p.placed);

  const checkCompletion = (updated) => {
    const placedCount = updated.filter((p) => p.placed).length;
    const total = updated.length;
    const pct = Math.round((placedCount / total) * 100);
    completionRef.current = pct;
    setCompletion(pct);

    if (pct === 100 && !finished) {
      setFinished(true);
      clearInterval(timerRef.current);
      setTimeout(() => {
        onComplete({
          type: "puzzle",
          title: `Puzzle — ${difficulty}`,
          completion: 100,
          difficulty: difficulty === "easy" ? 2 : difficulty === "medium" ? 3 : 5,
          timeSpent: elapsed,
          size: difficulty === "hard" ? "large" : "medium",
          message: "We solved it together",
        });
      }, 1500);
    }
  };

  const selectPiece = (piece) => {
    if (piece.placed || dragging) return;
    setSelectedPiece(piece);
  };

  const handlePointerDown = (e, piece) => {
    if (piece.placed) return;
    if (piece.id !== selectedPiece?.id) {
      setSelectedPiece(piece);
      return;
    }
    e.preventDefault();
    const boardRect = boardRef.current?.getBoundingClientRect();
    if (!boardRect) return;
    setDragOffset({
      x: e.clientX - boardRect.left - piece.x,
      y: e.clientY - boardRect.top - piece.y,
    });
    setDragging(piece);
  };

  const handlePointerMove = useCallback(
    (e) => {
      if (!dragging || !boardRef.current) return;
      const boardRect = boardRef.current.getBoundingClientRect();
      const x = e.clientX - boardRect.left - dragOffset.x;
      const y = e.clientY - boardRect.top - dragOffset.y;

      setBoardPieces((prev) =>
        prev.map((p) => (p.id === dragging.id ? { ...p, x, y } : p))
      );
      send({ type: "PUZZLE_MOVE", pieceId: dragging.id, x, y });
    },
    [dragging, dragOffset, send]
  );

  const snapPiece = useCallback(() => {
    if (!dragging) return;
    const grid = GRID_SIZES[difficulty];
    const boardRect = boardRef.current?.getBoundingClientRect();
    if (!boardRect) { setDragging(null); return; }

    const piece = boardPieces.find((p) => p.id === dragging.id);
    if (!piece) { setDragging(null); return; }

    const boardW = boardRect.width;
    const boardH = boardRect.height;
    const cellW = boardW / grid;
    const cellH = boardH / grid;
    const targetX = piece.col * cellW;
    const targetY = piece.row * cellH;
    const snapDist = Math.min(cellW, cellH) * 0.35;
    const dist = Math.hypot(piece.x - targetX, piece.y - targetY);

    if (dist < snapDist) {
      setBoardPieces((prev) => {
        const updated = prev.map((p) =>
          p.id === dragging.id
            ? { ...p, x: targetX, y: targetY, placed: true }
            : p
        );
        checkCompletion(updated);
        return updated;
      });
      send({ type: "PUZZLE_PLACE", pieceId: dragging.id, x: targetX, y: targetY });
    }

    setDragging(null);
  }, [dragging, boardPieces, difficulty, send]);

  const handlePointerUp = useCallback(() => {
    snapPiece();
  }, [snapPiece]);

  useEffect(() => {
    if (dragging) {
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      return () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };
    }
  }, [dragging, handlePointerMove, handlePointerUp]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (!started) {
    return (
      <div className="activity-screen">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="puzzle-setup" style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <h2>🧩 Jigsaw Puzzle</h2>
          <p className="setup-desc">Upload an image and solve it together</p>

          <label className="upload-zone">
            <input type="file" accept="image/*" onChange={handleImageUpload} hidden />
            {previewUrl ? (
              <img src={previewUrl} alt="preview" className="upload-preview" />
            ) : (
              <span>Click to upload image</span>
            )}
          </label>

          <div className="difficulty-picker">
            {Object.keys(GRID_SIZES).map((d) => (
              <button
                key={d}
                className={`diff-btn ${difficulty === d ? "active" : ""}`}
                onClick={() => setDifficulty(d)}
              >
                {d} ({GRID_SIZES[d]}×{GRID_SIZES[d]})
              </button>
            ))}
          </div>

          <button className="start-btn" onClick={startGame} disabled={!imgRef.current}>
            Start Puzzle
          </button>
        </div>
      </div>
    );
  }

  const grid = GRID_SIZES[difficulty];

  return (
    <div className="activity-screen puzzle-game">
      <div className="puzzle-toolbar">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="puzzle-stats">
          <span>{completion}%</span>
          <span>{formatTime(elapsed)}</span>
          <span>{placedPieces.length}/{boardPieces.length}</span>
        </div>
      </div>

      {finished && (
        <div className="puzzle-complete-banner">
          Puzzle Complete! ✨ Creating your star...
        </div>
      )}

      <div className="puzzle-board" ref={boardRef} onPointerMove={handlePointerMove}>
        {/* Ghost grid */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            gridTemplateColumns: `repeat(${grid}, 1fr)`,
            gridTemplateRows: `repeat(${grid}, 1fr)`,
            pointerEvents: "none",
            zIndex: 0,
          }}
        >
          {Array.from({ length: grid * grid }).map((_, i) => (
            <div
              key={i}
              style={{
                border: "1px solid rgba(255,255,255,0.04)",
                borderRadius: 2,
              }}
            />
          ))}
        </div>

        {/* Placed pieces on the board */}
        {placedPieces.map((piece) => (
          <div
            key={piece.id}
            className="puzzle-piece placed"
            style={{
              left: `${piece.col * (100 / grid)}%`,
              top: `${piece.row * (100 / grid)}%`,
              width: `${100 / grid}%`,
              height: `${100 / grid}%`,
              backgroundImage: `url(${piece.dataUrl})`,
              backgroundSize: "100% 100%",
              zIndex: 1,
            }}
          />
        ))}

        {/* Selected piece (draggable) */}
        {selectedPiece && !selectedPiece.placed && (
          <div
            className={`puzzle-piece ${dragging?.id === selectedPiece.id ? "dragging" : "selected"}`}
            style={{
              left: dragging?.id === selectedPiece.id
                ? selectedPiece.x
                : `${selectedPiece.col * (100 / grid)}%`,
              top: dragging?.id === selectedPiece.id
                ? selectedPiece.y
                : `${selectedPiece.row * (100 / grid)}%`,
              width: `${100 / grid}%`,
              height: `${100 / grid}%`,
              backgroundImage: `url(${selectedPiece.dataUrl})`,
              backgroundSize: "100% 100%",
              zIndex: dragging?.id === selectedPiece.id ? 100 : 10,
              opacity: dragging?.id === selectedPiece.id ? 1 : 0.6,
            }}
            onPointerDown={(e) => handlePointerDown(e, selectedPiece)}
          />
        )}
      </div>

      {/* Piece tray */}
      <div className="puzzle-tray">
        <div className="puzzle-tray-label">
          Pieces left ({unplacedPieces.length})
        </div>
        <div className="puzzle-tray-grid">
          {unplacedPieces.map((piece) => (
            <button
              key={piece.id}
              className={`puzzle-tray-piece ${selectedPiece?.id === piece.id ? "active" : ""}`}
              onClick={() => selectPiece(piece)}
              style={{
                backgroundImage: `url(${piece.dataUrl})`,
                backgroundSize: "100% 100%",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
