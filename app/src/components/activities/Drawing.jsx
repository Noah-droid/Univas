import { useState, useRef, useCallback, useEffect } from "react";
import { useActivityWS } from "../../hooks/useActivityWS";
import "./Drawing.css";

const COLORS = [
  "#ffffff", "#ff6b6b", "#ffd700", "#4ecdc4", "#45b7d1",
  "#96ceb4", "#ff69b4", "#7b68ee", "#2ecc71", "#e74c3c",
  "#f39c12", "#1abc9c", "#9b59b6", "#3498db", "#e67e22",
  "#2c3e50",
];

const BRUSH_SIZES = [2, 5, 10, 20, 40];

export default function Drawing({ universeId, onComplete, onBack }) {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState("brush");
  const [color, setColor] = useState("#ffffff");
  const [brushSize, setBrushSize] = useState(5);
  const [drawing, setDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const lastPos = useRef(null);

  const { send } = useActivityWS(universeId, (msg) => {
    if (msg.type === "DRAW_STROKE") {
      drawRemoteStroke(msg);
    } else if (msg.type === "DRAW_CLEAR") {
      clearCanvas(false);
    }
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);
    ctx.fillStyle = "#0a0a1a";
    ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
  }, []);

  const drawRemoteStroke = (stroke) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(stroke.x0, stroke.y0);
    ctx.lineTo(stroke.x1, stroke.y1);
    ctx.strokeStyle = stroke.tool === "eraser" ? "#0a0a1a" : stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  };

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDraw = (e) => {
    setDrawing(true);
    setHasDrawn(true);
    const pos = getPos(e);
    lastPos.current = pos;

    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = tool === "eraser" ? "#0a0a1a" : color;
    ctx.fill();
  };

  const draw = useCallback(
    (e) => {
      if (!drawing) return;
      const ctx = canvasRef.current.getContext("2d");
      const pos = getPos(e);

      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = tool === "eraser" ? "#0a0a1a" : color;
      ctx.lineWidth = brushSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();

      send({
        type: "DRAW_STROKE",
        x0: lastPos.current.x,
        y0: lastPos.current.y,
        x1: pos.x,
        y1: pos.y,
        color,
        size: brushSize,
        tool,
      });

      lastPos.current = pos;
    },
    [drawing, color, brushSize, tool, send]
  );

  const stopDraw = () => {
    setDrawing(false);
    lastPos.current = null;
  };

  const clearCanvas = (broadcast = true) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#0a0a1a";
    ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
    setHasDrawn(false);
    if (broadcast) send({ type: "DRAW_CLEAR" });
  };

  const saveDrawing = () => {
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL("image/png");
    onComplete({
      type: "drawing",
      title: "Our Drawing",
      completion: 100,
      difficulty: 2,
      timeSpent: 0,
      size: "medium",
      message: "Created together",
      assets: [dataUrl],
    });
  };

  return (
    <div className="activity-screen drawing-screen">
      <div className="drawing-toolbar">
        <button className="back-btn" onClick={onBack}>← Back</button>

        <div className="tool-group">
          <button
            className={`tool-btn ${tool === "brush" ? "active" : ""}`}
            onClick={() => setTool("brush")}
          >
            ✏️
          </button>
          <button
            className={`tool-btn ${tool === "eraser" ? "active" : ""}`}
            onClick={() => setTool("eraser")}
          >
            🧹
          </button>
        </div>

        <div className="color-palette">
          {COLORS.map((c) => (
            <button
              key={c}
              className={`color-swatch ${color === c ? "active" : ""}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>

        <div className="brush-sizes">
          {BRUSH_SIZES.map((s) => (
            <button
              key={s}
              className={`size-btn ${brushSize === s ? "active" : ""}`}
              onClick={() => setBrushSize(s)}
            >
              <span className="size-dot" style={{ width: s, height: s }} />
            </button>
          ))}
        </div>

        <div className="drawing-actions">
          <button className="tool-btn" onClick={() => clearCanvas(true)}>🗑️</button>
          <button
            className="save-drawing-btn"
            onClick={saveDrawing}
            disabled={!hasDrawn}
          >
            Save ✨
          </button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        className="drawing-canvas"
        onPointerDown={startDraw}
        onPointerMove={draw}
        onPointerUp={stopDraw}
        onPointerLeave={stopDraw}
      />
    </div>
  );
}
