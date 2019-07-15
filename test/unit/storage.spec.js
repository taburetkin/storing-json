import { JsonStorage, Serializer } from '../../';

const waitFor = (n) => new Promise(res => setTimeout(res, n));

const fakeStore = {
  _i: {},
  setItem(k,v) {
    this._i[k] = v;
  },
  getItem(k) {
    return this._i[k];
  }
}

const fakeAsyncStore = {
  _i: {},
  setItem(k,v) {
    return new Promise((resolve) => {
      setTimeout(() => {
        this._i[k] = v;
        resolve(v);
      }, 10);
    });
  },
  getItem(k) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this._i[k]);
      }, 10);
    });
  }
}

describe('# Storage', function() {
  let store;
  let storeOptions = { store: fakeStore };
  describe('when initialized', function() {
    it('should throw if store options are not provided', function() {
      expect(() => new JsonStorage()).to.throw();
      expect(() => new JsonStorage({ store: 123 })).to.throw();
      expect(() => new JsonStorage({ store: {} })).to.throw();
      expect(() => new JsonStorage({ store: {}, storeGet: () => {} })).to.throw();
      expect(() => new JsonStorage({ store: {}, storeSet: () => {} })).to.throw();
      expect(() => new JsonStorage({ store: { setItem: () => {} }, storeSet: () => {} })).to.throw();
      expect(() => new JsonStorage({ storeSet: () => {} })).to.throw();
    });
    it('should not throw if store options are good enough', function() {
      expect(() => new JsonStorage({ store: { getItem: 'foo', setItem: 'bar' } })).to.not.throw();
      expect(() => new JsonStorage({ storeGet: 'foo', storeSet: 'bar' })).to.not.throw();
    });
    it('should set options', function() {
      store = new JsonStorage({ store: fakeStore, async: true, stringStore: false, expire: true, wrap: false, circularDependency: true });
      expect(store.isAsync).to.be.true;
      expect(store.isStringStore).to.be.false;
      expect(store.useExpiration).to.be.true;
      expect(store.wrap).to.be.false;
      expect(store.circularDependency).to.be.true;
    });
    it('should initialize serializer', function() {
      store = new JsonStorage(storeOptions);
      expect(store.serializer).to.be.instanceof(Serializer);
    });
    it('should initialize serializer with given options', function() {
      let dateType = {
        type: Date,
      }
      let serializerOptions = {
        types: [dateType]
      }
      let spy = this.sinon.spy(JsonStorage.prototype, 'Serializer');
      store = new JsonStorage({ store: fakeStore, serializerOptions});
      expect(spy).to.be.calledOnce.and.calledWith(serializerOptions);
    });
    it('should initialize serializer if its Class passed in options with given options', function() {
      const MySerializer = function() {
        Serializer.apply(this, arguments);
      }
      MySerializer.prototype = Object.create(Serializer.prototype);
      MySerializer.prototype.constructor = Serializer;

      let dateType = {
        type: Date,
      }
      let serializerOptions = {
        types: [dateType]
      }
      let options = { store: fakeStore, Serializer: MySerializer, serializerOptions };
      let spy = this.sinon.spy(options, 'Serializer');
      store = new JsonStorage(options);
      expect(spy).to.be.calledOnce.and.calledWith(serializerOptions);
    });
    it('should take initialized serializer as is', function() {
      const MySerializer = function() {
        Serializer.apply(this, arguments);
      }
      MySerializer.prototype = Object.create(Serializer.prototype);
      MySerializer.prototype.constructor = Serializer;
      let dateType = {
        type: Date,
      }
      let serializerOptions = {
        types: [dateType]
      }
      let serializer = new MySerializer();
      let options = { store: fakeStore, serializer, Serializer: Serializer, serializerOptions };
      store = new JsonStorage(options);

      expect(store.serializer).to.be.instanceof(MySerializer);
    });
  });
  describe('when trying get not exist item', function() {
    it('should return udefined if item does not exist', function() {
      store = new JsonStorage(storeOptions);
      let res = store.getItem('notexistentkey');
      expect(res).to.be.undefined;
    });
  });
  describe('when passing wrap/unwrap as option', function() {
    const test1 = { foo: 1 };
    beforeEach(function() {
      store = new JsonStorage({ store: fakeStore, wrap: false });
    });
    it('should wrap value if wrap is true', function() {
      store.setItem('key', test1, { wrap: true });
      let res = store.getItem('key');
      expect(res).to.not.eql(test1);
    });
    it('should not unwrap value if unwrap is false', function() {
      store.setItem('key', test1, { wrap: true });
      let res = store.getItem('key', { unwrap: false });
      expect(res).to.not.eql(test1);
    });
  });
  describe('when circularDependencies not supported', function() {
    const opts = { supportCircularDependency: false };
    beforeEach(function() {
      store = new JsonStorage(storeOptions);
    });
    it('should not throw if there is no circular dependencies', function() {
      let foo = { foo: 1 };
      let test = { foo: foo, bar: foo };
      expect(store.setItem.bind(store, 'key', test, opts)).to.not.throw();
    });
    it('should throw if there is a circular dependencies', function() {
      let foo = { foo: 1 };
      let test = { foo: foo, bar: foo };
      foo.circular = test;
      expect(store.setItem.bind(store, 'key', test, opts)).to.throw();
    });
  });
  describe('when circularDependencies supported', function() {
    const opts = { supportCircularDependency: true };
    beforeEach(function() {
      store = new JsonStorage(storeOptions);
    });
    it('should not throw if there is no circular dependencies', function() {
      let foo = { foo: 1 };
      let test = { foo: foo, bar: foo };
      expect(store.setItem.bind(store, 'key', test, opts)).to.not.throw();
    });
    it('should not throw if there is a circular dependencies', function() {
      let foo = { foo: 1 };
      let test = { foo: foo, bar: foo };
      foo.circular = test;
      expect(store.setItem.bind(store, 'key', test, opts)).to.not.throw();
    });
  });
  describe('when using sync string store', function() {
    beforeEach(function() {
      store = new JsonStorage(storeOptions);
    });
    it('should call store\'s setItem with key and value on setItem', function() {
      let spy = this.sinon.spy(store._store, 'setItem');
      store.setItem('foo', 'bar');
      expect(spy).to.be.calledOnce.and.calledWith('foo', '"bar"');
    });
    it('should call store\'s getItem with key on getItem', function() {
      let spy = this.sinon.spy(store._store, 'getItem');
      store.getItem('foo');
      expect(spy).to.be.calledOnce.and.calledWith('foo');
    });
  });
  describe('when using sync non string store', function() {
    let setSpy;
    let getSpy;
    beforeEach(function() {
      store = new JsonStorage({ store: fakeStore, stringStore: false });
      setSpy = this.sinon.spy(store._store, 'setItem');
      getSpy = this.sinon.spy(store._store, 'getItem');
    });
    it('should call store\'s setItem with key and not stringified value on setItem', function() {
      store.setItem('foo', 'bar');
      expect(setSpy).to.be.calledOnce.and.calledWith('foo', 'bar');
    });
    it('should call store\'s setItem with key and not stringified value on setItem', function() {
      let test = {};
      store.setItem('foo', test, { wrap: false });
      expect(setSpy).to.be.calledOnce.and.calledWith('foo', test);
    });
    it('should get similar value', function() {
      let test = { foo: 123, bar: 456 };
      store.setItem('foo', test);
      let res = store.getItem('foo');
      expect(res).to.be.eql(test);
    });
  });
  describe('when using expiration', function() {
    const value = { some: 'value', to: 'test' };
    beforeEach(function() {
      store = new JsonStorage({ store: fakeStore, expire: true });
      store.setItem('expired', value, { expiresAt: Date.now() - 10 });
      store.setItem('valid', value, { expiresAt: Date.now() + 100 });
      store.setItem('neverend', value);
    });
    it('should return undefined for expired item', function() {
      let res = store.getItem('expired');
      expect(res).to.be.undefined;
    });
    it('should return value for not expired item', function() {
      let res = store.getItem('valid');
      expect(res).to.be.eql(value);
    });
    it('should return undefined for expired item #2', async function() {
      await waitFor(150);
      let res = store.getItem('valid');
      expect(res).to.be.undefined;
    });
    it('should return value for expired if expired option is set to false', async function() {
      await waitFor(150);
      let res = store.getItem('valid', { expired: false });
      expect(res).to.be.eql(value);
    });
    it('should return value if expiration was not set', async function() {
      await waitFor(150);
      let res = store.getItem('neverend');
      expect(res).to.be.eql(value);
    });

  });
  describe('when using async store', function() {
    const test2 = { foo: 1 };
    beforeEach(function() {
      store = new JsonStorage({ store: fakeAsyncStore, async: true, wrap: true, expire: true });
    });
    it('should return promise on setItem', function() {
      let res = store.setItem('key', test2);
      expect(res).to.be.instanceof(Promise);
    });
    it('should return promise on getItem', function() {
      let res = store.getItem('key');
      expect(res).to.be.instanceof(Promise);
    });
    it('should check expiration and return value for valid item and undefined for expired', async function() {
      await store.setItem('key', test2, { expiresAt: Date.now() + 50 });
      let res1 = await store.getItem('key');
      await waitFor(70);
      let res2 = await store.getItem('key');
      let res3 = await store.getItem('key', { expired: false });
      expect(res1).to.be.eql(test2);
      expect(res2).to.be.undefined;
      expect(res3).to.be.eql(test2);
    });
    it('should return value if expiration was not set', async function() {
      await store.setItem('neverend', true);
      await waitFor(150);
      let res = await store.getItem('neverend');
      expect(res).to.be.true;
    });

  });
});

