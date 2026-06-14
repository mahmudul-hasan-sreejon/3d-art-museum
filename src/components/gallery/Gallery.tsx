"use client";

import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Environment,
  Lightformer,
  MeshReflectorMaterial,
  PointerLockControls,
  SoftShadows,
  useProgress,
} from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import gsap from "gsap";
import type { Artist, Painting } from "@/lib/types";

/* ----------------------------- layout math ----------------------------- */

const SPACING = 4.6; // metres between paintings along a wall
const ROOM_W = 10;
const ROOM_H = 5.2;
const EYE = 1.65;

interface Hung {
  painting: Painting;
  pos: [number, number, number];
  rotY: number;
  normal: THREE.Vector3;
}

function layoutRoom(paintings: Painting[]) {
  const n = paintings.length;
  const perWall = Math.ceil(Math.max(0, n - 1) / 2);
  const length = Math.max(16, perWall * SPACING + 8);
  const hung: Hung[] = [];
  paintings.forEach((p, i) => {
    if (i === 0) {
      // anchor piece on the far wall
      hung.push({
        painting: p,
        pos: [0, 2.0, -length / 2 + 0.06],
        rotY: 0,
        normal: new THREE.Vector3(0, 0, 1),
      });
      return;
    }
    const k = i - 1;
    const side = k % 2 === 0 ? -1 : 1; // left, right alternating
    const slot = Math.floor(k / 2);
    const z = -length / 2 + 5 + slot * SPACING;
    hung.push({
      painting: p,
      pos: [side * (ROOM_W / 2 - 0.06), 2.0, z],
      rotY: side === -1 ? Math.PI / 2 : -Math.PI / 2,
      normal: new THREE.Vector3(-side, 0, 0),
    });
  });
  return { hung, length };
}

/* ------------------------------- gallery ------------------------------- */

export default function Gallery({
  artist,
  paintings,
  onExit,
  lite = false,
  still = false,
}: {
  artist: Artist;
  paintings: Painting[];
  onExit: () => void;
  lite?: boolean;
  still?: boolean;
}) {
  const { hung, length } = useMemo(() => layoutRoom(paintings), [paintings]);
  const [inspectIdx, setInspectIdx] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const controlsRef = useRef<any>(null);
  const savedPose = useRef<{ pos: THREE.Vector3; quat: THREE.Quaternion } | null>(null);

  const inspecting = inspectIdx !== null;
  const target = inspecting ? hung[inspectIdx] : null;

  const closeInspect = useCallback(() => setInspectIdx(null), []);
  const requestLock = useCallback(() => {
    // call lock() directly inside the user gesture — reliable across browsers,
    // unlike drei's selector lookup which can miss the late-mounted overlay
    controlsRef.current?.lock();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && inspecting) closeInspect();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inspecting, closeInspect]);

  return (
    <div className="fixed inset-0 bg-black">
      <Canvas
        shadows={!lite}
        dpr={lite ? [0.8, 1] : [1, 1.5]}
        camera={{ position: [0, EYE, length / 2 - 3], fov: 62, near: 0.1, far: 120 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05, preserveDrawingBuffer: still }}
      >
        <color attach="background" args={["#070605"]} />
        <fog attach="fog" args={["#0a0806", 26, 85]} />
        {!lite && <SoftShadows size={14} samples={6} focus={0.7} />}

        <Suspense fallback={null}>
          <Room length={length} lite={lite} />
          {hung.map((h, i) => (
            <PaintingOnWall
              key={h.painting.id}
              hung={h}
              index={i}
              shadowLight={!lite && i % 6 === 0 && i < 18}
              dimOthers={inspecting && inspectIdx !== i}
            />
          ))}
          {/* benches */}
          {Array.from({ length: Math.max(1, Math.floor(length / 14)) }).map((_, i) => (
            <Bench key={i} z={-length / 2 + 8 + i * 14} />
          ))}
          {/* environment for PBR glints — procedural, no network */}
          <Environment resolution={64} frames={1}>
            <Lightformer intensity={2.2} position={[0, 4, 0]} scale={[10, 1, 10]} rotation-x={Math.PI / 2} color="#fff2d4" />
            <Lightformer intensity={0.6} position={[-6, 2, 0]} scale={[6, 3, 1]} rotation-y={Math.PI / 2} color="#e8d8b0" />
            <Lightformer intensity={0.6} position={[6, 2, 0]} scale={[6, 3, 1]} rotation-y={-Math.PI / 2} color="#e8d8b0" />
          </Environment>
        </Suspense>

        <hemisphereLight args={["#6b5d45", "#1c1610", 0.95]} />
        <ambientLight intensity={0.22} color="#5a4c38" />

        <Player
          length={length}
          locked={locked || still}
          inspecting={inspecting}
          onPick={(i) => {
            savedPose.current = null;
            setInspectIdx(i);
          }}
        />
        <InspectCamera target={target} savedPose={savedPose} active={inspecting} />

        <PointerLockControls
          ref={controlsRef}
          enabled={!inspecting}
          onLock={() => setLocked(true)}
          onUnlock={() => setLocked(false)}
          selector="#lock-trigger"
        />

        {!lite && (
          <EffectComposer multisampling={2}>
            <Bloom intensity={0.32} luminanceThreshold={0.82} luminanceSmoothing={0.2} mipmapBlur />
            <Vignette eskil={false} offset={0.18} darkness={0.78} />
          </EffectComposer>
        )}
      </Canvas>

      <Overlays
        artist={artist}
        locked={locked}
        inspecting={inspecting}
        target={target}
        onClose={closeInspect}
        onExit={onExit}
        onEnter={requestLock}
      />
    </div>
  );
}

