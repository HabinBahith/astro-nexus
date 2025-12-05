import { useEffect, useRef } from "react";
import * as THREE from "three";

type SceneBody = {
  id: string;
  color: string;
  orbitRadius: number;
  size: number;
  speed: number;
};

type SolarSystemSceneProps = {
  bodies: SceneBody[];
  activeId: string;
  onSelect: (id: string) => void;
};

export const SolarSystemScene = ({ bodies, activeId, onSelect }: SolarSystemSceneProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = null;
    scene.fog = new THREE.FogExp2(0x02040a, 0.012);

    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000,
    );
    camera.position.set(0, 32, 70);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0x5ac8ff, 0.4);
    const pointLight = new THREE.PointLight(0xfff3b0, 1.4, 500);
    pointLight.position.set(0, 0, 0);
    scene.add(ambientLight, pointLight);

    const starGeometry = new THREE.BufferGeometry();
    const starVertices = [];
    for (let i = 0; i < 800; i += 1) {
      starVertices.push(
        THREE.MathUtils.randFloatSpread(400),
        THREE.MathUtils.randFloatSpread(400),
        THREE.MathUtils.randFloatSpread(400),
      );
    }
    starGeometry.setAttribute("position", new THREE.Float32BufferAttribute(starVertices, 3));
    const starMaterial = new THREE.PointsMaterial({
      color: 0x6fc6ff,
      size: 0.8,
      transparent: true,
      opacity: 0.7,
    });
    scene.add(new THREE.Points(starGeometry, starMaterial));

    const sunGeometry = new THREE.SphereGeometry(4, 64, 64);
    const sunMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5c063,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.4,
      roughness: 0.4,
      metalness: 0.1,
    });
    const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sunMesh);

    const orbitLines: THREE.Line[] = [];
    const planetMeshes: THREE.Mesh[] = [];

    bodies.forEach((body) => {
      const orbitGeometry = new THREE.RingGeometry(body.orbitRadius - 0.04, body.orbitRadius + 0.04, 128);
      const orbitMaterial = new THREE.MeshBasicMaterial({
        color: 0x2dd4bf,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.12,
      });
      const orbitRing = new THREE.Mesh(orbitGeometry, orbitMaterial);
      orbitRing.rotation.x = Math.PI / 2.3;
      scene.add(orbitRing);
      orbitLines.push(orbitRing as unknown as THREE.Line);

      const geometry = new THREE.SphereGeometry(body.size, 48, 48);
      const material = new THREE.MeshStandardMaterial({
        color: body.color,
        emissive: body.id === activeId ? new THREE.Color(body.color).multiplyScalar(0.35) : 0x000000,
        emissiveIntensity: 0.8,
        roughness: 0.55,
        metalness: 0.2,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData = {
        id: body.id,
        angle: Math.random() * Math.PI * 2,
        speed: body.speed,
        radius: body.orbitRadius,
      };
      scene.add(mesh);
      planetMeshes.push(mesh);
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const updateActiveMaterial = () => {
      planetMeshes.forEach((mesh) => {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        const isActive = mesh.userData.id === activeId;
        mat.emissive = isActive
          ? new THREE.Color(mesh.material.color as THREE.Color).multiplyScalar(0.35)
          : new THREE.Color(0x000000);
        mat.needsUpdate = true;
      });
    };

    updateActiveMaterial();

    const onPointerDown = (event: PointerEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(planetMeshes);
      if (intersects.length > 0) {
        const hit = intersects[0].object;
        const id = hit.userData.id as string;
        onSelect(id);
      }
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);

    const clock = new THREE.Clock();
    let animationFrameId = 0;

    const animate = () => {
      const delta = clock.getDelta();
      planetMeshes.forEach((mesh) => {
        const { speed, radius } = mesh.userData as { speed: number; radius: number; angle: number };
        const nextAngle = (mesh.userData.angle as number) + speed * delta;
        mesh.userData.angle = nextAngle;

        const tilt = Math.PI / 2.3;
        const x = Math.cos(nextAngle) * radius;
        const z = Math.sin(nextAngle) * radius;
        const y = Math.sin(nextAngle * 0.5) * 0.6;
        const rotX = x;
        const rotY = y * Math.cos(tilt) - z * Math.sin(tilt);
        const rotZ = y * Math.sin(tilt) + z * Math.cos(tilt);
        mesh.position.set(rotX, rotY, rotZ);
        mesh.rotation.y += 0.6 * delta;
      });

      sunMesh.rotation.y += 0.15 * delta;
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      cancelAnimationFrame(animationFrameId);
      scene.clear();
      planetMeshes.forEach((mesh) => mesh.geometry.dispose());
      orbitLines.forEach((line) => line.geometry.dispose());
      sunGeometry.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [activeId, bodies, onSelect]);

  return <div ref={containerRef} className="w-full h-full" />;
};
