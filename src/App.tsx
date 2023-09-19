import { useCallback, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const initThreeJsScene = (node: HTMLDivElement) => {

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

    const onWindowResize = () => {
      const newAspect = window.innerWidth / window.innerHeight;
      camera.aspect = newAspect;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    const scene = new THREE.Scene();
    // scene.add( new THREE.AmbientLight(0xffffff));

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 2000);
    camera.position.z = 10;

    const geometry = new THREE.BufferGeometry()
    const nodePositions = [];
    const nodeColors = [];
    for (let i=0; i<json.nodes.length; i++) {
      nodePositions.push(json.nodes[i].x*2, json.nodes[i].y*2, 0);

      const ec: string = json.nodes[i].entityClass;
      const color: number[] = COLOR_MAP.has(ec) ? COLOR_MAP.get(ec)! : [1,1,1];
      nodeColors.push(...color);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(nodePositions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(nodeColors, 3));

    const sprite = new THREE.TextureLoader().load('circle.png');
    sprite.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.PointsMaterial( { size: 8, sizeAttenuation: true, map: sprite, alphaTest: 0.5, transparent: true, vertexColors: true } );
    // material.color.setHSL( 1.0, 0.3, 0.7, THREE.SRGBColorSpace );

    const particles = new THREE.Points( geometry, material );
    scene.add(particles);


    const renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(0);//(0xffffff);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    node.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);

    // const geometry = new THREE.BoxGeometry();
    // // const material = new THREE.MeshNormalMaterial();
    // const material = new THREE.MeshBasicMaterial({color: 0x0000ff});
    // const cube = new THREE.Mesh(geometry, material);
    // scene.add(cube);

    const animate = () => {
      requestAnimationFrame(animate)
      // cube.rotation.x += 0.01
      // cube.rotation.y += 0.01

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
  const [initialized, setInitialized] = useState(false);
  const threeDivRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node !== null && !initialized) {
        initThreeJsScene(node)
        setInitialized(true)
      }
    },
    [initialized]
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