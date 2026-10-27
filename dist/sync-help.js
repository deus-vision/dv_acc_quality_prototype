import {esc} from './core.js';

/** Descriptions are shared by all synchronization fields and status labels. */
export const HELP=Object.freeze({
 metaInterval:{title:'Интервал Meta',text:'Как часто начинать загрузку Raw Spend, статусов кабинетов и причин Disabled из AIO → Meta. Интервал задаётся в минутах. Лимит запросов, повторные попытки и незавершённая загрузка могут отложить следующий запуск.'},
 rollupInterval:{title:'Интервал Roll Up Report',text:'Как часто начинать загрузку Spend, Revenue и Profit кампаний из AIO → Analytics → Roll Up Report. Интервал задаётся в минутах. Новый цикл этого источника не начинается, пока не завершён предыдущий.'},
 rpm:{title:'Запросы в минуту',text:'Общий максимум запросов к AIO за минуту для Meta и Roll Up Report вместе. Повторные попытки тоже расходуют этот лимит. Меньшее значение снижает нагрузку, но большая загрузка может занять больше времени.'},
 concurrency:{title:'Одновременные запросы',text:'Сколько запросов к AIO может выполняться одновременно. Остальные ждут своей очереди. Этот параметр ограничивает параллельную работу и не отменяет общий лимит запросов в минуту.'},
 retries:{title:'Количество повторов',text:'Сколько дополнительных попыток разрешено после неудачного запроса. Например, 3 повтора — это до 4 попыток вместе с первоначальной. При значении 0 повторов нет. Ошибки доступа 401/403 требуют проверки подключения.'},
 retryDelay:{title:'Начальная задержка',text:'Сколько секунд ждать перед первым повтором неудачного запроса. Дальнейшее ожидание зависит от выбранного увеличения задержки. Если AIO при HTTP 429 передаёт Retry-After, повтор не должен начинаться раньше указанного сервером срока.'},
 backoff:{title:'Увеличение задержки',text:'При экспоненциальном режиме ожидание перед каждым следующим повтором удваивается относительно предыдущего. При фиксированном режиме задержка остаётся одинаковой. Начальное значение задаётся в поле «Начальная задержка».'},
 timeout:{title:'Таймаут запроса',text:'Сколько секунд ждать ответа на один запрос к AIO. Если ответ не пришёл вовремя, запрос считается неудачным; затем может быть выполнен повтор. Это ограничение одного запроса, а не всей синхронизации.'},
 staleAfter:{title:'Порог устаревания данных',text:'Через сколько минут после последней УСПЕШНОЙ синхронизации данные считаются устаревшими. Порог не задаёт частоту запросов. Например, загрузка запланирована каждые 15 минут, а порог — 60 минут: если 60 минут не было успешной загрузки, данные устаревают. Неудачные попытки не сбрасывают этот отсчёт.'},
 lastSuccess:{title:'Последняя успешная синхронизация',text:'Время последней завершённой загрузки, которая успешно обновила данные этого источника. По этому времени оценивается актуальность данных. Ошибка новой попытки не изменяет время последнего успеха и не стирает ранее загруженные данные.'},
 lastAttempt:{title:'Последняя попытка синхронизации',text:'Время начала последнего запуска этого источника, независимо от результата. Свежая попытка может закончиться ошибкой и не означает, что данные обновлены. Проверяйте также время последней успешной синхронизации.'},
 next:{title:'Следующая загрузка или попытка',text:'Запланированное время следующего запуска этого источника. После ошибки это может быть время повторной попытки с учётом задержки и Retry-After. Очередь запросов, общий лимит и текущая загрузка могут сдвинуть запуск. На паузе автоматические запуски остановлены.'},
 requests:{title:'Количество запросов',text:'Сколько запросов к AIO выполнено в рамках этой записи журнала, включая повторные попытки. Это не число кабинетов или кампаний: один запрос может вернуть несколько записей.'},
 duration:{title:'Длительность загрузки',text:'Время от начала до завершения этой загрузки, в том числе ожидание ответов и повторные попытки. Длительность относится ко всему запуску, а таймаут в настройках — к одному запросу.'}
});

export function renderSyncHelp(key,label=HELP[key]?.title){
 if(!Object.hasOwn(HELP,key))return '';
 return `<button type="button" class="sync-help-button" data-sync-help="${esc(key)}" aria-label="Подробнее: ${esc(label||HELP[key].title)}" aria-expanded="false"><span aria-hidden="true">?</span></button>`;
}

let dispose;
const popupId='sync-help-tooltip';

