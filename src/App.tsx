import { useCallback, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const FIELD_OF_VIEW = 45.0;

const initialiseScene = (node: HTMLDivElement) => {

  const COLOR_MAP = new Map<string, number[]>([
    ['A', [1,0.25,0.25]],
    ['B', [0.25,1,0.25]],
    ['C', [0.25,0.25,1]],
    ['D', [1,1,0.25]],
    ['E', [0.25,1,1]],
    ['F', [0.5, 0.5, 0.5]]
  ]);

  const loadGraph = async (url: string) => {
    const data = await fetch(url);
    const json = await data.json();
    return json;
  };

  const setup = (node: HTMLDivElement, json: any) => {

    const camera = new THREE.PerspectiveCamera(FIELD_OF_VIEW, window.innerWidth/window.innerHeight, 0.1, 2000);

    const onWindowResize = () => {
      const newAspect = window.innerWidth / window.innerHeight;
      camera.aspect = newAspect;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    const scene = new THREE.Scene();
    // scene.add( new THREE.AmbientLight(0xffffff));

    const nodeGeometry = new THREE.BufferGeometry()
    const nodePositions = [];
    const nodeColors = [];
    for (let i=0; i<json.nodes.length; i++) {
      nodePositions.push(json.nodes[i].x*2, json.nodes[i].y*2, 0);

      // Assign a color depending on the entity class.
      // If the entity class is not recognides, assign white.
      //
      const ec: string = json.nodes[i].entityClass;
      const color: number[] = COLOR_MAP.has(ec) ? COLOR_MAP.get(ec)! : [1,1,1];
      nodeColors.push(...color);
    }

    nodeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(nodePositions, 3));
    nodeGeometry.setAttribute('color', new THREE.Float32BufferAttribute(nodeColors, 3));

    const sprite = new THREE.TextureLoader().load('circle.png');
    sprite.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.PointsMaterial( { size: 8, sizeAttenuation: true, map: sprite, alphaTest: 0.5, transparent: true, vertexColors: true } );
    // material.color.setHSL( 1.0, 0.3, 0.7, THREE.SRGBColorSpace );

    const nodes = new THREE.Points(nodeGeometry, material);
    scene.add(nodes);

    const renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(0);//(0xffffff);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    node.appendChild(renderer.domElement);

    // Zoom the camera to fit the scene.
    // Move the orbital control to match.
    //
    nodeGeometry.computeBoundingSphere();
    const c = nodes.geometry.boundingSphere ?? new THREE.Sphere(new THREE.Vector3(), 1);
    camera.position.set(c.center.x, c.center.y, c.center.z + 1.1*c.radius/Math.tan(FIELD_OF_VIEW*Math.PI/360) );
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target = new THREE.Vector3(c.center.x, c.center.y, c.center.z);
    controls.update();

    const animate = () => {
      requestAnimationFrame(animate)

      // required if controls.enableDamping or controls.autoRotate are set to true
      // controls.update();

      renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', onWindowResize);
  };

  (async function(url: string) {
    const json = await loadGraph(url);
    setup(node, json);
  })('graph.json');
}

export const ThreeCanvas = () => {
  const [initialised, setInitialised] = useState(false);
  const threeDivRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node !== null && !initialised) {
        initialiseScene(node)
        setInitialised(true)
      }
    },
    [initialised]
  );

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh'
      }}
      ref={threeDivRef}
    ></div>
  );
}