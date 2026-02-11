import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';

const TRAIL_POINTS = 42;
const METEOR_COUNT = 9;
const GALAXY_PARTICLES = 24000;
const PLANET_DEFS = [
    { name: 'Mercury', radius: 0.9, distance: 9, color: 0x9d8d7e, speed: 0.024, tilt: 0.03, spin: 0.009 },
    { name: 'Venus', radius: 1.3, distance: 12.5, color: 0xd8ad7a, speed: 0.019, tilt: 0.04, spin: 0.007 },
    { name: 'Earth', radius: 1.38, distance: 16.8, color: 0x4e88dc, speed: 0.016, tilt: 0.41, spin: 0.013, atmosphere: 0x87ceff },
    { name: 'Mars', radius: 1.05, distance: 21.8, color: 0xc86849, speed: 0.012, tilt: 0.44, spin: 0.011 },
    { name: 'Jupiter', radius: 3.4, distance: 31.5, color: 0xd8b084, speed: 0.0075, tilt: 0.06, spin: 0.02 },
    { name: 'Saturn', radius: 2.9, distance: 41.8, color: 0xd5c087, speed: 0.0062, tilt: 0.47, spin: 0.018, ring: { inner: 3.8, outer: 5.6, color: 0xbfa877 } },
    { name: 'Uranus', radius: 2.2, distance: 50.5, color: 0x93d5df, speed: 0.0051, tilt: 1.72, spin: 0.015 },
    { name: 'Neptune', radius: 2.15, distance: 58.5, color: 0x4f6fd8, speed: 0.0043, tilt: 0.49, spin: 0.014 }
];

const createStars = (count, radiusMin, radiusMax, size, opacity) => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count * 3; i += 3) {
        const radius = radiusMin + Math.random() * (radiusMax - radiusMin);
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        positions[i] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i + 2] = radius * Math.cos(phi);

        const t = Math.random();
        if (t < 0.7) {
            colors[i] = 1.0;
            colors[i + 1] = 1.0;
            colors[i + 2] = 1.0;
        } else if (t < 0.9) {
            colors[i] = 0.6;
            colors[i + 1] = 0.8;
            colors[i + 2] = 1.0;
        } else {
            colors[i] = 1.0;
            colors[i + 1] = 0.85;
            colors[i + 2] = 0.6;
        }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    return new THREE.Points(
        geometry,
        new THREE.PointsMaterial({
            size,
            vertexColors: true,
            transparent: true,
            opacity,
            depthWrite: false
        })
    );
};

const createGalaxyLayer = (count, mode, options = {}) => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const coreRadius = options.coreRadius ?? 26;
    const outerRadius = options.outerRadius ?? 520;
    const arms = options.arms ?? 4;

    for (let i = 0; i < count; i += 1) {
        const i3 = i * 3;
        let x = 0;
        let y = 0;
        let z = 0;
        let r = 0;

        if (mode === 'core') {
            r = Math.pow(Math.random(), 2.2) * coreRadius;
            const a = Math.random() * Math.PI * 2;
            x = Math.cos(a) * r;
            z = Math.sin(a) * r;
            y = (Math.random() - 0.5) * 4;
            colors[i3] = 1.0;
            colors[i3 + 1] = 0.94;
            colors[i3 + 2] = 0.78;
        } else if (mode === 'bulge') {
            r = coreRadius + Math.pow(Math.random(), 1.7) * 140;
            const a = Math.random() * Math.PI * 2;
            x = Math.cos(a) * r;
            z = Math.sin(a) * r;
            y = (Math.random() - 0.5) * (22 - (r / 140) * 12);
            const warm = 0.8 + Math.random() * 0.2;
            colors[i3] = 0.86 * warm;
            colors[i3 + 1] = 0.84 * warm;
            colors[i3 + 2] = 0.92 * warm;
        } else if (mode === 'arms') {
            r = 50 + Math.pow(Math.random(), 0.62) * (outerRadius - 50);
            const arm = i % arms;
            const armAngle = (arm / arms) * Math.PI * 2;
            const twist = r * 0.037;
            const spread = (Math.random() - 0.5) * (0.14 + (r / outerRadius) * 0.7);
            const a = armAngle + twist + spread;
            x = Math.cos(a) * r;
            z = Math.sin(a) * r;
            y = (Math.random() - 0.5) * (2.8 + r * 0.01);
            const t = r / outerRadius;
            colors[i3] = 0.62 + (1 - t) * 0.24;
            colors[i3 + 1] = 0.7 + (1 - t) * 0.2;
            colors[i3 + 2] = 0.94 + (1 - t) * 0.06;
        } else {
            // Halo stars around the galaxy volume.
            r = 260 + Math.random() * 420;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            x = Math.sin(phi) * Math.cos(theta) * r;
            y = Math.cos(phi) * r * 0.58;
            z = Math.sin(phi) * Math.sin(theta) * r;
            const c = 0.72 + Math.random() * 0.28;
            colors[i3] = c;
            colors[i3 + 1] = c;
            colors[i3 + 2] = 1.0;
        }

        positions[i3] = x;
        positions[i3 + 1] = y;
        positions[i3 + 2] = z;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geometry;
};

