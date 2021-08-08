import React, { Component } from 'react';

import ImportOrCreate from './import-or-create/import-or-create';
import ImageEditor from './image-editor/image-editor';
import ControlPointEditor from './control-point-editor/control-point-editor';
import PuppetDetailsEditor from './puppet-details-editor/puppet-details-editor';

import dranimate from 'services/dranimate/dranimate';
import puppetEditorStateService from 'services/imagetomesh/puppet-editor-state-service';
import generateUniqueId from 'services/util/uuid';
import { generateMesh } from 'services/imagetomesh/generateMesh';
import { getImageDataFromImage } from 'services/imagetomesh/ImageUtil';
import loadImage from 'services/util/imageLoader';
import apiService from 'services/api/apiService';
import userService from 'services/api/userService';

import './puppet-editor.scss';

import eventManager from 'services/eventManager/event-manager';
import Puppet from 'services/puppet/puppet';
import ControlPoint from 'services/puppet/control-point';

enum EditorStep {
	IMPORT_OR_CREATE = 'import-or-create',
	IMAGE = 'image',
	CONTROL_POINT = 'control-point',
	DETAILS = 'details',
}

interface PuppetEditorProps {
	onClose: () => void;
}

interface PuppetEditorState {
	imageSrc: any;
	step: EditorStep;
	backgroundRemovalData: any;
	controlPoints: ControlPoint[];
	zoom: number;
	name: string;
}

class PuppetEditor extends Component<PuppetEditorProps, PuppetEditorState> {
	constructor(props: PuppetEditorProps) {
		super(props);

		if (puppetEditorStateService.isPuppet) {
			const puppet = puppetEditorStateService.getItem();
			this.state = {
				imageSrc: puppet.image.src,
				backgroundRemovalData: puppet.backgroundRemovalData || null,
				controlPoints: puppet.controlPointPositions,
				zoom: 1,
				step: EditorStep.IMAGE,
				name: puppet.name,
			};
		}
		else {
			this.state = {
				imageSrc: puppetEditorStateService.getItem(),
				step: EditorStep.IMPORT_OR_CREATE,
				backgroundRemovalData: null,
				controlPoints: null,
				zoom: 1,
				name: 'My puppet'
			};
		}
	}

	public componentWillUnmount = (): void => {
		eventManager.emit('puppet-editor-closed', {});
	}

	public componentDidMount = (): void => {
		eventManager.emit('puppet-editor-opened', {});
	}

	private onClose = (): void => {
		this.props.onClose();
	}

	onCreate = (): void => {
		this.setState({
			imageSrc: puppetEditorStateService.getItem(),
			step: EditorStep.IMAGE
		})
	}

	onImageEditorBack = (): void => {
		this.setState({
			step: EditorStep.IMPORT_OR_CREATE,
			imageSrc: null,
			backgroundRemovalData: null,
		})
	}

	onImageEditorNext = (backgroundRemovalData, zoom): void => {
		this.setState({
			step: EditorStep.CONTROL_POINT,
			backgroundRemovalData,
			zoom: zoom
		});
	}

	onControlPointEditorBack = (): void => {
		this.setState({
			step: EditorStep.IMAGE
		});
	}

	onControlPointEditorNext = (controlPoints): void => {
		this.setState({
			step: EditorStep.DETAILS,
			controlPoints: controlPoints,
		});
	}

	onPuppetDetailsEditorBack = (): void => {
		this.setState({
			step: EditorStep.CONTROL_POINT
		});
	}

	onSaveAsync = async (): Promise<void> => {
		if (this.state.controlPoints.length < 2) {
			alert('Puppet must have at least two control points');
			return;
		}
		const puppetId = puppetEditorStateService.isPuppet ?
			puppetEditorStateService.getItem().id : generateUniqueId();

		return loadImage(this.state.imageSrc)
			.then((imageElement) => {
				const { width, height } = this.state.backgroundRemovalData;
				const originalImageData = getImageDataFromImage(imageElement, width, height);
				return generateMesh(puppetId, this.state.name, imageElement, this.state.backgroundRemovalData, originalImageData, this.state.controlPoints);
			})
			.then((puppet) => {
				if (puppet) {
					dranimate.addPuppet(puppet);
					return this.savePuppetAsync(puppet).then(() => {
						dranimate.puppetAddedCallbacks.forEach((callback) => {
							callback(puppet);
						});

						this.onClose();
					});
				}
			});
	}

	/**
	 * Saves puppet in database.
	 */
	private savePuppetAsync = async(puppet: Puppet): Promise<void> => {
		if (!userService.isAuthenticated()) {
			console.warn('User not logged in, skipping puppet save to DB...');
			return;
		}
		await apiService.savePuppet(puppet);
	}

	private onNameChange = (value: string): void => {
		this.setState({
			name: value,
		});
	}

	render(): JSX.Element {
		return (
			<div className='puppet-editor-backdrop'>
				{this.state.step === EditorStep.IMPORT_OR_CREATE
				&& <ImportOrCreate
					onCancel={this.onClose}
					onCreate={this.onCreate}
				/>}
				{this.state.step === EditorStep.IMAGE
				&& <ImageEditor
					imageSrc={this.state.imageSrc}
					backgroundRemovalData={this.state.backgroundRemovalData}
					onCancel={this.onClose}
					onBack={this.onImageEditorBack}
					onNext={this.onImageEditorNext}
				/>}
				{this.state.step === EditorStep.CONTROL_POINT
				&& <ControlPointEditor
					imageSrc={this.state.imageSrc}
					backgroundRemovalData={this.state.backgroundRemovalData}
					controlPointPositions={this.state.controlPoints}
					onBack={this.onControlPointEditorBack}
					onClose={this.onClose}
					onSave={this.onSaveAsync}
					zoom={this.state.zoom}
					onNext={this.onControlPointEditorNext}
				/>}
				{this.state.step === EditorStep.DETAILS
				&& <PuppetDetailsEditor
					onClose={this.onClose}
					onBack={this.onPuppetDetailsEditorBack}
					onSaveAsync={this.onSaveAsync}
					onNameChange={this.onNameChange}
					imageSrc={this.state.imageSrc}
					backgroundRemovalData={this.state.backgroundRemovalData}
					zoom={this.state.zoom}
					name={this.state.name}
				/>}
			</div>
		);
	}
}
export default PuppetEditor;
