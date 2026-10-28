import assert from 'node:assert/strict';

globalThis.localStorage={getItem:()=>null,setItem(){}};
globalThis.document={addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],getElementById:()=>null};
globalThis.window={dispatchEvent(){},addEventListener(){}};
globalThis.MutationObserver=class{observe(){}disconnect(){}};
globalThis.location={hash:'#analytics',origin:'https://example.test',pathname:'/'};

const {db,ui}=await import('../dist/core.js');
const {serializeCsv,csvNumber,downloadCsv}=await import('../dist/csv.js');
const {buildAccountsExport,renderAccounts,bindAccounts}=await import('../dist/accounts.js');
const {buildAnalyticsExport,renderAnalytics,bindAnalytics}=await import('../dist/analytics.js');

// Independent reader: commas and line breaks inside quoted cells must survive.
function readCsv(source){
  assert.equal(source.charCodeAt(0),0xFEFF,'UTF-8 BOM supports Cyrillic in spreadsheet imports');
  const text=source.slice(1),records=[];
  let record=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++){
    const char=text[i];
    if(char==='"'){
      if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;
    }else if(!quoted&&char===','){record.push(cell);cell='';}
    else if(!quoted&&(char==='\r'||char==='\n')){
      if(char==='\r'&&text[i+1]==='\n')i++;
      record.push(cell);records.push(record);record=[];cell='';
    }else cell+=char;
  }
  assert.equal(quoted,false,'Every quoted field must close');
  if(record.length||cell)records.push([...record,cell]);
  return records;
}
const objects=report=>report.rows.map(row=>Object.fromEntries(report.headers.map((header,i)=>[header,row[i]])));
const decoded=report=>readCsv(serializeCsv(report.headers,report.rows));
const allFilters=()=>({buyer:'all',type:'all',status:'all',geo:'all',period:'all',dateFrom:'',dateTo:'',search:'',completeness:'all'});

assert.deepEqual(readCsv(serializeCsv(['Название','Число'],[['Кабинет, "Альфа"\nвторая строка',-12.5],[null,0]])),[
  ['Название','Число'],['Кабинет, "Альфа"\nвторая строка','-12.5'],['','0']
]);
const hostile=['=SUM(1,2)','+cmd','-cmd','@SUM(A1)',' \t=1+1','\ttext','\rtext','\ntext'];
const sanitized=readCsv(serializeCsv(['Текст'],hostile.map(value=>[value]))).slice(1).flat();
assert.deepEqual(sanitized,hostile.map(value=>"'"+value),'Text must never be interpreted as a spreadsheet formula');
assert.deepEqual(readCsv(serializeCsv(['x'],[[NaN],[Infinity],[undefined],[0],[-4]])),[['x'],[''],[''],[''],['0'],['-4']]);
assert.equal(csvNumber(null),null);assert.equal(csvNumber(''),null);assert.equal(csvNumber(Infinity),null);
assert.equal(csvNumber(-25.125,2),-25.13);assert.equal(csvNumber(0),0);assert.equal(csvNumber('23.4'),23.4);

