import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

function App() {
  const mountRef = useRef(null);
  const [currentTexture, setCurrentTexture] = useState(0); // Estado para manejar el índice de la textura
  const [transitioning, setTransitioning] = useState(false); // Estado para controlar la transición de la imagen
  const textureChangeRef = useRef(false); // Ref para controlar el cambio de fondo

  const backgroundTextures = [
    '/background/background1.jpg', // Ruta de la imagen 1 en la carpeta public/background
    '/background/background2.jpg', // Ruta de la imagen 2
    '/background/background3.jpg'  // Ruta de la imagen 3
  ];

  const cubeTexturePath = '/textures/cube-texture.jpg';  // Textura para el cubo

  const cubeRef = useRef(null);  // Referencia para el cubo
  const sceneRef = useRef(null);  // Referencia para la escena
  const rendererRef = useRef(null); // Referencia para el renderizador
  const cameraRef = useRef(null);  // Referencia para la cámara
  const backgroundRef = useRef(null); // Referencia para el fondo

  useEffect(() => {
    // Crear la escena y la cámara (se ejecuta una sola vez)
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 7;
    sceneRef.current = scene;
    cameraRef.current = camera;

    // Crear el renderizador
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Agregar controles de la cámara
    const controls = new OrbitControls(camera, renderer.domElement);

    // Agregar luces
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 5, 5).normalize();
    scene.add(light);
    const ambientLight = new THREE.AmbientLight(0x404040, 1);
    scene.add(ambientLight);

    // Guardar referencias para usar en la animación
    const textureLoader = new THREE.TextureLoader();
    const cubeTexture = textureLoader.load(cubeTexturePath);
    const cubeGeometry = new THREE.BoxGeometry(2, 2, 2);
    const cubeMaterial = new THREE.MeshStandardMaterial({ map: cubeTexture });
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    scene.add(cube);
    cubeRef.current = cube;

    // Función para actualizar el tamaño de la ventana
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    // Listener para resize
    window.addEventListener('resize', handleResize);

    // Retornar función de limpieza
    return () => {
      window.removeEventListener('resize', handleResize);
      mountRef.current.removeChild(renderer.domElement);
    };
  }, []); // Solo se ejecuta una vez cuando el componente se monta

  // Función para cambiar el fondo
  const changeBackground = () => {
    // Cambiar fondo cada 5 segundos
    if (textureChangeRef.current) return; // Prevenir cambios múltiples simultáneos
    textureChangeRef.current = true;
    setTimeout(() => {
      // Actualizar el estado de la textura
      setCurrentTexture((prevIndex) => (prevIndex + 1) % backgroundTextures.length);
      textureChangeRef.current = false; // Permitir nuevos cambios de fondo
    }, 1000); // Esperar 1 segundo antes de permitir un cambio
  };

  useEffect(() => {
    // Este useEffect solo se ocupa de cambiar el fondo cuando currentTexture cambia
    const textureLoader = new THREE.TextureLoader();
    const backgroundTexture = textureLoader.load(backgroundTextures[currentTexture]);
    backgroundTexture.minFilter = THREE.LinearFilter;

    const backgroundMaterial = new THREE.MeshBasicMaterial({ map: backgroundTexture });
    const planeGeometry = new THREE.PlaneGeometry(50, 50); // Tamaño grande para el fondo
    const background = new THREE.Mesh(planeGeometry, backgroundMaterial);
    background.position.z = -10;

    // Guardar la referencia al fondo
    backgroundRef.current = background;

    // Agregar el fondo a la escena
    const scene = sceneRef.current;
    scene.add(background);

    // Limpiar el fondo anterior cuando se cambie la textura
    return () => {
      const scene = sceneRef.current;
      scene.remove(backgroundRef.current); // Eliminar el fondo anterior antes de agregar uno nuevo
    };
  }, [currentTexture]); // Solo se ejecuta cuando currentTexture cambia

  useEffect(() => {
    // Cambiar fondo cada 5 segundos
    const intervalId = setInterval(() => {
      if (!textureChangeRef.current) changeBackground();
    }, 5000); // Cambiar fondo cada 5 segundos

    return () => clearInterval(intervalId); // Limpiar el intervalo cuando el componente se desmonte
  }, []);

  useEffect(() => {
    // Función de animación continua del cubo
    const animate = () => {
      requestAnimationFrame(animate);

      // Rotación continua del cubo
      if (cubeRef.current) {
        cubeRef.current.rotation.x += 0.01;
        cubeRef.current.rotation.y += 0.01;
      }

      // Renderizar la escena
      const scene = sceneRef.current;
      const camera = cameraRef.current;
      const renderer = rendererRef.current;
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.update();
      renderer.render(scene, camera);
    };

    animate(); // Iniciar la animación del cubo

  }, []); // Se ejecuta solo una vez para iniciar la animación del cubo

  return <div ref={mountRef}></div>;
}

export default App;