/* -------------------------------- room -------------------------------- */

function Room({ length, lite }: { length: number; lite?: boolean }) {
  const wall = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#42362a",
        roughness: 0.92,
        metalness: 0.02,
      }),
    []
  );
  const dark = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#0e0b08", roughness: 0.6, metalness: 0.1 }),
    []
  );
  const gilt = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#a8842c",
        roughness: 0.35,
        metalness: 0.85,
        envMapIntensity: 1.1,
      }),
    []
  );

  return (
    <group>
      {/* reflective floor */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[ROOM_W, length]} />
        <MeshReflectorMaterial
          blur={[140, 50]}
          resolution={lite ? 256 : 512}
          mixBlur={0.7}
          mixStrength={9}
          roughness={0.65}
          depthScale={1.1}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.3}
          color="#221910"
          metalness={0.35}
          mirror={0.5}
        />
      </mesh>

      {/* ceiling */}
      <mesh position={[0, ROOM_H, 0]} rotation-x={Math.PI / 2} material={dark}>
        <planeGeometry args={[ROOM_W, length]} />
      </mesh>
      {/* ceiling light cove strip */}
      <mesh position={[0, ROOM_H - 0.02, 0]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[1.3, length - 2]} />
        <meshStandardMaterial color="#fff0cf" emissive="#ffe7b0" emissiveIntensity={2.3} />
      </mesh>

      {/* side walls */}
      <mesh position={[-ROOM_W / 2, ROOM_H / 2, 0]} rotation-y={Math.PI / 2} material={wall} receiveShadow>
        <planeGeometry args={[length, ROOM_H]} />
      </mesh>
      <mesh position={[ROOM_W / 2, ROOM_H / 2, 0]} rotation-y={-Math.PI / 2} material={wall} receiveShadow>
        <planeGeometry args={[length, ROOM_H]} />
      </mesh>
      {/* end walls */}
      <mesh position={[0, ROOM_H / 2, -length / 2]} material={wall} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_H]} />
      </mesh>
      <mesh position={[0, ROOM_H / 2, length / 2]} rotation-y={Math.PI} material={wall} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_H]} />
      </mesh>

      {/* baseboards */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (ROOM_W / 2 - 0.05), 0.14, 0]} material={dark} castShadow>
          <boxGeometry args={[0.1, 0.28, length]} />
        </mesh>
      ))}
      <mesh position={[0, 0.14, -length / 2 + 0.05]} material={dark}>
        <boxGeometry args={[ROOM_W, 0.28, 0.1]} />
      </mesh>
      {/* gilt crown lines */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (ROOM_W / 2 - 0.04), ROOM_H - 0.5, 0]} material={gilt}>
          <boxGeometry args={[0.04, 0.05, length]} />
        </mesh>
      ))}
    </group>
  );
}