const createRealGalaxy = () => {
    const group = new THREE.Group();

    const core = new THREE.Points(
        createGalaxyLayer(Math.floor(GALAXY_PARTICLES * 0.12), 'core'),
        new THREE.PointsMaterial({
            size: 1.95,
            transparent: true,
            opacity: 0.9,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        })
    );
    group.add(core);

    const bulge = new THREE.Points(
        createGalaxyLayer(Math.floor(GALAXY_PARTICLES * 0.2), 'bulge'),
        new THREE.PointsMaterial({
            size: 1.25,
            transparent: true,
            opacity: 0.5,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        })
    );
    group.add(bulge);

    const arms = new THREE.Points(
        createGalaxyLayer(Math.floor(GALAXY_PARTICLES * 0.55), 'arms'),
        new THREE.PointsMaterial({
            size: 1.08,
            transparent: true,
            opacity: 0.4,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        })
    );
    group.add(arms);

    const halo = new THREE.Points(
        createGalaxyLayer(Math.floor(GALAXY_PARTICLES * 0.13), 'halo'),
        new THREE.PointsMaterial({
            size: 1.16,
            transparent: true,
            opacity: 0.24,
            vertexColors: true,
            depthWrite: false
        })
    );
    group.add(halo);

    const dustLanes = new THREE.Mesh(
        new THREE.RingGeometry(65, 380, 180),
        new THREE.MeshBasicMaterial({
            color: 0x1e1a23,
            transparent: true,
            opacity: 0.17,
            side: THREE.DoubleSide
        })
    );
    dustLanes.rotation.x = Math.PI * 0.5;
    group.add(dustLanes);

    return group;
};

