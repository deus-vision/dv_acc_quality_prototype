const KEY='dv-account-lab-v1';
const now=Date.now();
const seedTypes=[['t1','North · Standard',25,'#6d66d7'],['t2','North · Premium',45,'#3b82a5'],['t3','Atlas · Agency',65,'#408d79'],['t4','Собственный фарм',12,'#bf925a'],['t5','Orbit · Verified',35,'#9b70a8']].map(([id,name,price,color])=>({id,team:'alpha',name,price,color,archived:false}));
const DEMO_ROSTER_REVISION=1;
const DEMO_CAMPAIGN_REVISION=1;
const demoCampaignSamples=[
 ['190842','595 AR OF'],['218644','594 MPG AR-4G6XB'],['192238','594 IN Voronka2 61XDIGSPSF'],
 ['248601','595 KR-20PP1'],['231241','594 IN Voronka1 BLN2L'],['225502','598 CL-LB0VP'],
 ['188697','594 AR mix of cas'],['196339','594 KR MIX'],['162322','593 AR off mix'],
 ['174568','590 AR MPG'],['199320','596 IN Voronka2 61XDIGSPSF'],['208856','596 CO MIX'],
 ['204025','597 IN-61XDIGSPSF'],['207335','598 AR-MPG'],['233082','597 IN-SAS44']
];
const seedAccountId=index=>String(129450000000000+index*375173+861);
function demoCampaignIdentity(index,accountId,slot=0){
 const sample=demoCampaignSamples[(index+slot)%demoCampaignSamples.length];
 return {id:slot===0&&index<demoCampaignSamples.length?sample[0]:String(300000+index*2+slot),name:sample[1]+' ['+accountId+']'};
}
function seedCampaigns(index,accountId,spend,revenue){
 const spendCents=Math.round(spend*100),revenueCents=Math.round(revenue*100);
 const parts=index%10===2?[.6,.4]:[1];
 let remainingSpend=spendCents,remainingRevenue=revenueCents;
 return parts.map((part,slot)=>{
  const last=slot===parts.length-1;
  const spendPart=last?remainingSpend:Math.round(spendCents*part),revenuePart=last?remainingRevenue:Math.round(revenueCents*part);
  remainingSpend-=spendPart;remainingRevenue-=revenuePart;
  return {...demoCampaignIdentity(index,accountId,slot),spend:spendPart/100,revenue:revenuePart/100,profit:(revenuePart-spendPart)/100};
 });
}
// Only untouched built-in campaign identities are replaced; saved figures and links stay intact.
export function migrateDemoCampaigns(state){
 if(state?.version!==1||!Array.isArray(state.accounts)||(state.demoCampaignRevision??0)>=DEMO_CAMPAIGN_REVISION)return false;
 const usedIds=new Set(state.accounts.flatMap(account=>Array.isArray(account.campaigns)?account.campaigns.map(campaign=>String(campaign.id)):[]));
 for(let index=0;index<68;index++){
  const id=seedAccountId(index),team=index>=60?'beta':'alpha';
  const account=state.accounts.find(item=>item.id===id&&item.team===team);
  if(!Array.isArray(account?.campaigns))continue;
  const oldName=['IN Voronka 2','AR Mix','BR Launch','KR Test','CL Scale'][index%5]+' ['+id+']';
  const campaign=account.campaigns.find(item=>item.id==='cmp-'+index&&item.name===oldName);
  if(!campaign)continue;
  const identity=demoCampaignIdentity(index,id);
  if(usedIds.has(identity.id))continue;
  Object.assign(campaign,identity);
  usedIds.add(identity.id);
 }
 state.demoCampaignRevision=DEMO_CAMPAIGN_REVISION;
 return true;
}
const alphaLogins=['vlad_11_595','max_11_594','natalia_11_598','vlad_11_593','ivan_11_590','vova_11_596','nikita_11_597'];
const seedUsers=alphaLogins.map((username,index)=>({id:'u'+(index+1),team:'alpha',username,role:index===0?'admin':index===1||index===5?'lead':'buyer',email:username+'@example.com',aio:username,status:'active'}));
const betaUsers=[['ub1','beta_lead','lead'],['ub2','beta_buyer','buyer']].map(([id,username,role])=>({id,team:'beta',username,email:username+'@example.com',aio:username,role,status:'active'}));
// Fill legacy demo defaults without overwriting edited user identities.
export function migrateDemoRoster(state){
 if(state?.version!==1||!Array.isArray(state.users)||(state.demoRosterRevision??0)>=DEMO_ROSTER_REVISION)return false;
 for(const source of [...seedUsers.slice(0,6),...betaUsers]){
  const user=state.users.find(item=>item.id===source.id&&item.team===source.team);
  if(user)for(const key of ['username','email','aio']){
   const claimed=key!=='aio'&&state.users.some(other=>other.id!==user.id&&String(other[key]||'').toLowerCase()===source[key].toLowerCase());
   if(!user[key]&&!claimed)user[key]=source[key];
  }
 }
 if(!state.users.some(user=>user.id==='u7'||String(user.username||'').toLowerCase()===seedUsers[6].username||String(user.email||'').toLowerCase()===seedUsers[6].email)){
  const newBuyer={...seedUsers[6]};
  const firstBeta=state.users.findIndex(user=>user.team==='beta');
  state.users.splice(firstBeta<0?state.users.length:firstBeta,0,newBuyer);
 }
 state.demoRosterRevision=DEMO_ROSTER_REVISION;
 return true;
}
// Usernames are the only display identity. Existing usernames and user IDs are stable.
export function migrateUsernames(state){
 if(!Array.isArray(state?.users))return false;
 const occupied=new Set(state.users.filter(user=>typeof user.username==='string'&&user.username.trim()).map(user=>user.username.toLowerCase()));
 let changed=false;
 for(const user of state.users){
  if(typeof user.username!=='string'||!user.username.trim()){
   const clean=value=>String(value||'').replace(/[^a-zA-Z0-9_.-]/g,'_').replace(/^_+|_+$/g,'').slice(0,34);
   let base=clean(String(user.email||'').split('@')[0]);
   if(base.length<3)base='user_'+(clean(user.id)||'account');
   let username=base,suffix=2;
   while(occupied.has(username.toLowerCase())){const tail='_'+suffix++;username=base.slice(0,40-tail.length)+tail;}
   user.username=username;occupied.add(username.toLowerCase());changed=true;
  }
  if(Object.prototype.hasOwnProperty.call(user,'name')){delete user.name;changed=true;}
 }
 return changed;
}
export function validateUserIdentity(username,email,excludeId=null){
 const login=String(username??'').trim(),address=String(email??'').trim();
 if(!/^[a-zA-Z0-9_.-]{3,40}$/.test(login))return 'Username: от 3 до 40 латинских букв, цифр или символов _ . -.';
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address))return 'Укажите корректный email.';
 if(db.users.some(user=>user.id!==excludeId&&String(user.username||'').toLowerCase()===login.toLowerCase()))return 'Этот username уже используется.';
 if(db.users.some(user=>user.id!==excludeId&&String(user.email||'').toLowerCase()===address.toLowerCase()))return 'Этот email уже используется.';
 return '';
}

