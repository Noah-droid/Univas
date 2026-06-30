import { useRef, useCallback, useState, useEffect, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";

const ROOM_W = 8;
const ROOM_H = 4.5;
const ROOM_D = 6;
const WALL_H = ROOM_H * 0.65;
const WALL_W = ROOM_W - 1;
const FLOOR_W = ROOM_W - 1.5;
const FLOOR_D = ROOM_D - 1;

function generateWallTexture(color) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 6000; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const alpha = Math.random() * 0.06;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fillRect(x, y, 1, 1);
  }
  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const alpha = Math.random() * 0.04;
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    ctx.fillRect(x, y, 1, 1);
  }
  return new THREE.CanvasTexture(canvas);
}

function generateFloorTexture(baseColor, tileCount = 8) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  const tileW = canvas.width / tileCount;
  const tileH = canvas.height / tileCount;

  for (let r = 0; r < tileCount; r++) {
    for (let c = 0; c < tileCount; c++) {
      const bright = 1 + (Math.random() - 0.5) * 0.06;
      const r2 = parseInt(baseColor.slice(1, 3), 16);
      const g2 = parseInt(baseColor.slice(3, 5), 16);
      const b2 = parseInt(baseColor.slice(5, 7), 16);
      const nr = Math.min(255, Math.max(0, Math.round(r2 * bright)));
      const ng = Math.min(255, Math.max(0, Math.round(g2 * bright)));
      const nb = Math.min(255, Math.max(0, Math.round(b2 * bright)));
      const hex = `#${nr.toString(16).padStart(2, "0")}${ng.toString(16).padStart(2, "0")}${nb.toString(16).padStart(2, "0")}`;

      ctx.fillStyle = hex;
      ctx.fillRect(c * tileW, r * tileH, tileW, tileH);

      ctx.strokeStyle = `rgba(255,255,255,0.04)`;
      ctx.lineWidth = 1;
      ctx.strokeRect(c * tileW, r * tileH, tileW, tileH);
    }
  }

  return new THREE.CanvasTexture(canvas);
}

function generateFloorGradient(color) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  const grad = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
  grad.addColorStop(0, `rgba(255,255,255,0.08)`);
  grad.addColorStop(0.5, `rgba(255,255,255,0.02)`);
  grad.addColorStop(1, `rgba(0,0,0,0.15)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  return new THREE.CanvasTexture(canvas);
}

function generateWallGradient() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, `rgba(255,255,255,0.04)`);
  grad.addColorStop(0.5, `rgba(255,255,255,0.01)`);
  grad.addColorStop(1, `rgba(0,0,0,0.08)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(canvas);
}

function Wall({ position, rotation, width, height, color, surfaceRef, side }) {
  const meshRef = useRef();
  const tex = useMemo(() => generateWallTexture(color), [color]);
  const gradientTex = useMemo(generateWallGradient, []);

  useEffect(() => {
    tex.needsUpdate = true;
  }, [color, tex]);

  useEffect(() => {
    const unregister = surfaceRef?.(meshRef.current);
    return () => unregister?.();
  }, []);

  return (
    <group position={position} rotation={rotation}>
      <mesh ref={meshRef} userData={{ isSurface: true, isFloor: false }}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          map={tex}
          roughness={0.7}
          metalness={0.05}
          color={color}
        />
      </mesh>
      <mesh position={[0, -height / 2 + 0.06, 0.01]}>
        <planeGeometry args={[width, 0.12]} />
        <meshStandardMaterial color="#000" transparent opacity={0.3} roughness={0.9} />
      </mesh>
      <mesh position={[0, -height / 2 + 0.18, 0.01]}>
        <planeGeometry args={[width, 0.06]} />
        <meshStandardMaterial color="#fff" transparent opacity={0.03} roughness={0.9} />
      </mesh>
    </group>
  );
}