const makeAsteroidBelt = () => {
    const baseGeometry = new THREE.DodecahedronGeometry(0.28, 0);
    const material = new THREE.MeshStandardMaterial({
        color: 0x584e49,
        roughness: 0.9,
        metalness: 0.05
    });
    const mesh = new THREE.InstancedMesh(baseGeometry, material, 1100);
    const m = new THREE.Matrix4();

    for (let i = 0; i < mesh.count; i += 1) {
        const theta = Math.random() * Math.PI * 2;
        const radius = 62 + (Math.random() - 0.5) * 20;
        const y = (Math.random() - 0.5) * 4;
        const scale = 0.2 + Math.random() * 0.65;
        const rot = new THREE.Euler(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        const q = new THREE.Quaternion().setFromEuler(rot);
        const s = new THREE.Vector3(scale, scale, scale);
        const p = new THREE.Vector3(Math.cos(theta) * radius, y, Math.sin(theta) * radius);
        m.compose(p, q, s);
        mesh.setMatrixAt(i, m);
    }

    mesh.rotation.x = 0.22;
    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
};

const SpaceVisualization = ({ asteroids = [] }) => {
    const containerRef = useRef(null);
    const asteroidsRef = useRef([]);
    const planetsRef = useRef([]);
    const meteorsRef = useRef([]);
    const frameRef = useRef(0);
    const composerRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current) return undefined;

        asteroidsRef.current = [];
        planetsRef.current = [];
        meteorsRef.current = [];

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000205);
        scene.fog = new THREE.FogExp2(0x050712, 0.0015);

        const camera = new THREE.PerspectiveCamera(
            65,
            containerRef.current.clientWidth / containerRef.current.clientHeight,
            0.1,
            1600
        );
        camera.position.set(0, 24, 70);

        const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.12;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        containerRef.current.appendChild(renderer.domElement);

        const composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));
        composer.addPass(
            new UnrealBloomPass(
                new THREE.Vector2(containerRef.current.clientWidth, containerRef.current.clientHeight),
                1.15,
                0.25,
                0.78
            )
        );
        composerRef.current = composer;

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.045;
        controls.minDistance = 26;
        controls.maxDistance = 170;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.16;

        const hemi = new THREE.HemisphereLight(0x89a7ff, 0x100d17, 0.28);
        scene.add(hemi);

        const sunLight = new THREE.PointLight(0xffa045, 2.7, 430, 1.65);
        sunLight.position.set(0, 0, 0);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 1024;
        sunLight.shadow.mapSize.height = 1024;
        scene.add(sunLight);

        const fillLight = new THREE.PointLight(0x89d4ff, 0.32, 260);
        fillLight.position.set(-40, 32, -40);
        scene.add(fillLight);

        const nearStars = createStars(5400, 120, 280, 0.44, 0.95);
        const farStars = createStars(6800, 360, 760, 0.72, 0.34);
        const deepStars = createStars(5200, 740, 1300, 1.0, 0.13);
        const galaxy = createRealGalaxy();
        galaxy.rotation.x = 0.22;
        galaxy.rotation.z = -0.18;
        scene.add(nearStars);
        scene.add(farStars);
        scene.add(deepStars);
        scene.add(galaxy);

        const nebula = new THREE.Mesh(
            new THREE.SphereGeometry(240, 64, 64),
            new THREE.ShaderMaterial({
                side: THREE.BackSide,
                transparent: true,
                depthWrite: false,
                uniforms: {
                    uTime: { value: 0 }
                },
                vertexShader: `
                    varying vec3 vWorld;
                    void main() {
                        vec4 wp = modelMatrix * vec4(position, 1.0);
                        vWorld = wp.xyz;
                        gl_Position = projectionMatrix * viewMatrix * wp;
                    }
                `,
                fragmentShader: `
                    uniform float uTime;
                    varying vec3 vWorld;
                    float hash(vec3 p) {
                        return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
                    }
                    void main() {
                        vec3 p = normalize(vWorld) * 7.0;
                        float n = hash(floor(p + uTime * 0.2)) * 0.6 + hash(floor(p * 2.0 - uTime * 0.3)) * 0.4;
                        float glow = smoothstep(0.32, 0.88, n) * 0.26;
                        vec3 c = mix(vec3(0.01, 0.02, 0.07), vec3(0.07, 0.16, 0.3), n);
                        gl_FragColor = vec4(c, glow);
                    }
                `
            })
        );
        scene.add(nebula);

        const sun = new THREE.Mesh(
            new THREE.SphereGeometry(5.2, 48, 48),
            new THREE.MeshStandardMaterial({
                color: 0xff9955,
                emissive: 0xff8c2f,
                emissiveIntensity: 2.9,
                roughness: 0.6,
                metalness: 0.0
            })
        );
        scene.add(sun);

        const corona = new THREE.Mesh(
            new THREE.SphereGeometry(7.5, 40, 40),
            new THREE.MeshBasicMaterial({
                color: 0xffcf7d,
                transparent: true,
                opacity: 0.22
            })
        );
        sun.add(corona);

        PLANET_DEFS.forEach((planetDef) => {
            const orbitPivot = new THREE.Object3D();
            scene.add(orbitPivot);

            const orbitLine = new THREE.LineLoop(
                new THREE.BufferGeometry().setFromPoints(
                    Array.from({ length: 160 }, (_, i) => {
                        const theta = (i / 160) * Math.PI * 2;
                        return new THREE.Vector3(
                            Math.cos(theta) * planetDef.distance,
                            0,
                            Math.sin(theta) * planetDef.distance
                        );
                    })
                ),
                new THREE.LineBasicMaterial({
                    color: 0x3b4c78,
                    transparent: true,
                    opacity: 0.34
                })
            );
            scene.add(orbitLine);

            const planetMesh = new THREE.Mesh(
                new THREE.SphereGeometry(planetDef.radius, 40, 40),
                new THREE.MeshStandardMaterial({
                    color: planetDef.color,
                    roughness: 0.9,
                    metalness: 0.04,
                    emissive: new THREE.Color(planetDef.color).multiplyScalar(0.09)
                })
            );
            planetMesh.position.x = planetDef.distance;
            planetMesh.rotation.z = planetDef.tilt;
            orbitPivot.add(planetMesh);

            let atmosphere = null;
            if (planetDef.atmosphere) {
                atmosphere = new THREE.Mesh(
                    new THREE.SphereGeometry(planetDef.radius * 1.06, 32, 32),
                    new THREE.MeshBasicMaterial({
                        color: planetDef.atmosphere,
                        transparent: true,
                        opacity: 0.18
                    })
                );
                planetMesh.add(atmosphere);
            }

            if (planetDef.ring) {
                const ring = new THREE.Mesh(
                    new THREE.RingGeometry(planetDef.ring.inner, planetDef.ring.outer, 96),
                    new THREE.MeshBasicMaterial({
                        color: planetDef.ring.color,
                        side: THREE.DoubleSide,
                        transparent: true,
                        opacity: 0.58
                    })
                );
                ring.rotation.x = Math.PI * 0.5;
                ring.rotation.z = 0.15;
                planetMesh.add(ring);
            }

            planetsRef.current.push({
                orbitPivot,
                planetMesh,
                atmosphere,
                orbitSpeed: planetDef.speed,
                spinSpeed: planetDef.spin
            });
        });

        const asteroidsToRender = asteroids.length > 0
            ? asteroids
            : Array(24).fill(null).map((_, i) => ({
                id: `generated-${i}`,
                estimated_diameter: { kilometers: { estimated_diameter_min: 0.35 + Math.random() * 2.3 } }
            }));

        asteroidsToRender.forEach((asteroidData, index) => {
            const baseSize = asteroidData.estimated_diameter
                ? asteroidData.estimated_diameter.kilometers.estimated_diameter_min * 0.48
                : 0.5 + Math.random() * 1.3;
            const size = Math.min(Math.max(baseSize, 0.22), 3.6);

            const mesh = new THREE.Mesh(
                new THREE.IcosahedronGeometry(size, 1),
                new THREE.MeshStandardMaterial({
                    color: new THREE.Color().setHSL(0.07, 0.18, 0.22 + Math.random() * 0.24),
                    roughness: 0.88,
                    metalness: 0.1
                })
            );
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            const orbitRadius = 66 + index * 2.15 + Math.random() * 5;
            const orbitalPhase = (index / Math.max(asteroidsToRender.length, 1)) * Math.PI * 2;
            const inclination = (Math.random() - 0.5) * 0.8;
            const eccentricity = 0.04 + Math.random() * 0.26;
            const wobble = 0.3 + Math.random() * 1.4;
            const trailData = new Float32Array(TRAIL_POINTS * 3);

            for (let i = 0; i < trailData.length; i += 3) {
                trailData[i] = Math.cos(orbitalPhase) * orbitRadius;
                trailData[i + 1] = inclination * orbitRadius;
                trailData[i + 2] = Math.sin(orbitalPhase) * orbitRadius;
            }

            const trailGeometry = new THREE.BufferGeometry();
            trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailData, 3));
            const trailLine = new THREE.Line(
                trailGeometry,
                new THREE.LineBasicMaterial({
                    color: new THREE.Color().setHSL(0.1, 0.25, 0.5),
                    transparent: true,
                    opacity: 0.35
                })
            );

            mesh.userData = {
                orbitRadius,
                orbitalPhase,
                speed: 0.0012 + Math.random() * 0.0033,
                inclination,
                eccentricity,
                wobble,
                rotationSpeed: 0.004 + Math.random() * 0.016
            };

            scene.add(mesh);
            scene.add(trailLine);
            asteroidsRef.current.push({ mesh, trailLine });
        });

        const asteroidBelt = makeAsteroidBelt();
        scene.add(asteroidBelt);

        for (let i = 0; i < METEOR_COUNT; i += 1) {
            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array(6);
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            const material = new THREE.LineBasicMaterial({
                color: 0x8fd4ff,
                transparent: true,
                opacity: 0
            });
            const line = new THREE.Line(geometry, material);
            line.userData = { life: 0, speed: 0, direction: new THREE.Vector3() };
            scene.add(line);
            meteorsRef.current.push(line);
        }

        const tmpVec = new THREE.Vector3();
        const clock = new THREE.Clock();

        const resetMeteor = (line) => {
            const startRadius = 90 + Math.random() * 45;
            const theta = Math.random() * Math.PI * 2;
            const phi = (Math.random() * 0.7 + 0.15) * Math.PI;
            const origin = new THREE.Vector3(
                Math.sin(phi) * Math.cos(theta),
                Math.cos(phi),
                Math.sin(phi) * Math.sin(theta)
            ).multiplyScalar(startRadius);

            const tangent = new THREE.Vector3(-origin.z, (Math.random() - 0.5) * 20, origin.x)
                .normalize()
                .multiplyScalar(1.5 + Math.random() * 3.4);

            line.userData.life = 0.6 + Math.random() * 1.4;
            line.userData.speed = 28 + Math.random() * 42;
            line.userData.direction.copy(tangent);

            const pos = line.geometry.attributes.position.array;
            pos[0] = origin.x;
            pos[1] = origin.y;
            pos[2] = origin.z;
            pos[3] = origin.x - tangent.x * 0.8;
            pos[4] = origin.y - tangent.y * 0.8;
            pos[5] = origin.z - tangent.z * 0.8;
            line.geometry.attributes.position.needsUpdate = true;
            line.material.opacity = 0.75;
        };

        meteorsRef.current.forEach((m) => resetMeteor(m));

        const animate = () => {
            frameRef.current = requestAnimationFrame(animate);
            const dt = Math.min(clock.getDelta(), 0.033);
            const t = clock.elapsedTime;

            nearStars.rotation.y += 0.00008;
            nearStars.rotation.x += 0.00002;
            farStars.rotation.y -= 0.00003;
            farStars.rotation.x += 0.00001;
            deepStars.rotation.y += 0.00001;
            galaxy.rotation.y += 0.000035;
            nebula.material.uniforms.uTime.value = t;
            sun.rotation.y += dt * 0.22;
            corona.scale.setScalar(1 + Math.sin(t * 1.7) * 0.08);
            asteroidBelt.rotation.y += dt * 0.03;

            planetsRef.current.forEach((planet) => {
                planet.orbitPivot.rotation.y += planet.orbitSpeed * dt * 12;
                planet.planetMesh.rotation.y += planet.spinSpeed * dt * 60;
                if (planet.atmosphere) {
                    planet.atmosphere.rotation.y -= planet.spinSpeed * dt * 25;
                }
            });

            asteroidsRef.current.forEach(({ mesh, trailLine }, idx) => {
                const data = mesh.userData;
                data.orbitalPhase += data.speed;

                const cosA = Math.cos(data.orbitalPhase);
                const sinA = Math.sin(data.orbitalPhase);
                const x = cosA * data.orbitRadius * (1 + data.eccentricity * cosA);
                const z = sinA * data.orbitRadius * (1 - data.eccentricity * 0.7);
                const y = data.inclination * data.orbitRadius + Math.sin(data.orbitalPhase * 2.5 + idx) * data.wobble;

                mesh.position.set(x, y, z);
                mesh.rotation.x += data.rotationSpeed;
                mesh.rotation.y += data.rotationSpeed * 0.6;

                const positions = trailLine.geometry.attributes.position.array;
                positions.copyWithin(3, 0, positions.length - 3);
                positions[0] = mesh.position.x;
                positions[1] = mesh.position.y;
                positions[2] = mesh.position.z;
                trailLine.geometry.attributes.position.needsUpdate = true;
            });

            meteorsRef.current.forEach((meteor) => {
                meteor.userData.life -= dt;
                if (meteor.userData.life <= 0) {
                    resetMeteor(meteor);
                    return;
                }

                const direction = meteor.userData.direction;
                const step = meteor.userData.speed * dt;
                const arr = meteor.geometry.attributes.position.array;

                tmpVec.set(arr[0], arr[1], arr[2]).addScaledVector(direction, step);
                arr[0] = tmpVec.x;
                arr[1] = tmpVec.y;
                arr[2] = tmpVec.z;

                arr[3] = arr[0] - direction.x * 1.5;
                arr[4] = arr[1] - direction.y * 1.5;
                arr[5] = arr[2] - direction.z * 1.5;
                meteor.material.opacity = Math.max(0, meteor.userData.life * 0.68);
                meteor.geometry.attributes.position.needsUpdate = true;
            });

            // Slight cinematic drift while retaining OrbitControls interaction.
            camera.position.x += Math.sin(t * 0.25) * 0.0012;
            camera.position.y += Math.cos(t * 0.3) * 0.001;
            controls.update();
            composer.render();
        };

        animate();

        const handleResize = () => {
            if (!containerRef.current) return;
            const width = containerRef.current.clientWidth;
            const height = containerRef.current.clientHeight;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
            composer.setSize(width, height);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (frameRef.current) cancelAnimationFrame(frameRef.current);
            controls.dispose();
            composer.dispose();
            scene.traverse((obj) => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    if (Array.isArray(obj.material)) {
                        obj.material.forEach((m) => m.dispose());
                    } else {
                        obj.material.dispose();
                    }
                }
            });
            renderer.dispose();
            if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
                containerRef.current.removeChild(renderer.domElement);
            }
            composerRef.current = null;
        };
    }, [asteroids]);

    return (
        <div
            ref={containerRef}
            className="space-visualization"
        />
    );
};

export default SpaceVisualization;
