import {esc, icon} from './core.js';
import {COUNTRIES, isCountryCode, countryLabel, searchCountries} from './countries.js';

let activePicker;
/** Search text is separate from the saved value; only a selected ISO code is submitted. */
export function renderGeoPicker(id, code='', draftText){
  const value=isCountryCode(code)?code:'';
  const text=draftText===undefined?countryLabel(value):draftText;
  return `<div class="field geo-field"><label class="geo-label" id="${id}-label" for="${id}-search">GEO (необязательно)</label><div class="geo-picker" id="${id}-picker"><input type="hidden" id="${id}" name="geo" value="${esc(value)}"><div class="geo-input-wrap"><input id="${id}-search" class="geo-search" type="text" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${id}-list" aria-labelledby="${id}-label" autocomplete="off" spellcheck="false" placeholder="Код или название страны" value="${esc(text)}"><button type="button" class="geo-clear" aria-label="Очистить GEO" ${text?'':'hidden'}>${icon('close')}</button><button type="button" class="geo-toggle" aria-label="Показать страны" tabindex="-1">${icon('down')}</button></div><div class="geo-menu" hidden><div class="geo-menu-heading">Страна или территория <span>${COUNTRIES.length}</span></div><div class="geo-list" role="listbox" id="${id}-list" aria-labelledby="${id}-label"></div><div class="geo-empty" role="status" hidden>Страны не найдены. Попробуйте код или другое название.</div></div></div></div>`;
}
export function bindGeoPicker(id, onChange){
  activePicker?.abort();
  const root=document.getElementById(id+'-picker');
  if(!root)return;
  const controller=new AbortController();activePicker=controller;const signal=controller.signal;
  const hidden=document.getElementById(id),input=document.getElementById(id+'-search'),menu=root.querySelector('.geo-menu'),list=root.querySelector('.geo-list'),empty=root.querySelector('.geo-empty'),clear=root.querySelector('.geo-clear'),toggle=root.querySelector('.geo-toggle');
  let opened=false,results=[],highlight=-1;
  const valid=()=>!input.value.trim()||isCountryCode(hidden.value)&&input.value===countryLabel(hidden.value);
  const validate=()=>{input.setCustomValidity(valid()?'':'Выберите страну из списка или очистите GEO.');if(valid())input.removeAttribute('aria-invalid');};
  const scrollActive=()=>{const option=list.querySelector('[data-highlight="true"]');if(!option)return;if(option.offsetTop<list.scrollTop)list.scrollTop=option.offsetTop;else if(option.offsetTop+option.offsetHeight>list.scrollTop+list.clientHeight)list.scrollTop=option.offsetTop+option.offsetHeight-list.clientHeight;};
  const move=idx=>{highlight=Math.max(0,Math.min(idx,results.length-1));[...list.children].forEach((item,i)=>{item.dataset.highlight=String(i===highlight);});if(results.length){input.setAttribute('aria-activedescendant',id+'-option-'+highlight);scrollActive();}else input.removeAttribute('aria-activedescendant');};
  const position=()=>{if(!opened)return;const box=root.getBoundingClientRect(),body=root.closest('.modal-body')?.getBoundingClientRect();const screenBottom=window.visualViewport?window.visualViewport.offsetTop+window.visualViewport.height:window.innerHeight;const bottom=Math.min(body?.bottom??screenBottom,screenBottom)-box.bottom-12,top=box.top-Math.max(body?.top??0,0)-12;const up=bottom<180&&top>bottom;menu.classList.toggle('geo-menu-up',up);list.style.maxHeight=Math.max(100,Math.min(240,(up?top:bottom)-39))+'px';};
  const paint=()=>{const query=isCountryCode(hidden.value)&&input.value===countryLabel(hidden.value)?'':input.value;results=searchCountries(query);highlight=results.findIndex(c=>c.code===hidden.value);if(highlight<0)highlight=results.length?0:-1;list.innerHTML=results.map((c,i)=>`<div id="${id}-option-${i}" class="geo-option" role="option" aria-selected="${c.code===hidden.value}" data-country="${c.code}" data-highlight="${i===highlight}"><span class="geo-code">${c.code}</span><span class="geo-name">${esc(c.name)}</span>${c.code===hidden.value?icon('check'):''}</div>`).join('');empty.hidden=!!results.length;list.hidden=!results.length;root.querySelector('.geo-menu-heading span').textContent=String(results.length);if(results.length)input.setAttribute('aria-activedescendant',id+'-option-'+highlight);else input.removeAttribute('aria-activedescendant');position();requestAnimationFrame(scrollActive);};
  const open=()=>{opened=true;menu.hidden=false;input.setAttribute('aria-expanded','true');root.classList.add('is-open');paint();};
  const close=()=>{opened=false;menu.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');root.classList.remove('is-open');};
  const choose=code=>{hidden.value=isCountryCode(code)?code:'';input.value=countryLabel(hidden.value);clear.hidden=!hidden.value;validate();close();onChange?.(hidden.value,input.value);hidden.dispatchEvent(new Event('change',{bubbles:true}));input.focus();};
  input.addEventListener('click',()=>{if(!opened)open();},{signal});
  input.addEventListener('input',()=>{if(input.value!==countryLabel(hidden.value))hidden.value='';clear.hidden=!input.value;validate();open();onChange?.(hidden.value,input.value);},{signal});
  input.addEventListener('invalid',()=>{input.setAttribute('aria-invalid','true');open();},{signal});
  input.addEventListener('keydown',e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(!opened){open();if(e.key==='ArrowUp')move(results.length-1);}else move(highlight+(e.key==='ArrowDown'?1:-1));}else if(e.key==='Enter'&&opened){e.preventDefault();e.stopPropagation();if(results[highlight])choose(results[highlight].code);}else if(e.key==='Escape'&&opened){e.preventDefault();e.stopPropagation();close();}else if(e.key==='Tab')close();},{signal});
  root.addEventListener('keydown',e=>{if(e.key==='Escape'&&opened){e.preventDefault();e.stopPropagation();close();input.focus();}},{signal});
  list.addEventListener('mousedown',e=>{if(e.target.closest('[data-country]'))e.preventDefault();},{signal});
  list.addEventListener('click',e=>{const option=e.target.closest('[data-country]');if(option)choose(option.dataset.country);},{signal});
  clear.addEventListener('click',()=>choose(''),{signal});
  toggle.addEventListener('click',()=>{opened?close():open();input.focus();},{signal});
  document.addEventListener('pointerdown',e=>{if(!root.contains(e.target))close();},{signal});
  window.addEventListener('resize',position,{signal});window.visualViewport?.addEventListener('resize',position,{signal});
  root.closest('.modal-body')?.addEventListener('scroll',position,{signal});
  validate();
  return {isValid:valid,value:()=>hidden.value,close};
}
