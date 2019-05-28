const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const chaiPromise = require('chai-as-promised');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const { window } = new JSDOM('<!DOCTYPE html><html><body></body</html>');
const Backbone = require('backbone');
global.window = window;
global.document = window.document;
const jQuery = require('jquery');
const $ = global.$ = jQuery(window);
Backbone.$ = $;

chai.use(chaiPromise);
chai.use(sinonChai);

global.chai = chai;
global.sinon = sinon;
global.expect = global.chai.expect;

beforeEach(function() {
  this.sinon = global.sinon.createSandbox();
});

afterEach(function() {
  this.sinon.restore();
});
