import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";

function ModelAsset({ url, scale = 1 }) {
  const { scene } = useGLTF(url, true);
  return <primitive object={scene} dispose={null} scale={scale} />;
}

function TraumaBed({ position = [0, -0.35, 0] }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 0.4, 0]}>
        <boxGeometry args={[1.6, 0.2, 2.6]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.35} metalness={0.1} />
      </mesh>
      <mesh castShadow position={[0, 0.7, 0]}>
        <boxGeometry args={[1.5, 0.15, 2.5]} />
        <meshStandardMaterial color="#fde68a" roughness={0.4} metalness={0.05} />
      </mesh>
      <mesh castShadow position={[0, 0.95, 0]}>
        <boxGeometry args={[0.2, 0.05, 1.9]} />
        <meshStandardMaterial color="#64748b" roughness={0.5} metalness={0.2} />
      </mesh>
      <mesh castShadow position={[0, 0.15, 0]}>
        <boxGeometry args={[1.7, 0.3, 2.8]} />
        <meshStandardMaterial color="#0f172a" roughness={0.6} metalness={0.3} />
      </mesh>
      <mesh castShadow position={[0.95, 0.8, 0]}>
        <boxGeometry args={[0.08, 0.6, 2.3]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.4} metalness={0.4} />
      </mesh>
      <mesh castShadow position={[-0.95, 0.8, 0]}>
        <boxGeometry args={[0.08, 0.6, 2.3]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.4} metalness={0.4} />
      </mesh>
      <mesh castShadow position={[0, 0.4, 1.35]}>
        <boxGeometry args={[1.6, 0.5, 0.2]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.2} />
      </mesh>
    </group>
  );
}

function MonitorStack({ position = [0, 0, 0] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1, 0]} castShadow>
        <boxGeometry args={[0.05, 2.2, 0.05]} />
        <meshStandardMaterial color="#475569" roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[0.34, 1.8, 0]} castShadow>
        <boxGeometry args={[0.9, 0.5, 0.08]} />
        <meshStandardMaterial color="#0f172a" roughness={0.25} metalness={0.6} />
      </mesh>
      <mesh position={[0.32, 1.82, 0.03]}>
        <planeGeometry args={[0.74, 0.4]} />
        <meshStandardMaterial color="#22d3ee" emissive="#0ea5e9" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0.3, 1.35, 0.12]} castShadow>
        <boxGeometry args={[0.7, 0.4, 0.4]} />
        <meshStandardMaterial color="#334155" roughness={0.5} metalness={0.25} />
      </mesh>
    </group>
  );
}

function EquipmentCart({ position = [0, 0, 0] }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 0.55, 0]}>
        <boxGeometry args={[0.74, 0.12, 0.56]} />
        <meshStandardMaterial color="#475569" roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh castShadow position={[0, 0.33, 0]}>
        <boxGeometry args={[0.7, 0.36, 0.5]} />
        <meshStandardMaterial color="#cbd5f5" roughness={0.4} metalness={0.2} />
      </mesh>
      <mesh castShadow position={[0, 0.75, 0]}>
        <boxGeometry args={[0.52, 0.28, 0.38]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.5} metalness={0.2} />
      </mesh>
      <mesh position={[0, 1.05, 0]} castShadow>
        <boxGeometry args={[0.42, 0.2, 0.28]} />
        <meshStandardMaterial color="#f87171" roughness={0.45} metalness={0.2} />
      </mesh>
    </group>
  );
}

function CeilingRig({ position = [0, 0, 0] }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[1.6, 0.12, 1.6]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.3} metalness={0.6} />
      </mesh>
      <mesh position={[0, -0.08, 0]}>
        <boxGeometry args={[1.3, 0.1, 1.3]} />
        <meshStandardMaterial color="#f8fafc" emissive="#38bdf8" emissiveIntensity={0.08} />
      </mesh>
      <mesh position={[0.7, -0.42, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.64, 18]} />
        <meshStandardMaterial color="#475569" roughness={0.4} metalness={0.5} />
      </mesh>
      <mesh position={[-0.7, -0.42, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.64, 18]} />
        <meshStandardMaterial color="#475569" roughness={0.4} metalness={0.5} />
      </mesh>
    </group>
  );
}