function Bench({ z }: { z: number }) {
  return (
    <group position={[0, 0, z]}>
      <mesh position={[0, 0.46, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.4, 0.13, 0.62]} />
        <meshStandardMaterial color="#4a3525" roughness={0.5} metalness={0.05} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.95, 0.2, 0]} castShadow>
          <boxGeometry args={[0.16, 0.4, 0.5]} />
          <meshStandardMaterial color="#171210" roughness={0.45} metalness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------ paintings ------------------------------ */

function PaintingOnWall({
  hung,
  index,
  shadowLight,
  dimOthers,
}: {
  hung: Hung;
  index: number;
  shadowLight: boolean;
  dimOthers: boolean;
}) {
  const { painting, pos, rotY } = hung;
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const [aspect, setAspect] = useState(1.3);
  const groupRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.SpotLight>(null);
  const targetRef = useRef<THREE.Object3D>(null);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    let alive = true;
    loader.load(
      painting.thumbUrl,
      (t) => {
        if (!alive) return;
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
        const img = t.image as HTMLImageElement;
        if (img?.width) setAspect(img.width / img.height);
        setTex(t);
      },
      undefined,
      () => {}
    );
    return () => {
      alive = false;
    };
  }, [painting.thumbUrl]);

  // canvas dimensions from aspect, clamped to wall space
  const { w, h } = useMemo(() => {
    let h = 1.75;
    let w = h * aspect;
    if (w > 2.9) {
      w = 2.9;
      h = w / aspect;
    }
    if (h > 2.3) {
      h = 2.3;
      w = h * aspect;
    }
    return { w, h };
  }, [aspect]);

  useEffect(() => {
    if (lightRef.current && targetRef.current) {
      lightRef.current.target = targetRef.current;
    }
  }, [tex]);

  const fw = 0.12; // frame width
  const fd = 0.09; // frame depth

  return (
    <group ref={groupRef} position={pos} rotation-y={rotY}>
      {/* frame: 4 gilt bars */}
      {(
        [
          [0, h / 2 + fw / 2, 0, w + fw * 2, fw],
          [0, -h / 2 - fw / 2, 0, w + fw * 2, fw],
          [-w / 2 - fw / 2, 0, 0, fw, h],
          [w / 2 + fw / 2, 0, 0, fw, h],
        ] as const
      ).map(([x, y, _z, bw, bh], i) => (
        <mesh key={i} position={[x, y, fd / 2]} castShadow>
          <boxGeometry args={[bw, bh, fd]} />
          <meshPhysicalMaterial
            color="#9c7a22"
            metalness={0.92}
            roughness={0.3}
            clearcoat={0.6}
            clearcoatRoughness={0.25}
            envMapIntensity={1.3}
          />
        </mesh>
      ))}
      {/* inner liner */}
      <mesh position={[0, 0, 0.015]}>
        <planeGeometry args={[w + 0.04, h + 0.04]} />
        <meshStandardMaterial color="#13100b" roughness={0.8} />
      </mesh>
      {/* canvas */}
      <mesh
        position={[0, 0, 0.03]}
        userData={{ paintingIndex: index }}
        name={`painting-${index}`}
      >
        <planeGeometry args={[w, h]} />
        {tex ? (
          <meshStandardMaterial
            map={tex}
            roughness={0.62}
            metalness={0}
            color={dimOthers ? "#777777" : "#ffffff"}
          />
        ) : (
          <meshStandardMaterial color="#241e15" roughness={0.9} />
        )}
      </mesh>
      {/* subtle glass glare */}
      <mesh position={[0, 0, 0.045]}>
        <planeGeometry args={[w, h]} />
        <meshPhysicalMaterial
          transparent
          opacity={0.06}
          roughness={0.05}
          metalness={1}
          envMapIntensity={0.8}
          depthWrite={false}
        />
      </mesh>
      {/* wall label */}
      <mesh position={[w / 2 + 0.45, -h / 2 + 0.18, 0.012]}>
        <planeGeometry args={[0.42, 0.16]} />
        <meshStandardMaterial color="#ded4bc" roughness={0.85} />
      </mesh>

      {/* picture light */}
      <object3D ref={targetRef} position={[0, 0, 0]} />
      <spotLight
        ref={lightRef}
        position={[0, ROOM_H - pos[1] - 0.4, 2.1]}
        angle={0.62}
        penumbra={0.75}
        decay={1.4}
        distance={13}
        intensity={dimOthers ? 11 : 46}
        color="#ffe9c4"
        castShadow={shadowLight}
        shadow-mapSize={[512, 512]}
        shadow-bias={-0.0004}
      />
    </group>
  );
}

