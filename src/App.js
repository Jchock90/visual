import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

function App() {
  const mountRef = useRef(null);

  const backgroundTextures = [
    '/background/background1.jpg',
    '/background/background2.jpg',
    '/background/background3.jpg',
  ];
  const cubeTexturePath = '/textures/cube-texture.jpg';

  useEffect(() => {
    let currentTextureIndex = 0;
    let mixAmount = 0;
    const clock = new THREE.Clock(); // Reloj para manejar el tiempo constante
    let isTransitioning = false;

    // Configuración básica de Three.js
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 7;

    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);

    // Controles
    new OrbitControls(camera, renderer.domElement);

    // Iluminación
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 5, 5).normalize();
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0x404040, 1);
    scene.add(ambientLight);

    // Cargar textura del cubo
    const textureLoader = new THREE.TextureLoader();
    const cubeTexture = textureLoader.load(cubeTexturePath);
    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(2, 2, 2),
      new THREE.MeshStandardMaterial({ map: cubeTexture })
    );
    scene.add(cube);

    // Material del fondo (Shader)
    const planeGeometry = new THREE.PlaneGeometry(50, 50);
    const initialTexture = textureLoader.load(backgroundTextures[currentTextureIndex]);
    const planeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        u_time: { value: 0 },
        u_texture1: { value: initialTexture },
        u_texture2: { value: null },
        u_mixAmount: { value: 0 },
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
          float distortY = cos(uv.x * 10.0 + u_time) * 1.05;
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

    // Función para manejar la transición de fondos
    const startTransition = () => {
      if (isTransitioning) return;
      isTransitioning = true;

      const nextTextureIndex = (currentTextureIndex + 1) % backgroundTextures.length;
      const nextTexture = textureLoader.load(backgroundTextures[nextTextureIndex]);
      planeMaterial.uniforms.u_texture2.value = nextTexture;

      mixAmount = 0;

      // Lógica de mezcla integrada en la animación principal
      const updateTransition = () => {
        mixAmount += 0.01;
        planeMaterial.uniforms.u_mixAmount.value = mixAmount;

        if (mixAmount >= 1) {
          isTransitioning = false;
          planeMaterial.uniforms.u_texture1.value = nextTexture;
          planeMaterial.uniforms.u_mixAmount.value = 0;
          currentTextureIndex = nextTextureIndex;
        }
      };

      return updateTransition;
    };

    let transitionUpdate = null;

    // Animación principal
    const animate = () => {
      requestAnimationFrame(animate);

      const deltaTime = clock.getDelta(); // Tiempo constante entre frames

      // Rotación del cubo
      cube.rotation.x += 0.5 * deltaTime;
      cube.rotation.y += 0.5 * deltaTime;

      // Actualización del shader
      planeMaterial.uniforms.u_time.value += deltaTime;

      // Manejar transición si está activa
      if (transitionUpdate) transitionUpdate();

      renderer.render(scene, camera);
    };

    animate();

    // Cambio de fondo cada 5 segundos
    const interval = setInterval(() => {
      transitionUpdate = startTransition();
    }, 5000);

    // Manejar redimensionamiento
    const handleResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
      mountRef.current.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} />;
}

export default App;
