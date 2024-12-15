import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';

function App() {
  const mountRef = useRef(null);
  const audioRef = useRef(null);
  const analyserRef = useRef(null);
  const audioStartedRef = useRef(false);

  const backgroundTextures = [
    '/background/background1.jpg',
    '/background/background2.jpg',
    '/background/background3.jpg',
  ];

  const audioPath = '/thetrue.mp3';

  useEffect(() => {
    let currentTextureIndex = 0;
    let mixAmount = 0;
    const clock = new THREE.Clock();
    let isTransitioning = false;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 7;

    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);

    new OrbitControls(camera, renderer.domElement);

    // Luces
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 5, 5).normalize();
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0x404040, 1);
    scene.add(ambientLight);

    // Fondo con ShaderMaterial
    const textureLoader = new THREE.TextureLoader();
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
          float distortX = sin(uv.y * 10.0 + u_time) * 0.05;
          float distortY = cos(uv.x * 10.0 + u_time) * 1.05;
          uv.x += distortX;
          uv.y += distortY;

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

    // Cargar modelo 3D (lotus.obj) como wireframe
    const objLoader = new OBJLoader();
    const wireframeMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff69b4, // Color blanco para las líneas
      wireframe: true // Activa el wireframe
    });
    let model = null;

    objLoader.load('/models/lotus.obj', (object) => {
      object.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = wireframeMaterial;
        }
      });
      model = object;
      object.scale.set(0.5, 0.5, 0.5);
      scene.add(object);
    });

    // Audio
    const listener = new THREE.AudioListener();
    camera.add(listener);
    const audioLoader = new THREE.AudioLoader();
    const sound = new THREE.Audio(listener);
    const analyser = new THREE.AudioAnalyser(sound, 32);
    analyserRef.current = analyser;

    const startAudio = () => {
      if (audioStartedRef.current) return;
      audioStartedRef.current = true;

      audioLoader.load(audioPath, (buffer) => {
        sound.setBuffer(buffer);
        sound.setLoop(true);
        sound.setVolume(0.5);
        sound.play();
      });
    };

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const handleMouseClick = (event) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      if (model) {
        const intersects = raycaster.intersectObject(model, true);
        if (intersects.length > 0) {
          startAudio();
        }
      }
    };

    window.addEventListener('click', handleMouseClick);

    // Transiciones de fondo
    const startTransition = () => {
      if (isTransitioning) return;
      isTransitioning = true;

      const nextTextureIndex = (currentTextureIndex + 1) % backgroundTextures.length;
      const nextTexture = textureLoader.load(backgroundTextures[nextTextureIndex]);
      planeMaterial.uniforms.u_texture2.value = nextTexture;

      mixAmount = 0;

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

    const animate = () => {
      requestAnimationFrame(animate);

      const deltaTime = clock.getDelta();
      if (model) {
        model.rotation.x += 0.5 * deltaTime;
        model.rotation.y += 0.5 * deltaTime;

        if (analyserRef.current) {
          const frequency = analyserRef.current.getAverageFrequency();
          const scale = 1 + frequency / 256;
          model.scale.set(scale, scale, scale);
        }
      }

      planeMaterial.uniforms.u_time.value += deltaTime;

      if (transitionUpdate) transitionUpdate();

      renderer.render(scene, camera);
    };

    animate();

    const interval = setInterval(() => {
      transitionUpdate = startTransition();
    }, 5000);

    const handleResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('click', handleMouseClick);
      mountRef.current.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} />;
}

export default App;
