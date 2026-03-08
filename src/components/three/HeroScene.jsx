import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Environment, PerspectiveCamera, Stars } from '@react-three/drei';
import * as THREE from 'three';
import './HeroScene.css';

// Floating geometric shapes representing clothing/fashion
const ClothingShape = ({ position, color, scale = 1, rotationSpeed = 0.5 }) => {
    const meshRef = useRef();

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.x += rotationSpeed * 0.005;
            meshRef.current.rotation.y += rotationSpeed * 0.008;
        }
    });

    return (
        <Float speed={2} rotationIntensity={0.5} floatIntensity={2}>
            <mesh ref={meshRef} position={position} scale={scale}>
                <dodecahedronGeometry args={[1, 0]} />
                <meshStandardMaterial
                    color={color}
                    metalness={0.3}
                    roughness={0.4}
                    transparent
                    opacity={0.8}
                    emissive={color}
                    emissiveIntensity={0.15}
                />
            </mesh>
        </Float>
    );
};

// Paint splash particle
const PaintSplash = ({ count = 80 }) => {
    const points = useRef();

    const particlesPosition = useMemo(() => {
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const palette = [
            new THREE.Color('#5DADE2'),
            new THREE.Color('#E67E22'),
            new THREE.Color('#6BCB77'),
            new THREE.Color('#FFFFFF'),
        ];

        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 20;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 12;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 10;

            const color = palette[Math.floor(Math.random() * palette.length)];
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }
        return { positions, colors };
    }, [count]);

    useFrame((state) => {
        if (points.current) {
            points.current.rotation.y = state.clock.elapsedTime * 0.02;
            points.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.03) * 0.1;
        }
    });

    return (
        <points ref={points}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={count}
                    array={particlesPosition.positions}
                    itemSize={3}
                />
                <bufferAttribute
                    attach="attributes-color"
                    count={count}
                    array={particlesPosition.colors}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.06}
                vertexColors
                transparent
                opacity={0.6}
                sizeAttenuation
            />
        </points>
    );
};

// Glowing ring
const GlowRing = ({ position, color, radius = 2 }) => {
    const ringRef = useRef();

    useFrame((state) => {
        if (ringRef.current) {
            ringRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.3;
            ringRef.current.rotation.z += 0.003;
        }
    });

    return (
        <mesh ref={ringRef} position={position}>
            <torusGeometry args={[radius, 0.02, 16, 100]} />
            <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={0.5}
                transparent
                opacity={0.4}
            />
        </mesh>
    );
};

const Scene = () => {
    return (
        <>
            <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={60} />
            <ambientLight intensity={0.2} />
            <pointLight position={[5, 5, 5]} intensity={1} color="#5DADE2" />
            <pointLight position={[-5, -3, 3]} intensity={0.8} color="#E67E22" />
            <spotLight position={[0, 8, 0]} intensity={0.5} angle={0.5} color="#6BCB77" />

            {/* Floating shapes */}
            <ClothingShape position={[-3.5, 1.5, -2]} color="#5DADE2" scale={0.7} rotationSpeed={0.4} />
            <ClothingShape position={[3.5, -1, -1]} color="#E67E22" scale={0.9} rotationSpeed={0.6} />
            <ClothingShape position={[-2, -2, -3]} color="#6BCB77" scale={0.5} rotationSpeed={0.3} />
            <ClothingShape position={[2, 2.5, -2]} color="#5DADE2" scale={0.6} rotationSpeed={0.5} />
            <ClothingShape position={[0, -1.5, -4]} color="#E67E22" scale={0.4} rotationSpeed={0.7} />
            <ClothingShape position={[-4, 0, -3]} color="#FFFFFF" scale={0.3} rotationSpeed={0.2} />

            {/* Glow rings */}
            <GlowRing position={[0, 0, -3]} color="#5DADE2" radius={3} />
            <GlowRing position={[1, -0.5, -4]} color="#E67E22" radius={2} />

            {/* Paint splash particles */}
            <PaintSplash count={120} />

            {/* Stars background */}
            <Stars radius={50} depth={50} count={1000} factor={3} saturation={0.5} fade speed={0.5} />

            <Environment preset="night" />
        </>
    );
};

const HeroScene = () => {
    return (
        <div className="hero-canvas-container">
            <Canvas
                gl={{ antialias: true, alpha: true }}
                dpr={[1, 1.5]}
                style={{ position: 'absolute', inset: 0 }}
            >
                <Scene />
            </Canvas>
        </div>
    );
};

export default HeroScene;