function seed(){
 const types=[...seedTypes.map(type=>({...type})),{id:'tb1',team:'beta',name:'Vector · Base',color:'#5f8ab4',price:18,archived:false},{id:'tb2',team:'beta',name:'Внутренний фарм',color:'#a38965',price:10,archived:false}];
 const users=[...seedUsers,...betaUsers].map(user=>({...user}));
 const accounts=Array.from({length:68},(_,i)=>{const beta=i>=60; const ti=beta?5+(i%2):i%5;const type=types[ti];const buyer=beta?users[seedUsers.length+i%2]:users[(i+Math.floor(i/5))%seedUsers.length];const id=seedAccountId(i);const spend=i%19===0?0:Math.round((280+(i*217)%1600)*[1,1.8,2.3,.7,1.2][i%5]*100)/100;const revenue=Math.round(spend*(.65+((i*17)%91)/100)*100)/100;const missing=i===13||i===41;const status=i===39?null:i%7===0?'Disabled':i%13===0?'Unsettled':'Active';const date='2026-10-'+String(1+i%23).padStart(2,'0');return {id,name:(beta?'BT':'DV')+'-'+String(i+101),team:beta?'beta':'alpha',buyerId:buyer.id,typeId:type.id,date,geo:['IN','AR','BR','KR','CL'][i%5],cost:type.price-(i<25?3:0),raw:Math.round(spend*(i%11===0?1.14:1.003)*100)/100,spend:missing?null:spend,revenue:missing?null:revenue,profit:missing?null:Math.round((revenue-spend)*100)/100,status,reason:status==='Disabled'?'Ads Integrity Policy':'',campaigns:missing?[]:seedCampaigns(i,id,spend,revenue)};});
 const catalog=Array.from({length:16},(_,i)=>({id:String(239450000000000+i*23319),name:'NEW-'+(201+i),team:i<12?'alpha':'beta'}));
 return {version:1,demoRosterRevision:DEMO_ROSTER_REVISION,demoCampaignRevision:DEMO_CAMPAIGN_REVISION,teamId:'alpha',role:'admin',currentUserId:'u1',teamProfiles:{alpha:{name:'Команда Alpha'},beta:{name:'Команда Beta'}},types,users,accounts,catalog,sync:{meta:{lastSuccess:now-3*60000,lastAttempt:now-3*60000,status:'fresh',next:now+12*60000},rollup:{lastSuccess:now-7*60000,lastAttempt:now-7*60000,status:'fresh',next:now+23*60000},config:{metaInterval:15,rollupInterval:30,rpm:30,concurrency:2,retries:3,retryDelay:10,timeout:30,staleAfter:60,paused:false,backoff:'exponential'},logs:[{id:'l1',source:'meta',time:now-3*60000,status:'success',requests:8,duration:12,message:'Статусы и Raw Spend обновлены. 68 кабинетов.'},{id:'l2',source:'rollup',time:now-7*60000,status:'success',requests:12,duration:18,message:'Финансовые показатели обновлены.'},{id:'l3',source:'meta',time:now-18*60000,status:'success',requests:8,duration:11,message:'Загрузка завершена.'}]}};
}
let initial;try{initial=JSON.parse(localStorage.getItem(KEY));}catch{}export const db=initial?.version===1?initial:seed();
const rosterMigrated=migrateDemoRoster(db),campaignsMigrated=migrateDemoCampaigns(db),usernamesMigrated=migrateUsernames(db);
if(rosterMigrated||campaignsMigrated||usernamesMigrated){try{localStorage.setItem(KEY,JSON.stringify(db));}catch{}}
export const ui={route:'login',analysisTab:'types',settingsTab:'types',metric:'spendPer',filters:{buyer:'all',type:'all',status:'all',period:'month',dateFrom:'',dateTo:'',geo:'all',search:''},accountPage:1,accountSort:'date',sortDir:-1,selected:new Set(),mobile:false};
export function persist(){localStorage.setItem(KEY,JSON.stringify(db));}
export function resetDemo(){Object.keys(db).forEach(k=>delete db[k]);Object.assign(db,seed());persist();location.hash='#analytics';rerender();}
export function rerender(){window.dispatchEvent(new CustomEvent('app:render'));}
export function navigate(route,filters){if(filters){ui.filters={...ui.filters,...filters};ui.accountPage=1;}ui.route=route;ui.selected.clear();if(location.hash==='#'+route)rerender();else location.hash=route;}
export function teamAccounts(){return db.accounts.filter(x=>x.team===db.teamId);}
export function teamTypes(archived=false){return db.types.filter(x=>x.team===db.teamId&&(archived||!x.archived));}
export function teamUsers(){return db.users.filter(x=>x.team===db.teamId);}
export function isValidDate(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const [year,month,day]=value.split('-').map(Number);
 if(year<1||month<1||month>12||day<1)return false;
 const leap=year%4===0&&(year%100!==0||year%400===0);
 const days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
 return day<=days[month-1];
}
export function dateRangeError(from,to){
 if(!from&&!to)return 'Укажите дату начала и дату окончания.';
 if(!from)return 'Укажите дату начала.';
 if(!to)return 'Укажите дату окончания.';
 if(!isValidDate(from))return 'Укажите корректную дату начала.';
 if(!isValidDate(to))return 'Укажите корректную дату окончания.';
 if(from>to)return 'Дата начала не может быть позже даты окончания.';
 return '';
}
export const ISSUE_DATE_PRESETS=Object.freeze([
 {id:'lastMonth',label:'Последний месяц',hint:'Последние 30 дней, включая сегодня'},
 {id:'week',label:'Последняя неделя',hint:'Последние 7 дней, включая сегодня'},
 {id:'yesterday',label:'Вчера'},
 {id:'today',label:'Сегодня'},
 {id:'thisWeek',label:'Эта неделя',hint:'С понедельника по сегодня'},
 {id:'month',label:'Этот месяц',hint:'С первого числа по сегодня'},
 {id:'all',label:'За всё время'}
].map(Object.freeze));
export function getTodayDate(date=new Date()){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
 const value=type=>parts.find(part=>part.type===type).value;
 return value('year').padStart(4,'0')+'-'+value('month')+'-'+value('day');
}
export function getIssueDateRange(filters=ui.filters,referenceDate=getTodayDate()){
 const period=filters?.period??'month';
 if(period==='all')return {from:'',to:'',error:''};
 if(period==='custom'){
  const from=typeof filters.dateFrom==='string'?filters.dateFrom:'';
  const to=typeof filters.dateTo==='string'?filters.dateTo:'';
  return {from,to,error:dateRangeError(from,to)};
 }
 if(!ISSUE_DATE_PRESETS.some(preset=>preset.id===period))return {from:'',to:'',error:'Неизвестный период выдачи.'};
 if(!isValidDate(referenceDate))return {from:'',to:'',error:'Не удалось определить текущую дату.'};
 const shift=offset=>{
  const date=new Date(referenceDate+'T00:00:00Z');
  date.setUTCDate(date.getUTCDate()+offset);
  return date.toISOString().slice(0,10);
 };
 let from=referenceDate,to=referenceDate;
 if(period==='lastMonth')from=shift(-29);
 if(period==='week')from=shift(-6);
 if(period==='yesterday')from=to=shift(-1);
 if(period==='thisWeek')from=shift(-((new Date(referenceDate+'T00:00:00Z').getUTCDay()+6)%7));
 if(period==='month')from=referenceDate.slice(0,8)+'01';
 return {from,to,error:dateRangeError(from,to)};
}
export function formatIssuePeriod(filters=ui.filters,referenceDate=getTodayDate()){
 const {from,to,error}=getIssueDateRange(filters,referenceDate);
 if(error)return 'Период не выбран';
 if(!from&&!to)return 'За всё время';
 const compact=value=>value.split('-').reverse().join('.');
 return from===to?compact(from):compact(from)+' — '+compact(to);
}
export function filteredAccounts(referenceDate=getTodayDate()){
 const f=ui.filters,{from,to,error}=getIssueDateRange(f,referenceDate);
 if(error)return [];
 return teamAccounts().filter(a=>(f.completeness!=='missing'||a.spend==null||a.revenue==null||a.profit==null)&&(f.buyer==='all'||a.buyerId===f.buyer)&&(f.type==='all'||a.typeId===f.type)&&(f.status==='all'||(f.status==='unknown'?!a.status:a.status===f.status))&&(f.geo==='all'||a.geo===f.geo)&&(!from&&!to||(isValidDate(a.date)&&a.date>=from&&a.date<=to))&&(!f.search||[a.id,a.name].some(s=>s.toLowerCase().includes(f.search.toLowerCase()))));
}
export function aggregate(rows){
 const count=rows.length;
 const fields=['cost','raw','spend','revenue','profit'];
 const known=value=>value!=null&&value!==''&&Number.isFinite(Number(value));
 const missingCounts=Object.fromEntries(fields.map(key=>[key,rows.filter(row=>!known(row[key])).length]));
 const knownCounts=Object.fromEntries(fields.map(key=>[key,count-missingCounts[key]]));
 const total=key=>count&&missingCounts[key]===count?null:rows.reduce((sum,row)=>sum+(known(row[key])?Number(row[key]):0),0);
 const cost=total('cost'),raw=total('raw'),spend=total('spend'),revenue=total('revenue'),profit=total('profit');
 const missing=rows.filter(row=>['spend','revenue','profit'].some(key=>!known(row[key]))).length;
 const statusCounts=rows.reduce((counts,row)=>{const status=row.status||'unknown';counts[status]=(counts[status]||0)+1;return counts;},{});
 const active=statusCounts.Active||0,disabled=statusCounts.Disabled||0,unsettled=statusCounts.Unsettled||0,knownStatus=count-(statusCounts.unknown||0);
 const average=(value,key)=>knownCounts[key]&&value!=null?value/knownCounts[key]:null;
 const perThousand=denominator=>cost!=null&&denominator!=null&&denominator>0?cost/denominator*1000:null;
 const net=count&&profit!=null&&cost!=null?profit-cost:null;
 const roi=count&&net!=null&&spend!=null&&cost!=null&&spend+cost>0?net/(spend+cost)*100:null;
 return {count,cost,spend,revenue,profit,net,roi,raw,spendPer:average(spend,'spend'),profitPer:average(profit,'profit'),revenuePer:average(revenue,'revenue'),costPer1000:perThousand(spend),costPer1000Profit:perThousand(profit),costPer1000Revenue:perThousand(revenue),active,disabled,unsettled,statusCounts,knownStatus,disabledRate:knownStatus?disabled/knownStatus*100:null,missing,missingCounts,knownCounts,avgCost:average(cost,'cost')};
}
export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const num=(v,d=0)=>v==null?'—':new Intl.NumberFormat('en-US',{maximumFractionDigits:d,minimumFractionDigits:d}).format(v);
export const money=(v,d=0)=>v==null?'—':(v<0?'−':'')+'$'+num(Math.abs(v),d);
export const pct=(v,d=1)=>v==null?'—':(v>0?'+':'')+num(v,d)+'%';
export function formatDate(v){if(!v)return '—';return new Date(v).toLocaleDateString('ru-RU',{day:'numeric',month:'short',year:'numeric'});}
export function timeLabel(t){if(!t)return 'Ещё не было';return new Date(t).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Moscow'})+' GMT+3';}
export function relative(t){if(!t)return 'Нет данных';const m=Math.max(0,Math.floor((Date.now()-t)/60000));return m<1?'только что':m<60?m+' мин назад':m<1440?Math.floor(m/60)+' ч назад':Math.floor(m/1440)+' дн назад';}
const paths={chart:'M4 19V5m0 14h16M8 15v-4m5 4V7m5 8v-6',grid:'M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z',accounts:'M4 5h16v12H4zM8 21h8m-4-4v4',settings:'M9.5 4 10 2h4l.5 2 2 1 2-.5 2 3-1.5 1.5v3L21 14l-2 3-2-.5-2 1L14 20h-4l-.5-2.5-2-1-2 .5-2-3L5 12.5v-3L3.5 8l2-3 2 .5zM15 11a3 3 0 1 1-6 0 3 3 0 0 1 6 0',sync:'M3 11a9 9 0 0 1 15.36-5.36L21 8M21 3v5h-5M21 13a9 9 0 0 1-15.36 5.36L3 16M3 21v-5h5',plus:'M12 5v14M5 12h14',chevron:'m9 5 7 7-7 7',down:'m6 9 6 6 6-6',search:'M20 20l-5-5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',arrow:'M5 12h14m-5-5 5 5-5 5',download:'M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4',close:'m6 6 12 12M6 18 18 6',check:'m5 12 4 4L19 6',clock:'M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',warning:'m12 3 10 18H2L12 3zm0 6v5m0 3v1',users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0m4-3a4 4 0 0 1 0 8m2 3a4 4 0 0 1 3 4v2',box:'m3 7 9-5 9 5v10l-9 5-9-5zm0 0 9 5 9-5m-9 5v10',dots:'M5 12h.01M12 12h.01M19 12h.01',info:'M12 11v6m0-10v.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',logout:'M9 3H3v18h6m6-14 5 5-5 5M7 12h13',copy:'M9 9h12v12H9zM15 5V2H2v13h3',menu:'M4 6h16M4 12h16M4 18h16',shield:'m12 2 9 4v6c0 5-9 10-9 10s-9-5-9-10V6zM8 12l3 3 5-6',filter:'M3 5h18l-7 8v6l-4 2v-8z',edit:'m16 3 5 5-12 12H4v-5zm-2 2 5 5',link:'m9 15 6-6M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 10a4 4 0 0 0 6 0l4-4a4 4 0 0 0-6-6l-1 1',help:'M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3.5M12 16h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',play:'m8 5 11 7-11 7z',pause:'M8 4v16M16 4v16',archive:'M3 3h18v4H3zm2 4v14h14V7m-10 5h6',unarchive:'M3 3h18v4H3zM5 7v14h14V7M12 17v-7m-3 3 3-3 3 3',calendar:'M4 5h16v16H4zm0 5h16M8 2v6m8-6v6'};
export const icon=(name)=>`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.grid}"/></svg>`;
export function badgeStatus(s){return `<span class="badge ${s==='Active'?'badge-green':s==='Disabled'?'badge-red':s==='Unsettled'?'badge-amber':''}"><span class="dot"></span>${esc(s||'Нет статуса')}</span>`;}
let prevFocus;export function modal(title,body,footer='',wide=false){prevFocus=document.activeElement;document.getElementById('overlay-root').innerHTML=`<div class="modal-backdrop"><section id="modal" class="modal ${wide?'modal-wide':''}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><header class="modal-head"><h2>${esc(title)}</h2><button class="btn-icon" data-close aria-label="Закрыть">${icon('close')}</button></header><div class="modal-body">${body}</div>${footer?'<footer class="modal-footer">'+footer+'</footer>':''}</section></div>`;document.body.classList.add('has-modal');document.querySelector('[data-close]').onclick=closeModal;document.querySelector('.modal-backdrop').onclick=e=>{if(e.target.classList.contains('modal-backdrop'))closeModal();};setTimeout(()=>document.querySelector('#modal input:not([type=checkbox]),#modal select,#modal button')?.focus(),30);}
export function closeModal(){document.getElementById('overlay-root').innerHTML='';document.body.classList.remove('has-modal');prevFocus?.focus?.();}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();if(e.key==='Tab'&&document.querySelector('#modal')){const els=[...document.querySelectorAll('#modal button:not([disabled]),#modal input:not([disabled]),#modal select:not([disabled]),#modal textarea,#modal a[href]')].filter(x=>x.offsetParent!==null);if(e.shiftKey&&document.activeElement===els[0]){e.preventDefault();els.at(-1)?.focus();}else if(!e.shiftKey&&document.activeElement===els.at(-1)){e.preventDefault();els[0]?.focus();}}});
export function toast(text){const el=document.createElement('div');el.className='toast';el.innerHTML=icon('check')+esc(text);document.getElementById('toast-root').append(el);setTimeout(()=>el.remove(),4000);}
