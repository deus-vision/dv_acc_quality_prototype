import { db, ui, teamAccounts, teamTypes, teamUsers, filteredAccounts, aggregate, rerender, navigate, esc, money, num, pct, icon, modal, closeModal } from './core.js';
import {renderIssueDatePicker,bindIssueDatePicker} from './date-picker.js';

const metricDefs = {
  spendPer: { label:'Средний Spend на кабинет', help:'Spend / число кабинетов с полученным Spend', fields:['spend'], format:v=>money(v), lower:false },
  profitPer: { label:'Средний Profit на кабинет', help:'Profit AIO / число кабинетов с полученным Profit · до вычета стоимости кабинетов', fields:['profit'], format:v=>money(v), lower:false },
  revenuePer: { label:'Средний Revenue на кабинет', help:'Revenue AIO / число кабинетов с полученным Revenue', fields:['revenue'], format:v=>money(v), lower:false },
  costPer1000: { label:'Стоимость на $1 000 Spend', help:'Стоимость кабинетов / Spend × 1 000', fields:['spend','cost'], format:v=>money(v,1), lower:true },
  costPer1000Profit: { label:'Стоимость на $1 000 Profit', help:'Стоимость кабинетов / положительный Profit AIO × 1 000', fields:['profit','cost'], format:v=>money(v,1), lower:true },
  costPer1000Revenue: { label:'Стоимость на $1 000 Revenue', help:'Стоимость кабинетов / положительный Revenue AIO × 1 000', fields:['revenue','cost'], format:v=>money(v,1), lower:true },
  roi: { label:'ROI', help:'(Profit AIO − стоимость кабинетов) / (Spend + стоимость) × 100%', fields:['profit','spend','cost'], format:v=>pct(v), lower:false },
  disabledRate: { label:'Disabled сейчас', help:'Доля Disabled среди кабинетов с известным статусом', fields:[], format:v=>v==null?'—':`${num(v,1)}%`, lower:true }
};
const colors=['#6366f1','#8b83eb','#a5a7ed','#bfbeee','#d5d4f5','#7da4ce','#b4c9dd'];
const colorValue=c=>/^#[0-9a-fA-F]{3,8}$/.test(c||'')?c:'#8b83eb';
const arrow='<svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M5 10h10m-4-4 4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const metric=()=>metricDefs[ui.metric]||metricDefs.spendPer;
const opts=(arr,current)=>arr.map(([value,label])=>`<option value="${esc(value)}" ${String(current)===String(value)?'selected':''}>${esc(label)}</option>`).join('');
const fieldLabels={spend:'Spend',profit:'Profit AIO',revenue:'Revenue AIO',raw:'Raw Spend Meta',cost:'Стоимость кабинетов'};
const fieldMap={spend:['spend'],revenue:['revenue'],profit:['profit'],raw:['raw'],diff:['spend','raw'],net:['profit','cost'],cost:['cost'],avgCost:['cost']};
const safeAggregate=aggregate;
function initUI(){
  ui.analysisTab||='types';ui.metric||='spendPer';ui.analyticsExtended??=false;ui.filters||={};
  for(const [k,v] of Object.entries({buyer:'all',type:'all',status:'all',period:'month',dateFrom:'',dateTo:'',geo:'all',search:'',completeness:'all'}))ui.filters[k]??=v;
}
function metricTip(g,key){
  const fields=metricDefs[key]?.fields||fieldMap[key]||[];
  const missing=fields.filter(f=>g.missingCounts?.[f]>0);
  const parts=[];
  const meanField={spendPer:'spend',profitPer:'profit',revenuePer:'revenue',avgCost:'cost'}[key];
  if(missing.length){
    for(const f of missing)parts.push(`${fieldLabels[f]} получен для ${num(g.count-g.missingCounts[f])} из ${num(g.count)} кабинетов.`);
    if(g[key]==null)parts.push('Показатель пока недоступен. Отсутствие данных не означает нулевой результат.');
    else if(meanField){const known=g.count-g.missingCounts[meanField];parts.push(`Среднее рассчитано только по кабинетам с полученными данными: ${money(g[meanField],2)} ÷ ${num(known)}. Кабинеты без значения исключены; полученные нулевые значения учитываются.`);}
    else parts.push('Предварительный показатель рассчитан по доступным данным и уточнится после синхронизации. Отсутствующие значения не считаются подтверждёнными нулями.');
  }
  const denominator={costPer1000:'spend',costPer1000Profit:'profit',costPer1000Revenue:'revenue'}[key];
  if(denominator&&g[denominator]!=null&&g[denominator]<=0&&g.count)parts.push(`Не рассчитывается: суммарный ${fieldLabels[denominator]} равен нулю или отрицательный.`);
  if(metricDefs[key])parts.push(metricDefs[key].help+'.');
  if(key==='avgCost')parts.push('Сумма известных фактических цен / число кабинетов с указанной ценой.');
  if(key==='net')parts.push('Profit AIO − фактическая стоимость всех кабинетов выборки.');
  if(key==='diff')parts.push('Spend − Raw Spend Meta; оба источника за один период.');
  if(key==='disabledRate')parts.push(`${num(g.disabled)} Disabled из ${num(g.knownStatus)} кабинетов с известным статусом. Без статуса: ${num(g.count-g.knownStatus)}.`);
  return {text:parts.join(' '),partial:missing.length>0};
}
function tipSpan(text,content,partial=false){return `<span class="a-value-tip ${partial?'a-value-partial':''}" data-a-tooltip="${esc(text)}" tabindex="0" role="button" aria-label="${esc(content.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim())}. ${esc(text)}">${content}${partial?'<sup class="a-partial-mark" aria-hidden="true">*</sup>':''}</span>`;}
function value(g,key,decimals=0){
  const info=metricTip(g,key),v=g[key];
  const formatted=metricDefs[key]?metricDefs[key].format(v):`${key==='diff'&&v>0?'+':''}${money(v,decimals)}`;
  return info.text?tipSpan(info.text,formatted,info.partial):formatted;
}
function activeCount(){return Object.entries(ui.filters).filter(([k,v])=>!['period','dateFrom','dateTo'].includes(k)&&v&&v!=='all').length+(ui.filters.period!=='month'?1:0);}
function filterBar(){
  const f=ui.filters,buyers=teamUsers().filter(u=>u.status!=='disabled'&&u.status!=='Отключён'),geos=[...new Set(teamAccounts().map(a=>a.geo).filter(Boolean))].sort();
  return `<div class="a-filterbar" aria-label="Фильтры аналитики">
  ${renderIssueDatePicker('a-period')}
  <label class="a-filter"><span>Байер</span><select id="a-buyer" aria-label="Фильтр по байеру">${opts([['all','Все байеры'],...buyers.map(u=>[u.id,u.username])],f.buyer)}</select></label>
  <label class="a-filter"><span>Тип кабинета</span><select id="a-type" aria-label="Фильтр по типу кабинета">${opts([['all','Все типы'],...teamTypes(true).map(t=>[t.id,t.name])],f.type)}</select></label>
  <label class="a-filter"><span>Статус</span><select id="a-status" aria-label="Фильтр по статусу">${opts([['all','Все статусы'],['Active','Active'],['Disabled','Disabled'],['Unsettled','Unsettled'],['unknown','Не получен']],f.status)}</select></label>
  <label class="a-filter a-geo-filter"><span>GEO</span><select id="a-geo" aria-label="Фильтр по GEO">${opts([['all','Все GEO'],...geos.map(g=>[g,g])],f.geo)}</select></label>
  <label class="a-disabled-filter ${f.status==='Disabled'?'is-checked':''}"><input type="checkbox" id="a-only-disabled" ${f.status==='Disabled'?'checked':''}><span>Только Disabled</span></label>
  ${activeCount()?`<button class="btn btn-ghost btn-sm a-reset" id="a-reset" title="Сбросить фильтры">${icon('close')} Сбросить</button>`:''}</div>`;
}
function groupRows(rows,by='types'){
  const field=by==='buyers'?'buyerId':'typeId',list=by==='buyers'?teamUsers():teamTypes(true);
  return list.map((item,i)=>{const entries=rows.filter(a=>a[field]===item.id);return {id:item.id,name:by==='buyers'?item.username:item.name,color:colorValue(item.color||colors[i%colors.length]),subtitle:by==='buyers'?(item.aio&&item.aio!==item.username?item.aio:({buyer:'Байер',lead:'Тимлид',admin:'Администратор'}[item.role]||'Байер')):`${money(item.price)} · текущая цена`,...safeAggregate(entries)};}).filter(g=>g.count>0);
}
export function statusBreakdown(g){
  const counts=g.statusCounts||{},total=g.count||0;
  const rows=[{key:'Active',label:'Active',count:counts.Active??g.active??0},{key:'Disabled',label:'Disabled',count:counts.Disabled??g.disabled??0}];
  const unsettled=counts.Unsettled??g.unsettled??0;
  if(unsettled)rows.push({key:'Unsettled',label:'Unsettled',count:unsettled});
  for(const [status,count] of Object.entries(counts))if(!['Active','Disabled','Unsettled','unknown'].includes(status)&&count>0)rows.push({key:status,label:status,count});
  rows.push({key:'unknown',label:'Без статуса',count:Math.max(0,total-(g.knownStatus||0))});
  return rows.map(row=>({...row,percent:total>0?row.count/total*100:0}));
}
function summary(t){
  const statuses=statusBreakdown(t);
  return `<div class="a-stats">
  <div class="a-stat a-stat-status"><div class="a-stat-label">Кабинетов в выборке ${icon('box')}</div><div class="a-stat-value">${num(t.count)}</div><dl class="a-status-breakdown" aria-label="Статусы: количество и доля от всех кабинетов выборки">${statuses.map(s=>`<div data-status-key="${esc(s.key)}"><dt><i class="a-status-dot ${s.key==='Active'?'is-active':s.key==='Disabled'?'is-disabled':s.key==='Unsettled'?'is-unsettled':'is-unknown'}" aria-hidden="true"></i>${s.key==='Unsettled'?tipSpan('Unsettled — полученный статус Meta, связанный с неурегулированной оплатой. Проверьте биллинг кабинета. Это не отсутствие данных.',esc(s.label)):s.key==='unknown'?tipSpan('Статус кабинета ещё не получен из AIO → Meta. Это отсутствие данных, а не статус Unsettled.',esc(s.label)):esc(s.label)}</dt><dd><strong>${num(s.count)}</strong><span>(${num(s.percent,1)}%)</span></dd></div>`).join('')}</dl></div>
  <div class="a-stat"><div class="a-stat-label">Стоимость кабинетов ${icon('box')}</div><div class="a-stat-value">${value(t,'cost')}</div><div class="a-stat-desc">${value(t,'avgCost',1)} средняя фактическая цена</div></div>
  <div class="a-stat a-stat-paired"><div class="a-stat-metric"><div class="a-stat-label">Средний Spend на кабинет</div><div class="a-stat-value">${value(t,'spendPer')}</div></div><div class="a-stat-metric"><div class="a-stat-label">Средний Profit на кабинет</div><div class="a-stat-value ${t.profitPer<0?'a-negative':''}">${value(t,'profitPer')}</div></div><div class="a-stat-desc">Profit AIO · до стоимости кабинетов</div></div>
  <div class="a-stat a-stat-paired"><div class="a-stat-metric"><div class="a-stat-label">Стоимость на $1 000 Spend</div><div class="a-stat-value">${value(t,'costPer1000')}</div></div><div class="a-stat-metric"><div class="a-stat-label">Стоимость на $1 000 Profit</div><div class="a-stat-value">${value(t,'costPer1000Profit')}</div></div><div class="a-stat-desc">По Spend и Profit из AIO</div></div>
  </div>`;
}
function emptyState(){return `<div class="panel a-empty"><div class="a-empty-icon">${icon('search')}</div><h3>В этой выборке пока нет кабинетов</h3><p class="muted">Измените фильтры или добавьте кабинеты, чтобы сравнить их результативность.</p><div class="inline"><button class="btn" id="a-reset-empty">Сбросить фильтры</button><button class="btn btn-primary" id="a-empty-accounts">Перейти к кабинетам ${arrow}</button></div></div>`;}
function chart(groups){
  const d=metric();
  const sorted=[...groups].sort((a,b)=>a[ui.metric]==null?(b[ui.metric]==null?0:1):b[ui.metric]==null?-1:(d.lower?1:-1)*(a[ui.metric]-b[ui.metric]));
  const max=Math.max(1,...sorted.map(g=>g[ui.metric]||0)),min=Math.min(0,...sorted.map(g=>g[ui.metric]||0)),span=max-min,zero=-min/span*100;
  return `<section class="panel a-chart-panel" aria-label="Сравнение результативности"><div class="panel-head a-chart-head"><div><h2>Сравнение ${ui.analysisTab==='buyers'?'байеров':'типов кабинетов'}</h2><p class="muted">${esc(d.help)}</p></div><select class="a-metric-select" id="a-chart-metric" aria-label="Метрика графика">${opts(Object.entries(metricDefs).map(([k,v])=>[k,v.label]),ui.metric)}</select></div>
  <div class="a-chart"><div class="a-chart-scale"><span>${d.format(min)}</span><span>${d.format((max+min)/2)}</span><span>${d.format(max)}</span></div>
  ${sorted.map(g=>`<div class="a-bar-row"><button class="a-bar-main" data-drill="${esc(g.id)}" data-group="${ui.analysisTab}" aria-label="Показать кабинеты: ${esc(g.name)}"><span class="a-bar-name"><span class="a-color-dot" style="background:${g.color}"></span><span>${esc(g.name)}</span><small>${num(g.count)} каб.</small></span><span class="a-bar-track"><span class="a-bar" style="left:${g[ui.metric]<0?zero-Math.abs(g[ui.metric])/span*100:zero}%;width:${g[ui.metric]==null?0:Math.max(0,Math.abs(g[ui.metric])/span*100)}%;background:${g[ui.metric]<0?'#e7a797':g.color}"></span></span></button><span class="a-bar-value">${value(g,ui.metric)}</span></div>`).join('')}
  </div><div class="a-chart-note"><span class="a-hint-dot"></span>${d.lower?'Меньше — лучше':'Больше — лучше'}<span class="a-chart-note-sep">·</span>Нажмите на строку, чтобы открыть кабинеты</div></section>`;
}
const expandedMetrics=['spendPer','profitPer','revenuePer','costPer1000','costPer1000Profit','costPer1000Revenue'];
function details(groups,total){
  const byBuyer=ui.analysisTab==='buyers',extra=ui.analyticsExtended;
  return `<section class="panel a-details"><div class="panel-head a-details-head"><div><h2>${byBuyer?'Результаты по байерам':'Результаты по типам'}</h2><p class="muted">Фактическая стоимость сохранена в каждом кабинете</p></div><button class="btn btn-sm ${extra?'a-selected-btn':''}" id="a-columns">${icon('grid')} ${extra?'Основные колонки':'Все показатели'}</button></div>
  <div class="table-wrap"><table class="data-table a-result-table"><thead><tr><th>${byBuyer?'Байер':'Тип кабинета'}</th><th class="a-num">Кабинеты</th><th class="a-num">Стоимость</th><th class="a-num">Spend</th><th class="a-num">Revenue</th>${extra?`<th class="a-num">Raw Spend Meta</th><th class="a-num">Разница Spend</th><th class="a-num">Profit AIO</th><th class="a-num">Средняя цена</th>${expandedMetrics.map(k=>`<th class="a-num a-expanded-head">${esc(metricDefs[k].label)}</th>`).join('')}`:''}<th class="a-num" title="Profit AIO минус фактическая стоимость кабинетов">Profit с кабинетов</th><th class="a-num">ROI</th><th class="a-num">Disabled</th><th></th></tr></thead><tbody>${groups.map(g=>row(g,false,extra)).join('')}</tbody><tfoot>${row({...total,name:'Итого',subtitle:`${num(total.count)} кабинетов в выборке`},true,extra)}</tfoot></table></div>
  <div class="a-table-footer"><span>${num(groups.length)} ${byBuyer?'байеров':'типов'} · ${num(total.count)} кабинетов${extra?' · Прокрутите таблицу вправо →':''}</span></div></section>`;
}
function row(g,total,extra){
  const unknown=g.count-g.knownStatus,diff=g.raw==null||g.spend==null?null:g.spend-g.raw;
  const statusTip=`Disabled: ${num(g.disabled)} из ${num(g.knownStatus)} кабинетов с известным статусом. Всего в выборке: ${num(g.count)}. ${unknown?`Без статуса: ${num(unknown)} — Meta ещё не передала их статус.`:'Статусы всех кабинетов получены.'}`;
  return `<tr ${total?'':`data-drill="${esc(g.id)}" data-group="${ui.analysisTab}" tabindex="0" role="button" aria-label="Кабинеты ${esc(g.name)}"`}><td><div class="a-name-cell">${total?'':`<span class="a-type-icon" style="--type-color:${g.color}">${ui.analysisTab==='buyers'?esc(g.name.slice(0,2).toUpperCase()):icon('box')}</span>`}<div><strong>${esc(g.name)}</strong><small>${esc(g.subtitle||'')}</small></div></div></td><td class="a-num">${num(g.count)}</td><td class="a-num">${value(g,'cost')}</td><td class="a-num">${value(g,'spend')}</td><td class="a-num">${value(g,'revenue')}</td>${extra?`<td class="a-num">${value(g,'raw')}</td><td class="a-num ${diff!=null&&Math.abs(diff)>Math.abs(g.raw)*.05?'a-warning':''}">${value({...g,diff},'diff')}</td><td class="a-num">${value(g,'profit')}</td><td class="a-num">${value(g,'avgCost',1)}</td>${expandedMetrics.map(k=>`<td class="a-num ${k==='profitPer'&&g[k]<0?'a-negative':''}">${value(g,k)}</td>`).join('')}`:''}<td class="a-num ${g.net<0?'a-negative':'a-positive'}">${value(g,'net')}</td><td class="a-num ${g.roi<0?'a-negative':'a-positive'}">${value(g,'roi')}</td><td class="a-num a-status-cell">${tipSpan(statusTip,`<span class="a-disabled-pill ${g.disabledRate>40?'a-disabled-high':''}">${num(g.disabled)} из ${num(g.knownStatus)}</span><span class="a-status-caption">с известным статусом</span>${unknown?`<span class="a-unknown-status">Без статуса: ${num(unknown)}</span>`:''}`)}</td><td class="a-row-arrow">${total?'':arrow}</td></tr>`;
}
function matrix(rows){
  const types=teamTypes(true).filter(t=>rows.some(a=>a.typeId===t.id)),buyers=teamUsers().filter(u=>rows.some(a=>a.buyerId===u.id)),d=metric();
  const cells=buyers.flatMap(b=>types.map(t=>({buyer:b,type:t,...safeAggregate(rows.filter(a=>a.buyerId===b.id&&a.typeId===t.id))})));
  const values=cells.filter(c=>c.count&&c[ui.metric]!=null).map(c=>c[ui.metric]),min=Math.min(0,...values),max=Math.max(1,...values);
  if(!types.some(t=>t.id===ui.matrixType))ui.matrixType=types[0]?.id;
  function cell(c,mobile=false){
    if(!c?.count)return `<${mobile?'div':'td'} class="a-matrix-empty">—</${mobile?'div':'td'}>`;
    const v=c[ui.metric],ratio=v==null?0:(v-min)/(max-min||1),quality=d.lower?1-ratio:ratio,bg=v==null?'#fafafa':`rgba(99,102,241,${.04+quality*.19})`;
    return `<${mobile?'div':'td'} class="a-matrix-cell"><div class="a-matrix-card" style="background:${bg}"><strong>${value(c,ui.metric)}</strong><button data-matrix-buyer="${esc(c.buyer.id)}" data-matrix-type="${esc(c.type.id)}" aria-label="Открыть кабинеты: ${esc(c.buyer.username)}, ${esc(c.type.name)}">${num(c.count)} каб. ${arrow}</button></div></${mobile?'div':'td'}>`;
  }
  return `<section class="panel a-matrix-panel"><div class="panel-head a-chart-head"><div><h2>Байер × тип кабинета</h2><p class="muted">${esc(d.help)}</p></div><select class="a-metric-select" id="a-matrix-metric" aria-label="Метрика матрицы">${opts(Object.entries(metricDefs).map(([k,v])=>[k,v.label]),ui.metric)}</select></div>
  <div class="a-matrix-desktop table-wrap"><table class="a-matrix"><thead><tr><th>Байер</th>${types.map(t=>`<th><span class="a-color-dot" style="background:${colorValue(t.color)}"></span>${esc(t.name)}</th>`).join('')}</tr></thead><tbody>${buyers.map(b=>`<tr><th><div class="a-buyer-cell"><span class="a-avatar">${esc(b.username.slice(0,2).toUpperCase())}</span><span>${esc(b.username)}</span></div></th>${types.map(t=>cell(cells.find(c=>c.buyer.id===b.id&&c.type.id===t.id))).join('')}</tr>`).join('')}</tbody></table></div>
  <div class="a-matrix-mobile"><label class="field">Тип кабинета<select id="a-mobile-type">${opts(types.map(t=>[t.id,t.name]),ui.matrixType)}</select></label>${buyers.map(b=>`<div class="a-mobile-matrix-row"><span>${esc(b.username)}</span>${cell(cells.find(c=>c.buyer.id===b.id&&c.type.id===ui.matrixType),true)}</div>`).join('')}</div>
  <div class="a-matrix-legend"><span>Менее результативно</span><i></i><span>Более результативно</span><span class="a-matrix-legend-note">Нажмите на число кабинетов для перехода</span></div></section>`;
}
function methodology(){
  modal('Как читать эту аналитику',`<div class="a-methodology"><p>Вы выбираете <strong>кабинеты по дате выдачи</strong>. Результаты накапливаются с даты выдачи по дату отчёта — 23 октября 2026.</p><dl><dt>Spend, Revenue и Profit AIO</dt><dd>Данные связанных кампаний из Analytics → Roll Up Report. Новые средние и стоимость на $1 000 Profit используют Profit AIO до вычета стоимости кабинетов.</dd><dt>Средний Spend, Profit и Revenue на кабинет</dt><dd>Сумма соответствующего показателя / число кабинетов, для которых этот показатель получен. Для Spend, Profit и Revenue знаменатель считается отдельно. Кабинеты без значения исключаются; подтверждённый ноль учитывается. Если ни одного значения нет, показываем «—». Звёздочка означает неполное покрытие выборки, а подсказка показывает число кабинетов в расчёте.</dd><dt>Стоимость на $1 000 Spend, Profit и Revenue</dt><dd>Фактическая стоимость всех кабинетов / сумма соответствующего показателя × 1 000. При нулевой или отрицательной сумме показываем «—». Сначала складываем суммы, затем считаем отношение.</dd><dt>Profit с кабинетов и ROI</dt><dd>Profit = Profit AIO − стоимость кабинетов. ROI = (Profit AIO − стоимость) / (Spend + стоимость) × 100%.</dd><dt>Raw Spend Meta</dt><dd>Расходы из Meta → Ad Accounts для сверки. Не прибавляются к Spend и не вычитаются повторно.</dd><dt>Статусы в первой карточке</dt><dd>Количество и доля Active, Disabled, Unsettled и кабинетов без статуса от всей выбранной группы. Каждое состояние учитывается отдельно: Unsettled не относится к Active. При пустой выборке доли равны 0%.</dd><dt>Только Disabled</dt><dd>Оставляет кабинеты с текущим статусом Disabled. В колонке таблицы Disabled знаменатель включает только кабинеты с известным статусом. Кабинеты без статуса перечислены отдельно.</dd><dt>Красная звёздочка *</dt><dd>Для части кабинетов данные ещё не получены. Наведите на число, нажмите на него или перейдите клавишей Tab, чтобы увидеть, какие данные отсутствуют. Отсутствие данных не равно нулю.</dd></dl><p class="muted">У новых кабинетов меньше времени на открут. Для сравнения выбирайте близкие даты выдачи.</p></div>`,`<button class="btn btn-primary" id="a-methodology-close">Понятно</button>`);
  document.querySelector('#a-methodology-close')?.addEventListener('click',closeModal);
}
let tipAnchor=null,tooltipListeners=false;
function hideTooltip(){document.querySelector('#analytics-tooltip')?.remove();tipAnchor?.removeAttribute('aria-describedby');tipAnchor=null;}
function showTooltip(el){
  hideTooltip();const tip=document.createElement('div');tip.id='analytics-tooltip';tip.className='a-floating-tooltip';tip.setAttribute('role','tooltip');tip.textContent=el.dataset.aTooltip;const appBounds=document.querySelector('#app')?.getBoundingClientRect();const left=Math.max(12,(appBounds?.left||0)+12),right=Math.min(window.innerWidth-12,(appBounds?.right||window.innerWidth)-12);tip.style.maxWidth=`${Math.min(330,right-left)}px`;document.body.append(tip);tipAnchor=el;el.setAttribute('aria-describedby',tip.id);
  const r=el.getBoundingClientRect(),t=tip.getBoundingClientRect();tip.style.left=`${Math.max(left,Math.min(right-t.width,r.left+r.width/2-t.width/2))}px`;tip.style.top=`${r.top-t.height-10>=12?r.top-t.height-10:Math.min(window.innerHeight-t.height-12,r.bottom+10)}px`;
}
function bindTooltips(){
  document.querySelectorAll('[data-a-tooltip]').forEach(el=>{
    el.addEventListener('pointerenter',()=>showTooltip(el));el.addEventListener('pointerleave',hideTooltip);el.addEventListener('focus',()=>showTooltip(el));el.addEventListener('blur',hideTooltip);
    el.addEventListener('click',e=>{e.stopPropagation();showTooltip(el);});
    el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();showTooltip(el);}});
  });
  if(!tooltipListeners){document.addEventListener('pointerdown',e=>{if(!e.target.closest('[data-a-tooltip]'))hideTooltip();});document.addEventListener('keydown',e=>{if(e.key==='Escape')hideTooltip();});document.addEventListener('scroll',hideTooltip,true);window.addEventListener('resize',hideTooltip);tooltipListeners=true;}
}
export function renderAnalytics(){
  hideTooltip();initUI();const rows=filteredAccounts(),total=safeAggregate(rows),groups=groupRows(rows,ui.analysisTab==='buyers'?'buyers':'types');
  return `<div class="analytics-page"><div class="a-page-heading"><div><div class="a-eyebrow">ACCOUNT INTELLIGENCE</div><h1>Аналитика кабинетов</h1><p class="muted">Какие кабинеты дают больше. И сколько это стоит.</p></div><div class="a-heading-actions"><button class="btn btn-primary" id="a-add" data-add>${icon('plus')} Добавить кабинеты</button></div></div>
  ${filterBar()}<div class="a-cohort-note"><span>${icon('info')} Результаты с даты выдачи до 23 октября · статусы текущие</span><button id="a-methodology" class="a-text-button">Как считаем ${arrow}</button></div>${summary(total)}
  <div class="a-view-tabs" role="tablist" aria-label="Представление аналитики">${[['types','По типам','box'],['buyers','По байерам','users'],['matrix','Байер × тип','grid']].map(([id,label,glyph])=>`<button role="tab" aria-selected="${ui.analysisTab===id}" data-analysis-tab="${id}" class="a-view-tab ${ui.analysisTab===id?'active':''}">${icon(glyph)}${label}</button>`).join('')}<span class="a-view-tail">${num(total.count)} кабинетов в выборке</span></div>
  ${total.missing?`<div class="a-data-note">${icon('info')} <span>У ${num(total.missing)} кабинетов неполные данные AIO. Знак <span class="a-partial-mark">*</span> — не все данные получены. Наведите на число для пояснения.</span><button class="a-text-button" id="a-missing">Посмотреть ${arrow}</button></div>`:''}
  ${!rows.length?emptyState():ui.analysisTab==='matrix'?matrix(rows):`${chart(groups)}${details(groups,total)}`}
  </div>`;
}
export function bindAnalytics(){
  document.querySelectorAll('[data-analysis-tab]').forEach(el=>el.addEventListener('click',()=>{ui.analysisTab=el.dataset.analysisTab;rerender();}));
  bindIssueDatePicker('a-period');
  for(const key of ['buyer','type','status','geo'])document.querySelector(`#a-${key}`)?.addEventListener('change',e=>{ui.filters[key]=e.target.value;if(key!=='status')ui.filters.search='';rerender();});
  document.querySelector('#a-only-disabled')?.addEventListener('change',e=>{ui.filters.status=e.target.checked?'Disabled':'all';rerender();});
  document.querySelectorAll('#a-chart-metric,#a-matrix-metric').forEach(el=>el.addEventListener('change',e=>{ui.metric=e.target.value;rerender();}));
  document.querySelector('#a-mobile-type')?.addEventListener('change',e=>{ui.matrixType=e.target.value;rerender();});
  document.querySelectorAll('#a-reset,#a-reset-empty').forEach(el=>el.addEventListener('click',()=>{Object.assign(ui.filters,{buyer:'all',type:'all',status:'all',period:'month',dateFrom:'',dateTo:'',geo:'all',search:'',completeness:'all'});rerender();}));
  document.querySelector('#a-methodology')?.addEventListener('click',methodology);document.querySelector('#a-columns')?.addEventListener('click',()=>{ui.analyticsExtended=!ui.analyticsExtended;rerender();});
  document.querySelector('#a-empty-accounts')?.addEventListener('click',()=>navigate('accounts'));document.querySelector('#a-missing')?.addEventListener('click',()=>navigate('accounts',{...ui.filters,completeness:'missing'}));
  document.querySelectorAll('[data-drill]').forEach(el=>{const run=()=>navigate('accounts',{...ui.filters,[el.dataset.group==='buyers'?'buyer':'type']:el.dataset.drill});el.addEventListener('click',run);el.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();run();}});});
  document.querySelectorAll('[data-matrix-buyer]').forEach(el=>el.addEventListener('click',()=>navigate('accounts',{...ui.filters,buyer:el.dataset.matrixBuyer,type:el.dataset.matrixType})));
  bindTooltips();
}
