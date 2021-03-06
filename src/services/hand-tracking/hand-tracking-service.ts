import * as handpose from '@tensorflow-models/handpose';

import eventManager from './../../services/eventManager/event-manager';

interface HandPoseAnnotation {
	[key: string]: Array<[number, number, number]>;
}

export default class HandTrackingService {
	private model: handpose.HandPose;
	private video = null;
	private tracking = false;
	private palmPositionData = null;
	private onUpdatePosition = null;
	private partPositionData = {};
	private videoDataLoaded = false;

	private lowPassFilterEnabled = false;
	private lowPassSamplesCount = 4;
	private lowPassSamples: HandPoseAnnotation[] = [];

	constructor() {
		eventManager.on('low-pass-filter-toggle', this.lowPassFilterToggle);
		eventManager.on('low-pass-filter-samples-set', this.lowPassFilterSamplesSet);
	}

	private async loadAsync(): Promise<void> {
		this.model = await handpose.load();
		await this.loadVideoAsync();
	}

	private lowPassFilterToggle = (enabled: boolean): void => {
		this.lowPassFilterEnabled = enabled;
		this.lowPassSamples = [];
	}

	private lowPassFilterSamplesSet = (samples: number): void => {
		this.lowPassSamplesCount = samples;
		this.lowPassSamples = [];
	}

	/**
	 * Requests access to user camera and returns a handle to video element
	 */
	private async setupCameraAsync(): Promise<HTMLVideoElement> {
		const videoElement = document.getElementById('video') as HTMLVideoElement;
		const stream = await navigator.mediaDevices.getUserMedia({
			'audio': false,
			'video': {
				facingMode: 'user',
				width: window.innerWidth / 2,
				height: window.innerHeight / 2
			},
		});
		videoElement.srcObject = stream;
		
		return new Promise((resolve) => {
			videoElement.onloadedmetadata = (): void => {
				resolve(videoElement);
			};
		});
	}

	private async loadVideoAsync(): Promise<void> {
		this.video = await this.setupCameraAsync();
		this.video.play();
		this.videoDataLoaded = true;
	}

	/**
	 * Takes last [this.lowPassSamples] frames and averages them in order to stabilize input from hand-pose library.
	 */
	private lowPassFilter(inputData: HandPoseAnnotation): boolean {
		this.lowPassSamples.push(inputData);

		if (this.lowPassSamples.length < this.lowPassSamplesCount) {
			return false;
		}
		if (this.lowPassSamples.length > this.lowPassSamplesCount) {
			this.lowPassSamples.shift();
		}

		const handParts = ['thumb', 'indexFinger', 'middleFinger', 'ringFinger', 'pinky', 'palmBase'];

		this.lowPassSamples.forEach((sample) => {
			handParts.forEach((partName) => {
				const partPositionData = sample[partName];
				partPositionData.forEach((partData, index) => {
					if (!this[`${partName}-${index}-average`]) {
						this[`${partName}-${index}-average`] = [0, 0, 0];
					}

					this[`${partName}-${index}-average`][0] += partData[0];
					this[`${partName}-${index}-average`][1] += partData[1];
					this[`${partName}-${index}-average`][2] += partData[2];
				});
			});
		});

		handParts.forEach((partName) => {
			for(let i = 0; i < 4; i++) {
				if (this[`${partName}-${i}-average`]) {
					this[`${partName}-${i}-average`][0] /= this.lowPassSamplesCount;
					this[`${partName}-${i}-average`][1] /= this.lowPassSamplesCount;
					this[`${partName}-${i}-average`][2] /= this.lowPassSamplesCount;
				}
			}
		});

		handParts.forEach((partName) => {
			const partPositionData = this.palmPositionData[partName];
				partPositionData.forEach((partData, index) => {
					partData[0] = this[`${partName}-${index}-average`][0];
					partData[1] = this[`${partName}-${index}-average`][1];
					partData[2] = this[`${partName}-${index}-average`][2];

					this[`${partName}-${index}-average`][0] = 0;
					this[`${partName}-${index}-average`][1] = 0;
					this[`${partName}-${index}-average`][2] = 0;
				});
		});

		return true;
	}

	async trackAsync(): Promise<void> {
		if (!this.model) {
			await this.loadAsync();
		}
		if (!this.video || !this.videoDataLoaded) {
			return;
		}

		const predictions = await this.model.estimateHands(this.video, true);

		// If at least one hand is detected
		if (predictions.length > 0) {
			this.palmPositionData = predictions[0].annotations;

			if (this.lowPassFilterEnabled) {
				const result = this.lowPassFilter(predictions[0].annotations);
				if (result) {
					this.onUpdatePosition(this.palmPositionData);
				}
			}
			else {
				this.onUpdatePosition(this.palmPositionData);
			}
		}
		else {
			this.palmPositionData = null;
		}
	}
}
