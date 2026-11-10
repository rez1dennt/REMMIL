const { test } = require('node:test');
const assert = require('node:assert/strict');
const model = require('../js/model.js');
const products = [{id:'a',category:'adhesives'},{id:'b',category:'adhesives'},{id:'c',category:'primers'}];
test('category filter includes all products and isolates primers', () => {
  assert.equal(model.filterProducts(products, 'all').length, 3);
  assert.deepEqual(model.filterProducts(products, 'primers').map(p=>p.id), ['c']);
});
test('selection survives compatible filters and falls back for another category', () => {
  assert.equal(model.selectProduct(products, 'b', 'adhesives').id, 'b');
  assert.equal(model.selectProduct(products, 'b', 'primers').id, 'c');
  assert.equal(model.selectProduct([], 'b', 'primers'), null);
});
test('phone validation rejects incomplete input without claiming delivery', () => {
  assert.equal(model.validateLead('', '+7 999 123 45 67').valid, false);
  assert.equal(model.validateLead('Анна', '123').valid, false);
  assert.equal(model.validateLead('Анна', '+7 (999) 123-45-67').valid, true);
});
test('formatting preserves Russian rubles and normalizes telephone', () => {
  assert.match(model.formatPrice(4900), /4\s900\s₽/);
  assert.equal(model.phoneHref('+7 (999) 123-45-67'), 'tel:+79991234567');
});