/* ------------------------------- player ------------------------------- */

function Player({
  length,
  locked,
  inspecting,
  onPick,
}: {
  length: number;
  locked: boolean;
  inspecting: boolean;
  onPick: (i: number) => void;
}) {
  const { camera, scene } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const vel = useRef(new THREE.Vector3());
  const ray = useMemo(() => new THREE.Raycaster(), []);

  useEffect(() => {
    const dn = (e: KeyboardEvent) => (keys.current[e.code] = true);
    const up = (e: KeyboardEvent) => (keys.current[e.code] = false);
    window.addEventListener("keydown", dn);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", dn);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // click while locked = raycast from view centre
  useEffect(() => {
    const onClick = () => {
      if (!locked || inspecting) return;
      ray.setFromCamera(new THREE.Vector2(0, 0), camera);
      const meshes: THREE.Object3D[] = [];
      scene.traverse((o) => {
        if (o.userData?.paintingIndex !== undefined) meshes.push(o);
      });
      const hits = ray.intersectObjects(meshes, false);
      if (hits.length && hits[0].distance < 9) {
        onPick(hits[0].object.userData.paintingIndex);
      }
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [locked, inspecting, camera, scene, ray, onPick]);

  useFrame((_, dt) => {
    if (!locked || inspecting) return;
    const speed = 4.4;
    const k = (c: string) => (keys.current[c] ? 1 : 0);
    const fwd = (k("KeyW") || k("ArrowUp")) - (k("KeyS") || k("ArrowDown"));
    const strafe = (k("KeyD") || k("ArrowRight")) - (k("KeyA") || k("ArrowLeft"));
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    dir.y = 0;
    dir.normalize();
    const side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0));
    vel.current
      .set(0, 0, 0)
      .addScaledVector(dir, fwd)
      .addScaledVector(side, strafe);
    if (vel.current.lengthSq() > 0) {
      vel.current.normalize().multiplyScalar(speed * dt);
      camera.position.add(vel.current);
    }
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -ROOM_W / 2 + 0.7, ROOM_W / 2 - 0.7);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -length / 2 + 0.9, length / 2 - 0.9);
    camera.position.y = EYE;
  });

  return null;
}

/* --------------------------- inspect camera --------------------------- */

