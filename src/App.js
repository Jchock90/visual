import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

function App() {
  const mountRef = useRef(null);
  const [currentTextureIndex, setCurrentTextureIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const backgroundTextures = [
    '/background/background1.jpg',
    '/background/background2.jpg',
    '/background/background3.jpg',
  ];

  const cubeTexturePath = '/textures/cube-texture.jpg';

  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const planeRef = useRef(null);
  const cubeRef = useRef(null);

  useEffect(() => {
    // Configuración básica de Three.js
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 7;

    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);

    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;

    // Controles
    const controls = new OrbitControls(camera, renderer.domElement);

    // Iluminación
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 5, 5).normalize();
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0x404040, 1);
    scene.add(ambientLight);

    // Textura del cubo
    const textureLoader = new THREE.TextureLoader();
    const cubeTexture = textureLoader.load(cubeTexturePath);

    const cubeGeometry = new THREE.BoxGeometry(2, 2, 2);
    const cubeMaterial = new THREE.MeshStandardMaterial({ map: cubeTexture });
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    scene.add(cube);
    cubeRef.current = cube;

    // Shader material para el fondo
    const planeGeometry = new THREE.PlaneGeometry(50, 50);
    const initialTexture = textureLoader.load(backgroundTextures[currentTextureIndex]);
    const nextTexture = textureLoader.load(backgroundTextures[(currentTextureIndex + 1) % backgroundTextures.length]);

    const planeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        u_time: { value: 0 },
        u_texture1: { value: initialTexture },
        u_texture2: { value: nextTexture },
        u_mixAmount: { value: 0 }, // Control de transición
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D u_texture1;
        uniform sampler2D u_texture2;
        uniform float u_time;
        uniform float u_mixAmount;
        varying vec2 vUv;

        void main() {
          vec2 uv = vUv;

          // Distorsión líquida
          float distortX = sin(uv.y * 10.0 + u_time) * 0.05;
          float distortY = cos(uv.x * 10.0 + u_time) * 0.05;
          uv.x += distortX;
          uv.y += distortY;

          // Mezcla entre texturas
          vec4 tex1 = texture2D(u_texture1, uv);
          vec4 tex2 = texture2D(u_texture2, uv);
          vec4 color = mix(tex1, tex2, u_mixAmount);

          gl_FragColor = color;
        }
      `,
      transparent: true,
    });

    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.position.z = -10;
    scene.add(plane);
    planeRef.current = plane;

    // Manejar redimensionamiento
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      mountRef.current.removeChild(renderer.domElement);
    };
  }, []);

  const changeBackground = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);

    const plane = planeRef.current;
    const textureLoader = new THREE.TextureLoader();
    const nextTextureIndex = (currentTextureIndex + 1) % backgroundTextures.length;
    const newTexture = textureLoader.load(backgroundTextures[nextTextureIndex]);

    // Actualizar textura secundaria en el shader
    plane.material.uniforms.u_texture2.value = newTexture;

    let mixAmount = 0;

    const fadeTransition = setInterval(() => {
      mixAmount += 0.02;
      plane.material.uniforms.u_mixAmount.value = mixAmount;
      plane.material.uniforms.u_time.value += 0.05; // Movimiento líquido constante

      if (mixAmount >= 1) {
        clearInterval(fadeTransition);

        // Configurar la nueva textura como principal
        plane.material.uniforms.u_texture1.value = newTexture;
        plane.material.uniforms.u_mixAmount.value = 0;

        setCurrentTextureIndex(nextTextureIndex);
        setIsTransitioning(false);
      }
    }, 16); // 60 FPS
  };

  useEffect(() => {
    // Animación principal
    const animate = () => {
      requestAnimationFrame(animate);

      if (cubeRef.current) {
        cubeRef.current.rotation.x += 0.01;
        cubeRef.current.rotation.y += 0.01;
      }

      const scene = sceneRef.current;
      const camera = cameraRef.current;
      const renderer = rendererRef.current;

      if (planeRef.current) {
        planeRef.current.material.uniforms.u_time.value += 0.01; // Actualización del efecto líquido
      }

      renderer.render(scene, camera);
    };

    animate();

    // Cambio de fondo cada 5 segundos
    const interval = setInterval(() => {
      if (!isTransitioning) changeBackground();
    }, 5000);

    return () => clearInterval(interval);
  }, [currentTextureIndex, isTransitioning]);

  return <div ref={mountRef}></div>;
}

export default App;
