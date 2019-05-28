import { Serializer } from '../../index';
describe('# Serializer', function() {
  describe('when initialized', function() {
    it('should have `types` defined', function() {
      let ser = new Serializer();
      expect(ser.types).to.be.a('object');
      expect(ser.types.items).to.be.a('array');
      expect(ser.types.byName).to.be.a('object');
    });
  });

  describe('when initialized with types', function() {
    let type1 = { type: Date };
    let type2 = { type: String };
    let ser;
    //let spy;
    beforeEach(function() {
      //spy = this.sinon.spy(Serializer.prototype, 'addType');
      ser = new Serializer({ types: [type1, type2] });
    });
    // it('should call addType for every passed type', function() {
    //   expect(spy).to.be.calledTwice;
    // });
    it('should add type into items array', function() {
      expect(ser.types.items).to.be.eql([type1, type2]);
    });
    // it('should add types into byNames array', function() {
    //   expect(ser.types.byName).to.be.eql({ Date: type1, String: type2 });
    // });
  });

  describe('when called addType', function() {
    let ser;
    const type1 = { type: Date };
    beforeEach(function() {
      ser = new Serializer();
    });
    it('should throw if type was not provided', function() {
      expect(ser.addType.bind(ser)).to.throw();
      expect(ser.addType.bind(ser, {})).to.throw();
    });
    it('should throw if type is already added', function() {
      ser.addType(type1);
      expect(ser.addType.bind(ser, type1)).to.throw();
    });
    it('should generate type name if name was not provided', function() {
      ser.addType(type1);
      expect(ser.types.items[0]).to.have.property('name').and.not.undefined;
    });
  });

  describe('when called getType', function() {
    const type1 = { type: Date };
    const type2 = { type: String };
    const type3 = { type: Number, name: 'Shnumber' };
    let ser;
    beforeEach(function() {
      ser = new Serializer({ types: [type2] });
      ser.addType(type1);
      ser.addType(type3);
    });
    it('should return type by string name', function() {
      let type = ser.getType('Shnumber');
      expect(type).to.be.equal(type3);
    });
    it('should return undefined if given name is not exist', function() {
      let type = ser.getType('foo');
      expect(type).to.be.undefined;
    });
    it('should return type by given type', function() {
      let type = ser.getType(Number);
      expect(type).to.be.equal(type3);
    });
    it('should return type by given instance', function() {
      let type = ser.getType(new Number(123));
      expect(type).to.be.equal(type3);
    });
  });

  describe('when calling toJSON', function() {
    let ser;
    beforeEach(function() {
      ser = new Serializer();
    });
    it('should return undefined if called without arguments', function() {
      expect(ser.toJSON()).to.be.undefined;
    });
    it('should return undefined if called with undefined', function() {
      expect(ser.toJSON(void 0)).to.be.undefined;
    });
    it('should return undefined if called with function', function() {
      expect(ser.toJSON(() => {})).to.be.undefined;
    });
    it('should return null if called with null', function() {
      expect(ser.toJSON(null)).to.be.null;
    });
    it('should return primitive if called with primitive', function() {
      expect(ser.toJSON(1)).to.be.equal(1);
      expect(ser.toJSON('foo')).to.be.equal('foo');
      expect(ser.toJSON(false)).to.be.equal(false);
    });
    it('should return primitive if called with primitive object', function() {
      expect(ser.toJSON(new Number(1))).to.be.equal(1);
      expect(ser.toJSON(new String('foo'))).to.be.equal('foo');
      expect(ser.toJSON(new Boolean(false))).to.be.equal(false);
    });
    it('should use added type toJSON', function() {
      let date = { type: Date, toJSON: () => true };
      let spy = this.sinon.spy(date, 'toJSON');
      ser.addType(date);
      let value = new Date();
      let res = ser.toJSON(value);
      expect(res).to.be.true;
      expect(spy).to.be.calledOnce.and.calledWith(value);
    });
    it('should use own toJSON if it exist and there is no type provided', function() {
      let value = new Date();
      let json = value.toJSON();
      let spy = this.sinon.spy(Date.prototype, 'toJSON');
      let res = ser.toJSON(value);
      expect(res).to.be.equal(json);
      expect(spy).to.be.calledOnce;
    });
    it('should provide registered type if it exist', function() {
      let value = new Date();
      ser.addType({ type: Date });
      let type = ser.getType(Date);
      let json = ser.toJSON(value, { wrap: true });
      expect(json._xt).to.be.equal(type.name);
    });
    describe('without options', function() {
      beforeEach(function() {
        ser = new Serializer();
      });
      it('should throw on circular dependency', function() {
        let json = { foo: 'bar' };
        json.baz = json;
        expect(ser.toJSON.bind(ser, json)).to.throw('Circular dependency found');
      });
      it('should not replace repeated instances', function() {
        let foo = { foo: 1 };
        let json = { foo, foo1: foo };
        let res = ser.toJSON(json);
        expect(res).to.have.property('foo1').and.eql(foo);
      });
    });

    describe('with wrap option', function() {
      beforeEach(function() {
        ser = new Serializer();
      });
      it('should throw on circular dependency if there is no supportCircularDependency option', function() {
        let json = { foo: 'bar' };
        json.baz = json;
        expect(ser.toJSON.bind(ser, json, { wrap: true })).to.throw('Circular dependency found');
      });
      it('should not throw on circular dependency if there is supportCircularDependency option', function() {
        let json = { foo: 'bar' };
        json.baz = json;
        expect(ser.toJSON.bind(ser, json, { wrap: true, supportCircularDependency: true })).to.not.throw();
      });
      it('should wrap repeated instance', function() {
        let foo = { foo: 'bar' };
        let json = { foo, foo1: foo };
        let res = ser.toJSON(json, { wrap: true });
        expect(res._xv).to.have.property('foo1').and.have.property('_xIdRef');
      });
      it('should omit undefined properties if skipUndefined option provided', function() {
        let res = ser.toJSON({ foo: 'bar', baz: void 0}, {skipUndefined: true});
        expect(res).to.have.property('foo', 'bar');
        expect(res).to.not.have.property('baz');
      });
      it('should use complex toJSON without toObject provided', function() {
        let MyType = function(foo, baz) {
          this.foo = foo;
          this.baz = baz;
        };
        let type = { type: MyType, toJSON: v => ({ foo: v.foo, bar: { baz: v.baz} })};
        ser.addType(type);
        let test = { num: 123, check: new MyType('apple', 'mac')};
        let json = ser.toJSON(test, { wrap: true });
        let res = ser.toObject(json, { unwrap: true });
        expect(res.check.bar).to.have.property('baz', test.check.baz);
      });
    });

    describe('for array', function() {
      beforeEach(function() {
        ser = new Serializer();
      });
      it('should call toJSON for each array item', function() {
        let spy = this.sinon.spy(ser, 'toJSON');
        ser.toJSON([1,2]);
        expect(spy).to.been.calledThrice;
      });
    });
  });

  describe('when calling toObject', function() {
    let ser;
    beforeEach(function() {
      ser = new Serializer();
    });
    it('should return given argument', function() {
      let test = { foo: 'bar'};
      let res = ser.toObject(test);
      expect(res).to.be.equal(test);
    });
    it('should return given argument if unwrap is set to false', function() {
      let test = { foo: 'bar'};
      let res = ser.toObject(test, { unwrap: false });
      expect(res).to.be.equal(test);
    });
    it('should return null and primitives as is', function() {
      expect(ser.toObject(void 0, { unwrap: true })).to.be.undefined;
      expect(ser.toObject(null, { unwrap: true })).to.be.null;
      expect(ser.toObject(1, { unwrap: true })).to.be.equal(1);
      expect(ser.toObject('foo', { unwrap: true })).to.be.equal('foo');
      expect(ser.toObject(false, { unwrap: true })).to.be.equal(false);
    });
    it('should use same instance if given json has doubles', function() {
      let foo = { foo: 1 };
      let test = { foo, foo1: foo };
      let json = ser.toJSON(test, { wrap: true });
      let res = ser.toObject(json, { unwrap: true });
      expect(res).to.have.property('foo');
      expect(res).to.have.property('foo1');
      expect(res.foo).to.be.equal(res.foo1);
    });
    it('should use existing type toObject', function() {
      let type = { type: Date, toJSON: v => v.valueOf(), toObject: v => new Date(v) };
      let spy = this.sinon.spy(type, 'toObject');
      ser.addType(type);

      let value = new Date();
      let json = ser.toJSON(value, { wrap: true });
      let res = ser.toObject(json, { unwrap: true });
      expect(spy).to.be.calledOnce.and.calledWith(value.valueOf());
      expect(res).to.be.a('Date');
      expect(res.valueOf()).to.be.equal(value.valueOf());
    });
    it('should use complex toJSON with toObject provided', function() {
      let MyType = function(foo, baz) {
        this.foo = foo;
        this.baz = baz;
      };
      let type = { type: MyType, toJSON: v => ({ foo: v.foo, bar: { baz: v.baz} }), toObject: v => new MyType(v.foo, v.bar.baz)};
      ser.addType(type);
      let test = { num: 123, check: new MyType('apple', 'mac')};
      let json = ser.toJSON(test, { wrap: true });
      let res = ser.toObject(json, { unwrap: true });
      expect(res.check.foo).to.be.equal('apple');
      expect(res.check.baz).to.be.equal('mac');
    });
    describe('for array', function() {
      beforeEach(function() {
        ser = new Serializer();
      });
      it('should call toObject for each array item', function() {
        let spy = this.sinon.spy(ser, 'toObject');
        let json = ser.toJSON([1,2], { wrap: true });
        ser.toObject(json, { unwrap: true });
        expect(spy).to.been.calledThrice;
      });
    });

    describe('when there is a circular dependency exist', function() {
      beforeEach(function() {
        ser = new Serializer();
      });
      it('should properly fill circular dependecies with array', function() {
        let foo = { foo: 1 };
        let bar = [foo, foo];
        bar.push(bar);
        let test = { num: 123, bar, foo };
        let json = ser.toJSON(test, { wrap: true, supportCircularDependency: true });
        let res = ser.toObject(json, { unwrap: true });
        expect(res.num).to.be.equal(test.num);
        expect(res.foo).to.be.eql(foo);
        expect(res.bar).to.be.equal(res.bar[2]);
        expect(res.bar[1]).to.be.equal(res.foo);
        expect(res.bar[0]).to.be.equal(res.foo);
      });
      it('should properly fill circular dependecies with object', function() {
        let foo = { foo: 1 };
        let bar = { foo, foo1: foo };
        bar.baz = bar;
        let test = { num: 123, bar, foo };
        let json = ser.toJSON(test, { wrap: true, supportCircularDependency: true });
        let res = ser.toObject(json, { unwrap: true });
        expect(res.num).to.be.equal(test.num);
        expect(res.foo).to.be.eql(foo);
        expect(res.bar).to.be.equal(res.bar.baz);
        expect(res.bar.foo).to.be.equal(res.foo);
        expect(res.bar.foo1).to.be.equal(res.foo);
      });
    });

  });

});