const original={accounts:db.accounts,types:db.types,users:db.users,teamId:db.teamId};
try{
  db.teamId='csv-team';
  db.types=[{id:'t1',team:db.teamId,name:'Тип "А", основной',price:20},{id:'t2',team:db.teamId,name:'Тип Б',price:30,archived:true}];
  db.users=[{id:'u1',team:db.teamId,username:'vlad_11_595',status:'active'},{id:'u2',team:db.teamId,username:'max_11_594',status:'active'}];
  const account=(id,overrides={})=>({id,name:'Кабинет '+id,team:db.teamId,typeId:'t1',buyerId:'u1',date:'2026-10-01',geo:'BR',cost:20,spend:100,revenue:150,profit:50,raw:105,status:'Active',campaigns:[],...overrides});
  const ids=Array.from({length:16},(_,i)=>i===0?'001234567890123456789':String(900000000000000000n+BigInt(i)));
  db.accounts=ids.map((id,i)=>account(id,{name:'Кабинет '+String(i).padStart(2,'0'),buyerId:i%2?'u2':'u1',typeId:i<8?'t1':'t2',date:i<8?'2026-10-01':'2026-10-20',status:i===15?null:i%2?'Disabled':'Active',geo:i%3?'BR':'IN'}));
  db.accounts[1]={...db.accounts[1],cost:30,spend:null,revenue:null,profit:null,raw:null,reason:'Ads Integrity Policy'};
  db.accounts[2]={...db.accounts[2],cost:0,spend:0,revenue:0,profit:0,raw:0};
  db.accounts.push(account('foreign',{team:'another-team'}));
  ui.filters=allFilters();ui.accountSort='name';ui.sortDir=1;ui.accountPage=2;ui.selected=new Set([ids[0]]);
  let report=buildAccountsExport(),rows=objects(report);
  assert.equal(rows.length,16,'Export must include every page, excluding other teams');
  assert.deepEqual(rows.map(row=>row['ID кабинета Facebook']),ids,'Export follows visible sorting without numeric ID conversion');
  assert.deepEqual(decoded(report).slice(1).map(row=>row[0]),ids,'Long and zero-prefixed Facebook IDs must remain exact in the CSV');
  assert.equal(rows[0]['Байер'],'vlad_11_595');assert.equal(rows[0]['GEO'],'IN');
  assert.equal(rows[0]['Profit до стоимости кабинета, USD'],50);
  assert.equal(rows[0]['Profit с учётом стоимости кабинета, USD'],30);
  assert.equal(rows[0]['ROI, %'],25);assert.equal(rows[0]['Разница Spend − Raw Spend, USD'],-5);
  assert.equal(rows[1]['Spend, USD'],null);assert.equal(rows[1]['Profit с учётом стоимости кабинета, USD'],null);
  assert.equal(rows[2]['Spend, USD'],0);assert.equal(rows[2]['Profit с учётом стоимости кабинета, USD'],0);assert.equal(rows[2]['ROI, %'],null);
  assert.equal(rows[1]['Причина Disabled'],'Ads Integrity Policy');assert.equal(rows[0]['Причина Disabled'],'');
  assert.equal(rows[15]['Статус'],'Нет статуса');
  ui.accountPage=1;ui.selected=new Set(ids.slice(0,5));
  assert.deepEqual(buildAccountsExport(),report,'Selection and pagination must not narrow the export');
  for(const [filter,expected] of [
    [{buyer:'u1'},ids.filter((_,i)=>i%2===0)],
    [{type:'t2'},ids.slice(8)],
    [{status:'Disabled'},ids.filter((_,i)=>i%2===1&&i!==15)],
    [{status:'unknown'},[ids[15]]],
    [{geo:'IN'},ids.filter((_,i)=>i%3===0)],
    [{search:'Кабинет 07'},[ids[7]]],
    [{completeness:'missing'},[ids[1]]],
    [{period:'custom',dateFrom:'2026-10-01',dateTo:'2026-10-01'},ids.slice(0,8)],
    [{buyer:'u2',type:'t2',status:'Disabled',geo:'IN'},[ids[9]]]
  ]){
    ui.filters={...allFilters(),...filter};
    assert.deepEqual(buildAccountsExport().rows.map(row=>row[0]),expected,'CSV must honor '+JSON.stringify(filter));
  }
  ui.filters={...allFilters(),search:'not-found'};
  assert.equal(buildAccountsExport().rows.length,0);
  assert.match(renderAccounts(),/<button\b[^>]*id="accounts-export"[^>]*disabled/);

  db.accounts=[
    account('A'),
    account('B',{cost:30,spend:null,revenue:250,profit:150,raw:null,status:'Disabled'}),
    account('C',{buyerId:'u2',typeId:'t2',cost:10,spend:0,revenue:null,profit:null,raw:0,status:null}),
    account('foreign',{team:'another-team',spend:999999})
  ];
  ui.filters=allFilters();
  for(const tab of ['types','buyers','matrix']){
    ui.analysisTab=tab;
    report=buildAnalyticsExport();rows=objects(report);
    assert.equal(rows.length,3,'Two nonempty groups plus a clearly labeled total for '+tab);
    assert.deepEqual(rows.map(row=>row['Строка']),['Группа','Группа','Итого']);
    const total=rows[2];
    for(const [key,expected] of Object.entries({
      'Кабинетов':3,'Стоимость кабинетов, USD':60,'Spend, USD':100,'Revenue, USD':400,
      'Profit до стоимости кабинетов, USD':200,'Profit с кабинетов, USD':140,'ROI, %':87.5,
      'Средний Spend на кабинет, USD':50,'Средний Profit на кабинет до стоимости кабинетов, USD':100,'Средний Revenue на кабинет, USD':200,
      'Стоимость на 1000 USD Spend, USD':600,'Стоимость на 1000 USD Profit, USD':300,'Стоимость на 1000 USD Revenue, USD':150,
      'С полученным Spend, кабинетов':2,'С полученным Revenue, кабинетов':2,'С полученным Profit, кабинетов':2,
      'С полученным Raw Spend, кабинетов':2,'С указанной стоимостью, кабинетов':3,'С неполными финансовыми данными, кабинетов':2,
      'Active, кабинетов':1,'Disabled, кабинетов':1,'Без статуса, кабинетов':1,'Disabled среди известных статусов, %':50
    }))assert.equal(total[key],expected,tab+' total: '+key);
    assert.equal(rows[0]['Средний Spend на кабинет, USD'],100,'Missing Spend must not dilute a group average');
    assert.equal(rows[1]['Profit с кабинетов, USD'],null);
    assert.equal(rows[1]['Стоимость на 1000 USD Spend, USD'],null,'Zero denominator remains empty');
    assert.equal(rows[1]['Spend, USD'],0);
    assert.equal(total['Финансовые данные по'],'2026-10-23');
    assert.equal(decoded(report).length,4);
    ui.analyticsExtended=false;assert.deepEqual(buildAnalyticsExport(),report);
    ui.analyticsExtended=true;assert.deepEqual(buildAnalyticsExport(),report,'Column visibility must not omit metrics');
  }
  ui.analysisTab='matrix';rows=objects(buildAnalyticsExport());
  assert.deepEqual(rows.slice(0,2).map(row=>[row['Байер'],row['Тип кабинета']]),[['vlad_11_595','Тип "А", основной'],['max_11_594','Тип Б']]);
  ui.filters={...allFilters(),buyer:'u1',period:'custom',dateFrom:'2026-10-01',dateTo:'2026-10-02'};
  rows=objects(buildAnalyticsExport());assert.equal(rows.length,2);assert.equal(rows[1]['Кабинетов'],2);
  assert.equal(rows[0]['Дата выдачи от (фильтр)'],'2026-10-01');assert.equal(rows[0]['Дата выдачи до (фильтр)'],'2026-10-02');
  ui.filters={...allFilters(),search:'not-found'};
  assert.equal(buildAnalyticsExport().rows.length,0);
  assert.match(renderAnalytics(),/<button\b[^>]*id="a-export"[^>]*disabled/);

  // Exercise actual bound buttons and browser-download lifecycle, rather than only report builders.
  ui.filters=allFilters();ui.analysisTab='buyers';
  const handlers=new Map(),blobs=[],links=[],revoked=[],timers=[];
  const button=id=>({addEventListener(type,handler){if(type==='click')handlers.set(id,handler);}});
  const buttons=new Map([['accounts-export',button('accounts-export')],['a-export',button('a-export')]]);
  const old={document:globalThis.document,setTimeout:globalThis.setTimeout,create:URL.createObjectURL,revoke:URL.revokeObjectURL};
  try{
    globalThis.document={addEventListener(){},querySelectorAll:()=>[],querySelector:selector=>buttons.get(selector.slice(1))||null,getElementById:id=>id==='toast-root'?{append(){}}:buttons.get(id)||null,body:{append(link){link.attached=true;}},createElement(tag){const link={tag,click(){this.clicked=true;},remove(){this.removed=true;}};if(tag==='a')links.push(link);return link;}};
    globalThis.setTimeout=(fn,delay)=>{timers.push({fn,delay});return timers.length;};
    URL.createObjectURL=blob=>{blobs.push(blob);return 'blob:csv-'+blobs.length;};
    URL.revokeObjectURL=url=>revoked.push(url);
    bindAccounts();bindAnalytics();
    assert.equal(typeof handlers.get('accounts-export'),'function');assert.equal(typeof handlers.get('a-export'),'function');
    handlers.get('accounts-export')();handlers.get('a-export')();
    assert.equal(blobs.length,2);assert.ok(links.every(link=>link.attached&&link.clicked&&link.removed&&link.download.endsWith('.csv')));
    assert.equal(blobs[0].type,'text/csv;charset=utf-8;');
    // Blob.text strips a UTF-8 BOM, so inspect the raw bytes as well.
    assert.deepEqual([...new Uint8Array(await blobs[0].arrayBuffer()).slice(0,3)],[0xEF,0xBB,0xBF]);
    assert.deepEqual(readCsv('\uFEFF'+await blobs[0].text()),decoded(buildAccountsExport()));
    assert.deepEqual(readCsv('\uFEFF'+await blobs[1].text()),decoded(buildAnalyticsExport()));
    assert.equal(revoked.length,0,'The browser must have time to start the download');
    timers.filter(timer=>timer.delay===10000).forEach(timer=>timer.fn());
    assert.deepEqual(revoked,['blob:csv-1','blob:csv-2']);
  }finally{globalThis.document=old.document;globalThis.setTimeout=old.setTimeout;URL.createObjectURL=old.create;URL.revokeObjectURL=old.revoke;}
}finally{Object.assign(db,original);}

console.log('CSV validation passed: encoding, formulas, exact IDs, filtered rows, grouping, financial coverage and download buttons.');
