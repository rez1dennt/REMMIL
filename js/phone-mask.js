(function(root){
  'use strict';
  root.RemmilPhoneMask=function(input){
    const model=root.RemmilModel;
    let writing=false,composing=false,pending=null;
    const undo=[],redo=[];
    const snapshot=()=>({value:input.value,start:input.selectionStart||0,end:input.selectionEnd||0});
    let last=snapshot();
    function write(state,notify=true){
      writing=true;input.value=state.value;
      const start=state.start==null?state.caret:state.start;
      input.setSelectionRange(start,state.end==null?start:state.end);
      last=snapshot();
      if(notify)input.dispatchEvent(new Event('input',{bubbles:true}));
      writing=false;
    }
    function commit(result,previous=snapshot()){
      if(previous.value!==result.value){undo.push(previous);if(undo.length>100)undo.shift();redo.length=0;}
      write(result);
    }
    function history(backward){
      const source=backward?undo:redo,target=backward?redo:undo;
      if(!source.length)return;target.push(snapshot());write(source.pop());
    }
    function edit(type,data){const state=snapshot();commit(model.editPhone(state.value,state.start,state.end,type,data),state);}
    input.addEventListener('beforeinput',event=>{
      if(composing||event.isComposing)return;
      if(event.inputType==='historyUndo'||event.inputType==='historyRedo'){
        if(event.cancelable){event.preventDefault();history(event.inputType==='historyUndo');}return;
      }
      const types=['insertText','insertReplacementText','insertFromPaste','deleteContentBackward','deleteContentForward','deleteByCut'];
      if(!types.includes(event.inputType))return;
      if(event.inputType.startsWith('insert')&&event.data==null)return;
      const state=snapshot(), result=model.editPhone(state.value,state.start,state.end,event.inputType,event.data||'');
      if(event.cancelable){event.preventDefault();commit(result,state);}else pending={result,previous:state};
    });
    input.addEventListener('input',event=>{
      if(writing||composing||event.isComposing)return;
      if(pending){const edit=pending;pending=null;commit(edit.result,edit.previous);return;}
      const raw=input.value,caret=input.selectionStart||0;
      const digitsBefore=raw.slice(0,caret).replace(/\D/g,'');
      const prefix=/^\s*\+?[78]/.test(raw)&&(raw.replace(/\D/g,'').length>10||/^\s*\+/.test(raw));
      const count=Math.max(0,digitsBefore.length-(prefix?1:0));
      const value=model.formatPhone(raw);
      if(last.value!==value){undo.push(last);redo.length=0;}
      write({value,caret:model.phoneCaret(value,count)},false);
    });
    input.addEventListener('paste',event=>{
      const text=event.clipboardData&&event.clipboardData.getData('text/plain');
      if(text==null)return;event.preventDefault();pending=null;edit('insertFromPaste',text);
    });
    input.addEventListener('cut',event=>{
      const state=snapshot();if(state.start===state.end)return;
      if(event.clipboardData){event.clipboardData.setData('text/plain',state.value.slice(state.start,state.end));event.preventDefault();edit('deleteByCut','');}
    });
    input.addEventListener('keydown',event=>{
      if((event.ctrlKey||event.metaKey)&&!event.altKey){const key=event.key.toLowerCase();if(key==='z'||key==='y'){event.preventDefault();history(key==='z'&&!event.shiftKey);}}
    });
    input.addEventListener('compositionstart',()=>{composing=true;});
    input.addEventListener('compositionend',()=>{composing=false;input.dispatchEvent(new Event('input',{bubbles:true}));});
    if(input.form)input.form.addEventListener('reset',()=>queueMicrotask(()=>{pending=null;undo.length=0;redo.length=0;last=snapshot();}));
    if(input.value)write({value:model.formatPhone(input.value),caret:model.formatPhone(input.value).length},false);
  };
})(window);