function CrashCart({ position = [0, 0, 0] }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 0.8, 0]}>
        <boxGeometry args={[0.9, 0.18, 0.6]} />
        <meshStandardMaterial color="#991b1b" roughness={0.45} metalness={0.18} />
      </mesh>
      <mesh castShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[0.9, 0.4, 0.6]} />
        <meshStandardMaterial color="#dc2626" roughness={0.35} metalness={0.12} />
      </mesh>
      <mesh castShadow position={[0, 0.1, 0]}>
        <boxGeometry args={[0.82, 0.2, 0.56]} />
        <meshStandardMaterial color="#9ca3af" roughness={0.5} metalness={0.2} />
      </mesh>
      <mesh position={[0.45, 0.7, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.4, 16]} />
        <meshStandardMaterial color="#e5e7eb" roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh position={[0, 1.05, 0.32]}>
        <boxGeometry args={[0.3, 0.12, 0.04]} />
        <meshStandardMaterial color="#facc15" roughness={0.4} metalness={0.2} />
      </mesh>
      <mesh position={[0, 1.05, -0.32]}>
        <boxGeometry args={[0.3, 0.12, 0.04]} />
        <meshStandardMaterial color="#f97316" roughness={0.4} metalness={0.2} />
      </mesh>
    </group>
  );
}

function WallShelves({ position = [0, 0, 0], rotation = [0, 0, 0] }) {
  return (
    <group position={position} rotation={rotation}>
      {[0.4, 0, -0.4].map((offset, idx) => (
        <mesh key={`shelf-${idx}`} position={[0, 1.4 + offset, 0]} castShadow>
          <boxGeometry args={[3, 0.12, 0.4]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.55} metalness={0.12} />
        </mesh>
      ))}
      {[0.48, -0.48].map((xOffset, idx) => (
        <mesh key={`med-kit-${idx}`} position={[xOffset, 1.64, 0.18]}>
          <boxGeometry args={[0.4, 0.24, 0.24]} />
          <meshStandardMaterial color="#38bdf8" roughness={0.4} metalness={0.1} />
        </mesh>
      ))}
      <mesh position={[0, 1.0, 0.2]}>
        <boxGeometry args={[2.8, 0.4, 0.32]} />
        <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.15} />
      </mesh>
    </group>
  );
}

function WindowPanel({ position = [0, 0, 0], rotation = [0, 0, 0] }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 1.5, -0.01]}>
        <boxGeometry args={[3.6, 2.6, 0.12]} />
        <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.2} />
      </mesh>
      <mesh position={[0, 1.5, -0.02]}>
        <planeGeometry args={[3.4, 2.4]} />
        <meshStandardMaterial color="#1e40af" emissive="#22d3ee" emissiveIntensity={0.12} />
      </mesh>
      <mesh position={[0, 2.18, -0.03]}>
        <planeGeometry args={[3.4, 0.36]} />
        <meshStandardMaterial color="#bae6fd" emissive="#38bdf8" emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[0, 1.1, -0.03]}>
        <planeGeometry args={[3.4, 0.5]} />
        <meshStandardMaterial color="#0ea5e9" emissive="#22d3ee" emissiveIntensity={0.12} />
      </mesh>
      <mesh position={[0, 0.7, -0.03]}>
        <planeGeometry args={[3.4, 0.4]} />
        <meshStandardMaterial color="#0f766e" emissive="#14b8a6" emissiveIntensity={0.08} />
      </mesh>
      <mesh position={[-1.1, 1.15, -0.035]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.6, 0.9, 4]} />
        <meshStandardMaterial color="#1e3a8a" roughness={0.45} metalness={0.05} />
      </mesh>
      <mesh position={[0.2, 1.05, -0.035]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.7, 1.1, 4]} />
        <meshStandardMaterial color="#1d4ed8" roughness={0.45} metalness={0.05} />
      </mesh>
      <mesh position={[1.0, 0.95, -0.035]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.5, 0.7, 4]} />
        <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.07} />
      </mesh>
      <mesh position={[0, 0.38, -0.034]}>
        <planeGeometry args={[3.4, 0.12]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.3} metalness={0.1} />
      </mesh>
    </group>
  );
}

function ProceduralPatient({ position = [0, 0.85, 0], rotation = [0, 0, 0], withBase = true }) {
  return (
    <group position={position} rotation={rotation}>
      {withBase ? (
        <mesh position={[0, -0.9, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[3, 48]} />
          <meshStandardMaterial color="#0b1120" roughness={0.85} metalness={0.08} />
        </mesh>
      ) : null}
      <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[0.16, 1.06, 16, 32]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.45} metalness={0.18} />
      </mesh>
      <mesh castShadow position={[0, 0.05, 0.62]}>
        <sphereGeometry args={[0.22, 32, 32]} />
        <meshStandardMaterial color="#f97316" roughness={0.35} metalness={0.2} />
      </mesh>
      <mesh position={[0.08, -0.1, 0.4]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.6, 16]} />
        <meshStandardMaterial color="#cbd5f5" roughness={0.5} metalness={0.15} />
      </mesh>
      <mesh position={[-0.08, -0.1, 0.4]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.6, 16]} />
        <meshStandardMaterial color="#cbd5f5" roughness={0.5} metalness={0.15} />
      </mesh>
      <mesh position={[0, -0.12, -0.45]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.7, 16]} />
        <meshStandardMaterial color="#cbd5f5" roughness={0.5} metalness={0.15} />
      </mesh>
      <mesh position={[0.12, 0.08, 0.7]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh position={[-0.12, 0.08, 0.7]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh position={[0, -0.25, 0.4]} castShadow>
        <boxGeometry args={[0.48, 0.15, 1.42]} />
        <meshStandardMaterial color="#0ea5e9" roughness={0.6} metalness={0.1} />
      </mesh>
    </group>
  );
}

