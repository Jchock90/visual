import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

function App() {
  const mountRef = useRef(null);
  const [currentTexture, setCurrentTexture] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const textureChangeRef = useRef(false);

  const backgroundTextures = [
    '/background/background1.jpg',
    '/background/background2.jpg',
    '/background/background3.jpg',
  ];

  const cubeTexturePath = '/textures/cube-texture.jpg';

  const cubeRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const backgroundRefs = useRef([]);

  useEffect(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 7;
    sceneRef.current = scene;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 5, 5).normalize();
    scene.add(light);
    const ambientLight = new THREE.AmbientLight(0x404040, 1);
    scene.add(ambientLight);

    const textureLoader = new THREE.TextureLoader();
    const cubeTexture = textureLoader.load(cubeTexturePath);
    const cubeGeometry = new THREE.BoxGeometry(2, 2, 2);
    const cubeMaterial = new THREE.MeshStandardMaterial({ map: cubeTexture });
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    scene.add(cube);
    cubeRef.current = cube;

    const planeGeometry = new THREE.PlaneGeometry(50, 50);

    // Crear dos materiales y planos de fondo
    const material1 = new THREE.MeshBasicMaterial({ map: textureLoader.load(backgroundTextures[0]), transparent: true, opacity: 1 });
    const material2 = new THREE.MeshBasicMaterial({ map: textureLoader.load(backgroundTextures[1]), transparent: true, opacity: 0 });

    const background1 = new THREE.Mesh(planeGeometry, material1);
    const background2 = new THREE.Mesh(planeGeometry, material2);

    background1.position.z = -10;
    background2.position.z = -10;

    scene.add(background1);
    scene.add(background2);

    backgroundRefs.current = [material1, material2];

    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      mountRef.current.removeChild(renderer.domElement);
    };
  }, []);

  const changeBackground = () => {
    if (textureChangeRef.current || isTransitioning) return;
    setIsTransitioning(true);

    const materials = backgroundRefs.current;
    const nextTexture = (currentTexture + 1) % backgroundTextures.length;

    const textureLoader = new THREE.TextureLoader();
    const newTexture = textureLoader.load(backgroundTextures[nextTexture]);
    materials[nextTexture % 2].map = newTexture;

    // Animar opacidad para hacer el fade
    let progress = 0;
    const fadeInterval = setInterval(() => {
      progress += 0.02;
      materials[currentTexture % 2].opacity = 1 - progress; // Fade out del material actual
      materials[nextTexture % 2].opacity = progress;       // Fade in del siguiente material

      if (progress >= 1) {
        clearInterval(fadeInterval);
        setCurrentTexture(nextTexture);
        setIsTransitioning(false);
      }
    }, 16); // Aproximadamente 60 FPS
  };

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (!textureChangeRef.current && !isTransitioning) changeBackground();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [currentTexture, isTransitioning]);

  useEffect(() => {
    const animate = () => {
      requestAnimationFrame(animate);

      if (cubeRef.current) {
        cubeRef.current.rotation.x += 0.01;
        cubeRef.current.rotation.y += 0.01;
      }

      const scene = sceneRef.current;
      const camera = cameraRef.current;
      const renderer = rendererRef.current;
      renderer.render(scene, camera);
    };

    animate();
  }, []);

  return <div ref={mountRef}></div>;
}

export default App;
