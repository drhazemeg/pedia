/**
 * Physics-driven hanging badge — pediatric clinic edition.
 *
 * The physics core (rope joints, tapered tube, UV patching, WebGL context
 * recovery) is deliberately unchanged. This file layers a content model on
 * top so the badge can be rendered for any staff member without forking.
 *
 * Two required fixes, kept from the original:
 * 1. `colliders: false` on every RigidBody, or Rapier's auto-collider fights our manual ones.
 * 2. No `enabledRotations` — counter-rotate angular velocity instead.
 */

import { useIsMobile } from "@pedia/ui/hooks/use-mobile";
import { cn } from "@pedia/ui/lib/utils";
import {
  Environment,
  Html,
  Lightformer,
  useGLTF,
  useTexture,
} from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { Canvas, useFrame } from "@react-three/fiber";
import type { RapierRigidBody, RigidBodyProps } from "@react-three/rapier";
import {
  BallCollider,
  CuboidCollider,
  Physics,
  RigidBody,
  useRopeJoint,
  useSphericalJoint,
} from "@react-three/rapier";
import type { RefObject } from "react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { useTheme } from "./theme-provider";

// ─── Content model ─────────────────────────────────────────────────────────

export type BadgeContent = {
  /** Full display name printed on the badge. */
  name: string;
  /** Primary role line, e.g. "Board Certified Pediatrician". */
  title: string;
  /** Secondary credential line, e.g. "IBCLC · 15+ Years". */
  credential: string;
  /** Clinic or organization name printed at the top. */
  clinic: string;
  /** Optional URL or data URI of the staff photo. Falls back to initials. */
  photoUrl?: string;
  /** Two-letter initials used when `photoUrl` is absent. */
  initials: string;
  /** Optional URL or data URI of a QR code (badge scan-to-verify). */
  qrUrl?: string;
};

/**
 * Default badge for the founder. Override by passing `content` to `<IdCard />`.
 */
export const DEFAULT_BADGE_CONTENT: BadgeContent = {
  name: "Dr. Hazem Ali",
  title: "Board Certified Pediatrician",
  credential: "IBCLC · 15+ Years Clinical Experience",
  clinic: "Smart Clinic · Pediatrics",
  initials: "HA",
  // photoUrl: "/images/dr-hazem.jpg",
  // qrUrl: "/images/dr-hazem-qr.png",
};

// ─── Constants ─────────────────────────────────────────────────────────────

const CARD_MODEL_URL =
  "https://cdn.jsdelivr.net/gh/pmndrs/drei-assets@master/hdri/empty_warehouse.png";

// Rope tube radius (a real cylinder, not a flat ribbon).
const ROPE_RADIUS = 0.1;
// Rope cross-section smoothness.
const ROPE_RADIAL_SEGMENTS = 24;
// Fraction of rope length that tapers to a point instead of a flat cut.
const ROPE_TAPER_FRACTION = 0.06;
// Card-local y where the rope ties on, shared with the per-frame curve endpoint below.
const CARD_ROPE_ANCHOR_Y = 1.1;
// Extends the rendered rope past the joint's physical slack to close the visual gap.
const ROPE_TOP_EXTENSION = -0.5;

const PIN_IMAGE_URL =
  "https://cdn.shadcnstudio.com/ss-assets/template/landing-page/zolt/pin.png";
const PIN_IMAGE_ASPECT = 1024 / 1536;
const PIN_IMAGE_BOTTOM_PAD_FRACTION = (1536 - 1432) / 1536;
const CARD_TOP_EDGE_Y = 0.93;
const PIN_PLANE_HEIGHT = 1.4;
const PIN_PLANE_WIDTH = PIN_PLANE_HEIGHT * PIN_IMAGE_ASPECT;
const PIN_PLANE_Y =
  CARD_TOP_EDGE_Y + PIN_PLANE_HEIGHT * -PIN_IMAGE_BOTTOM_PAD_FRACTION;
const PIN_PLANE_X = 0;
const PIN_PLANE_Z = ROPE_RADIUS + 0.06;

const HOLE_PATCH_LOCAL_X = 0;
const HOLE_PATCH_LOCAL_Y = 0.942;
const HOLE_PATCH_LOCAL_SIZE = 0.055;
const HOLE_PATCH_UV_OFFSET = [0.2308, 0.0443] as const;
const HOLE_PATCH_UV_REPEAT = [0.0375, 0.0405] as const;

