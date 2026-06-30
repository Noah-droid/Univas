import { useRef, useCallback, useState, useEffect } from "react";
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

function useHitTest() {
  const { camera, gl } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const surfaces = useRef([]);

  const registerSurface = (mesh) => {
    surfaces.current.push(mesh);
    return () => {
      surfaces.current = surfaces.current.filter((m) => m !== mesh);
    };
  };

  const hitTest = (clientX, clientY) => {
    const rect = gl.domElement.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.current.setFromCamera(new THREE.Vector2(x, y), camera);
    const intersects = raycaster.current.intersectObjects(surfaces.current);
    if (intersects.length > 0) return intersects[0];
    return null;
  };

  return { registerSurface, hitTest };
}

function Surface({ position, rotation, width, height, color, onHit, surfaceRef }) {
  const meshRef = useRef();
  const { registerSurface } = useHitTest();

  useEffect(() => {
    const unregister = registerSurface(meshRef.current);
    if (surfaceRef) surfaceRef.current = meshRef.current;
    return unregister;
  }, []);

  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={rotation}
      userData={{ isSurface: true }}
    >
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial
        color={color}
        roughness={0.85}
        metalness={0.05}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function PlacedItem({ item, isDragging, onPointerDown, onDoubleClick }) {
  let pos;
  if (item.category === "floor") {
    const fx = ((item.x || 50) / 100) * FLOOR_W - FLOOR_W / 2;
    const fz = ((item.z || 50) / 100) * FLOOR_D - FLOOR_D / 2;
    pos = [fx, 0.05, fz];
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

function DragIndicator({ position, visible }) {
  if (!visible) return null;
  return (
    <mesh position={position}>
      <ringGeometry args={[0.15, 0.2, 32]} />
      <meshBasicMaterial color="#7b68ee" transparent opacity={0.8} side={THREE.DoubleSide} />
    </mesh>
  );
}

function RoomScene({ wallColor, floorColor, placed, selectedObj, onPlace, onMove, onRemove, onDragStart, onDragEnd, dragging }) {
  const { camera, gl } = useThree();
  const controlsRef = useRef();
  const wallSurfaceRef = useRef();
  const floorSurfaceRef = useRef();
  const raycaster = useRef(new THREE.Raycaster());
  const pointer = useRef(new THREE.Vector2());
  const dragItemRef = useRef(null);
  const dragPlaneRef = useRef(null);

  const handleClick = useCallback((e) => {
    if (!selectedObj || dragItemRef.current) return;
    if (selectedObj.id === "note") {
      const rect = gl.domElement.getBoundingClientRect();
      pointer.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.current.setFromCamera(pointer.current, camera);
      const meshes = [];
      if (wallSurfaceRef.current) meshes.push(wallSurfaceRef.current);
      if (floorSurfaceRef.current) meshes.push(floorSurfaceRef.current);
      const intersects = raycaster.current.intersectObjects(meshes);
      if (intersects.length > 0) {
        onPlace({ ...selectedObj, uid: Date.now(), x: 50, y: 50, text: "" });
      }
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
        const x = ((local.x + FLOOR_W / 2) / FLOOR_W) * 100;
        const z = ((-local.y + FLOOR_D / 2) / FLOOR_D) * 100;
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
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={0.6} />
      <directionalLight position={[-3, 5, -3]} intensity={0.2} color="#7b68ee" />

      <Surface
        position={[0, ROOM_H / 2 - 0.3, -ROOM_D / 2]}
        rotation={[0, 0, 0]}
        width={ROOM_W}
        height={ROOM_H}
        color={wallColor}
        surfaceRef={wallSurfaceRef}
      />

      <Surface
        position={[-ROOM_W / 2, ROOM_H / 2 - 0.3, 0]}
        rotation={[0, Math.PI / 2, 0]}
        width={ROOM_D}
        height={ROOM_H}
        color={wallColor}
      />

      <Surface
        position={[ROOM_W / 2, ROOM_H / 2 - 0.3, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        width={ROOM_D}
        height={ROOM_H}
        color={wallColor}
      />

      <Surface
        position={[0, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        width={ROOM_W}
        height={ROOM_D}
        color={floorColor}
        surfaceRef={floorSurfaceRef}
        userData={{ isFloor: true }}
      />

      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM_W - 1, ROOM_D - 1, 10, 10]} />
        <meshBasicMaterial color="rgba(255,255,255,0.03)" wireframe transparent />
      </mesh>

      <mesh position={[0, ROOM_H, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM_W * 1.1, ROOM_D * 1.1]} />
        <meshStandardMaterial color="#000008" side={THREE.BackSide} />
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
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2 - 0.05}
        minDistance={2}
        maxDistance={8}
        enablePan={false}
      />
    </group>
  );
}

export default function Room3D(props) {
  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <Canvas
        camera={{ position: [0, 2.5, 6], fov: 50, near: 0.1, far: 50 }}
        gl={{ antialias: true }}
        onCreated={({ gl }) => gl.setClearColor("#000008")}
      >
        <RoomScene {...props} />
      </Canvas>
    </div>
  );
}
