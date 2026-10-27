import {esc,icon} from './core.js';

export const ACCOUNT_COLUMN_HELP={
 select:{title:'Выбор кабинетов',source:'Действие в реестре',body:'Отметьте кабинеты для группового переназначения. Флажок в заголовке выбирает только текущую страницу.',note:'Строка «Итого» всегда относится ко всей отфильтрованной выборке, а не к отмеченным строкам.'},
 name:{title:'Кабинет',source:'Реестр кабинетов',body:'Название и Facebook ID рекламного кабинета. Этот ID связывает кабинет с его данными в AIO.',note:'Нажмите на строку, чтобы открыть карточку с параметрами, финансовыми показателями и связанными кампаниями.'},
 typeId:{title:'Тип / байер',source:'Данные вашей команды',body:'Тип кабинета из общего справочника команды и текущий ответственный байер. Заголовок сортирует строки по названию типа.',note:'При переназначении кабинета новому байеру переходит вся его статистика, включая прошлые периоды.'},
 campaigns:{title:'Кампании',source:'AIO → Analytics → Roll Up Report',body:'Количество кампаний AIO, связанных с кабинетом. Связь определяется по Facebook ID в последних квадратных скобках названия кампании: [Facebook ID].',note:'Нажмите на число, чтобы посмотреть ID и названия кампаний. Финансовые показатели кабинета суммируются по связанным кампаниям; отсутствие связи не означает нулевой результат.'},
 spend:{title:'Spend',source:'AIO → Analytics → Roll Up Report · Meta Spend',body:'Сумма показателя Meta Spend по связанным кампаниям AIO. Кампании сопоставляются с кабинетом по [Facebook ID] в конце названия.',note:'Учитываются результаты с даты выдачи кабинета по дату отчёта. Стоимость самого кабинета сюда не входит. Raw Spend используется отдельно для сверки.'},
 revenue:{title:'Revenue',source:'AIO → Analytics → Roll Up Report · Revenue',body:'Сумма Revenue по связанным кампаниям AIO. Кампании сопоставляются с кабинетом по [Facebook ID] в конце названия.',note:'Это выручка из отчёта AIO за учитываемый период, без вычитания spend и стоимости кабинета. Если данные не получены, показывается прочерк.'},
 net:{title:'Profit',source:'AIO → Analytics → Roll Up Report · Profit + фактическая стоимость из реестра',body:'Вначале суммируем исходный Profit связанных кампаний AIO, сопоставленных по [Facebook ID] в конце названия. Затем один раз вычитаем сохранённую фактическую стоимость кабинета.',formula:'Profit = суммарный Profit AIO − фактическая стоимость кабинета',note:'Это результат с учётом покупки кабинета. Spend уже учтён в исходном Profit AIO: повторно его не вычитаем. Raw Spend также повторно не вычитается. Текущая цена типа не заменяет сохранённую стоимость.'},
 roi:{title:'ROI',source:'Рассчитывается здесь; не загружается из AIO',body:'Рентабельность с учётом фактической стоимости кабинета. Используем сумму Profit и Meta Spend связанных кампаний из AIO → Analytics → Roll Up Report и сохранённую стоимость из реестра.',formula:'ROI = (Profit AIO − стоимость кабинета) / (Spend + стоимость кабинета) × 100%',note:'По выборке сначала суммируем суммы, а не усредняем проценты кабинетов. Если знаменатель равен нулю или отрицателен, ROI не рассчитывается. Неполные данные помечаются отдельно.'},
 raw:{title:'Raw Spend',source:'AIO → Meta → Ad Accounts · Raw Spend',body:'Расходы рекламного кабинета из поля Raw Spend в разделе Meta AIO. Получаем по Facebook ID кабинета, независимо от привязки кампаний в Roll Up Report.',note:'Используется только для сверки со Spend. Не суммируется со Spend и не вычитается повторно из Profit. Это Raw Spend, а не Total Spend и не Commission.'},
 diff:{title:'Разница Spend',source:'Рассчитывается здесь по двум источникам AIO',body:'Разница между суммой Meta Spend связанных кампаний из Analytics → Roll Up Report и Raw Spend кабинета из Meta → Ad Accounts.',formula:'Разница = Spend − Raw Spend',note:'Плюс: Spend больше Raw Spend. Минус: Raw Spend больше Spend. Сверяем одинаковые даты, валюту и часовой пояс. Расхождение — повод проверить данные; отсутствие данных не считается нулём.'},
 cost:{title:'Цена кабинета',source:'Фактическая стоимость из реестра',body:'Цена, сохранённая при добавлении конкретного кабинета. Вначале подставляется из типа, затем может быть уточнена.',note:'Изменение текущей цены типа не меняет эту сумму. Стоимость учитывается один раз в Profit и ROI; исправление сохранённой суммы пересчитывает результат кабинета.'},
 date:{title:'Дата выдачи',source:'Дата, указанная при добавлении кабинета',body:'Дата получения кабинета. По ней формируется выборка, а финансовые результаты учитываются начиная с этой даты.',note:'Возраст кабинетов влияет на накопленный spend. Для сопоставимого сравнения выбирайте близкие периоды выдачи.'},
 status:{title:'Статус',source:'AIO → Meta → Ad Accounts · Meta Status',body:'Последнее полученное состояние рекламного кабинета: Active, Disabled, Unsettled или другое значение AIO. Прочерк или «Нет статуса» означает, что статус не получен.',note:'Статус текущий, а не на конец выбранного периода. Active не означает, что сейчас идёт открут. У Disabled наведите курсор, сфокусируйте или нажмите на статус, чтобы увидеть причину.'},
 reason:{title:'Причина Disabled',source:'AIO → Meta → Ad Accounts · Disabled Reason',body:'Причина текущего статуса Disabled в том виде, в котором её вернул AIO. Для остальных статусов показывается прочерк.',note:'Если причина не получена, это указано явно. Причина не выводится из остановки spend и не определяется автоматически по финансовым показателям.'},
 open:{title:'Карточка кабинета',source:'Действие в реестре',body:'Нажмите на строку, чтобы открыть параметры кабинета, расчёт результата, сверку источников и связанные кампании.'}
};
export const DISABLED_REASON_MISSING='Причина не получена из AIO.';
export function getDisabledReason(account){return typeof account?.reason==='string'&&account.reason.trim()?account.reason.trim():DISABLED_REASON_MISSING;}

