(function (root) {
  'use strict';
  const filterProducts = (products, category) => products.filter(p => category === 'all' || p.category === category);
  const selectProduct = (products, id, category = 'all') => {
    const visible = filterProducts(products, category);
    return visible.find(p => p.id === id) || visible[0] || null;
  };
  const formatPrice = value => new Intl.NumberFormat('ru-RU').format(value) + ' ₽';
  const phoneHref = value => 'tel:+' + String(value).replace(/\D/g, '');
  const nationalDigits = value => {
    const raw=String(value); let digits=raw.replace(/\D/g,'');
    if(/^[78]/.test(digits)&&(digits.length>10||/^\s*\+/.test(raw)||digits.length===1))digits=digits.slice(1);
    return digits.slice(0,10);
  };
  const formatNational = digits => {
    if(!digits)return '';
    let value='+7 ('+digits.slice(0,3);
    if(digits.length>=3)value+=')';
    if(digits.length>3)value+=' '+digits.slice(3,6);
    if(digits.length>6)value+='-'+digits.slice(6,8);
    if(digits.length>8)value+='-'+digits.slice(8,10);
    return value;
  };
  const formatPhone = value => {
    const digits=nationalDigits(value);
    return digits?formatNational(digits):String(value).replace(/\D/g,'')?'+7':'';
  };
  const subscriberPositions = value => [...String(value).matchAll(/\d/g)].map(match=>match.index).filter(index=>index>1);
  const phoneCaret = (value,count) => {
    const positions=subscriberPositions(value);
    if(count>=positions.length)return value.length;
    return count>0?positions[count-1]+1:Math.min(4,value.length);
  };
  const editPhone = (value,start,end,inputType,data='') => {
    let digits=nationalDigits(value);
    const positions=subscriberPositions(value);
    let from=positions.filter(position=>position<start).length;
    let to=positions.filter(position=>position<end).length;
    if(inputType.startsWith('delete')){
      if(start===0&&end>=value.length)return {value:'',caret:0};
      if(from===to&&start===end){
        if(inputType==='deleteContentBackward'){
          const previous=positions.findLastIndex(position=>position<start);
          if(previous<0)return digits?{value,caret:start}:{value:'',caret:0};
          from=previous;to=previous+1;
        } else if(inputType==='deleteContentForward'){
          const next=positions.findIndex(position=>position>=start);
          if(next<0)return {value,caret:start};from=next;to=next+1;
        }
      }
      digits=digits.slice(0,from)+digits.slice(to);
    } else {
      const raw=String(data), incomingDigits=raw.replace(/\D/g,'');
      if(!incomingDigits)return {value,caret:start};
      if(!digits&&/^[78]$/.test(incomingDigits))return {value:'+7',caret:2};
      const fullNumber=incomingDigits.length>=10;
      const hasCountryPrefix=/^\s*\+7/.test(raw);
      const incoming=fullNumber||hasCountryPrefix?nationalDigits(raw):incomingDigits;
      if(hasCountryPrefix&&!incoming&&from===0&&to===digits.length)return {value:'+7',caret:2};
      if(fullNumber){digits=incoming;from=digits.length;}
      else {digits=(digits.slice(0,from)+incoming+digits.slice(to)).slice(0,10);from=Math.min(from+incoming.length,digits.length);}
    }
    const formatted=formatNational(digits);return {value:formatted,caret:phoneCaret(formatted,from)};
  };
  const validateLead = (name, phone) => {
    const digits = String(phone).replace(/\D/g, '');
    const errors = {};
    const cleanName=String(name).trim();
    if ((cleanName.match(/\p{L}/gu)||[]).length<2) errors.name = 'Введите имя, минимум 2 буквы.';
    else if(cleanName.length>60||!/^\p{L}[\p{L}\p{M} '\u2019-]*$/u.test(cleanName))errors.name='Используйте в имени буквы, пробел, дефис или апостроф.';
    if (!/^[78]\d{10}$/.test(digits)) errors.phone = 'Введите телефон полностью: +7 и ещё 10 цифр.';
    else if(/^(\d)\1{9}$/.test(digits.slice(1)))errors.phone='Проверьте номер телефона: все цифры одинаковые.';
    return { valid: !Object.keys(errors).length, errors };
  };
  const api = { filterProducts, selectProduct, formatPrice, phoneHref, validateLead, formatPhone, editPhone, phoneCaret };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RemmilModel = api;
})(typeof window !== 'undefined' ? window : globalThis);
