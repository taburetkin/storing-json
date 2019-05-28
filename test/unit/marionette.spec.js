import { View } from 'backbone.marionette';
import { Model, Collection } from 'backbone';
import { JsonStorage } from '../..';


const fakeStore = {
  _i: {},
  setItem(k, v) {
    this._i[k] = v;
  },
  getItem(k) {
    return this._i[k];
  }
}


const MyView = View.extend({
  initialize(options) {
    this.mergeOptions(options, ['foo', 'bar', 'baz']);
  },
});

const MyViewType = {
  type: MyView,
  toJSON: v => v.options,
  toObject: v => {
    v.model = new MyModel(v.model);
    v.collection = new MyCollection(v.collection);
    return new MyView(v)
  }
}

const MyModel = Model.extend({});

const MyModelType = {
  type: MyModel,
  toObject: v => new MyModel(v)
};

const MyCollection = Collection.extend({});
const MyCollectionType = {
  type: MyCollection,
  toObject: v => new MyCollection(v)
};

const store = new JsonStorage({
  store: fakeStore,
  wrap: true,
  serializerOptions: {
    types: [MyViewType, MyModelType, MyCollectionType]
  }
});

describe('testing backbone marionette serialization', function() {
  let test;
  let view;
  let model;
  let collection;
  beforeEach(function() {
    test = { foo: 1 };
    model = new MyModel({ test: 'paklya' });
    collection = new MyCollection([{id: 1}, {id: 2}]);
    view = new MyView({
      foo: 1, bar: 'asd',
      baz: model,
      model,
      collection
    });
  });
  it('should pack and unpack given model inside some context', function() {
    test.model = model;
    store.setItem('key', test);
    let res = store.getItem('key');
    expect(res.model).to.be.instanceof(MyModel);
    expect(res.model.get('test')).to.be.equal('paklya');
  });
  it('should pack and unpack given model', function() {
    store.setItem('key', model);
    let res = store.getItem('key');
    expect(res).to.be.instanceof(MyModel);
    expect(res.get('test')).to.be.equal('paklya');
  });
  it('should pack and unpack given collection inside some context', function() {
    test.col = collection;
    store.setItem('key', test);
    let res = store.getItem('key');
    expect(res.col).to.be.instanceof(MyCollection);
    expect(res.col.toJSON()).to.be.eql([{id: 1}, {id: 2}]);
  });
  it('should pack and unpack given collection', function() {
    store.setItem('key', collection);
    let res = store.getItem('key');
    expect(res).to.be.instanceof(MyCollection);
    expect(res.toJSON()).to.be.eql([{id: 1}, {id: 2}]);
  });
  it('should pack and unpack given collection inside some context', function() {
    test.view = view;
    store.setItem('key', test);
    let res = store.getItem('key');
    let resview = res.view;
    expect(resview).to.be.instanceof(MyView);
    expect(resview.model).to.be.instanceof(MyModel);
    expect(resview.collection).to.be.instanceof(MyCollection);
  });
});

