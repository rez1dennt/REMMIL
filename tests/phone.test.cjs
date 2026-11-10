const {test}=require('node:test');
const assert=require('node:assert/strict');
const model=require('../js/model.js');
test('phone mask accepts Russian international, trunk and national input',()=>{
  assert.equal(model.formatPhone('+7 999 1234567'),'+7 (999) 123-45-67');
  assert.equal(model.formatPhone('8 (999) 123-45-67'),'+7 (999) 123-45-67');
  assert.equal(model.formatPhone('9991234567'),'+7 (999) 123-45-67');
  assert.equal(model.formatPhone(''), '');
});
test('mask formats partial numbers without underscore characters',()=>{
  assert.equal(model.formatPhone('99'),'+7 (99');
  assert.equal(model.formatPhone('999'),'+7 (999)');
  assert.equal(model.formatPhone('9991234'),'+7 (999) 123-4');
});
test('backspace after closing bracket removes a digit instead of getting stuck',()=>{
  const result=model.editPhone('+7 (999)',8,8,'deleteContentBackward','');
  assert.equal(result.value,'+7 (99'); assert.equal(result.caret,6);
});
test('backspace skips bracket and space in the middle',()=>{
  const result=model.editPhone('+7 (999) 123-45-67',9,9,'deleteContentBackward','');
  assert.equal(result.value,'+7 (991) 234-56-7');assert.equal(result.caret,6);
});
test('forward delete skips separators',()=>{
  const result=model.editPhone('+7 (999) 123-45-67',7,7,'deleteContentForward','');
  assert.equal(result.value,'+7 (999) 234-56-7');assert.equal(result.caret,7);
});
test('area code can be replaced and entire field cleared',()=>{
  assert.equal(model.editPhone('+7 (999) 123-45-67',4,7,'insertText','495').value,'+7 (495) 123-45-67');
  assert.equal(model.editPhone('+7 (999) 123-45-67',0,18,'deleteContentBackward','').value,'');
});
test('full number paste replaces selection and accepts leading 8',()=>{
  assert.equal(model.editPhone('+7 (999) 123-45-67',0,18,'insertFromPaste','8 495 765 43 21').value,'+7 (495) 765-43-21');
});
test('a pasted formatted partial number does not duplicate its country prefix',()=>{
  assert.equal(model.editPhone('+7 (999) 123-45-67',0,18,'insertText','+7 (999)').value,'+7 (999)');
});
test('name validation counts letters, accepts apostrophes and hyphens',()=>{
  assert.equal(model.validateLead('12','+7 (999) 123-45-67').valid,false);
  assert.equal(model.validateLead('А','+7 (999) 123-45-67').valid,false);
  assert.equal(model.validateLead('Анна-Мария','+7 (999) 123-45-67').valid,true);
  assert.equal(model.validateLead("О’Коннор",'+7 (999) 123-45-67').valid,true);
});
test('phone validation rejects obvious repeated-digit dummy numbers',()=>{
  assert.equal(model.validateLead('Анна','+7 (000) 000-00-00').valid,false);
  assert.equal(model.validateLead('Анна','+7 (999) 999-99-99').valid,false);
});
