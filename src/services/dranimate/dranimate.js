import {
  GridHelper,
  OrthographicCamera,
  Scene,
  WebGLRenderer
} from 'three';
import DranimateMouseHandler from 'services/dranimate/mouseHandler';
import DranimateLeapHandler from 'services/dranimate/leapHandler';
import DranimateTouchHandler from 'services/dranimate/touchHandler';
import { GifRecording, GifBuilder } from 'services/util/GifRecorder';
import PanHandler from 'services/util/panHandler';
import { clamp } from 'services/util/math';

const ZOOM = {
  MIN: 0.1,
  MAX: 3
};
const CAMERA_DEPTH = 100;

const Dranimate = function () {
    let container;
    let camera, scene, renderer;
    const puppets = [];

    let zoom = 1.0;
    const panHandler = new PanHandler();
    let leapHandler;
    let mouseHandler;
    let touchHandler;

    let lastUpdateTimestamp = performance.now();

    let isInRenderLoop = true;
    let gifRecording = new GifRecording(performance.now(), false);

    const getSelectedPuppet = () => mouseHandler.getSelectedPuppet() || touchHandler.getSelectedPuppet();

/*****************************
    API
*****************************/

    this.setup = function (canvasContainer) {
      /* Initialize THREE canvas and scene */
      const halfWidth = window.innerWidth / 2;
      const halfHeight = window.innerHeight / 2;
      // OrthographicCamera: left, right, top, bottom, near, far
      // puppet.z = 0, controlPoint.z = 10
      camera = new OrthographicCamera(-halfWidth, halfWidth, -halfHeight, halfHeight, CAMERA_DEPTH - 10, CAMERA_DEPTH + 1);
      scene = new Scene();
      renderer = new WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(window.devicePixelRatio);
      // renderer.setSize(width, height);
      renderer.setClearColor(0xFFFFFF, 1);
      canvasContainer.appendChild(renderer.domElement);
      camera.position.x = 0;
      camera.position.y = 0;
      camera.position.z = CAMERA_DEPTH;

      mouseHandler = new DranimateMouseHandler(renderer.domElement, panHandler);
      touchHandler = new DranimateTouchHandler(renderer.domElement, panHandler);
      leapHandler = new DranimateLeapHandler(renderer.domElement, panHandler, puppets);

      const gridHelper = new GridHelper(1000, 20);
      gridHelper.geometry.rotateX(Math.PI / 2);
      scene.add(gridHelper);

      refreshCamera();
      animate();
    }

    this.onMouseWheel = function(event) {
      let d = ((typeof e.wheelDelta != "undefined")?(-e.wheelDelta):e.detail);
      d *= 0.01;
      zoom += d;
      zoom = clamp(zoom, ZOOM.MIN, ZOOM.MAX);
      refreshCamera();
    };

    this.onMouseDown = event => mouseHandler.onMouseDown(event, puppets, zoom);

    this.onMouseMove = event => mouseHandler.onMouseMove(event, puppets, zoom);

    this.onMouseUp = event => mouseHandler.onMouseUp(event, puppets, zoom);

    this.onTouchStart = event => touchHandler.onTouchStart(event, puppets, zoom);

    this.onTouchMove = event => touchHandler.onTouchMove(event, puppets, zoom);

    this.onTouchEnd = event => touchHandler.onTouchEnd(event, puppets, zoom);

    // this.createNewPuppet = function (vertices, faces, controlPoints, image, imageNoBG) {
    //
    //     /* Create the new Puppet */
    //
    //     var puppet = new Puppet(image, imageNoBG);
    //     puppet.generateMesh(vertices, faces, controlPoints, scene);
    //     puppets.push(puppet);
    //
    // }

    this.addPuppet = function (p) {
      const matchingIndex = puppets.findIndex(puppet => puppet.id === p.id);
      if(matchingIndex > -1) {
        this.removePuppetByIndex(matchingIndex);
      }
      puppets.push(p);
      scene.add(p.group);
    }

    this.zoomIn = function () {
        zoom += 0.1;
        zoom = clamp(zoom, ZOOM.MIN, ZOOM.MAX);
        //panPosition.x -= (0.1)*window.innerWidth/2;
        //panPosition.y -= (0.1)*window.innerHeight/2;

        refreshCamera();
        camera.updateProjectionMatrix();
    }

    this.zoomOut = function () {
        zoom -= 0.1;
        zoom = clamp(zoom, ZOOM.MIN, ZOOM.MAX);
        //panPosition.x += (0.1)*window.innerWidth/2;
        //panPosition.y += (0.1)*window.innerHeight/2;

        refreshCamera();
        camera.updateProjectionMatrix();
    }

    this.setPanEnabled = function (isEnabled) {
      panHandler.setPanEnabled(isEnabled);
      renderer.domElement.style.cursor = isEnabled ? 'move' : 'default';
    }

    this.deleteSelectedPuppet = function () {
      const selectedPuppet = getSelectedPuppet();
      if (!selectedPuppet) {
        return;
      }
      const index = puppets.indexOf(selectedPuppet);
      this.removePuppetByIndex(index);
      mouseHandler.onRemovePuppet();
      touchHandler.onRemovePuppet();
    }

    this.removePuppetByIndex = function(index) {
      const puppet = puppets[index];
      if (!puppet) {
        return;
      }
      puppet.cleanup();
      scene.remove(puppet.group);
      puppets.splice(index, 1);
    }

    this.getSelectedPuppet = () => getSelectedPuppet();

    this.setRecording = function(isRec) {
      if (getSelectedPuppet()) {
        isRec ?
          getSelectedPuppet().startRecording() :
          getSelectedPuppet().stopRecording();
      }
    };

    this.setGifIsRecording = function(isRec) {
      isInRenderLoop = isRec;
      if (isRec) {
        gifRecording = new GifRecording(performance.now(), true);
        return;
      }
      else {
        const gifBuilder = new GifBuilder();
        const { targetTimestamps, gifTimestep } = gifRecording.stop(performance.now(), puppets);
        targetTimestamps.forEach((targetTimestamp) => {
          puppets.forEach(puppet => puppet.update(gifTimestep, targetTimestamp));
          renderer.render(scene, camera);
          gifBuilder.recordFrame(renderer.domElement, gifTimestep);
        });
        return gifBuilder;
      }
    }

    this.onRenderToggle = () => {
      isInRenderLoop = !isInRenderLoop;
      if (isInRenderLoop) {
        animate();
      }
    };

    // this.startRenderLoop = () => {
    //   isInRenderLoop = true;
    //   this.animate();
    // };
    //
    // this.stopRenderLoop = () => {
    //   isInRenderLoop = false;
    // };

/*****************************
    Dom events
*****************************/

    window.addEventListener('resize', $event => refreshCamera(), false );

/*****************************
    Draw/update loop
*****************************/

    function refreshCamera() {
      const width = window.innerWidth / 2 / zoom;
      const height = window.innerHeight / 2 / zoom
      camera.left = -width;
      camera.right = width;
      camera.top = -height;
      camera.bottom = height;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function animate() {
      const now = performance.now();
      const elapsedTime = now - lastUpdateTimestamp;
      lastUpdateTimestamp = now;
      update(elapsedTime);
      render(elapsedTime);
      if (isInRenderLoop) {
        requestAnimationFrame(animate);
      }
    }

    function update(elapsedTime) {
      leapHandler.update(getSelectedPuppet());
      puppets.forEach(puppet => puppet.update(elapsedTime));
      panHandler.update(camera);
    }

    function render(elapsedTime) {
      renderer.render(scene, camera);
      gifRecording.setFrame(performance.now());
    }

};

const dranimate = new Dranimate();
export default dranimate;
