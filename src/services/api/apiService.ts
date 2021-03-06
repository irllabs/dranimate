import * as firebase from 'firebase';
import { getPuppetJsonFile } from 'services/storage/serializer';
import GifDB from 'services/api/models/GifDB';
import PuppetDB from 'services/api/models/PuppetDB';
import userService from 'services/api/userService';
import loadPuppetFromFile from 'services/storage/deserializer';

const PUPPET_COLLECTION = 'puppets';
const GIF_COLLECTION = 'gifs';

function getBlobFromUrl(url: string): Promise<Blob> {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.responseType = 'text';
		xhr.onload = (): void => {
			const blob = new Blob([xhr.response], {type : 'application/json'});
			resolve(blob);
		};
		xhr.ontimeout = error => {
			reject(error);
		};
		xhr.onerror = error => {
			reject(error);
		};
		xhr.open('GET', url);
		xhr.send();
	});
}

class ApiService {
	private _db = firebase.firestore();
	private _storage = firebase.storage();

	public getAllPuppetsForUser(): any {
		const userId = userService.getUserId();
		return this._db.collection(PUPPET_COLLECTION).where('userId', '==', userId).get()
			.then(snapshot => snapshot.docs.map((doc) =>
				PuppetDB.fromJson(doc.data()).setDatabaseId(doc.id)
			))
			.catch(error => console.log(error));
	}

	getAllGifsForUser() {
		const userId = userService.getUserId();
		return this._db.collection(GIF_COLLECTION).where('userId', '==', userId).get()
			.then(snapshot => snapshot.docs.map((doc) =>
				GifDB.fromJson(doc.data()).setDatabaseId(doc.id)
			))
			.catch(error => console.log(error));
	}

	openPuppet(puppetModel) {
		return this._storage.ref().child(puppetModel.getStorageRef()).getDownloadURL()
			.then(getBlobFromUrl)
			.then(loadPuppetFromFile);
	}

	deletePuppet(puppetModel) {
		console.log('delete puppet', puppetModel)
		const documentId = puppetModel.getDatabaseId();
		const puppetJsonRef = this._storage.ref().child(puppetModel.getStorageRef());
		const foregroundImageRef = this._storage.ref().child(puppetModel.getThumbnailStorageRef());
		return Promise.all([
			puppetJsonRef.delete(),
			foregroundImageRef.delete()
		])
		.then(() => {
			console.log('storage refs deleted');
			return this._db.collection(PUPPET_COLLECTION).doc(documentId).delete();
		});
	}

	deleteGif(gifModel) {
		const documentId = gifModel.getDatabaseId();
		const gifStorageRef = this._storage.ref().child(gifModel.getStorageRef());
		return gifStorageRef.delete()
			.then(() => this._db.collection(GIF_COLLECTION).doc(documentId).delete());
	}

	async savePuppet(puppet) {
		// save puppet json blob & puppet thumbnail to storage
		// save puppetID, puppetName, jsonBlobRef, and storageRef to DB

		const userId = userService.getUserId();
		const base64Thumbnail = puppet.imageNoBG.src;
		const puppetJsonBlob = getPuppetJsonFile(puppet);
		const puppetJsonRef = this._storage.ref().child(`test${Math.random()}`);
		const foregroundImageRef = this._storage.ref().child(`testthumb${Math.random()}`);
		return Promise.all([
			puppetJsonRef.put(puppetJsonBlob),
			foregroundImageRef.putString(base64Thumbnail, 'data_url')
		])
		.then(async ([puppetJsonSnapshot, thumbnailSnapshot]) => {
			const puppetStorageRef = puppetJsonSnapshot.metadata.fullPath;
			const thumbnailStorageRef = thumbnailSnapshot.metadata.fullPath;
			const thumbnailUrl = await thumbnailSnapshot.ref.getDownloadURL();
			const puppetModel = new PuppetDB()
				.setName(puppet.getName())
				.setStorageRef(puppetStorageRef)
				.setThumbnailStorageRef(thumbnailStorageRef)
				.setThumbnailUrl(thumbnailUrl)
				.setUserId(userId)
				.toJson();

			const docName = `${puppet.name}-${Math.random()}`;

			return this._db.collection(PUPPET_COLLECTION).add(puppetModel);

			// TODO: use uuid for puppet creation, then use set
			// return this.db.collection(PUPPET_COLLECTION).doc(PUPPET-UUID).set(data);
		})
	}

	saveGif(gifBlob, gifName) {
		const userId = userService.getUserId();
		const gifRef = this._storage.ref().child(`gif-${Math.random()}`);

		return gifRef.put(gifBlob)
			.then((gifSnapshot) => {
				const gifStorageRef = gifSnapshot.metadata.fullPath;
				const url = gifSnapshot.downloadURL;
				const gifModel = new GifDB()
					.setName(gifName)
					.setStorageRef(gifStorageRef)
					.setUrl(url)
					.setUserId(userId)
					.toJson();
				return this._db.collection(GIF_COLLECTION).add(gifModel);
			});
	}

	getGifBlob(gifUrl) {
		return getBlobFromUrl(gifUrl);
	}

}

const apiService = new ApiService();
export default apiService;
