import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Loader from 'components/loader';
import ImageEditor from 'components/puppetEditor/ImageEditor';
import ControlPointEditor from 'components/puppetEditor/ControlPointEditor';
import Slider from 'components/primitives/slider';
import dranimate from 'services/dranimate/dranimate';
import puppetEditorStateService from 'services/imageToMesh/PuppetEditorStateService';
import generateUniqueId from 'services/util/uuid';
import { generateMesh } from 'services/imagetomesh/generateMesh';
import { getImageDataFromImage } from 'services/imagetomesh/ImageUtil';
import loadImage from 'services/util/imageLoader';
import styles from './styles.scss';

const STEPS = {
  IMAGE: 'IMAGE',
  CONTROL_POINT: 'CONTROL_POINT'
};

class PuppetEditor extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loaderIsVisible: false,
      step: STEPS.IMAGE,
      imageSrc: null,
      backgroundRemovalData: null,
      controlPointPositions: null,
    };
  }

  componentWillMount() {
    if (puppetEditorStateService.isPuppet) {
      const puppet = puppetEditorStateService.getItem();
      this.setState({
        imageSrc: puppet.image.src,
        backgroundRemovalData: puppet.backgroundRemovalData || null,
        controlPointPositions: puppet.controlPointPositions
      });
    }
    else {
      this.setState({
        imageSrc: puppetEditorStateService.getItem()
      });
    }
  }

  onClose = () => this.props.onClose();

  onImageEditorNext = backgroundRemovalData => {
    this.setState({
      step: STEPS.CONTROL_POINT,
      backgroundRemovalData
    });
  }

  onControlPointEditorBack = () => {
    this.setState({
      step: STEPS.IMAGE
    });
  }

  onSave = (controlPointPositions) => {
    if (controlPointPositions.length < 2) {
      alert('Puppet must have at least two control points');
      return;
    }
    const puppetId = puppetEditorStateService.isPuppet ?
      puppetEditorStateService.getItem().id : generateUniqueId();

    loadImage(this.state.imageSrc)
      .then((imageElement) => {
        const { width, height } = this.state.backgroundRemovalData;
        const originalImageData = getImageDataFromImage(imageElement, width, height);
        return generateMesh(puppetId, imageElement, this.state.backgroundRemovalData, originalImageData, controlPointPositions);
      })
      .then((puppet) => {
        if (puppet) {
          dranimate.addPuppet(puppet);
        }
        this.onClose();
      });
  }

  render() {
    return (
      <div className={styles.scrim}>
        <div className={styles.puppetEditor}>
          {
            this.state.step === STEPS.IMAGE ?
              <ImageEditor
                imageSrc={this.state.imageSrc}
                backgroundRemovalData={this.state.backgroundRemovalData}
                onCancel={this.onClose}
                onNext={this.onImageEditorNext}
              /> :
              <ControlPointEditor
                imageSrc={this.state.imageSrc}
                backgroundRemovalData={this.state.backgroundRemovalData}
                controlPointPositions={this.state.controlPointPositions}
                onClose={this.onControlPointEditorBack}
                onSave={this.onSave}
              />
          }
          <Loader isVisible={this.state.loaderIsVisible} />
        </div>
      </div>
    );
  }
}

PuppetEditor.propTypes = {
  onClose: PropTypes.func.isRequired,
  puppet: PropTypes.object,
  imageSrc: PropTypes.string
};

export default PuppetEditor;
