# json-web-storage
Allow to store json or strongly typed data in a string key/value storage.  
In general was designed for using with `localStorage` and `sessionStorage` but may be used with any kind of store, f.e. `redis` or any backend inmemory store.

![version](https://img.shields.io/github/package-json/v/taburetkin/json-web-storage.svg)
[![Coverage Status](https://coveralls.io/repos/github/taburetkin/json-web-storage/badge.svg?branch=master)](https://coveralls.io/github/taburetkin/json-web-storage?branch=master)
![Build status](https://secure.travis-ci.org/taburetkin/json-web-storage.svg?branch=master)

## how to install
```
npm i json-web-storage
```

or

```
yarn add json-web-storage
```
## how to use
### common case
```js
import { JsonStorage } from 'json-web-storage';

const store = new JsonStorage({ store: localStorage });

const MyClass = function(foo, bar) {
  this.foo = foo;
  this.bar = bar;
}

store.addType({
  type: MyClass,
  toJSON: value => ({ foo: value.foo, bar: value.bar }),
  toObject: value => new MyClass(value.foo, value.bar)
});

const instance = new MyClass('foo', 'bar');

store.setItem('somekey', instace);

let restored = store.getItem('somekey');

console.log(restored instanceof MyClass); // true

```

### Expiration
If given storage do not support expiration you can use `expiresAt` option
```js
// declarations are like in previous example

const instance = new MyClass('foo', 'bar');
store.setItem('somekey', instace, { expiresAt: Date.now() + 2000 });

let restored = store.getItem('somekey');
console.log(restored instanceof MyClass); // true

setTimeout(() => {
  restored = store.getItem('somekey');
  console.log( restored === undefined ); // true
}, 2010);

```

## Contents

### JsonStorage, class
#### usage: 
```js
new JsonStorage({
  // IStorage is anything with setItem and getItem methods.
  store: IStorage, 
  
  // should be provided with storeSet method together
  // will be used to create fake internal store
  storeGet: method, default: undefined,

  // should be provided with storeGet method together
  // will be used to create fake internal store
  storeGet: method, default: undefined,

  // if true, getItem and setItem returns promises
  async: Boolean, default: false, 

  // if false there is no serialization/desirialization to string
  stringStore: Boolean, default: true,

  // If true enables expiration of stored items
  expire: Boolean, default: false,

  // if false there is no type wrapping and values stored as is
  wrap: Boolean, default: true,

  // if true allow circular dependencies in passed item
  // otherwise will throw an error on `setItem`
  circularDependency: Boolean, default: false,

  // passed to the Serializer as options at initialize time
  serializerOptions: Object, default: undefined,

  // if provided will used internally instead of default serializer
  // serializerOptions will be ignored in this case
  serializer: serializer instance, default: undefined,

  // if provided will be used with serializerOptions to create default serializer
  // at initialize time
  Serializer: Serializer class, default: undefined,

});
```
#### required options:
You have to provide `store` or `storeGet` with `storeSet` methods.
* case 1: `{ store }`
* case 2: `{ storeGet, storeSet }`

#### use cases:
```js
const storeGet = (...args) => redis.get(...args);
const storeSet = (...args) => redis.set(...args);
const store = new JsonStorage({ storeGet, storeSet });

const inMemory = {
  _item: {},
  setItem(key, value) {
    this._item[key] = value;
  },
  getItem(key) {
    return this._item[key];
  }
}

const myInmemory = new JsonStorage({ store: inMemory });

```

#### methods:

**setItem(string key, any value, [object options])**  
puts value to the store.  
*options:*
  - expiresAt: number, default: undefined.  
  *If provided sets expiration of value. Will be ignored if storage `useExpiration` is false. for expiring value after one second use: `Date.now() + 1000`*  
  - wrap: Boolean, default: undefined.  
  *Overrides Storage wrap options.*  
  - supportCircularDependency: Boolean, default: undefined.  
  *Overrides storage circularDependency option.*

**getItem(string key, [object options])**  
gets value from the store.

*options:*
  - unwrap: Boolean, default: undefined.  
  *If storage `wrap` is true and this options is `false` will not unwrap stored values.*

### Serializer, class
internally used in JsonStorage. Do all the job.
#### usage:
```js
new Serializer({
  // add types to the type store for allowing better processing.
  // store is empty by default
  types: TypeContext Array, default: undefined,  

  // Used in toJSON method. If true, wrap any value to some special typed json
  wrap: Boolean, default: undefined,

  // Used in toObject method. If false toObject returns given value.
  unwrap: Boolean, default: !wrap,

  // Used in toJSON method. If true will allow to pass objects with circular dependencies inside.
  supportCircularDependency: Boolean, default: false

});
```
#### use cases:
```js
const dateType = {
  type: Date,
  toJSON: date => date.valueOf(),
  toObject: value => new Date(value),
}
const serializer = new Serializer({ types: [ dateType ] });

const date = new Date();
let result = serializer.toJSON(date, { wrap: true });
// convert to wraped valueOf.
let recoverd = serializer.toObject(result);
// will restore Date instance

console.log(recoverd instanceof Date); // true
console.log(recoverd === date); // false
console.log(recoverd.valueOf() === date.valueOf()); // true


```
#### methods:

**addType(object TypeContext)**  
Adds `TypeContext` to the types store. Argument must have `type` property defined.

**getType(string | Type | instance argument)**  
Gets `TypeContext` from the store by name, by type or by instance.

**toJSON(any value, [object options])**  
Converts given value to some special typed json. 

*options:*
  - wrap: Boolean, default: undefined  
If set will override serializer wrap option
  - supportCircularDependency: Boolean, default: undefined  
If set will override serializer supportCircularDependency option

**toObject(any value, [object options])**  
Converts given value to regular value (unwraps if argument was wrapped).  

*options:*
  - unwrap: Boolean, default: undefined.  
  Overrides Serializer unwrap option.
