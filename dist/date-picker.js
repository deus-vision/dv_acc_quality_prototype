import {ui,esc,icon,rerender,getIssueDateRange,dateRangeError,formatIssuePeriod,ISSUE_DATE_PRESETS} from './core.js';

let activePicker=null;
export function closeIssueDatePicker(restoreFocus=false){
  if(!activePicker)return;
  const {panel,trigger,controller}=activePicker;
  activePicker=null;
  controller.abort();
  panel.remove();
  trigger.setAttribute('aria-expanded','false');
  if(restoreFocus&&trigger.isConnected)trigger.focus();
}

export function renderIssueDatePicker(id,variant='analytics'){
  const range=formatIssuePeriod(ui.filters);
  const preset=ISSUE_DATE_PRESETS.find(item=>item.id===ui.filters.period);
  return `<button type="button" id="${esc(id)}" class="issue-date-trigger issue-date-${esc(variant)}" aria-label="Период выдачи: ${esc(range)}" aria-haspopup="dialog" aria-expanded="false" aria-controls="${esc(id)}-popover" title="${esc(preset?.label||'Произвольный период')}"><span class="issue-date-label">${icon('calendar')}<span>Дата выдачи</span></span><strong>${esc(range)}</strong>${icon('down')}</button>`;
}

export function bindIssueDatePicker(id){
  const trigger=document.getElementById(id);
  if(!trigger)return;
  closeIssueDatePicker();
  trigger.addEventListener('click',()=>{
    if(activePicker?.trigger===trigger){closeIssueDatePicker(true);return;}
    closeIssueDatePicker();
    openPicker(trigger,id);
  });
}

function openPicker(trigger,id){
  const range=getIssueDateRange(ui.filters);
  let selected=ui.filters.period;
  const panel=document.createElement('section');
  panel.id=id+'-popover';
  panel.className='issue-date-popover';
  panel.setAttribute('role','dialog');
  panel.setAttribute('aria-label','Период выдачи кабинетов');
  panel.innerHTML=`<form novalidate><div class="issue-date-heading"><strong>Дата выдачи</strong><button type="button" class="btn-icon issue-date-close" aria-label="Закрыть выбор дат">${icon('close')}</button></div><div class="issue-date-presets" aria-label="Быстрый выбор периода">${ISSUE_DATE_PRESETS.map(p=>`<button class="issue-date-preset" type="button" data-date-preset="${esc(p.id)}" title="${esc(p.hint||p.label)}" aria-pressed="${selected===p.id}"><span>${esc(p.label)}</span>${p.id==='lastMonth'?'<small>30 дней</small>':p.id==='week'?'<small>7 дней</small>':''}</button>`).join('')}</div><div class="issue-date-custom"><span>Произвольный период</span><div class="issue-date-fields"><label for="${id}-from">От<input id="${id}-from" type="date" value="${esc(range.from)}" aria-label="Дата выдачи от" aria-describedby="${id}-error"></label><span class="issue-date-separator" aria-hidden="true">—</span><label for="${id}-to">До<input id="${id}-to" type="date" value="${esc(range.to)}" aria-label="Дата выдачи до" aria-describedby="${id}-error"></label></div><p class="issue-date-error" id="${id}-error" role="alert" hidden></p></div><div class="issue-date-footer"><span>Обе даты включены</span><button type="submit" class="btn btn-primary btn-sm">Применить</button></div></form>`;
  document.body.append(panel);
  const controller=new AbortController(),{signal}=controller;
  activePicker={panel,trigger,controller};
  trigger.setAttribute('aria-expanded','true');
  const from=panel.querySelector('#'+id+'-from'),to=panel.querySelector('#'+id+'-to'),error=panel.querySelector('.issue-date-error');
  const position=()=>{
    if(!trigger.isConnected){closeIssueDatePicker();return;}
    const rect=trigger.getBoundingClientRect();
    const viewport=window.visualViewport;
    const minX=viewport?.offsetLeft||0,minY=viewport?.offsetTop||0;
    const screenWidth=viewport?.width||window.innerWidth,screenHeight=viewport?.height||window.innerHeight;
    const shell=document.body.classList.contains('mobile-preview')?document.querySelector('.shell')?.getBoundingClientRect():null;
    const leftEdge=Math.max(minX+10,shell?shell.left+10:0),rightEdge=Math.min(minX+screenWidth-10,shell?shell.right-10:Infinity);
    const width=Math.min(404,rightEdge-leftEdge);
    panel.style.width=width+'px';
    panel.style.maxHeight=Math.max(140,screenHeight-20)+'px';
    const height=panel.getBoundingClientRect().height;
    const below=minY+screenHeight-rect.bottom-10,above=rect.top-minY-10;
    const top=below>=height||below>=above?rect.bottom+7:rect.top-height-7;
    panel.style.left=Math.max(leftEdge,Math.min(rect.left,rightEdge-width))+'px';
    panel.style.top=Math.max(minY+10,Math.min(top,minY+screenHeight-height-10))+'px';
  };
  const clearError=()=>{error.hidden=true;error.textContent='';from.removeAttribute('aria-invalid');to.removeAttribute('aria-invalid');};
  const refresh=()=>{panel.querySelectorAll('[data-date-preset]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.datePreset===selected)));};
  panel.querySelectorAll('[data-date-preset]').forEach(button=>button.addEventListener('click',()=>{
    selected=button.dataset.datePreset;
    const next=getIssueDateRange({period:selected});
    from.value=next.from;to.value=next.to;clearError();refresh();position();
  },{signal}));
  for(const input of [from,to])input.addEventListener('input',()=>{selected='custom';clearError();refresh();},{signal});
  panel.querySelector('.issue-date-close').addEventListener('click',()=>closeIssueDatePicker(true),{signal});
  panel.querySelector('form').addEventListener('submit',e=>{
    e.preventDefault();
    const message=selected==='all'?'':dateRangeError(from.value,to.value);
    if(message){error.textContent=message;error.hidden=false;from.setAttribute('aria-invalid','true');to.setAttribute('aria-invalid','true');position();return;}
    Object.assign(ui.filters,{period:selected,dateFrom:selected==='custom'?from.value:'',dateTo:selected==='custom'?to.value:''});
    ui.accountPage=1;ui.selected.clear();closeIssueDatePicker();rerender();
    document.getElementById(id)?.focus();
  },{signal});
  document.addEventListener('pointerdown',e=>{if(!panel.contains(e.target)&&!trigger.contains(e.target))closeIssueDatePicker();},{signal});
  document.addEventListener('focusin',e=>{if(!panel.contains(e.target)&&!trigger.contains(e.target))closeIssueDatePicker();},{signal});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeIssueDatePicker(true);}},{signal,capture:true});
  window.addEventListener('resize',position,{signal});
  window.addEventListener('scroll',position,{signal,capture:true});
  window.addEventListener('hashchange',()=>closeIssueDatePicker(),{signal});
  window.addEventListener('app:render',()=>closeIssueDatePicker(),{signal});
  window.visualViewport?.addEventListener('resize',position,{signal});
  window.visualViewport?.addEventListener('scroll',position,{signal});
  position();
  (panel.querySelector('[aria-pressed="true"]')||from).focus();
}