// Front/back face UVs on the badge's texture atlas.
const FRONT_UV_RECT = { x: 0, y: 0, w: 0.5, h: 0.755 };
const BACK_UV_RECT = { x: 0.5, y: 0, w: 0.5, h: 0.755 };

// Accent stripe height as a fraction of face height.
const ACCENT_STRIPE_HEIGHT_RATIO = 0.03;

type CardGltf = {
  nodes: { card: THREE.Mesh };
  materials: { base: THREE.MeshStandardMaterial };
};

type LanyardRigidBody = RapierRigidBody & { lerped?: THREE.Vector3 };

const getLerped = (body: LanyardRigidBody) => {
  if (!body.lerped) {
    body.lerped = new THREE.Vector3().copy(body.translation());
  }
  return body.lerped;
};

// ─── Tapered rope tube ─────────────────────────────────────────────────────

const buildTaperedTubeGeometry = (
  curve: THREE.CatmullRomCurve3,
  tubularSegments: number,
  radius: number,
  radialSegments: number,
  taperFraction: number
) => {
  const frames = curve.computeFrenetFrames(tubularSegments, false);
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const vertex = new THREE.Vector3();
  const normal = new THREE.Vector3();

  for (let i = 0; i <= tubularSegments; i += 1) {
    const t = i / tubularSegments;
    const point = curve.getPointAt(t);

    const ringRadius =
      t < taperFraction ? radius * (t / taperFraction) : radius;

    for (let j = 0; j <= radialSegments; j++) {
      const angle = (j / radialSegments) * Math.PI * 2;
      const sin = Math.sin(angle);
      const cos = -Math.cos(angle);
      const N = frames.normals[i];
      const B = frames.binormals[i];
      if (!(N && B)) continue;
      normal.x = cos * N.x + sin * B.x;
      normal.y = cos * N.y + sin * B.y;
      normal.z = cos * N.z + sin * B.z;
      normal.normalize();
      normals.push(normal.x, normal.y, normal.z);

      vertex.x = point.x + ringRadius * normal.x;
      vertex.y = point.y + ringRadius * normal.y;
      vertex.z = point.z + ringRadius * normal.z;
      positions.push(vertex.x, vertex.y, vertex.z);

      uvs.push(t, j / radialSegments);
    }
  }

  for (let j = 1; j <= tubularSegments; j += 1) {
    for (let i = 1; i <= radialSegments; i += 1) {
      const a = (radialSegments + 1) * (j - 1) + (i - 1);
      const b = (radialSegments + 1) * j + (i - 1);
      const c = (radialSegments + 1) * j + i;
      const d = (radialSegments + 1) * (j - 1) + i;

      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  return geometry;
};

// ─── Canvas painting (pure) ────────────────────────────────────────────────
//
// Pure function that draws the front and back faces onto a 2D canvas.
//
// Extracted from the memo so it can be unit-tested, memoized on content alone,
// and reused by a future "preview your badge" admin screen.

type PaintOptions = {
  accentColor: string;
  content: BadgeContent;
  frontImage: HTMLImageElement;
};

function paintCardCanvas(
  canvas: HTMLCanvasElement,
  baseImage: HTMLImageElement,
  { accentColor, content, frontImage }: PaintOptions
): void {
  const { width, height } = canvas;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.drawImage(baseImage, 0, 0, width, height);

  for (const uvRect of [FRONT_UV_RECT, BACK_UV_RECT]) {
    const rx = uvRect.x * width;
    const ry = uvRect.y * height;
    const rw = uvRect.w * width;
    const rh = uvRect.h * height;

    // ── Background photo: cover-fit, then draw the credential text on top.
    const scale = Math.max(rw / frontImage.width, rh / frontImage.height);
    const dw = frontImage.width * scale;
    const dh = frontImage.height * scale;
    const dx = rx + (rw - dw) / 2;
    const dy = ry + (rh - dh) / 2;

    ctx.save();
    ctx.beginPath();
    ctx.rect(rx, ry, rw, rh);
    ctx.clip();
    ctx.drawImage(frontImage, dx, dy, dw, dh);

    // ── Bottom-to-top dark scrim so the name reads on any photo.
    const scrim = ctx.createLinearGradient(0, ry + rh, 0, ry + rh * 0.4);
    scrim.addColorStop(0, "rgba(0, 0, 0, 0.78)");
    scrim.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = scrim;
    ctx.fillRect(rx, ry, rw, rh);

    // ── Clinic name — small, top-left, letter-spaced.
    ctx.font = `${Math.round(rw * 0.055)}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillText(content.clinic.toUpperCase(), rx + rw * 0.08, ry + rh * 0.06);

    // ── Name — large, bold, bottom-left.
    ctx.font = `700 ${Math.round(rw * 0.105)}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(content.name, rx + rw * 0.08, ry + rh * 0.82);

    // ── Title — medium, muted white.
    ctx.font = `500 ${Math.round(rw * 0.062)}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.86)";
    ctx.fillText(content.title, rx + rw * 0.08, ry + rh * 0.88);

    // ── Credential — small, dimmer.
    ctx.font = `400 ${Math.round(rw * 0.048)}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.62)";
    ctx.fillText(content.credential, rx + rw * 0.08, ry + rh * 0.925);

    // ── Accent stripe — top edge, in the resolved primary color.
    ctx.fillStyle = accentColor;
    ctx.fillRect(rx, ry, rw, rh * ACCENT_STRIPE_HEIGHT_RATIO);
    ctx.restore();
  }
}

// ─── Band (physics + rendering) ────────────────────────────────────────────

type BandProps = {
  accentColor: string;
  content: BadgeContent;
  frontImage: string;
  isMobile: boolean;
};

function Band({ frontImage, isMobile, accentColor, content }: BandProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const rope = useRef<THREE.Mesh>(null);
  const fixed = useRef<RapierRigidBody>(null);
  const j1 = useRef<LanyardRigidBody>(null);
  const j2 = useRef<LanyardRigidBody>(null);
  const j3 = useRef<RapierRigidBody>(null);
  const card = useRef<RapierRigidBody>(null);

  const vec = new THREE.Vector3();
  const ang = new THREE.Vector3();
  const rot = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const cardQuat = new THREE.Quaternion();

  const segmentProps: RigidBodyProps = {
    type: "dynamic",
    canSleep: true,
    // Fix 1 — see file header.
    colliders: false,
    angularDamping: 1.5,
    linearDamping: 1.5,
  };

  const rawGltf = useGLTF(CARD_MODEL_URL) as unknown as Partial<CardGltf>;
  const cardGeometry = rawGltf.nodes?.card?.geometry;
  const baseMap = rawGltf.materials?.base?.map;

  const frontTexture = useTexture(frontImage);
  const pinTexture = useTexture(PIN_IMAGE_URL);

  // ── Composite badge texture ─────────────────────────────────────────────
  const cardMap = useMemo(() => {
    if (!baseMap) return new THREE.Texture();

    const baseImage = baseMap.image as HTMLImageElement;
    const canvas = document.createElement("canvas");
    canvas.width = baseImage.width;
    canvas.height = baseImage.height;

    paintCardCanvas(canvas, baseImage, {
      accentColor,
      content,
      frontImage: frontTexture.image as HTMLImageElement,
    });

    const composite = new THREE.CanvasTexture(canvas);
    composite.colorSpace = THREE.SRGBColorSpace;
    composite.flipY = baseMap.flipY;
    composite.anisotropy = 16;
    composite.needsUpdate = true;
    return composite;
  }, [frontTexture, baseMap, accentColor, content]);

  // ── Dispose the previous composite on swap (prevents VRAM leak on theme
  //     toggles — see Bug 2 in the file header).
  useEffect(
    () => () => {
      cardMap.dispose();
    },
    [cardMap]
  );

  // ── Hole patch (samples the composite; dispose alongside it) ───────────
  const holePatchTexture = useMemo(() => {
    const texture = cardMap.clone();
    texture.offset.set(...HOLE_PATCH_UV_OFFSET);
    texture.repeat.set(...HOLE_PATCH_UV_REPEAT);
    texture.needsUpdate = true;
    return texture;
  }, [cardMap]);

  useEffect(
    () => () => {
      holePatchTexture.dispose();
    },
    [holePatchTexture]
  );

  // ── Rope curve + joints ─────────────────────────────────────────────────
  const curveRef = useRef<THREE.CatmullRomCurve3>(
    (() => {
      const ropeCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
      ]);
      ropeCurve.curveType = "chordal";
      return ropeCurve;
    })()
  );
  const [draggedState, setDraggedState] = useState<THREE.Vector3 | false>(
    false
  );

  useRopeJoint(
    fixed as RefObject<RapierRigidBody>,
    j1 as RefObject<RapierRigidBody>,
    [[0, 0, 0], [0, 0, 0], 0.85]
  );
  useRopeJoint(
    j1 as RefObject<RapierRigidBody>,
    j2 as RefObject<RapierRigidBody>,
    [[0, 0, 0], [0, 0, 0], 0.85]
  );
  useRopeJoint(
    j2 as RefObject<RapierRigidBody>,
    j3 as RefObject<RapierRigidBody>,
    [[0, 0, 0], [0, 0, 0], 0.85]
  );
  useSphericalJoint(
    j3 as RefObject<RapierRigidBody>,
    card as RefObject<RapierRigidBody>,
    [
      [0, 0, 0],
      [0, CARD_ROPE_ANCHOR_Y, 0],
    ]
  );

  useFrame((state, delta) => {
    if (draggedState) {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera);
      dir.copy(vec).sub(state.camera.position).normalize();
      vec.add(dir.multiplyScalar(state.camera.position.length()));

      for (const ref of [card, j1, j2, j3, fixed]) {
        ref.current?.wakeUp();
      }

      if (card.current) {
        card.current.setNextKinematicTranslation({
          x: vec.x - draggedState.x,
          y: vec.y - draggedState.y,
          z: vec.z - draggedState.z,
        });
      }
    }

    if (fixed.current) {
      for (const ref of [j1, j2]) {
        const currentRef = ref.current;
        if (currentRef) {
          const lerped = getLerped(currentRef);
          const clampedDistance = Math.max(
            0.1,
            Math.min(1, lerped.distanceTo(currentRef.translation()))
          );
          lerped.lerp(currentRef.translation(), delta * 50 * clampedDistance);
        }
      }

      const cardCurrent = card.current;
      const ropeCurrent = rope.current;
      const fixedCurrent = fixed.current;

      if (cardCurrent && ropeCurrent && fixedCurrent) {
        const cardPos = cardCurrent.translation();
        const cardRot = cardCurrent.rotation();

        cardQuat.set(cardRot.x, cardRot.y, cardRot.z, cardRot.w);
        const curve = curveRef.current;
        const point0 = curve.points[0];
        if (point0) {
          point0
            .set(0, CARD_ROPE_ANCHOR_Y + ROPE_TOP_EXTENSION, 0)
            .applyQuaternion(cardQuat)
            .add(vec.set(cardPos.x, cardPos.y, cardPos.z));
        }

        const j2Current = j2.current;
        const j1Current = j1.current;
        const point1 = curve.points[1];
        const point2 = curve.points[2];
        const point3 = curve.points[3];
        if (j2Current && point1) point1.copy(getLerped(j2Current));
        if (j1Current && point2) point2.copy(getLerped(j1Current));
        if (point3) point3.copy(fixedCurrent.translation());

        const oldRopeGeometry = ropeCurrent.geometry;
        ropeCurrent.geometry = buildTaperedTubeGeometry(
          curve,
          isMobile ? 16 : 32,
          ROPE_RADIUS,
          ROPE_RADIAL_SEGMENTS,
          ROPE_TAPER_FRACTION
        );
        oldRopeGeometry.dispose();

        // Fix 2 — see file header.
        ang.copy(cardCurrent.angvel());
        rot.copy(cardCurrent.rotation());
        cardCurrent.setAngvel(
          { x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z },
          true
        );
      }
    }
  });

  return (
    <>
      <group position={[0, 4, 0]}>
        <RigidBody ref={fixed} {...segmentProps} type="fixed" />
        <RigidBody position={[0.425, 0, 0]} ref={j1} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[0.85, 0, 0]} ref={j2} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1.275, 0, 0]} ref={j3} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody
          position={[1.7, 0, 0]}
          ref={card}
          {...segmentProps}
          type={draggedState ? "kinematicPosition" : "dynamic"}
        >
          <CuboidCollider args={[1.42, 2.0, 0.018]} />
          <group
            onPointerDown={(e: ThreeEvent<PointerEvent>) => {
              (e.target as Element).setPointerCapture(e.pointerId);
              if (card.current) {
                setDraggedState(
                  new THREE.Vector3()
                    .copy(e.point)
                    .sub(vec.copy(card.current.translation()))
                );
              }
              document.body.style.userSelect = "none";
            }}
            onPointerUp={(e: ThreeEvent<PointerEvent>) => {
              (e.target as Element).releasePointerCapture(e.pointerId);
              setDraggedState(false);
              document.body.style.userSelect = "";
            }}
            position={[0, -3.16, -0.09]}
            scale={4}
          >
            {cardGeometry && (
              <mesh geometry={cardGeometry}>
                <meshBasicMaterial map={cardMap} toneMapped={false} />
              </mesh>
            )}

            <mesh position={[HOLE_PATCH_LOCAL_X, HOLE_PATCH_LOCAL_Y, 0.006]}>
              <planeGeometry
                args={[HOLE_PATCH_LOCAL_SIZE, HOLE_PATCH_LOCAL_SIZE]}
              />
              <meshBasicMaterial map={holePatchTexture} toneMapped={false} />
            </mesh>
          </group>

          <mesh position={[PIN_PLANE_X, PIN_PLANE_Y, PIN_PLANE_Z]}>
            <planeGeometry args={[PIN_PLANE_WIDTH, PIN_PLANE_HEIGHT]} />
            <meshBasicMaterial
              alphaTest={0.1}
              map={pinTexture}
              toneMapped={false}
              transparent
            />
          </mesh>
        </RigidBody>
      </group>

      <mesh frustumCulled={false} ref={rope}>
        <meshStandardMaterial
          color={isDark ? "#d4d4d8" : "#262626"}
          metalness={0.15}
          roughness={0.55}
        />
      </mesh>
    </>
  );
}