function ProceduralTraumaRoom() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[14, 12]} />
        <meshStandardMaterial color="#0f172a" roughness={0.9} metalness={0.05} />
      </mesh>
      <mesh position={[0, 2, -6]} receiveShadow>
        <boxGeometry args={[14, 4, 0.4]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} metalness={0.1} />
      </mesh>
      <mesh position={[-7, 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <boxGeometry args={[12, 4, 0.4]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} metalness={0.1} />
      </mesh>
      <mesh position={[7, 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <boxGeometry args={[12, 4, 0.4]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} metalness={0.1} />
      </mesh>

  <TraumaBed position={[0, 0, 0]} />
  <ProceduralPatient position={[0, 0.86, 0]} withBase={false} />
  <MonitorStack position={[1.2, 0, -0.65]} />
  <MonitorStack position={[-1.2, 0, -0.65]} />
  <EquipmentCart position={[2.15, 0, 1.35]} />
  <EquipmentCart position={[-2.15, 0, 1.35]} />
  <CrashCart position={[0, 0, -2.1]} />
      <WallShelves position={[-6.6, 0, -0.4]} rotation={[0, Math.PI / 2, 0]} />
      <WindowPanel position={[6.8, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />
      <CeilingRig position={[0, 2.6, 0]} />
      <CeilingRig position={[0, 2.4, -1.8]} />

      <spotLight
        position={[3.6, 5, 2.5]}
        angle={0.6}
        penumbra={0.45}
        intensity={1.2}
        color="#38bdf8"
        castShadow
        distance={12}
      />
      <spotLight
        position={[-3.6, 5, 2.5]}
        angle={0.6}
        penumbra={0.45}
        intensity={1.0}
        color="#fbbf24"
        castShadow
        distance={12}
      />
    </group>
  );
}

export default function SimulationStage({
  modelPath,
  modelScale = 1,
  cameraPosition = [3.4, 2.6, 4.1],
  autoRotate = true,
  proceduralVariant = "trauma"
}) {
  if (modelPath) {
    useGLTF.preload(modelPath);
  }

  const glRef = useRef(null);
  const [contextLost, setContextLost] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const handleCreated = (state) => {
    glRef.current = state.gl;
    setInitialized(true);
  };

  useEffect(() => {
    if (!initialized) return undefined;

    const canvas = glRef.current?.domElement;
    if (!canvas) return undefined;

    const handleLost = (event) => {
      event.preventDefault();
      setContextLost(true);
    };

    const handleRestored = () => {
      setContextLost(false);
    };

    canvas.addEventListener("webglcontextlost", handleLost, false);
    canvas.addEventListener("webglcontextrestored", handleRestored, false);

    return () => {
      canvas.removeEventListener("webglcontextlost", handleLost, false);
      canvas.removeEventListener("webglcontextrestored", handleRestored, false);
    };
  }, [initialized]);

  const overlayMessage = useMemo(() => {
    if (contextLost) {
      return "El renderizado 3D se detuvo por el navegador. Recarga la pagina o reduce otras pestañas para liberar recursos.";
    }
    if (!initialized) {
      return "Inicializando entorno 3D...";
    }
    if (!modelPath) {
      return proceduralVariant === "trauma"
        ? "Modelo definitivo pendiente"
        : "Modelo definitivo pendiente";
    }
    return null;
  }, [contextLost, initialized, modelPath, proceduralVariant]);

  return (
    <div className="relative h-full w-full">
      <div className="flex items-center justify-center h-full text-white bg-slate-900">
        3D Simulation Temporarily Disabled
      </div>
      {overlayMessage ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 mx-auto w-[min(360px,85%)] rounded-2xl bg-slate-900/70 px-4 py-3 text-center text-sm text-white">
          {overlayMessage}
        </div>
      ) : null}
    </div>
  );
}