function InspectCamera({
  target,
  savedPose,
  active,
}: {
  target: Hung | null;
  savedPose: React.MutableRefObject<{ pos: THREE.Vector3; quat: THREE.Quaternion } | null>;
  active: boolean;
}) {
  const { camera } = useThree();
  const anim = useRef<gsap.core.Tween | null>(null);
  const lookAt = useRef(new THREE.Vector3());
  const wasActive = useRef(false);
  const zoomDist = useRef(0);

  useEffect(() => {
    if (active && target) {
      if (!savedPose.current) {
        savedPose.current = {
          pos: camera.position.clone(),
          quat: camera.quaternion.clone(),
        };
      }
      const p = new THREE.Vector3(...target.pos);
      const dist = 2.6;
      zoomDist.current = dist;
      const dest = p.clone().addScaledVector(target.normal, dist);
      dest.y = target.pos[1];
      lookAt.current.copy(p);
      anim.current?.kill();
      anim.current = gsap.to(camera.position, {
        x: dest.x,
        y: dest.y,
        z: dest.z,
        duration: 1.25,
        ease: "power3.inOut",
      });
      wasActive.current = true;
    } else if (wasActive.current && savedPose.current) {
      anim.current?.kill();
      const sp = savedPose.current;
      anim.current = gsap.to(camera.position, {
        x: sp.pos.x,
        y: sp.pos.y,
        z: sp.pos.z,
        duration: 1.0,
        ease: "power3.inOut",
      });
      wasActive.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, target]);

  // wheel-to-zoom while inspecting
  useEffect(() => {
    if (!active || !target) return;
    const onWheel = (e: WheelEvent) => {
      zoomDist.current = THREE.MathUtils.clamp(
        zoomDist.current + e.deltaY * 0.0024,
        0.85,
        4.2
      );
      const p = new THREE.Vector3(...target.pos);
      const dest = p.clone().addScaledVector(target.normal, zoomDist.current);
      dest.y = target.pos[1];
      gsap.to(camera.position, { x: dest.x, y: dest.y, z: dest.z, duration: 0.4, ease: "power2.out" });
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => window.removeEventListener("wheel", onWheel);
  }, [active, target, camera]);

  useFrame(() => {
    if (active && target) camera.lookAt(lookAt.current);
  });

  return null;
}

/* ------------------------------- overlays ------------------------------- */

function Overlays({
  artist,
  locked,
  inspecting,
  target,
  onClose,
  onExit,
  onEnter,
}: {
  artist: Artist;
  locked: boolean;
  inspecting: boolean;
  target: Hung | null;
  onClose: () => void;
  onExit: () => void;
  onEnter: () => void;
}) {
  const { progress, active } = useProgress();
  const loading = active && progress < 100;

  return (
    <>
      {/* load veil */}
      <div
        className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center bg-black transition-opacity duration-1000"
        style={{ opacity: loading ? 1 : 0 }}
      >
        <p className="font-display text-[14px] tracking-[0.4em] text-[#9d937d]">
          LIGHTING THE GALLERY…
        </p>
      </div>

      {/* top chrome */}
      <div className="fixed inset-x-0 top-0 z-20 flex items-start justify-between p-5">
        <button
          onClick={onExit}
          className="font-utility px-4 py-2 text-[10.5px] tracking-[0.26em] text-[#d9d0b8] transition-colors hover:text-[--gilt-bright]"
          style={{ border: "1px solid rgba(201,162,39,0.5)", background: "rgba(10,9,7,0.6)", backdropFilter: "blur(6px)" }}
        >
          ← TIMELINE
        </button>
        <div className="px-5 py-2 text-right" style={{ background: "rgba(10,9,7,0.55)", backdropFilter: "blur(6px)", border: "1px solid rgba(201,162,39,0.35)" }}>
          <p className="font-display text-[16px] tracking-[0.12em] text-[#ece5d3]">{artist.name}</p>
          <p className="font-utility text-[9px] tracking-[0.3em] text-[#9d937d]">
            {artist.movement.toUpperCase()} · {artist.born}–{artist.died ?? "PRESENT"}
          </p>
        </div>
      </div>

      {/* click to enter / controls hint */}
      {!locked && !inspecting && !loading && (
        <div id="lock-trigger" onClick={onEnter} className="fixed inset-0 z-10 flex cursor-pointer items-end justify-center pb-20">
          <div className="px-7 py-4 text-center"
            style={{ background: "rgba(10,9,7,0.72)", border: "1px solid rgba(201,162,39,0.55)", backdropFilter: "blur(8px)" }}>
            <p className="font-display text-[15px] tracking-[0.22em] text-[#ece5d3]">CLICK TO ENTER</p>
            <p className="font-utility mt-1.5 text-[9.5px] tracking-[0.26em] text-[#9d937d]">
              WASD / ARROWS — WALK · MOUSE — LOOK · CLICK A PAINTING — INSPECT · ESC — RELEASE
            </p>
          </div>
        </div>
      )}

      {/* crosshair */}
      {locked && !inspecting && (
        <div className="pointer-events-none fixed left-1/2 top-1/2 z-10 h-[5px] w-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: "#e8c95a", boxShadow: "0 0 8px 2px rgba(232,201,90,0.6)" }} />
      )}

      {/* inspect placard */}
      {inspecting && target && (
        <InspectPanel painting={target.painting} onClose={onClose} />
      )}
    </>
  );
}

function InspectPanel({ painting, onClose }: { painting: Painting; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) {
      gsap.fromTo(
        ref.current,
        { x: 60, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.8, delay: 0.45, ease: "power3.out" }
      );
    }
  }, [painting.id]);

  return (
    <div className="pointer-events-none fixed inset-0 z-20">
      <div
        ref={ref}
        className="pointer-events-auto absolute right-6 top-1/2 max-h-[82vh] w-[400px] max-w-[90vw] -translate-y-1/2 overflow-y-auto"
        style={{
          background: "linear-gradient(165deg, #f0e9d8, #e6dcc4)",
          border: "1px solid rgba(201,162,39,0.7)",
          boxShadow: "0 40px 90px rgba(0,0,0,0.7)",
          borderRadius: 3,
        }}
      >
        <div className="p-7">
          <button
            onClick={onClose}
            className="font-utility float-right text-[10px] tracking-[0.18em] text-[#6c6353] hover:text-[#6e1f1f]"
          >
            CLOSE ✕
          </button>
          <p className="font-utility text-[10px] tracking-[0.32em] text-[#8a6d1c]">
            {painting.yearText || "UNDATED"}
          </p>
          <h3 className="font-display mt-1.5 text-[24px] leading-tight text-[#221f1a]">
            {painting.title}
          </h3>
          <div className="my-4 h-px w-20" style={{ background: "linear-gradient(90deg,#c9a227,transparent)" }} />
          <p className="font-body text-[15px] leading-[1.6] text-[#3a352c]">{painting.story}</p>

          {painting.facts?.length > 0 && (
            <>
              <p className="font-utility mt-5 text-[9.5px] tracking-[0.3em] text-[#8a6d1c]">
                FROM THE ARCHIVE
              </p>
              <ul className="mt-2 space-y-2.5">
                {painting.facts.map((f, i) => (
                  <li key={i} className="font-body flex gap-2.5 text-[14px] leading-[1.5] text-[#4d473c]">
                    <span className="mt-[7px] h-[5px] w-[5px] shrink-0 rotate-45 bg-[#c9a227]" />
                    {f}
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="mt-6 flex items-center justify-between border-t border-[rgba(42,39,34,0.15)] pt-4">
            <a
              href={painting.wikiUrl}
              target="_blank"
              rel="noreferrer"
              className="font-utility text-[9.5px] tracking-[0.22em] text-[#6c6353] underline-offset-4 hover:text-[#8a6d1c] hover:underline"
            >
              SOURCE: WIKIPEDIA ↗
            </a>
            <p className="font-utility text-[9.5px] tracking-[0.22em] text-[#9d937d]">
              SCROLL TO ZOOM · ESC TO STEP BACK
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
