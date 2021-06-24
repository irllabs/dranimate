import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { RootState } from "../store";

import { createLiveVideoPuppet } from "services/puppet/puppet-factory";
import dranimate from "services/dranimate/dranimate";

import Puppet from "services/puppet/puppet";

export interface PuppetData {
	id: string;
	name: string;
	visible: boolean;
	selected: boolean;
	hasRecording: boolean;
	playing: boolean;
	type: string;
	opacity?: number;
	invert?: number;
	softness?: number;
	threshold?: number;
}

interface SetPuppetVisiblePayload {
	puppetId: string;
	visible: boolean;
}

interface SetPuppetSelectedPayload {
	puppetId: string;
	selected: boolean;
}

interface SetLiveVideoParamPayload {
	puppetId: string;
	value: number;
}

interface SetPuppetHasVideoPayload {
	puppetId: string;
	hasRecording: boolean;
}

interface SetPuppetPlayingPayload {
	puppetId: string;
	playing: boolean;
}

const initialState: {data: PuppetData[]} = {
	data: []
};

export const puppetsSlice = createSlice({
	name: 'puppets-slice',
	initialState,
	reducers: {
		addPuppet: (state, action: PayloadAction<Puppet>): void => {
			state.data.push({
				name: action.payload.getName(),
				id: action.payload.id,
				visible: true,
				selected: false,
				hasRecording: false,
				playing: false,
				type: 'puppet'
			});
		},
		addLiveVideo: (state): void => {
			const puppet = createLiveVideoPuppet();

			state.data.push({
				name: 'Live video',
				id: puppet.id,
				visible: true,
				selected: false,
				hasRecording: false,
				playing: false,
				opacity: 1,
				invert: 1,
				softness: 1,
				threshold: 0.5,
				type: 'livedraw-puppet'
			});
			
			dranimate.addPuppet(puppet);
		},
		setVisible: (state, action: PayloadAction<SetPuppetVisiblePayload>): void => {
			const puppet = dranimate.getPuppetWithId(action.payload.puppetId);
			puppet.setVisible(action.payload.visible);

			const puppetUiData = state.data.find((statePuppet) => {
				return statePuppet.id === action.payload.puppetId;
			});
			puppetUiData.visible = action.payload.visible;
		},
		setSelected: (state, action: PayloadAction<SetPuppetSelectedPayload>): void => {
			dranimate.puppets.forEach((puppet) => {
				puppet.setSelectionGUIVisible(false);
			});

			const puppet = dranimate.getPuppetWithId(action.payload.puppetId);
			puppet?.setSelectionGUIVisible(action.payload.selected);

			dranimate.mouseHandler.selectedPuppet = puppet;

			state.data.forEach((statePuppet) => {
				statePuppet.selected = false;
			});

			const puppetUiData = state.data.find((statePuppet) => {
				return statePuppet.id === action.payload.puppetId;
			});
			if (puppetUiData) {
				puppetUiData.selected = action.payload.selected;
			}

		},
		deletePuppet: (state, action: PayloadAction<string>): void => {
			dranimate.deleteSelectedPuppet();

			state.data = state.data.filter((puppet) => {
				return puppet.id !== action.payload;
			});
		},
		setOpacity: (state, action: PayloadAction<SetLiveVideoParamPayload>): void => {
			const puppet = dranimate.getPuppetWithId(action.payload.puppetId);
			puppet.setOpacity(action.payload.value);

			const puppetUiData = state.data.find((statePuppet) => {
				return statePuppet.id === action.payload.puppetId;
			});
			if (puppetUiData) {
				puppetUiData.opacity = action.payload.value;
			}
		},
		setInvert: (state, action: PayloadAction<SetLiveVideoParamPayload>): void => {
			const puppet = dranimate.getPuppetWithId(action.payload.puppetId);
			puppet.setInvert(action.payload.value);

			const puppetUiData = state.data.find((statePuppet) => {
				return statePuppet.id === action.payload.puppetId;
			});
			if (puppetUiData) {
				puppetUiData.invert = action.payload.value;
			}
		},
		setSoftness: (state, action: PayloadAction<SetLiveVideoParamPayload>): void => {
			const puppet = dranimate.getPuppetWithId(action.payload.puppetId);
			puppet.setSoftness(action.payload.value);

			const puppetUiData = state.data.find((statePuppet) => {
				return statePuppet.id === action.payload.puppetId;
			});
			if (puppetUiData) {
				puppetUiData.softness = action.payload.value;
			}
		},
		setThreshold: (state, action: PayloadAction<SetLiveVideoParamPayload>): void => {
			const puppet = dranimate.getPuppetWithId(action.payload.puppetId);
			puppet.setThreshold(action.payload.value);

			const puppetUiData = state.data.find((statePuppet) => {
				return statePuppet.id === action.payload.puppetId;
			});
			if (puppetUiData) {
				puppetUiData.threshold = action.payload.value;
			}
		},
		setHasRecording: (state, action: PayloadAction<SetPuppetHasVideoPayload>): void => {
			const puppet = dranimate.getPuppetWithId(action.payload.puppetId);

			if (!action.payload.hasRecording) {
				puppet.clearRecording();
			}
			if (action.payload.hasRecording) {
				puppet.playing = true;
			}

			const puppetUiData = state.data.find((statePuppet) => {
				return statePuppet.id === action.payload.puppetId;
			});
			if (puppetUiData) {
				puppetUiData.hasRecording = action.payload.hasRecording;
				puppetUiData.playing = action.payload.hasRecording;
			}
		},
		setPlaying: (state, action: PayloadAction<SetPuppetPlayingPayload>): void => {
			const puppet = dranimate.getPuppetWithId(action.payload.puppetId);
			puppet.playing = action.payload.playing;

			const puppetUiData = state.data.find((statePuppet) => {
				return statePuppet.id === action.payload.puppetId;
			});
			if (puppetUiData) {
				puppetUiData.playing = action.payload.playing;
			}
		},
		setName: (state, action: PayloadAction<{name: string, puppetId: string}>): void => {
			const puppetUiData = state.data.find((statePuppet) => {
				return statePuppet.id === action.payload.puppetId;
			});
			if (puppetUiData) {
				puppetUiData.name = action.payload.name;
			}
		},
	}
});

export const { addPuppet, addLiveVideo, setVisible, setSelected, deletePuppet, setOpacity, setInvert, setSoftness, setThreshold, setHasRecording, setPlaying, setName } = puppetsSlice.actions;

export const selectPuppets = (state: RootState): PuppetData[] => state.puppets.data;
export const selectActivePuppet = (state: RootState): PuppetData => {
	return state.puppets.data.find((puppet) => {
		return puppet.selected;
	});
}

export default puppetsSlice.reducer;