/** Help buttons must remain enabled even when the adjacent form inputs are read-only. */
export function bindSyncHelp(scope=document){
 dispose?.();
 const controller=new AbortController(),signal=controller.signal;
 let anchor=null,popup=null,popupController=null,pinned=false,hideTimer=null;
 const clearTimer=()=>{if(hideTimer!==null)clearTimeout(hideTimer);hideTimer=null;};
 const close=()=>{
  clearTimer();
  if(anchor){anchor.setAttribute('aria-expanded','false');anchor.removeAttribute('aria-describedby');}
  popupController?.abort();popupController=null;
  popup?.remove();popup=null;anchor=null;pinned=false;
 };
 const position=()=>{
  if(!anchor?.isConnected||!popup){close();return;}
  const target=anchor.getBoundingClientRect(),viewport=window.visualViewport;
  const vLeft=viewport?.offsetLeft||0,vTop=viewport?.offsetTop||0;
  const vWidth=viewport?.width||window.innerWidth,vHeight=viewport?.height||window.innerHeight;
  let leftBound=vLeft+12,rightBound=vLeft+vWidth-12;
  const frame=anchor.closest('.modal')||(document.body.classList.contains('mobile-preview')?document.getElementById('app'):null);
  if(frame){const bounds=frame.getBoundingClientRect();leftBound=Math.max(leftBound,bounds.left+12);rightBound=Math.min(rightBound,bounds.right-12);}
  const width=Math.max(1,Math.min(340,rightBound-leftBound));
  popup.style.width=width+'px';popup.style.maxWidth=width+'px';
  popup.style.maxHeight=Math.max(1,vHeight-24)+'px';
  const height=popup.getBoundingClientRect().height;
  const left=Math.max(leftBound,Math.min(target.left,rightBound-width));
  let top=target.bottom+8;
  const availableBelow=vTop+vHeight-12-target.bottom;
  if(height+8>availableBelow&&target.top-vTop>availableBelow)top=target.top-height-8;
  top=Math.max(vTop+12,Math.min(top,vTop+vHeight-height-12));
  popup.style.left=left+'px';popup.style.top=top+'px';
 };
 const scheduleClose=(force=false)=>{
  clearTimer();if(pinned&&!force)return;
  hideTimer=setTimeout(()=>{
   hideTimer=null;
   if(!popup?.matches(':hover')&&document.activeElement!==anchor)close();
  },140);
 };
 const open=(button,sticky=false)=>{
  if(anchor===button&&popup){clearTimer();if(sticky)pinned=true;return;}
  close();
  const key=button.dataset.syncHelp;
  if(!Object.hasOwn(HELP,key))return;
  const help=HELP[key];
  anchor=button;pinned=sticky;
  popup=document.createElement('div');popup.id=popupId;popup.className='sync-help-tooltip';
  popup.setAttribute('role','tooltip');popup.style.position='fixed';popup.style.boxSizing='border-box';popup.style.overflowY='auto';
  const title=document.createElement('strong');title.className='sync-help-title';title.textContent=help.title;
  const body=document.createElement('p');body.className='sync-help-text';body.textContent=help.text;
  popup.append(title,body);document.body.append(popup);
  anchor.setAttribute('aria-expanded','true');anchor.setAttribute('aria-describedby',popupId);
  popupController=new AbortController();const popupSignal=popupController.signal;
  popup.addEventListener('pointerenter',clearTimer,{signal:popupSignal});
  popup.addEventListener('pointerleave',()=>scheduleClose(),{signal:popupSignal});
  popup.addEventListener('click',e=>e.stopPropagation(),{signal:popupSignal});
  position();
 };
 for(const button of scope.querySelectorAll('[data-sync-help]')){
  button.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')open(button);},{signal});
  button.addEventListener('pointerleave',()=>scheduleClose(),{signal});
  button.addEventListener('focus',()=>open(button),{signal});
  button.addEventListener('blur',()=>scheduleClose(true),{signal});
  button.addEventListener('click',e=>{
   e.preventDefault();e.stopPropagation();
   if(anchor===button&&pinned)close();else open(button,true);
  },{signal});
  button.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')e.stopPropagation();},{signal});
 }
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&popup){e.preventDefault();e.stopImmediatePropagation();close();}
 },{capture:true,signal});
 document.addEventListener('pointerdown',e=>{
  if(popup&&!popup.contains(e.target)&&!anchor?.contains(e.target))close();
 },{capture:true,signal});
 window.addEventListener('resize',position,{signal});
 window.visualViewport?.addEventListener('resize',position,{signal});
 window.visualViewport?.addEventListener('scroll',position,{signal});
 document.addEventListener('scroll',e=>{if(popup&&!popup.contains(e.target))position();},{capture:true,signal});
 window.addEventListener('hashchange',close,{signal});
 window.addEventListener('app:render',close,{signal});
 const observer=new MutationObserver(()=>{if(anchor&&!anchor.isConnected)close();});
 observer.observe(document.body,{childList:true,subtree:true});
 dispose=()=>{close();controller.abort();observer.disconnect();};
}

export function hideSyncHelp(){dispose?.();dispose=null;}
