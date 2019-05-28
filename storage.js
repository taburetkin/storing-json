import DefaultSerializer from './serializer.js';

const JsonStorage = function JsonStorage(options) {
  // initializes internal store
  // you can just pass storeGet and storeSet methods, or only store if it has `setItem` and `getItem` methods
  this._initStorage(options.store, options.storeGet, options.storeSet);

  // by default store is sync, but if its not, then you can pass async: true
  // this will indicate that store's get item returns promise and should be processed in async manner
  this.isAsync = options.async === true;

  // by default store should be a string store, but if its not
  // you can pass stringStore: false for removing serialization/deserialization of stored values
  this.isStringStore = options.stringStore !== false;

  //if your store does not support expiration mechanic you may use this option - expire: true
  //mostly developed for browser local and session storages.
  this.useExpiration = options.expire === true;
  this.expireKeyPrefix = '_xexp:'; // - will set expiration as `'_xexp:[yourkey]': expirationValue`

  // by default every object will be wrapped for processing with custom serializators
  // but you can turn this option off by passing wrap: false
  this.wrap = options.wrap !== false;

  // by default this option is turned off, but when it enabled it will allow you to pass objects which have circular dependencies inside
  // this option works only when `wrap` is set to true
  // you will get an error if there is a circular dependency inside and this option is disabled
  this.circularDependency = options.circularDependency === true;

  this._initSerializer(options);
}

// here is a runtime fail on prototype asign, thats why we should ignore next line until this will not fixed in instanbul
/* istanbul ignore next */
JsonStorage.prototype = {

  Serializer: DefaultSerializer,

  // sets item to a store
  setItem(key, value, options) {
    let json = this._createStoreItem(value, options);
    let text = this.convertToString(json);
    this.setItemExpiration(key, options);
    let res = this.setItemToStore(key, text);
    return res;
  },

  setItemToStore(key, value) {
    return this._store.setItem(key, value);
  },

  setItemExpiration(key, options = {}) {
    if (!this.useExpiration || !options.expiresAt) {
      return;
    }
    let expiresAt = options.expiresAt;
    let expKey = this.expireKeyPrefix + key;
    this.setItemToStore(expKey, expiresAt);
  },

  // gets item from store
  getItem() {
    if (this.isAsync) {
      return this.getItemAsync.apply(this, arguments);
    } else {
      return this.getItemSync.apply(this, arguments);
    }
  },

  getItemSync(key, options) {
    let expired = this.checkExpireSync(key, options);
    if (expired) {
      return;
    }
    let text = this.getItemFromStore(key);
    let json = this.parseStringValue(text);
    return this._parseStoredItem(json, options);
  },

  async getItemAsync(key, options) {
    let expired = await this.checkExpireAsync(key, options);
    if (expired) {
      return;
    }
    let text = await this.getItemFromStore(key);
    let json = this.parseStringValue(text);
    return this._parseStoredItem(json, options);
  },

  checkExpireSync(key, options = {}) {
    if (!this.useExpiration || options.expired === false) {
      return;
    }
    let expKey = this.expireKeyPrefix + key;
    let expired = this.getItemSync(expKey, { expired: false });
    return !expired || expired < Date.now();
  },

  async checkExpireAsync(key, options = {}) {
    if (!this.useExpiration || options.expired === false) {
      return;
    }
    let expKey = this.expireKeyPrefix + key;
    let expired = await this.getItemAsync(expKey, { expired: false });
    return !expired || expired < Date.now();
  },


  getItemFromStore(key) {
    return this._store.getItem(key);
  },

  //#region helpers

  parseStringValue(text) {
    if (text == null) return;
    if (!this.isStringStore) {
      return text;
    }
    return JSON.parse(text);
  },

  convertToString(storeItem) {
    if (!this.isStringStore) {
      return storeItem;
    }
    return JSON.stringify(storeItem);
  },

  _createStoreItem(value, options = {}) {
    if (options.wrap == null) { options.wrap = this.wrap; }
    if (options.supportCircularDependency == null) { options.supportCircularDependency = this.circularDependency; }
    return this.serializer.toJSON(value, options);
  },

  _parseStoredItem(json, options = {}) {
    if (options.unwrap == null) { options.unwrap = this.wrap; }
    return this.serializer.toObject(json, options);
  },

  _initSerializer(options) {
    if (options.serializer instanceof this.Serializer) {

      this.serializer = options.serializer;

    } else {
      let seropts = options.serializerOptions || {};
      if (seropts.wrap == null) {
        seropts.wrap = options.wrap;
      }
      if (seropts.unwrap == null) {
        seropts.unwrap = !options.wrap;
      }
      if (seropts.supportCircularDependency == null) {
        seropts.supportCircularDependency = options.circularDependency;
      }
      let Serializer = options.Serializer || this.Serializer;
      this.serializer = new Serializer(seropts);

    }
  },

  _initStorage(store, getItem, setItem) {
    if (store && store.getItem && store.setItem) {
      this._store = store;
    } else if (getItem && setItem) {
      this._store = {
        getItem,
        setItem
      }
    } else {
      throw new Error('You must provide a store which has `getItem` and `setItem` methods or you should provide `storeGet` and `storeSet` methods in options');
    }
  },
  //#region helpers

}

export default JsonStorage;
