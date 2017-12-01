import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Loader from 'components/loader';
import ZoomPanner from 'components/zoomPanner';
import ImageToMesh from 'services/imageToMesh/imageToMesh'
import editorHelper from 'services/imageToMesh/EditorHelper';
import generateUniqueId from 'services/util/uuid';
import dranimate from 'services/dranimate/dranimate';
import styles from './styles.scss';

class PuppetEditor extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selector: 'SELECT',
      threshold: 30,
      loaderIsVisible: false
    };
  }

  componentWillMount() {
    this.imageToMesh = new ImageToMesh();
  }

  componentDidMount() {
    this.canvasElement.width = 400;
    this.canvasElement.height = 300;
    this.imageToMesh.setup(this.canvasElement);
    // TODO: image to puppet needs 2 instantiation methods: "fromImage" and "fromPuppet"
    if (editorHelper.isPuppet) {
      const puppet = editorHelper.getItem();
      this.imageToMesh.editImage(
        puppet.image.src,
        puppet.controlPointPositions,
        puppet.backgroundRemovalData
      )
      .then(() => this.runSlic())
      .catch(error => console.log('error', error));
    }
    else if (editorHelper.getItem()) {
      this.imageToMesh.editImage(editorHelper.getItem())
        .then(() => this.runSlic())
        .catch(error => console.log('error', error));
    }
    else {
      this.props.onClose();
    }

    // passive touch event listeners seem to be needed, which react does not support
    this.canvasElement.addEventListener(
      'touchstart',
      event => this.imageToMesh.onTouchStart(event),
      { passive: false }
    );
    this.canvasElement.addEventListener(
      'touchmove',
      event => this.imageToMesh.onTouchMove(event),
      { passive: false }
    );
    this.canvasElement.addEventListener(
      'touchend',
      event => this.imageToMesh.onTouchEnd(event),
      { passive: false }
    );
  }

  runSlic = () => {
    console.log(".......runslic")
    this.setState({ loaderIsVisible: true });
    setTimeout(() => {
      this.imageToMesh.doSlic(this.state.threshold);
      this.setState({ loaderIsVisible: false });
    });
  }

  onCancel = () => {
    this.props.onClose();
  };

  onSave = () => {
    if (this.imageToMesh.getControlPoints().length < 2) {
      alert('Puppet must have at least two control points');
      return;
    }
    const puppetId = editorHelper.isPuppet ? editorHelper.getItem().id : generateUniqueId();
    this.imageToMesh.generateMesh(puppetId)
      .then((puppet) => {
        if (puppet) {
          dranimate.addPuppet(puppet);
        }
        this.props.onClose();
      });
  }

  updateThresholdUi = event => this.setState({ threshold: event.target.value });

  onZoomSelect = isZoomIn => isZoomIn ?
    this.imageToMesh.zoomIn() : this.imageToMesh.zoomOut();

  onCanvasSelectType = event => {
    const selector = event.target.value;
    this.imageToMesh.setSelectState(event.target.value);
    this.setState({ selector });
  }

  render() {
    return (
      <div className={styles.scrim}>
        <div className={styles.puppetEditor}>
          <div>
            <canvas
              className={styles.editorCanvas}
              ref={input => this.canvasElement = input}
              onMouseMove={this.imageToMesh.onMouseMove}
              onMouseDown={this.imageToMesh.onMouseDown}
              onContextMenu={this.imageToMesh.onContextMenu}
              onMouseUp={this.imageToMesh.onMouseUp}
              onMouseOut={this.imageToMesh.onMouseOut}
              onMouseOver={this.imageToMesh.onMouseOver}
            />
            <ZoomPanner
              onZoomSelect={this.onZoomSelect}
              />
          </div>
          <div className={styles.editorControls}>
            <h1>Edit puppet</h1>
            <div>
              <p>Selection type:</p>
              <div>
                <input
                  type="radio"
                  name="selectionType"
                  id="select"
                  value="SELECT"
                  onChange={this.onCanvasSelectType}
                  checked={this.state.selector === 'SELECT'}
                />
                <label htmlFor="select">Select</label>
                <br />
                <input
                  type="radio"
                  name="selectionType"
                  id="deselect"
                  value="DESELECT"
                  onChange={this.onCanvasSelectType}
                  checked={this.state.selector === 'DESELECT'}
                />
                <label htmlFor="deselect">Deselect</label>
                <br />
                <input
                  type="radio"
                  name="selectionType"
                  id="controlPoints"
                  value="CONTROL_POINT"
                  onChange={this.onCanvasSelectType}
                  checked={this.state.selector === 'CONTROL_POINT'}
                />
                <label htmlFor="controlPoints">Control Points</label>
                <br />
                <input
                  type="radio"
                  name="selectionType"
                  id="pan"
                  value="PAN"
                  onChange={this.onCanvasSelectType}
                  checked={this.state.selector === 'PAN'}
                />
                <label htmlFor="pan">Pan</label>
              </div>
            </div>

            <div>
              <label htmlFor="thresholdSlider">Threshold</label>
              <input
                type="range"
                id="thresholdSlider"
                min="5"
                max="75"
                defaultValue={this.state.threshold}
                onChange={this.updateThresholdUi}
                onMouseUp={this.runSlic}
              />
              <span>{this.state.threshold}</span>
              <br />
            </div>

            <div className={styles.saveCancel}>
              <button onClick={this.onCancel}>Cancel</button>
              <button onClick={this.onSave}>Save</button>
            </div>
          </div>
          <Loader isVisible={this.state.loaderIsVisible} />
        </div>
      </div>
    );
  }
}

PuppetEditor.PropTypes = {
  onClose: PropTypes.func.isRequired
};

export default PuppetEditor;