// ─── Studio lighting ───────────────────────────────────────────────────────

function StudioLighting() {
  return (
    <Environment blur={0.75}>
      <Lightformer
        color="white"
        intensity={2}
        position={[0, -1, 5]}
        rotation={[0, 0, Math.PI / 3]}
        scale={[100, 0.1, 1]}
      />
      <Lightformer
        color="white"
        intensity={3}
        position={[-1, -1, 1]}
        rotation={[0, 0, Math.PI / 3]}
        scale={[100, 0.1, 1]}
      />
      <Lightformer
        color="white"
        intensity={3}
        position={[1, 1, 1]}
        rotation={[0, 0, Math.PI / 3]}
        scale={[100, 0.1, 1]}
      />
      <Lightformer
        color="white"
        intensity={10}
        position={[-10, 0, 14]}
        rotation={[0, Math.PI / 2, Math.PI / 3]}
        scale={[100, 10, 1]}
      />
    </Environment>
  );
}

// ─── Camera alignment ──────────────────────────────────────────────────────

const REFERENCE_HEIGHT_PX = 520;
const CAMERA_Z = 20;
const CAMERA_FOV_DEG = 20;
const WORLD_UNITS_PER_PX =
  (2 * CAMERA_Z * Math.tan((CAMERA_FOV_DEG / 2) * (Math.PI / 180))) ** -1;