function Floor({ color, surfaceRef }) {
  const meshRef = useRef();
  const tileTex = useMemo(() => generateFloorTexture(color), [color]);
  const gradientTex = useMemo(generateFloorGradient, []);

  useEffect(() => {
    tileTex.needsUpdate = true;
  }, [color, tileTex]);

  useEffect(() => {
    const unregister = surfaceRef?.(meshRef.current);
    return () => unregister?.();
  }, []);

  return (
    <group position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh ref={meshRef} userData={{ isSurface: true, isFloor: true }}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial
          map={tileTex}
          roughness={0.8}
          metalness={0.1}
          color={color}
        />
      </mesh>
      <mesh position={[0, 0.01, 0]}>
        <planeGeometry args={[ROOM_W - 0.3, ROOM_D - 0.3]} />
        <meshStandardMaterial
          map={gradientTex}
          transparent
          opacity={1}
          roughness={1}
          metalness={0}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function PlacedItem({ item, isDragging, onPointerDown, onDoubleClick }) {
  let pos;
  if (item.category === "floor") {
    const fx = ((item.x || 50) / 100) * FLOOR_W - FLOOR_W / 2;
    const fz = ((item.z || 50) / 100) * FLOOR_D - FLOOR_D / 2;
    pos = [fx, 0.08, fz];
  } else {
    const wx = ((item.x || 50) / 100) * WALL_W - WALL_W / 2;
    const wy = ((item.y || 50) / 100) * WALL_H - WALL_H / 2;
    pos = [wx, wy + 0.8, -ROOM_D / 2 + 0.05];
  }

  return (
    <group
      position={pos}
      onPointerDown={(e) => {
        e.stopPropagation();
        onPointerDown?.(item.uid, e);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick?.(item.uid);
      }}
    >
      <Text
        fontSize={(item.size || 36) * 0.014}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {item.icon}
      </Text>
      {item.text && (
        <Text
          position={[0, -(item.size || 36) * 0.018, 0]}
          fontSize={0.12}
          color="rgba(255,255,255,0.7)"
          anchorX="center"
          anchorY="top"
        >
          {item.text}
        </Text>
      )}
    </group>
  );
}

function BackgroundStars() {
  const count = 500;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 20 + Math.random() * 10;
      pos[i] = r * Math.sin(phi) * Math.cos(theta);
      pos[i + 1] = r * Math.cos(phi) * 0.5 + 2;
      pos[i + 2] = r * Math.sin(phi) * Math.sin(theta) - 2;
    }
    return pos;
  }, []);

  const ref = useRef();
  useFrame(() => {
    if (ref.current) ref.current.rotation.y += 0.0001;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color="rgba(255,255,255,0.4)"
        transparent
        opacity={0.6}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

function RoomScene({ wallColor, floorColor, placed, selectedObj, onPlace, onMove, onRemove, onDragStart, onDragEnd, dragging }) {
  const { camera, gl } = useThree();
  const controlsRef = useRef();
  const wallSurfaceRef = useRef(null);
  const floorSurfaceRef = useRef(null);
  const raycaster = useRef(new THREE.Raycaster());
  const pointer = useRef(new THREE.Vector2());
  const dragItemRef = useRef(null);
  const dragPlaneRef = useRef(null);

  const registerSurface = useCallback((mesh) => {
    if (mesh?.userData?.isFloor) {
      floorSurfaceRef.current = mesh;
    } else {
      wallSurfaceRef.current = mesh;
    }
    return () => {
      if (mesh?.userData?.isFloor) floorSurfaceRef.current = null;
      else wallSurfaceRef.current = null;
    };
  }, []);

  const handleClick = useCallback((e) => {
    if (!selectedObj || dragItemRef.current) return;
    if (selectedObj.id === "note") {
      onPlace({ ...selectedObj, uid: Date.now(), x: 50, y: 50, text: "" });
      return;
    }

    const rect = gl.domElement.getBoundingClientRect();
    pointer.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.current.setFromCamera(pointer.current, camera);
    const meshes = [];
    if (wallSurfaceRef.current) meshes.push(wallSurfaceRef.current);
    if (floorSurfaceRef.current) meshes.push(floorSurfaceRef.current);
    const intersects = raycaster.current.intersectObjects(meshes);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const local = hit.object.worldToLocal(hit.point.clone());
      let item;
      if (hit.object.userData.isFloor) {
        const x = ((local.x + ROOM_W / 2) / ROOM_W) * 100;
        const z = ((-local.y + ROOM_D / 2) / ROOM_D) * 100;
        item = { ...selectedObj, uid: Date.now(), x, y: 50, z, text: "" };
      } else {
        const x = ((local.x + WALL_W / 2) / WALL_W) * 100;
        const y = ((local.y + WALL_H / 2) / WALL_H) * 100;
        item = { ...selectedObj, uid: Date.now(), x, y, text: "" };
      }
      onPlace(item);
    }
  }, [selectedObj, camera, gl, onPlace]);

  const handleItemPointerDown = useCallback((uid, e) => {
    e.stopPropagation();
    dragItemRef.current = uid;
    onDragStart?.(uid);
    const rect = gl.domElement.getBoundingClientRect();
    pointer.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.current.setFromCamera(pointer.current, camera);
    const planeNormal = new THREE.Vector3(0, 0, 1);
    const planePos = new THREE.Vector3(0, 0, -ROOM_D / 2);
    if (placed.find((p) => p.uid === uid)?.category === "floor") {
      planeNormal.set(0, 1, 0);
      planePos.set(0, 0, 0);
    }
    dragPlaneRef.current = new THREE.Plane(planeNormal, -planeNormal.dot(planePos));
  }, [camera, gl, onDragStart, placed]);

  const handleItemDoubleClick = useCallback((uid) => {
    onRemove?.(uid);
  }, [onRemove]);

  useFrame((state) => {
    if (!dragItemRef.current) return;
    const rect = gl.domElement.getBoundingClientRect();
    pointer.current.x = ((state.mouse.x * rect.width - rect.left) / rect.width) * 2 - 1;
    pointer.current.y = -((state.mouse.y * rect.height - rect.top) / rect.height) * 2 + 1;
    raycaster.current.setFromCamera(pointer.current, camera);

    if (dragPlaneRef.current) {
      const intersectPoint = new THREE.Vector3();
      raycaster.current.ray.intersectPlane(dragPlaneRef.current, intersectPoint);
      if (intersectPoint) {
        const item = placed.find((p) => p.uid === dragItemRef.current);
        if (item) {
          if (item.category === "floor") {
            const x = ((intersectPoint.x + FLOOR_W / 2) / FLOOR_W) * 100;
            const z = ((intersectPoint.z + FLOOR_D / 2) / FLOOR_D) * 100;
            onMove(dragItemRef.current, Math.max(0, Math.min(100, x)), 50, Math.max(0, Math.min(100, z)));
          } else {
            const x = ((intersectPoint.x + WALL_W / 2) / WALL_W) * 100;
            const y = ((intersectPoint.y + WALL_H / 2) / WALL_H) * 100;
            onMove(dragItemRef.current, Math.max(0, Math.min(100, x)), Math.max(0, Math.min(100, y)));
          }
        }
      }
    }
  });

  useEffect(() => {
    const handleUp = () => {
      if (dragItemRef.current) {
        onDragEnd?.();
        dragItemRef.current = null;
        dragPlaneRef.current = null;
      }
    };
    window.addEventListener("pointerup", handleUp);
    return () => window.removeEventListener("pointerup", handleUp);
  }, [onDragEnd]);

  return (
    <group onClick={handleClick}>
      <ambientLight intensity={0.35} color="#444466" />
      <directionalLight position={[5, 10, 5]} intensity={0.7} color="#ffeedd" />
      <directionalLight position={[-5, 3, -5]} intensity={0.25} color="#7b68ee" />
      <directionalLight position={[0, -2, 6]} intensity={0.15} color="#4466aa" />
      <pointLight position={[0, 3.8, 0]} intensity={0.08} color="#ffd700" distance={6} />

      <BackgroundStars />

      <Wall
        position={[0, ROOM_H / 2 - 0.3, -ROOM_D / 2]}
        rotation={[0, 0, 0]}
        width={ROOM_W}
        height={ROOM_H}
        color={wallColor}
        surfaceRef={registerSurface}
      />

      <Wall
        position={[-ROOM_W / 2, ROOM_H / 2 - 0.3, 0]}
        rotation={[0, Math.PI / 2, 0]}
        width={ROOM_D}
        height={ROOM_H}
        color={wallColor}
      />

      <Wall
        position={[ROOM_W / 2, ROOM_H / 2 - 0.3, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        width={ROOM_D}
        height={ROOM_H}
        color={wallColor}
      />

      <Floor color={floorColor} surfaceRef={registerSurface} />

      <mesh position={[0, ROOM_H, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM_W * 1.1, ROOM_D * 1.1, 8, 8]} />
        <meshStandardMaterial color="#000008" roughness={1} metalness={0} side={THREE.BackSide} />
      </mesh>

      {placed.map((item) => (
        <PlacedItem
          key={item.uid}
          item={item}
          isDragging={dragging === item.uid}
          onPointerDown={handleItemPointerDown}
          onDoubleClick={handleItemDoubleClick}
        />
      ))}

      {selectedObj && (
        <Text
          position={[0, 3.8, -ROOM_D / 2 + 0.1]}
          fontSize={0.15}
          color="rgba(255,255,255,0.5)"
          anchorX="center"
        >
          Tap to place {selectedObj.name}
        </Text>
      )}

      <OrbitControls
        ref={controlsRef}
        target={[0, 1.5, 0]}
        minPolarAngle={0.1}
        maxPolarAngle={Math.PI / 2 + 0.1}
        minDistance={1.5}
        maxDistance={10}
        enablePan={false}
      />
    </group>
  );
}

export default function Room3D(props) {
  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <Canvas
        camera={{ position: [0, 2.5, 6], fov: 55, near: 0.1, far: 50 }}
        gl={{ antialias: true }}
        onCreated={({ gl }) => gl.setClearColor("#000008")}
      >
        <RoomScene {...props} />
      </Canvas>
    </div>
  );
}
