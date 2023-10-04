import { useCallback, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'
// import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js'
import { F32Array, NodeIndex, EdgeIndex } from './util';

const FIELD_OF_VIEW = 45.0;

const initialiseScene = (document: Document, htmlElem: HTMLDivElement) => {

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

  const setup = (htmlElem: HTMLDivElement, json: any) => {

    const camera = new THREE.PerspectiveCamera(FIELD_OF_VIEW, window.innerWidth/window.innerHeight, 0.1, 4000);
    console.dir(camera);

    const onWindowResize = () => {
      const newAspect = window.innerWidth / window.innerHeight;
      camera.aspect = newAspect;
      camera.updateProjectionMatrix();

      renderer.setSize(window.innerWidth, window.innerHeight);
      labelRenderer.setSize(window.innerWidth, window.innerHeight);
    };

    const pointer = new THREE.Vector2();
    const onPointerMove = (event: PointerEvent) => {
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }

    const onClick = (_event: MouseEvent) => {
      if (intersected!==undefined) {
        const ix = intersected.index!;// * 3;
        const colorAttr = nodeGeometry.getAttribute('color');
        colorAttr.setXYZ(ix, 0, 0, 0);
        colorAttr.needsUpdate = true;
      }
    };

    const scene = new THREE.Scene();
    // scene.add( new THREE.AmbientLight(0xffffff));

    const nodeGeometry = new THREE.BufferGeometry()
    const nodePositions = new F32Array(json.nodes.length*3);
    const nodeColors = new F32Array(json.nodes.length*3);
    const labelGroup = new THREE.Group();

    // Map the node ids to a position and a buffer index.
    //
    const nodeIndexes = new Map<string, NodeIndex>();

    for (let i=0; i<json.nodes.length; i++) {
      const x = json.nodes[i].x;
      const y = json.nodes[i].y;
      const z = 0;//Math.random()*10;
      nodePositions.push(x, y, z);

      nodeIndexes.set(json.nodes[i].id, new NodeIndex(x, y, z))

      // Assign a color depending on the entity class.
      // If the entity class is not recognides, assign white.
      //
      const ec: string = json.nodes[i].entityClass;
      const color: number[] = COLOR_MAP.has(ec) ? COLOR_MAP.get(ec)! : [1,1,1];
      nodeColors.push(...color);

      const text = document.createElement('div');
      text.className = 'label';
      text.style.color = `rgba(${100+Math.random()*155}, ${100+Math.random()*155}, ${100+Math.random()*155}, 0.5)`;
      text.textContent = json.nodes[i].label;
      const label = new CSS2DObject(text);
      label.position.set(x, y, z);
      label.renderOrder = 1;
      labelGroup.add(label);
    }

    nodeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(nodePositions.array, 3));
    nodeGeometry.setAttribute('color', new THREE.Float32BufferAttribute(nodeColors.array, 3));

    const edgeIndexes = new EdgeIndex(nodeIndexes);
    for (let i=0; i<json.edges.length; i++) {
      const src = json.edges[i].source;
      const tgt = json.edges[i].target;
      edgeIndexes.add(src, tgt);
    }

    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setIndex(edgeIndexes.edgeIndexes);
    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(edgeIndexes.edgePositions, 3));
    lineGeometry.computeBoundingSphere();
    const lineMaterial = new THREE.LineBasicMaterial({color:0x7f7f7f});
    const lineSegments = new THREE.LineSegments(lineGeometry, lineMaterial);

    const pn = new THREE.Object3D();
    pn.add(lineSegments);
    // scene.add(lineSegments);
    scene.add(pn);
    scene.add(labelGroup);

    const sprite = new THREE.TextureLoader().load('circle.png');
    sprite.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.PointsMaterial( { size: 8, sizeAttenuation: true, map: sprite, alphaTest: 0.5, transparent: true, vertexColors: true } );
    // material.onBeforeCompile = (shader) => {
    //   console.log(`${shader.vertexShader}`);
    //   console.log(`${shader.fragmentShader}`);
    // }

    const nodes = new THREE.Points(nodeGeometry, material);
    scene.add(nodes);

    // const labels = makeLabels(json, document, scene);

    const raycaster = new THREE.Raycaster();

    const renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(0x2b2b2b);//(0xffffff);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    htmlElem.appendChild(renderer.domElement);

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '20px';
    labelRenderer.domElement.style.pointerEvents = 'none';
    htmlElem.appendChild(labelRenderer.domElement);

    // Zoom the camera to fit the scene.orbit
    // Move the orbital control to match.
    //
    nodeGeometry.computeBoundingSphere();
    const c = nodes.geometry.boundingSphere ?? new THREE.Sphere(new THREE.Vector3(), 1);
    camera.position.set(c.center.x, c.center.y, c.center.z + 1.1*c.radius/Math.tan(FIELD_OF_VIEW*Math.PI/360) );
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target = new THREE.Vector3(c.center.x, c.center.y, c.center.z);
    controls.update();

    let intersected: THREE.Intersection<THREE.Object3D<THREE.Object3DEventMap>> | undefined = undefined;

    const animate = () => {
      requestAnimationFrame(animate)

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObject(nodes);

      intersected = intersects.length>0 ? intersects[0] : undefined;

      // required if controls.enableDamping or controls.autoRotate are set to true
      // controls.update();

      labelRenderer.render(scene, camera);
      renderer.render(scene, camera);
      console.log(`animate ${camera.zoom} ${camera.toJSON()}`);
    }
    animate();

    window.addEventListener('resize', onWindowResize);
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('click', onClick);
  };

  (async function(url: string) {
    const json = await loadGraph(url);
    console.log(`GRAPH: nnodes=${json.nodes.length} nedges=${json.edges.length}`);
    setup(htmlElem, json);
  })('graph.json');
}

export const ThreeCanvas = () => {
  const [initialised, setInitialised] = useState(false);
  const threeDivRef = useCallback(
    (htmlElem: HTMLDivElement | null) => {
      if (htmlElem !== null && !initialised) {
        initialiseScene(document, htmlElem)
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