/** Count actual linked AIO campaigns; financial completeness does not affect this value. */
export function getCampaignCount(account){return Array.isArray(account?.campaigns)?account.campaigns.length:0;}
export function renderCampaignCount(account){
 const count=getCampaignCount(account);
 return `<button type="button" class="campaign-count" data-campaign-count="${esc(account.id)}" aria-label="Кампании кабинета ${esc(account.name)}: ${count}" aria-expanded="false"><span>${count}</span>${icon('down')}</button>`;
}
/** Accessible info button is separate from sorting, so tap never changes sort order. */
export function renderAccountHelp(key,label=ACCOUNT_COLUMN_HELP[key]?.title||'Показатель'){
 return `<button type="button" class="account-column-help" data-account-help="${esc(key)}" aria-label="Описание: ${esc(label)}" aria-expanded="false">${icon('info')}</button>`;
}

let dispose;
const popupId='account-data-tooltip';
/** Bind campaign counts, headers, status reasons and totals using one popup lifecycle. */
export function bindCampaignTooltips(getAccount,scope=document){
 dispose?.();
 const controller=new AbortController(),signal=controller.signal;
 let anchor=null,popup=null,pinned=false,hideTimer=null;
 const clearTimer=()=>{if(hideTimer)clearTimeout(hideTimer);hideTimer=null;};
 const close=()=>{
  clearTimer();
  if(anchor){anchor.setAttribute('aria-expanded','false');anchor.removeAttribute('aria-describedby');}
  popup?.remove();popup=null;anchor=null;pinned=false;
 };
 const position=()=>{
  if(!anchor?.isConnected||!popup){close();return;}
  const target=anchor.getBoundingClientRect(),viewport=window.visualViewport;
  const vLeft=viewport?.offsetLeft||0,vTop=viewport?.offsetTop||0,vWidth=viewport?.width||window.innerWidth,vHeight=viewport?.height||window.innerHeight;
  let leftBound=vLeft+12,rightBound=vLeft+vWidth-12;
  const frame=anchor.closest('.modal')||(document.body.classList.contains('mobile-preview')?document.getElementById('app'):null);
  if(frame){const bounds=frame.getBoundingClientRect();leftBound=Math.max(leftBound,bounds.left+12);rightBound=Math.min(rightBound,bounds.right-12);}
  const desired=popup.classList.contains('account-rich-tooltip')?350:popup.classList.contains('account-value-tooltip')?300:380;
  const width=Math.max(180,Math.min(desired,rightBound-leftBound));
  popup.style.width=width+'px';popup.style.maxWidth=Math.max(0,rightBound-leftBound)+'px';
  popup.style.maxHeight=Math.max(100,vHeight-24)+'px';
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
  hideTimer=setTimeout(()=>{if(!popup?.matches(':hover')&&document.activeElement!==anchor)close();},140);
 };
 const open=(button,sticky=false)=>{
  if(anchor===button&&popup){clearTimer();if(sticky)pinned=true;return;}
  close();
  const account=button.hasAttribute('data-campaign-count')?getAccount(button.dataset.campaignCount):null;
  const disabled=button.hasAttribute('data-account-disabled')?getAccount(button.dataset.accountDisabled):null;
  const help=button.hasAttribute('data-account-help')?ACCOUNT_COLUMN_HELP[button.dataset.accountHelp]:null;
  if(button.hasAttribute('data-campaign-count')&&!account||button.hasAttribute('data-account-disabled')&&!disabled||button.hasAttribute('data-account-help')&&!help)return;
  anchor=button;pinned=sticky;popup=document.createElement('div');popup.id=popupId;
  popup.setAttribute('role','tooltip');popup.className=account?'campaign-tooltip':help||disabled?'account-value-tooltip account-rich-tooltip':'account-value-tooltip';
  if(account){
   const campaigns=Array.isArray(account.campaigns)?account.campaigns:[];
   popup.innerHTML=`<div class="campaign-tooltip-heading"><strong>Связанные кампании</strong><span>${campaigns.length}</span></div>${campaigns.length?`<ul class="campaign-tooltip-list">${campaigns.map(c=>`<li><span class="campaign-tooltip-id">${esc(c.id)}</span><span class="campaign-tooltip-name">${esc(c.name)}</span></li>`).join('')}</ul>`:'<p class="campaign-tooltip-empty">У этого кабинета нет связанных кампаний AIO.</p>'}`;
  }else if(help){
   popup.innerHTML=`<div class="account-help-title">${esc(help.title)}</div><div class="account-help-source">${esc(help.source)}</div><p>${esc(help.body)}</p>${help.formula?`<div class="account-help-formula">${esc(help.formula)}</div>`:''}${help.note?`<p class="account-help-note">${esc(help.note)}</p>`:''}`;
  }else if(disabled){
   popup.innerHTML=`<div class="account-help-title">Причина Disabled</div><div class="account-help-source">AIO → Meta → Ad Accounts · Disabled Reason</div><p class="account-disabled-reason-text">${esc(getDisabledReason(disabled))}</p><p class="account-help-note">Последняя полученная причина ограничения для кабинета ${esc(disabled.name)}.</p>`;
  }else popup.textContent=button.getAttribute('data-account-value-tooltip')||'Нет данных';
  document.body.append(popup);anchor.setAttribute('aria-expanded','true');anchor.setAttribute('aria-describedby',popupId);
  popup.addEventListener('pointerenter',clearTimer,{signal});popup.addEventListener('pointerleave',()=>scheduleClose(),{signal});
  popup.addEventListener('click',e=>e.stopPropagation(),{signal});
  position();
 };
 const buttons=[...scope.querySelectorAll('[data-campaign-count],[data-account-value-tooltip],[data-account-help],[data-account-disabled]')];
 for(const button of buttons){
  button.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')open(button);},{signal});
  button.addEventListener('pointerleave',()=>scheduleClose(),{signal});
  button.addEventListener('focus',()=>open(button),{signal});
  button.addEventListener('blur',()=>scheduleClose(true),{signal});
  button.addEventListener('click',e=>{if(button.hasAttribute('data-sort')){close();return;}e.preventDefault();e.stopPropagation();if(anchor===button&&pinned)close();else open(button,true);},{signal});
  button.addEventListener('keydown',e=>{if(!button.hasAttribute('data-sort')&&(e.key==='Enter'||e.key===' '))e.stopPropagation();},{signal});
 }
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&popup){e.preventDefault();e.stopImmediatePropagation();close();}},{capture:true,signal});
 document.addEventListener('pointerdown',e=>{if(popup&&!popup.contains(e.target)&&!anchor?.contains(e.target))close();},{capture:true,signal});
 window.addEventListener('resize',position,{signal});window.visualViewport?.addEventListener('resize',position,{signal});
 document.addEventListener('scroll',e=>{if(popup&&!popup.contains(e.target))position();},{capture:true,signal});
 window.addEventListener('hashchange',close,{signal});window.addEventListener('app:render',close,{signal});
 const observer=new MutationObserver(()=>{if(anchor&&!anchor.isConnected)close();});
 observer.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
 dispose=()=>{close();controller.abort();observer.disconnect();};
}
export function hideAccountTooltips(){dispose?.();dispose=null;}
