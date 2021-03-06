import { Vector2 } from 'three';
import { getPuppetAndControlPointFromPostion } from 'services/dranimate/util';

function getFirstTouchLocation(event, rendererElement) {
  const firstTouch = event.touches[0];
  const boundingRect = rendererElement.getBoundingClientRect();
  return {
    x: firstTouch.clientX - boundingRect.left,
    y: firstTouch.clientY - boundingRect.top
  };
}

function getRelativeTouchPosition(x, y, rendererElement, panHandler, zoom) {
  const boundingRect = rendererElement.getBoundingClientRect();
  return {
    x: (x - boundingRect.left - window.innerWidth / 2) / zoom - panHandler.getPanPosition().x,
    y: (y - boundingRect.top - window.innerHeight / 2) / zoom - panHandler.getPanPosition().y
  };
}

export default class DranimateTouchHandler {

  constructor(rendererElement, panHandler) {
    this.rendererElement = rendererElement;
    this.panHandler = panHandler;
    this.touchMap = new Map();
    this.selectedPuppet;
  }

  onTouchStart(event, puppets, zoom) {
    if(this.panHandler.getPanEnabled()) {
      const firstTouchLocation = getFirstTouchLocation(event, this.rendererElement);
      this.panHandler.onMouseDown(firstTouchLocation.x, firstTouchLocation.y, zoom);
      return;
    }

    // IF A NEW TOUCH POINT IS WITHIN DISTANCE FROM PUPPET CONTROL POINT, ASSOCIATE THE TWO IN TOUCHMAP
    const touch = event.changedTouches[0];
    const relativePosition = getRelativeTouchPosition(touch.clientX, touch.clientY, this.rendererElement, this.panHandler, zoom);
    const controlPoint = getPuppetAndControlPointFromPostion(puppets, relativePosition.x, relativePosition.y, 10, zoom);
    if (controlPoint) {
      this.touchMap.set(touch.identifier, controlPoint);
      return;
    }

    // IF A SINGLE FINGER TOUCHES A PUPPET BUT NOT A CONTROL POINT, SELECT THE PUPPET
    if (event.touches.length > 1) {
      return;
    }
    this.selectedPuppet = null;
    for (let i = puppets.length - 1; i >= 0; i--) {
      if (puppets[i].pointInsideMesh(relativePosition.x, relativePosition.y)) {
        this.selectedPuppet = puppets[i];
        break;
      }
    }
    if (this.selectedPuppet) {
      this.selectedPuppet.setSelectionState(true, relativePosition.x, relativePosition.y);
    }
    puppets.forEach(puppet => puppet.setSelectionGUIVisible(puppet === this.selectedPuppet));
  }

  onTouchMove(event, puppets, zoom) {
    event.preventDefault();

    // PAN CAMERA
    if(this.panHandler.getPanEnabled()) {
      const firstTouchLocation = getFirstTouchLocation(event, this.rendererElement);
      this.panHandler.onMouseMove(firstTouchLocation.x, firstTouchLocation.y, zoom);
      return;
    }

    const normalizedTouchPoints = Object.values(event.touches)
      .filter(touch => this.touchMap.has(touch.identifier))
      .map((touch) => {
        const controlPoint = this.touchMap.get(touch.identifier);
        const puppet = puppets[controlPoint.puppetIndex];
        const puppetCenter = puppet.getCenter();
        const relativePosition = getRelativeTouchPosition(touch.clientX, touch.clientY, this.rendererElement, this.panHandler, zoom);
        const position = new Vector2(relativePosition.x, relativePosition.y)
          .sub(puppetCenter)
          .multiplyScalar(1 / puppet.getScale())
          .add(puppetCenter);
        return {
          cpi: controlPoint.controlPointIndex,
          position
        };
      });

    // EDIT CONTROL POINTS
    if (normalizedTouchPoints.length) {
      this.selectedPuppet.setControlPointPositions(normalizedTouchPoints);
      return;
    }

    // MOVE PUPPET XY
    if (this.selectedPuppet) {
      const firstTouch = event.touches[0];
      const relativePosition = getRelativeTouchPosition(firstTouch.clientX, firstTouch.clientY, this.rendererElement, this.panHandler, zoom);
      this.selectedPuppet.incrementPosition(relativePosition.x, relativePosition.y);
      return;
    }

  }

  onTouchEnd(event, puppets, zoom) {
    const currentTouchIds = Object.values(event.touches).map(touch => touch.identifier);
    // IF A REMOVED TOUCH POINT WAS ASSOCIATED WITH A CONTROL POINT, REMOVE IT FROM TOUCHMAP
    [...this.touchMap.keys()]
      .filter(touchId => !currentTouchIds.includes(touchId))
      .forEach(touchId => this.touchMap.delete(touchId));
  }

  getSelectedPuppet() {
    return this.selectedPuppet;
  }

  onRemovePuppet() {
    this.selectedPuppet = null;
  }

}
