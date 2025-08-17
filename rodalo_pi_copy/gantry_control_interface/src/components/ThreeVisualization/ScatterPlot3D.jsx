import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import './ScatterPlot3D.css';

const ScatterPlot3D = ({ 
  scanData, 
  currentPosition, 
  gridSize, 
  stepSize, 
  cameraView,
  onCameraViewChange,
  dataSource,
  arduinoConnected,
  isScanning,
  onScanPoint 
}) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const animationRef = useRef(null);
  
  // Performance optimization for large datasets
  const [lastUpdateTime, setLastUpdateTime] = useState(0);
  const [fps, setFps] = useState(0);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    sceneRef.current = scene;

    // Calculate optimal bounds
    const maxX = gridSize.x * stepSize;
    const maxY = gridSize.y * stepSize;
    const centerX = maxX / 2;
    const centerY = maxY / 2;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      60,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(centerX + 30, 60, centerY + 30);
    camera.lookAt(centerX, 0, centerY);
    cameraRef.current = camera;

    // Renderer setup with enhanced settings
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    // Mouse controls
    const controls = {
      isMouseDown: false,
      mouseX: 0,
      mouseY: 0,
      isDragging: false
    };
    controlsRef.current = controls;

    // Enhanced mouse event handlers
    const handleMouseDown = (event) => {
      controls.isMouseDown = true;
      controls.mouseX = event.clientX;
      controls.mouseY = event.clientY;
      controls.isDragging = false;
    };

    const handleMouseMove = (event) => {
      if (!controls.isMouseDown) return;

      const deltaX = event.clientX - controls.mouseX;
      const deltaY = event.clientY - controls.mouseY;
      
      if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
        controls.isDragging = true;
        
        // Rotate camera around center
        const spherical = new THREE.Spherical();
        spherical.setFromVector3(camera.position.clone().sub(new THREE.Vector3(centerX, 0, centerY)));
        
        spherical.theta -= deltaX * 0.01;
        spherical.phi += deltaY * 0.01;
        spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));
        
        const newPosition = new THREE.Vector3().setFromSpherical(spherical);
        newPosition.add(new THREE.Vector3(centerX, 0, centerY));
        
        camera.position.copy(newPosition);
        camera.lookAt(centerX, 0, centerY);
        
        controls.mouseX = event.clientX;
        controls.mouseY = event.clientY;
      }
    };

    const handleMouseUp = () => {
      controls.isMouseDown = false;
      controls.isDragging = false;
    };

    const handleWheel = (event) => {
      event.preventDefault();
      const zoomFactor = event.deltaY > 0 ? 1.1 : 0.9;
      const newPosition = camera.position.clone().multiplyScalar(zoomFactor);
      
      // Limit zoom range
      const distance = newPosition.distanceTo(new THREE.Vector3(centerX, 0, centerY));
      if (distance > 10 && distance < 500) {
        camera.position.copy(newPosition);
        camera.lookAt(centerX, 0, centerY);
      }
    };

    // Add event listeners
    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    renderer.domElement.addEventListener('wheel', handleWheel);

    // Enhanced lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(centerX + 20, 50, centerY + 20);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Grid helper with enhanced appearance
    const gridHelper = new THREE.GridHelper(
      Math.max(maxX, maxY),
      Math.max(gridSize.x, gridSize.y),
      0x666666,
      0xcccccc
    );
    gridHelper.position.set(centerX, 0, centerY);
    scene.add(gridHelper);

    // Create boundary box
    const boundaryGeometry = new THREE.BoxGeometry(maxX, 1, maxY);
    const boundaryMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x999999, 
      transparent: true, 
      opacity: 0.1,
      wireframe: true 
    });
    const boundaryMesh = new THREE.Mesh(boundaryGeometry, boundaryMaterial);
    boundaryMesh.position.set(centerX, 0, centerY);
    scene.add(boundaryMesh);

    // Axes helper
    const axesHelper = new THREE.AxesHelper(15);
    axesHelper.position.set(0, 0, 0);
    scene.add(axesHelper);

    // Performance-optimized render loop
    let frameCount = 0;
    let lastFpsUpdate = performance.now();

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      
      // FPS calculation
      frameCount++;
      const now = performance.now();
      if (now - lastFpsUpdate >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastFpsUpdate)));
        frameCount = 0;
        lastFpsUpdate = now;
      }
      
      renderer.render(scene, camera);
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      if (mountRef.current && camera && renderer) {
        camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      renderer.domElement.removeEventListener('wheel', handleWheel);
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [gridSize, stepSize]);

  // Camera control based on cameraView prop
  useEffect(() => {
    if (!cameraRef.current) return;
    
    const camera = cameraRef.current;
    const centerX = (gridSize.x * stepSize) / 2;
    const centerY = (gridSize.y * stepSize) / 2;
    const distance = Math.max(gridSize.x * stepSize, gridSize.y * stepSize) * 0.8;

    switch (cameraView) {
      case 'top':
        camera.position.set(centerX, distance, centerY);
        break;
      case 'front':
        camera.position.set(centerX, 30, centerY + distance);
        break;
      case 'side':
        camera.position.set(centerX + distance, 30, centerY);
        break;
      case 'reset':
      default:
        camera.position.set(centerX + 30, 60, centerY + 30);
        break;
    }
    camera.lookAt(centerX, 0, centerY);
  }, [cameraView, gridSize, stepSize]);

  // Optimized scan data updates with batching for live data
  useEffect(() => {
    if (!sceneRef.current) return;

    const now = performance.now();
    // Throttle updates for performance during live streaming
    if (dataSource === 'live' && now - lastUpdateTime < 100) {
      return; // Skip update if less than 100ms since last update
    }
    setLastUpdateTime(now);

    // Remove existing data points efficiently
    const objectsToRemove = [];
    sceneRef.current.traverse((child) => {
      if (child.userData.isDataPoint) {
        objectsToRemove.push(child);
      }
    });
    
    objectsToRemove.forEach(obj => {
      sceneRef.current.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });

    // Add new data points with optimized geometry
    console.log(`Rendering ${scanData.length} data points for ${dataSource} mode`);
    
    // Use instanced geometry for large datasets
    if (scanData.length > 500) {
      const geometry = new THREE.SphereGeometry(1.2, 8, 6); // Reduced detail for performance
      const material = new THREE.MeshLambertMaterial();
      
      scanData.forEach((point, index) => {
        const sphere = new THREE.Mesh(geometry, material.clone());
        const hue = Math.min(point.z / 30, 1.0);
        sphere.material.color.setHSL(hue * 0.7, 1.0, 0.5);
        sphere.position.set(point.x, point.z, point.y);
        sphere.castShadow = true;
        sphere.userData.isDataPoint = true;
        sphere.userData.pointIndex = index;
        sceneRef.current.add(sphere);
      });
    } else {
      // Full quality for smaller datasets
      scanData.forEach((point, index) => {
        const geometry = new THREE.SphereGeometry(1.2, 16, 16);
        const hue = Math.min(point.z / 30, 1.0);
        const material = new THREE.MeshLambertMaterial({
          color: new THREE.Color().setHSL(hue * 0.7, 1.0, 0.5)
        });
        
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.set(point.x, point.z, point.y);
        sphere.castShadow = true;
        sphere.userData.isDataPoint = true;
        sphere.userData.pointIndex = index;
        sceneRef.current.add(sphere);
      });
    }

    console.log(`Total objects in scene: ${sceneRef.current.children.length}`);
  }, [scanData, dataSource, lastUpdateTime]);

  // Enhanced current position indicator
  useEffect(() => {
    if (!sceneRef.current) return;

    // Remove existing position indicator
    const objectsToRemove = [];
    sceneRef.current.traverse((child) => {
      if (child.userData.isPositionIndicator) {
        objectsToRemove.push(child);
      }
    });
    
    objectsToRemove.forEach(obj => {
      sceneRef.current.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });

    // Add enhanced position indicator
    console.log('Adding position indicator at:', currentPosition);
    
    // Main cone (red)
    const coneGeometry = new THREE.ConeGeometry(2, 8, 8);
    let coneMaterial;
    
    if (dataSource === 'live' && arduinoConnected) {
      // Animated material for live mode
      coneMaterial = new THREE.MeshLambertMaterial({ 
        color: isScanning ? 0x00ff00 : 0xff0000, // Green when scanning, red when idle
        transparent: false,
        opacity: 1.0
      });
    } else {
      // Static material for demo/historical mode
      coneMaterial = new THREE.MeshLambertMaterial({ 
        color: 0xff6600, // Orange for demo mode
        transparent: false,
        opacity: 1.0
      });
    }
    
    const cone = new THREE.Mesh(coneGeometry, coneMaterial);
    cone.position.set(
      currentPosition.x * stepSize,
      20,
      currentPosition.y * stepSize
    );
    cone.castShadow = true;
    cone.userData.isPositionIndicator = true;
    sceneRef.current.add(cone);

    // Add position base circle
    const circleGeometry = new THREE.CircleGeometry(3, 16);
    const circleMaterial = new THREE.MeshBasicMaterial({ 
      color: dataSource === 'live' ? (isScanning ? 0x00ff00 : 0xff0000) : 0xff6600,
      transparent: true,
      opacity: 0.3
    });
    const circle = new THREE.Mesh(circleGeometry, circleMaterial);
    circle.position.set(
      currentPosition.x * stepSize,
      0.1,
      currentPosition.y * stepSize
    );
    circle.rotation.x = -Math.PI / 2;
    circle.userData.isPositionIndicator = true;
    sceneRef.current.add(circle);

    console.log(`Position indicator added at world coords: (${cone.position.x}, ${cone.position.y}, ${cone.position.z})`);
  }, [currentPosition, stepSize, dataSource, arduinoConnected, isScanning]);

  return (
    <div className="scatter-plot-container">
      <div className="plot-header">
        <h2>Sand Bed 3D Visualization</h2>
        
        {/* Enhanced plot info with connection status */}
        <div className="plot-info">
          <span>Grid: {gridSize.x} × {gridSize.y}</span>
          <span>Step: {stepSize}cm</span>
          <span>Points: {scanData.length}</span>
          <span>Position: ({currentPosition.x}, {currentPosition.y})</span>
          <span className={`data-source ${dataSource}`}>
            Source: {dataSource.charAt(0).toUpperCase() + dataSource.slice(1)}
          </span>
          {dataSource === 'live' && (
            <span className={`connection-status ${arduinoConnected ? 'connected' : 'disconnected'}`}>
              Arduino: {arduinoConnected ? '✅ Connected' : '❌ Disconnected'}
            </span>
          )}
          {dataSource === 'live' && fps > 0 && (
            <span className="performance-info">FPS: {fps}</span>
          )}
        </div>
        
        {/* Camera controls */}
        <div className="camera-controls">
          <button 
            onClick={() => onCameraViewChange('top')}
            className={cameraView === 'top' ? 'active' : ''}
          >
            Top View
          </button>
          <button 
            onClick={() => onCameraViewChange('front')}
            className={cameraView === 'front' ? 'active' : ''}
          >
            X View
          </button>
          <button 
            onClick={() => onCameraViewChange('side')}
            className={cameraView === 'side' ? 'active' : ''}
          >
            Y View
          </button>
          <button 
            onClick={() => onCameraViewChange('reset')}
            className={cameraView === 'reset' ? 'active' : ''}
          >
            Reset View
          </button>
          {onScanPoint && dataSource !== 'historical' && (
            <button 
              onClick={onScanPoint}
              className="scan-point-btn"
              disabled={dataSource === 'live' && !arduinoConnected}
              title="Scan current position"
            >
              📍 Scan Point
            </button>
          )}
        </div>
      </div>
      
      <div ref={mountRef} className="three-canvas" />
      
      <div className="controls-info">
        <span>🖱️ Drag to rotate • 🔄 Scroll to zoom • 📷 View: {cameraView}</span>
        {dataSource === 'live' && isScanning && (
          <span className="live-indicator"> • 🔴 LIVE SCANNING</span>
        )}
      </div>
    </div>
  );
};

export default ScatterPlot3D;
