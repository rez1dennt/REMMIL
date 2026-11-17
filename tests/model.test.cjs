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

test('an unconfirmed price stays empty',()=>{assert.equal(model.formatPrice(null),'');assert.equal(model.formatPrice(undefined),'');});

test('packaging resolves a concrete SKU without changing the parent product',()=>{
 const family={id:'primer-p',price:5250,variants:[{id:'p11',packaging:'1,1 кг',price:5250},{id:'p55',packaging:'5,5 кг',price:22650}]};
 const selected=model.resolveProduct(family,'p55');assert.equal(selected.id,'primer-p');assert.equal(selected.variantId,'p55');assert.equal(selected.price,22650);assert.equal(selected.packaging,'5,5 кг');assert.equal(family.price,5250);
 assert.equal(model.resolveProduct(family,'missing').variantId,'p11');assert.equal(model.resolveProduct(products[0]),products[0]);
});
test('catalogue price reflects the lowest available packaging price',()=>{
 assert.match(model.formatCatalogPrice({variants:[{price:22650},{price:5250}]}),/^от 5\s250\s₽$/);
 assert.equal(model.formatCatalogPrice({price:null}),'');assert.match(model.formatCatalogPrice({price:9500}),/^9\s500\s₽$/);
});
