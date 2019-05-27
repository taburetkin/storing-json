import DefaultSerializer from './serializer.js';

const Storage = function(stringStorage, options = {}) {
	this._store = stringStorage;
	this._initSerializer(options);
}
Storage.prototype = {
	_initSerializer(options) {
		if (options.serializer instanceof DefaultSerializer) {
			this.serializer = options.serializer; 
		} else {
			let Serializer = options.Serializer || DefaultSerializer;
			this.serializer = new Serializer(options.serializerOptions);
		}	
	},
	setItem(key, value, options) {
		let storeItem = this._createStoreItem(value, options);
		this._store.setItem(key, JSON.stringify(storeItem));
	},
	getItem(key, options) {
		let storedItem = this._store.getItem(key);
		let storedValue = this._parseStoredItem(storedItem, options);
		return storedValue;
	},

	_createStoreItem(value, options = {}) {
		if (options.wrap == null) {
			options.wrap = true;
		}
		let item = this.serializer.toJSON(value, options);
		if (options.expiresAt) {
			item._xStorageEpxAt = options.expiresAt.valueOf ? options.expiresAt.valueOf() : options.expiresAt;
		}
		return item;
	},
	_parseStoredItem(stringValue, options = {}) {
		let expired = JSON.parse(stringValue, (key, value) => {
			if (key == '_xStorageEpxAt' && typeof value === 'number') {
				if (isNaN(value)) return false;
				return Date.now() > value;
			}
			if (!key && value._xStorageEpxAt != null) {
				return value._xStorageEpxAt;
			}
		});
		if (expired) {
			return;
		}
		let parsed = JSON.parse(stringValue);
		if (options.unwrap == null) {
			options.unwrap = true;
		}
		return this.serializer.toObject(parsed, options);
	},

}

export default Storage;