const PX_PER_WORLD_UNIT = REFERENCE_HEIGHT_PX * WORLD_UNITS_PER_PX;

const TARGET_FROM_RIGHT_FRACTION = 0.3;
const TARGET_FROM_RIGHT_FRACTION_AT_LG = 0.15;
const LG_BREAKPOINT_PX = 1024;
const XL_BREAKPOINT_PX = 1280;

function CameraAlign() {
  useFrame((state) => {
    const widthT = THREE.MathUtils.clamp(
      (state.size.width - LG_BREAKPOINT_PX) /
        (XL_BREAKPOINT_PX - LG_BREAKPOINT_PX),
      0,
      1
    );

    const targetFromRightFraction = THREE.MathUtils.lerp(
      TARGET_FROM_RIGHT_FRACTION_AT_LG,
      TARGET_FROM_RIGHT_FRACTION,
      widthT
    );

    const targetFromRightPx = targetFromRightFraction * state.size.width;

    state.camera.position.x =
      (targetFromRightPx - state.size.width / 2) / PX_PER_WORLD_UNIT;

    state.camera.position.z =
      CAMERA_Z * (state.size.height / REFERENCE_HEIGHT_PX);
  });

  return null;
}

// ─── Public component ──────────────────────────────────────────────────────

export type IdCardProps = {
  /** Staff photo drawn onto the badge face. */
  frontImage: string;
  /** Content printed on the badge. Falls back to the Dr. Hazem default. */
  content?: BadgeContent;
  className?: string;
};
function IdCard({
  frontImage,
  className,
  content = DEFAULT_BADGE_CONTENT,
}: IdCardProps) {
  const isMobile = useIsMobile();

  const [contextLossKey, setContextLossKey] = useState(0);

  const eventSourceRef = useRef<HTMLElement | null>(
    typeof document === "undefined" ? null : document.body
  );

  const primaryProbeRef = useRef<HTMLSpanElement>(null);
  const [accentColor, setAccentColor] = useState("#4a9fd8"); // baby-blue fallback

  useEffect(() => {
    const updateAccentColor = () => {
      if (primaryProbeRef.current) {
        setAccentColor(getComputedStyle(primaryProbeRef.current).fill);
      }
    };

    updateAccentColor();

    const observers: MutationObserver[] = [];

    for (
      let node: HTMLElement | null = primaryProbeRef.current;
      node;
      node = node.parentElement
    ) {
      const observer = new MutationObserver(updateAccentColor);
      observer.observe(node, {
        attributes: true,
        attributeFilter: ["class", "style"],
      });
      observers.push(observer);
    }

    return () => {
      for (const observer of observers) {
        observer.disconnect();
      }
    };
  }, []);

  return (
    <div className={cn("pointer-events-none drop-shadow-xl", className)}>
      <span aria-hidden className="fill-primary hidden" ref={primaryProbeRef} />
      <Canvas
        camera={{ position: [0, 0, 20], fov: 20 }}
        dpr={[1, isMobile ? 1.25 : 1.5]}
        eventSource={eventSourceRef}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: "default",
        }}
        key={contextLossKey}
        onCreated={(state) => {
          state.gl.setClearColor(new THREE.Color(0x00_00_00), 0);

          state.gl.domElement.addEventListener("webglcontextlost", (event) => {
            event.preventDefault();
            setContextLossKey((key) => key + 1);
          });

          state.setEvents({
            compute: (event, s) => {
              const rect = s.gl.domElement.getBoundingClientRect();
              const x = event.clientX - rect.left;
              const y = event.clientY - rect.top;

              s.pointer.set(
                (x / s.size.width) * 2 - 1,
                -(y / s.size.height) * 2 + 1
              );
              s.raycaster.setFromCamera(s.pointer, s.camera);
            },
          });
        }}
      >
        <CameraAlign />
        <ambientLight intensity={Math.PI} />

        {/*
          Suspense boundary for every async resource in this canvas:
            - `useGLTF(CARD_MODEL_URL)`   — the badge card model
            - `useTexture(frontImage)`    — the staff photo
            - `useTexture(PIN_IMAGE_URL)` — the pin PNG
            - `Environment` in `<StudioLighting />` — the HDRI

          All four suspend on first mount, and all four suspend again if
          their input changes (e.g. a new `frontImage` prop). R3F requires
          the boundary to live INSIDE `<Canvas>`; putting it outside
          doesn't work because the canvas itself needs to render the
          fallback.
        */}
        <Suspense
          fallback={
            <Html center>
              <div
                aria-label="Loading ID badge"
                className="text-muted-foreground flex items-center gap-2 text-sm"
                role="status"
              >
                <span className="border-muted-foreground size-4 animate-spin rounded-full border-2 border-r-transparent" />
                Loading badge…
              </div>
            </Html>
          }
        >
          <Physics gravity={[0, -40, 0]} timeStep={isMobile ? 1 / 30 : 1 / 60}>
            <Band
              accentColor={accentColor}
              content={content}
              frontImage={frontImage}
              isMobile={isMobile}
            />
          </Physics>
          <StudioLighting />
        </Suspense>
      </Canvas>
    </div>
  );
}
export default IdCard;
