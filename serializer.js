const Serializer = function () {
	this.types = {
		items: [],
		byName: {}
	};
	this.addType({
		type: Date,
		toJSON: data => data.valueOf(),
		toObject: value => new Date(value),
	});
}


Serializer.prototype = {
	addType(typeContext = {}) {
		if (!typeContext.name) {
			typeContext.name = typeContext.type.name;
		}
		this.types.items.push(typeContext);
		this.types.byName[typeContext.name] = typeContext;
	},
	getType(type) {
		let typeName = typeof type === 'string' ? type : type.name;
		let byName = this.types.byName[typeName];
		if (byName || (typeName === type)) {
			return byName; 
		}
		
		for (let x = 0; x < this.types.items.length; x++) {
			let typeContext = this.types.items[x];
			if (type === typeContext.type || type.constructor === typeContext.type) {
				return typeContext;
			}
		}
	},

	_getToJsonOptions(options) {
		if (options == null || typeof options !== 'object') {
			return {
				inc: { id: 0 },
				procObjects: {},
				procJsons: {},
				procBranch: [],
				callbacks: [],
			}
		}

		!options.procObjects && (options.procObjects = {});
		!options.procBranch && (options.procBranch = []);
		!options.procJsons && (options.procJsons = []);
		!options.callbacks && (options.callbacks = []);
		!options.inc && (options.inc = { id: 0 });

		let childOptions = Object.assign({}, options);
		childOptions.procBranch = options.procBranch.slice(0);

		

		return childOptions;
	},

	toJSON(data, options) {
		// return primitives and null as is
		if (data == null || typeof data !== 'object') return data;
		// omit functions
		if (typeof data === 'function' || typeof data !== 'object') return;
		// return primitive objects as primitives
		if (data instanceof String || data instanceof Boolean || data instanceof Number)
			return data.valueOf();

		options = this._getToJsonOptions(options);

		// check object for circular dependency
		let founded = this._findObject(options, data);
		if (founded) {
			if (founded.inBranch) {
				// supporting circular dependency is not pretty safe and can lead to unexpected results
				// its better to avoid this
				if (!options.wrap || (options.wrap && !options.supportCircularDependency)) {
					throw new Error('Circular dependency founded');	
				}
			}
			if (options.wrap) {
				return { _xIdRef: founded.key };
			} 
		}

		// register given object for circural dependency check;
		let result;
		let context = this._registerObject(options, data, () => result);
		let dataType = data.constructor.name;

		// use native toJSON when serializers are disabled
		// for supporting native behavior
		let type = this.getType(data);
		if (type && type.toJSON) {

			result = type.toJSON(data, options, this);

		} else if (typeof data.toJSON === 'function') {

			result = data.toJSON();

		} else if (Array.isArray(data)) {

			let arrayToJson = data.reduce((memo, value) => {
				let json = this.toJSON(value, options);
				memo.push(json);

				return memo;
			}, []);
			result = arrayToJson;

		} else {

			let objectToJson = Object.keys(data).reduce((memo, key) => {
				let json = this.toJSON(data[key], options);
				if (!(options.skipUndefined && json === void 0)) {
					memo[key] = json;
				}
				return memo;
			}, {});
			result = objectToJson;
					
		}

		

		if (options.wrap) {
			let jr = result;
			result = { _xId: context.id, _xt: dataType, _xv: jr };
		}


		if (result && typeof result === 'object') {
			if (Array.isArray(result)) {
				context.json.push(...result);
			} else {
				Object.assign(context.json, result);
			}
		} else {
			context.json = result;
		}
		return result;
	},

	toObject(data, options = {}, level = 0) {
		if (!options.unwrap) return data;

	
		// return primitives and null as is
		if (data == null || typeof data !== 'object') {
			return data;
		}

		if (!options.callbacks) {
			options.callbacks = [];
		}
		if (!options.instances) {
			options.instances = this._extractRefs(data);
		}
		
		
		let result;
		
		if ('_xId' in data || '_xIdRef' in data || '_xt' in data || '_xv' in daata) {
			if (data._xIdRef) {
				result = options.instances[data._xIdRef];
				if (result && result.compiled) {
					result = result.compiled;
				} else {
					let cntx = result;
					result = () => {
						return cntx.compiled;
					}
				}
			} else {
				let id = data && data._xId;
				let type = this.getType(data._xt);

				result = data._xv;
				if (type && type.toObject) {
					
					result = type.toObject(data._xv);

				} else if (data._xv == null || typeof data._xv !== 'object') {
					
					result = data._xv;

				} else if (Array.isArray(data._xv)) {

					result = data._xv.reduce((memo, value, index) => {
						let result = this.toObject(value, options, level + 1);
						if (typeof result === 'function') {
							options.callbacks.push(() => {
								let later = result();
								memo.splice(index, 0, later)
							});
						} else {
							memo.push(result);
						}

						return memo;
					}, []);

				} else {
					result = Object.keys(data._xv).reduce((memo, key) => {
						let result = this.toObject(data._xv[key], options, level + 1);
						if (typeof result === 'function') {
							options.callbacks.push(() => memo[key] = result());
						} else {
							memo[key] = result;
						}
						return memo;
					}, {});
				}
				if (id != null) {
					let inst = options.instances[id];
					if (inst) {
						inst.compiled = result;
					}
				}
			}
		} else {
			return data;
		}	

		if (level == 0) {
			options.callbacks.map(method => method());
		}
		return result;
	},

	stringify(data, options) {
		let json = this.toJSON(data, options);
		return JSON.stringify(json);
	},
	parse(data, options) {
		let result = JSON.parse(data);
		result = this.toObject(result, options);
		return result;
	},


	_findObject(options, obj) {
		let founded = {};
		if (options.procObjects == null) return;
	
		let objects = options.procObjects;
		let keys = Object.keys(objects);
		let length = keys.length;
		for (let x = 0; x < length; x ++) {
			let key = keys[x];
			if (objects[key] === obj) {
				founded.key = key;
				founded.value = obj;
				founded.json = options.procJsons[key];
				break;
			}
		}
	
		if (!founded.key) return;
	
		let branch = options.procBranch;
		for (let x = 0; x < branch.length; x++) {
			if (branch[x] === obj) {
				founded.inBranch = true;
			}
		}
	
		return founded;
	},

	_registerObject(options, data) {
		options.inc.id ++;
		let id = options.inc.id;
		options.procBranch.push(data);
		options.procObjects[id] = data;
		options.procJsons[id] = Array.isArray(data) ? [] : {};
		return { id, json: options.procJsons[id] }
	},

	_extractRefs(data, instances = {}) {
		if (data == null || typeof data !== 'object') return instances;
		if ('_xId' in data) {
			instances[data._xId] = data;
		}
		if (data._xv == null || typeof data._xv != 'object') {
			return instances;
		} else if (Array.isArray(data._xv)) {
			for (let x = 0; x < data._xv.length; x++) {
				this._extractRefs(data._xv[x], instances);
			}
		} else if (typeof data === 'object') {
			Object.keys(data._xv).map(key => {
				this._extractRefs(data._xv[key], instances);
			});
		}
		return instances;
	}
}



export default Serializer;
