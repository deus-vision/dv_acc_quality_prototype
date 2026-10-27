import assert from 'node:assert/strict';
import {readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
globalThis.localStorage={getItem:()=>null,setItem(){}};
globalThis.document={addEventListener(){},querySelector:()=>null};
globalThis.window={dispatchEvent(){}};
globalThis.location={hash:'#analytics',origin:'https://example.test',pathname:'/'};
const {db,ui,aggregate,teamAccounts,filteredAccounts,teamTypes,migrateDemoRoster,migrateDemoCampaigns,migrateUsernames,validateUserIdentity,isValidDate,dateRangeError,getIssueDateRange,formatIssuePeriod,navigate,getTodayDate,ISSUE_DATE_PRESETS,timeLabel}=await import('../dist/core.js');
const {renderAnalytics,statusBreakdown}=await import('../dist/analytics.js');
const {renderSettings,bindSettings,renderSync,bindSync,runSync}=await import('../dist/settings.js');
const accountModule=await import('../dist/accounts.js');
const {renderAccounts,bindAccounts,accountTotals,renderCampaignDetails}=accountModule;
const {ACCOUNT_COLUMN_HELP,DISABLED_REASON_MISSING,getDisabledReason,hideAccountTooltips}=await import('../dist/account-tooltips.js');
const {COUNTRIES,isCountryCode,countryLabel,searchCountries}=await import('../dist/countries.js');
for(const name of await readdir(new URL('../dist',import.meta.url))){
 if(name.endsWith('.js')){
  const r=spawnSync(process.execPath,['--check',new URL('../dist/'+name,import.meta.url).pathname],{encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);
 }
}
const TEST_DATE='2026-10-25';
const approx=(actual,expected,label)=>assert.ok(actual!=null&&Math.abs(actual-expected)<1e-9,`${label}: ${actual} != ${expected}`);
const known=[
 {cost:20,spend:100,revenue:150,profit:50,raw:105,status:'Active'},
 {cost:30,spend:300,revenue:350,profit:50,raw:310,status:'Disabled'}
];
const a=aggregate(known);
assert.equal(a.net,50);
approx(a.roi,50/450*100,'ROI from totals');
assert.equal(a.disabledRate,50);
assert.equal(a.spendPer,200);
assert.equal(a.profitPer,50);
assert.equal(a.revenuePer,250);
assert.equal(a.costPer1000,125);
assert.equal(a.costPer1000Profit,500);
assert.equal(a.costPer1000Revenue,100);
assert.deepEqual(a.missingCounts,{cost:0,raw:0,spend:0,revenue:0,profit:0});
assert.deepEqual(a.knownCounts,{cost:2,raw:2,spend:2,revenue:2,profit:2});
// The status KPI uses the whole cohort, while the existing Disabled metric keeps known-status coverage.
const statusFixture=['Active','Disabled','Unsettled','Pending',null].map(status=>({status}));
const statusTotals=aggregate(statusFixture);
assert.deepEqual({...statusTotals.statusCounts},{Active:1,Disabled:1,Unsettled:1,Pending:1,unknown:1});
assert.equal(statusTotals.active,1);assert.equal(statusTotals.unsettled,1);assert.equal(statusTotals.disabled,1);
assert.equal(statusTotals.knownStatus,4);assert.equal(statusTotals.disabledRate,25);
const statusParts=statusBreakdown(statusTotals);
for(const key of ['Active','Disabled','Unsettled','Pending','unknown']){
 const part=statusParts.find(row=>row.key===key);
 assert.equal(part?.count,1,key+' count');assert.equal(part.percent,20,key+' percent of all accounts');
}
assert.equal(statusParts.reduce((sum,part)=>sum+part.percent,0),100);
assert.ok(statusBreakdown(aggregate([])).every(part=>part.count===0&&part.percent===0),'Empty status percentages must be zero');
const entirelyUnknownStatus=statusBreakdown(aggregate([{status:null},{}]));
assert.equal(entirelyUnknownStatus.find(part=>part.key==='unknown').percent,100);
assert.equal(entirelyUnknownStatus.find(part=>part.key==='Active').percent,0);
// A known zero is data. Cost-based ratios require a positive denominator.
const zero=aggregate([{cost:0,spend:0,profit:0,revenue:0,raw:0,status:null}]);
for(const key of ['cost','spend','profit','revenue','raw','net','spendPer','profitPer','revenuePer'])assert.equal(zero[key],0,key);
for(const key of ['roi','costPer1000','costPer1000Profit','costPer1000Revenue','disabledRate'])assert.equal(zero[key],null,key);
const paidZero=aggregate([{cost:20,spend:0,profit:0,revenue:0,raw:0,status:'Active'}]);
assert.equal(paidZero.net,-20);
assert.equal(paidZero.roi,-100);
const negative=aggregate([{cost:20,spend:-30,profit:-5,revenue:-35,raw:-30,status:'Disabled'}]);
assert.equal(negative.profitPer,-5);
assert.equal(negative.revenuePer,-35);
for(const key of ['roi','costPer1000','costPer1000Profit','costPer1000Revenue'])assert.equal(negative[key],null,key);
const negativeProfit=aggregate([{cost:20,spend:100,profit:-40,revenue:60,raw:100,status:'Active'}]);
assert.equal(negativeProfit.net,-60);
assert.equal(negativeProfit.roi,-50);
assert.equal(negativeProfit.costPer1000Profit,null);
approx(negativeProfit.costPer1000Revenue,20/60*1000,'Revenue denominator stays available');
// Empty cohorts have neutral source totals but no derived result or percentages.
const empty=aggregate([]);
for(const key of ['cost','spend','revenue','profit','raw'])assert.equal(empty[key],0,key);
for(const key of ['net','roi','spendPer','profitPer','revenuePer','avgCost','costPer1000','costPer1000Profit','costPer1000Revenue','disabledRate'])assert.equal(empty[key],null,key);
assert.deepEqual(empty.missingCounts,{cost:0,raw:0,spend:0,revenue:0,profit:0});
// Unknown totals must never become a confirmed zero or loss.
const absent=aggregate([{cost:20,spend:null,revenue:null,profit:null,raw:null,status:null},{cost:30,status:'Active'}]);
for(const key of ['spend','revenue','profit','raw','net','roi','spendPer','profitPer','revenuePer','costPer1000','costPer1000Profit','costPer1000Revenue'])assert.equal(absent[key],null,key);
assert.equal(absent.cost,50);
assert.equal(absent.missing,2);
assert.deepEqual(absent.missingCounts,{cost:0,raw:2,spend:2,revenue:2,profit:2});
const noProfit=aggregate([{cost:20,spend:100,revenue:150,profit:null,raw:105}]);
assert.equal(noProfit.net,null);
assert.equal(noProfit.roi,null);
assert.equal(noProfit.revenuePer,150);
const noSpend=aggregate([{cost:20,spend:null,revenue:150,profit:50,raw:105}]);
assert.equal(noSpend.net,30);
assert.equal(noSpend.roi,null);
assert.equal(noSpend.costPer1000Profit,400);
// Each average excludes unknown values of that field, while total cohort cost stays intact.
const partial=aggregate([known[0],{cost:30,spend:null,revenue:null,profit:null,raw:null,status:'Disabled'}]);
assert.equal(partial.count,2);
assert.equal(partial.spend,100);
assert.equal(partial.revenue,150);
assert.equal(partial.profit,50);
assert.equal(partial.raw,105);
assert.equal(partial.cost,50);
assert.equal(partial.spendPer,100);
assert.equal(partial.profitPer,50);
assert.equal(partial.revenuePer,150);
assert.equal(partial.avgCost,25);
assert.equal(partial.costPer1000,500);
assert.equal(partial.costPer1000Profit,1000);
approx(partial.costPer1000Revenue,50/150*1000,'All cohort costs / available Revenue');
assert.deepEqual(partial.knownCounts,{cost:2,raw:1,spend:1,revenue:1,profit:1});
assert.equal(partial.net,0);
assert.equal(partial.roi,0);
assert.equal(partial.missing,1);
assert.deepEqual(partial.missingCounts,{cost:0,raw:1,spend:1,revenue:1,profit:1});
const fieldwise=aggregate([{cost:10,spend:0,revenue:null,profit:0,raw:null},{cost:20,spend:null,revenue:50,profit:null,raw:25}]);
assert.equal(fieldwise.spend,0);
assert.equal(fieldwise.revenue,50);
assert.equal(fieldwise.profit,0);
assert.equal(fieldwise.raw,25);
assert.equal(fieldwise.missing,2);
assert.deepEqual(fieldwise.missingCounts,{cost:0,raw:1,spend:1,revenue:1,profit:1});
// Independent coverage: a known zero counts in its field's denominator.
assert.equal(fieldwise.spendPer,0);
assert.equal(fieldwise.profitPer,0);
assert.equal(fieldwise.revenuePer,50);
assert.equal(fieldwise.avgCost,15);
const mixed=aggregate([
 {cost:10,spend:100,revenue:200,profit:100,raw:105},
 {cost:null,spend:0,revenue:0,profit:null,raw:null},
 {cost:20,spend:null,revenue:100,profit:-20,raw:100},
 {cost:null,spend:null,revenue:null,profit:0,raw:null}
]);
assert.deepEqual(mixed.knownCounts,{cost:2,raw:2,spend:2,revenue:3,profit:3});
assert.deepEqual(mixed.missingCounts,{cost:2,raw:2,spend:2,revenue:1,profit:1});
assert.equal(mixed.spendPer,50);
assert.equal(mixed.revenuePer,100);
approx(mixed.profitPer,80/3,'Profit average uses its independent known count');
assert.equal(mixed.avgCost,15);
assert.equal(mixed.cost,30);
assert.equal(mixed.costPer1000,300);
assert.equal(mixed.costPer1000Profit,375);
assert.equal(mixed.costPer1000Revenue,100);
const zeroAndUnknown=aggregate([{cost:0,spend:0,revenue:0,profit:0,raw:0},{}]);
for(const key of ['spendPer','profitPer','revenuePer','avgCost'])assert.equal(zeroAndUnknown[key],0,key);
assert.deepEqual(zeroAndUnknown.knownCounts,{cost:1,raw:1,spend:1,revenue:1,profit:1});
assert.deepEqual(absent.knownCounts,{cost:2,raw:0,spend:0,revenue:0,profit:0});
assert.deepEqual(empty.knownCounts,{cost:0,raw:0,spend:0,revenue:0,profit:0});
const noCost=aggregate([{cost:null,spend:10,revenue:20,profit:10,raw:10}]);
assert.equal(noCost.avgCost,null);
assert.equal(noCost.cost,null);
// Registry totals use source sums and one cohort ROI, independent of campaign count.
const registryKnown=known.map((row,index)=>({...row,campaigns:Array.from({length:index+1},(_,i)=>({id:String(500000+index*2+i)}))}));
const knownTotals=accountTotals(registryKnown);
assert.equal(knownTotals.campaignCount,3);
assert.equal(knownTotals.diff,-15);
assert.equal(knownTotals.net,50);
approx(knownTotals.roi,50/450*100,'Registry ROI from totals');
const averageAccountRoi=known.reduce((sum,row)=>sum+(row.profit-row.cost)/(row.spend+row.cost)*100,0)/known.length;
assert.notEqual(knownTotals.roi,averageAccountRoi,'Registry ROI must not average account percentages');
for(const rows of [[],[known[0],{cost:30,raw:null,spend:null,revenue:null,profit:null}],[{cost:20,raw:null,spend:null,revenue:null,profit:null}]]){
 const totals=accountTotals(rows),expected=aggregate(rows);
 for(const key of ['count','cost','raw','spend','revenue','profit','net','roi'])assert.equal(totals[key],expected[key],key);
 assert.equal(totals.diff,totals.spend==null||totals.raw==null?null:totals.spend-totals.raw);
 assert.equal(totals.campaignCount,0);
 assert.deepEqual(totals.knownCounts,expected.knownCounts);
 assert.deepEqual(totals.missingCounts,expected.missingCounts);
}
const campaignDetail=renderCampaignDetails([{id:'190842"',name:'595 AR <script> [129450000000861]',spend:100,revenue:150,profit:50}]);
assert.ok(campaignDetail.includes('190842&quot;')&&campaignDetail.includes('&lt;script&gt;'));
assert.ok(!campaignDetail.includes('<script>'));
for(const value of ['$100.00','$150.00','$50.00'])assert.ok(campaignDetail.includes(value),'Campaign detail must show its original source figure '+value);
// Source descriptions distinguish campaign Roll Up financials from cabinet-level Raw Spend.
for(const key of ['select','name','typeId','campaigns','spend','revenue','net','roi','raw','diff','cost','date','status','reason','open']){
 const help=ACCOUNT_COLUMN_HELP[key];
 assert.ok(help?.title&&help.source&&help.body,'Missing registry header explanation: '+key);
}
assert.equal(ACCOUNT_COLUMN_HELP.spend.title,'Spend');
assert.equal(ACCOUNT_COLUMN_HELP.net.title,'Profit');
for(const key of ['spend','revenue','net']){
 assert.match(ACCOUNT_COLUMN_HELP[key].source,/AIO.*Analytics.*Roll Up Report/);
 assert.match(ACCOUNT_COLUMN_HELP[key].body,/Facebook ID/);
}
assert.match(ACCOUNT_COLUMN_HELP.spend.source,/Meta Spend/);
assert.match(ACCOUNT_COLUMN_HELP.raw.source,/AIO.*Meta.*Ad Accounts.*Raw Spend/);
assert.match(ACCOUNT_COLUMN_HELP.raw.body,/независимо от привязки кампаний/);
assert.match(ACCOUNT_COLUMN_HELP.net.formula,/Profit AIO − фактическая стоимость кабинета/);
assert.match(ACCOUNT_COLUMN_HELP.net.note,/повторно/);
assert.equal(ACCOUNT_COLUMN_HELP.roi.formula,'ROI = (Profit AIO − стоимость кабинета) / (Spend + стоимость кабинета) × 100%');
assert.match(ACCOUNT_COLUMN_HELP.roi.note,/не усредняем/);
assert.equal(ACCOUNT_COLUMN_HELP.diff.formula,'Разница = Spend − Raw Spend');
assert.match(ACCOUNT_COLUMN_HELP.reason.source,/Meta.*Ad Accounts.*Disabled Reason/);
for(const reason of [null,undefined,'','   '])assert.equal(getDisabledReason({reason}),DISABLED_REASON_MISSING);
assert.equal(getDisabledReason({reason:'  Ads Integrity Policy  '}),'Ads Integrity Policy');
// Fresh seed has the requested stable roster and every ownership link remains within its team.
const requestedLogins=['vlad_11_595','max_11_594','natalia_11_598','vlad_11_593','ivan_11_590','vova_11_596','nikita_11_597'];
const alphaRoster=db.users.filter(user=>user.team==='alpha');
assert.deepEqual(alphaRoster.map(user=>user.id),['u1','u2','u3','u4','u5','u6','u7']);
assert.deepEqual(alphaRoster.map(user=>user.username),requestedLogins);
assert.ok(db.users.every(user=>!Object.hasOwn(user,'name')),'Fresh user records must be username-only');
assert.deepEqual(alphaRoster.map(user=>user.role),['admin','lead','buyer','buyer','buyer','lead','buyer']);
alphaRoster.forEach((user,index)=>{assert.equal(user.username,requestedLogins[index]);assert.equal(user.aio,requestedLogins[index]);assert.equal(user.email,requestedLogins[index]+'@example.com');});
assert.deepEqual(new Set(db.accounts.filter(account=>account.team==='alpha').map(account=>account.buyerId)),new Set(alphaRoster.map(user=>user.id)));
assert.ok(db.accounts.every(account=>db.users.some(user=>user.id===account.buyerId&&user.team===account.team)),'Seed ownership crossed team boundaries');
assert.deepEqual(db.users.filter(user=>user.team==='beta').map(user=>user.username),['beta_lead','beta_buyer']);
// Campaign identities look like AIO, and splitting demo campaigns never changes account totals.
const seededCampaigns=db.accounts.flatMap(account=>account.campaigns);
assert.ok(seededCampaigns.every(campaign=>/^\d+$/.test(campaign.id)));
assert.equal(new Set(seededCampaigns.map(campaign=>campaign.id)).size,seededCampaigns.length);
assert.ok(db.accounts.some(account=>account.campaigns.length===2),'Demo must include multiple linked campaigns');
assert.equal(db.accounts[0].campaigns[0].id,'190842');
assert.equal(db.accounts[0].campaigns[0].name,'595 AR OF ['+db.accounts[0].id+']');
assert.equal(db.accounts[1].campaigns[0].id,'218644');
assert.equal(db.accounts[1].campaigns[0].name,'594 MPG AR-4G6XB ['+db.accounts[1].id+']');
for(const account of db.accounts){
 for(const campaign of account.campaigns){
  assert.ok(campaign.name.endsWith(' ['+account.id+']'));
  assert.ok(!Object.hasOwn(campaign,'geo')&&!Object.hasOwn(campaign,'flag'));
  assert.equal(Math.round(campaign.profit*100),Math.round(campaign.revenue*100)-Math.round(campaign.spend*100));
 }
 if(account.campaigns.length)for(const key of ['spend','revenue','profit']){
  assert.equal(account.campaigns.reduce((sum,campaign)=>sum+Math.round(campaign[key]*100),0),Math.round(account[key]*100),account.id+' campaign '+key+' sum');
 }
}
for(const key of ['spend','revenue','profit'])approx(aggregate(seededCampaigns)[key],aggregate(db.accounts)[key],'Seed campaign/account '+key+' totals');
// Old demo bootstrap fills missing roster data without overwriting any saved identities or assignments.
const legacy=structuredClone(db);
delete legacy.demoRosterRevision;
legacy.users=legacy.users.filter(user=>user.id!=='u7');
legacy.accounts.forEach(account=>{if(account.buyerId==='u7')account.buyerId='u3';});
legacy.users.forEach(user=>{user.name='old-name-'+user.id;user.username='old-login-'+user.id;user.aio='old-aio-'+user.id;user.email='old-'+user.id+'@example.com';});
legacy.users.find(user=>user.id==='u1').role='buyer';
legacy.users.find(user=>user.id==='u2').status='disabled';
legacy.users.find(user=>user.id==='u3').customNote='keep builtin metadata';
const customUser={id:'user-custom',team:'alpha',name:'Custom Person',username:'custom-login',email:'custom@example.com',aio:'custom-aio',role:'lead',status:'invited',inviteExpires:123456};
legacy.users.push(structuredClone(customUser));
legacy.types[0].price=123.45;
legacy.types.push({id:'type-custom',team:'alpha',name:'Custom type',price:87,archived:false});
legacy.accounts[0].buyerId='u6';
legacy.accounts[0].cost=7.89;
legacy.accounts[0].changes=[{from:'u2',to:'u6',reason:'User reassignment'}];
legacy.accounts.push({id:'custom-account',team:'alpha',buyerId:'user-custom',typeId:'type-custom',cost:87,date:'2026-10-12',spend:null,revenue:0,profit:null,raw:null,customField:'preserve'});
legacy.sync.config.rpm=11;
legacy.sync.logs.push({id:'custom-sync-log',status:'error',message:'preserve'});
legacy.extraState={doNotReset:true};
legacy.unmatched=[{id:'legacy-unused',team:'alpha',name:'Preserve stored data'}];
const preserved=structuredClone(legacy);
const nonRoster=state=>Object.fromEntries(Object.entries(state).filter(([key])=>key!=='users'&&key!=='demoRosterRevision'));
assert.equal(migrateDemoRoster(legacy),true);
assert.equal(legacy.demoRosterRevision,1);
assert.deepEqual(nonRoster(legacy),nonRoster(preserved),'Migration modified non-roster state');
assert.deepEqual(legacy.users.find(user=>user.id==='user-custom'),customUser,'Migration modified a user-added person');
for(const oldUser of preserved.users.filter(user=>user.id!=='user-custom')){
 const migrated=legacy.users.find(user=>user.id===oldUser.id);
 assert.deepEqual(migrated,oldUser,'Roster bootstrap overwrote saved identity, role or metadata');
}
assert.deepEqual(legacy.users.find(user=>user.id==='u7'),{id:'u7',team:'alpha',username:'nikita_11_597',role:'buyer',email:'nikita_11_597@example.com',aio:'nikita_11_597',status:'active'});
assert.equal(legacy.users.filter(user=>user.id==='u7').length,1);
const once=structuredClone(legacy);
assert.equal(migrateDemoRoster(legacy),false);
assert.deepEqual(legacy,once,'Roster migration is not idempotent');
legacy.users.find(user=>user.id==='u1').name='edited-after-migration';
assert.equal(migrateDemoRoster(legacy),false);
assert.equal(legacy.users.find(user=>user.id==='u1').name,'edited-after-migration');
// A user-added id collision must never overwrite that user or create a duplicate id.
const collision=structuredClone(preserved);
collision.users.push({...customUser,id:'u7'});
assert.equal(migrateDemoRoster(collision),true);
assert.equal(collision.users.filter(user=>user.id==='u7').length,1);
assert.deepEqual(collision.users.find(user=>user.id==='u7'),{...customUser,id:'u7'});
// Username migration removes only obsolete names, and reserves saved identities before generating fallbacks.
const usernameLegacy=structuredClone(db);
delete usernameLegacy.demoRosterRevision;
usernameLegacy.users.forEach(user=>{user.name='Old personal name '+user.id;});
Object.assign(usernameLegacy.users[0],{username:'Saved.Case',email:'Saved.Email@Example.COM',aio:'Custom AIO',token:'keep-token',expires:987654321,custom:{keep:true}});
usernameLegacy.users.unshift({id:'missing-a',team:'alpha',name:'Email fallback',email:'case.user@example.com',aio:'keep-aio',role:'buyer',status:'invited',token:'a-token',expires:12345});
usernameLegacy.users.push({id:'reserved-later',team:'alpha',name:'Reserved login',username:'CASE.USER',email:'other@example.com',role:'buyer',status:'disabled',customField:'keep'});
usernameLegacy.users.push({id:'missing-b',team:'alpha',name:'Collision fallback',email:'case.user@another.example',role:'buyer',status:'active'});
usernameLegacy.users.push({id:'empty-login',team:'alpha',name:'No email',username:' ',email:'',aio:'Unchanged AIO',role:'buyer',status:'active'});
const usernameBefore=structuredClone(usernameLegacy);
assert.equal(migrateUsernames(usernameLegacy),true);
assert.ok(usernameLegacy.users.every(user=>!Object.hasOwn(user,'name')));
assert.equal(usernameLegacy.users.find(user=>user.id==='missing-a').username,'case.user_2');
assert.equal(usernameLegacy.users.find(user=>user.id==='missing-b').username,'case.user_3');
assert.equal(usernameLegacy.users.find(user=>user.id==='empty-login').username,'user_empty-login');
assert.equal(new Set(usernameLegacy.users.map(user=>user.username.toLowerCase())).size,usernameLegacy.users.length);
const exceptNameAndUsername=user=>Object.fromEntries(Object.entries(user).filter(([key])=>!['name','username'].includes(key)));
for(const user of usernameBefore.users){
 const migrated=usernameLegacy.users.find(candidate=>candidate.id===user.id);
 assert.deepEqual(exceptNameAndUsername(migrated),exceptNameAndUsername(user),'Username migration changed email/AIO/roles/invite/custom values');
 if(typeof user.username==='string'&&user.username.trim())assert.equal(migrated.username,user.username,'Saved username was normalized or overwritten');
}
assert.deepEqual({...usernameLegacy,users:[]},{...usernameBefore,users:[]},'Username migration changed account history or other state');
const usernameOnce=structuredClone(usernameLegacy);
assert.equal(migrateUsernames(usernameLegacy),false);assert.deepEqual(usernameLegacy,usernameOnce);
const longFallbacks={users:[{id:'x'.repeat(34)+'-first'},{id:'x'.repeat(34)+'-second'}]};
assert.equal(migrateUsernames(longFallbacks),true);
assert.equal(new Set(longFallbacks.users.map(user=>user.username.toLowerCase())).size,2);
assert.ok(longFallbacks.users.every(user=>/^[a-zA-Z0-9_.-]{3,40}$/.test(user.username)),'Collision suffix must fit the username length limit');
const rosterIdentityCollision=structuredClone(db);delete rosterIdentityCollision.demoRosterRevision;
rosterIdentityCollision.users=rosterIdentityCollision.users.filter(user=>user.id!=='u7');
rosterIdentityCollision.accounts.forEach(account=>{if(account.buyerId==='u7')account.buyerId='u3';});
const reservedSeedIdentity={id:'custom-seed-identity',team:'alpha',username:'NIKITA_11_597',email:'NIKITA_11_597@EXAMPLE.COM',aio:'Saved AIO',role:'buyer',status:'active',token:'keep-custom-token'};
rosterIdentityCollision.users.push(reservedSeedIdentity);
const collisionAccounts=structuredClone(rosterIdentityCollision.accounts);
assert.equal(migrateDemoRoster(rosterIdentityCollision),true);
assert.ok(!rosterIdentityCollision.users.some(user=>user.id==='u7'),'Legacy roster must not add a duplicate login/email');
assert.deepEqual(rosterIdentityCollision.users.find(user=>user.id==='custom-seed-identity'),reservedSeedIdentity);
assert.deepEqual(rosterIdentityCollision.accounts,collisionAccounts);
const missingSeedIdentity=structuredClone(db);delete missingSeedIdentity.demoRosterRevision;
missingSeedIdentity.users.find(user=>user.id==='u1').username='';
missingSeedIdentity.users.find(user=>user.id==='u1').email='';
missingSeedIdentity.users.push({id:'custom-reserved-u1',username:'VLAD_11_595',email:'VLAD_11_595@EXAMPLE.COM',team:'alpha',role:'buyer',status:'active'});
migrateDemoRoster(missingSeedIdentity);migrateUsernames(missingSeedIdentity);
assert.equal(new Set(missingSeedIdentity.users.map(user=>user.username.toLowerCase())).size,missingSeedIdentity.users.length,'Default filling must not duplicate a saved login');
assert.equal(missingSeedIdentity.users.find(user=>user.id==='u1').email,'','Reserved email must not be reused by the seed');
const beforeUsernameStorage=globalThis.localStorage;let usernamePersisted;
globalThis.localStorage={getItem:()=>JSON.stringify(usernameBefore),setItem:(_key,value)=>{usernamePersisted=JSON.parse(value);}};
try{
 const loaded=await import('../dist/core.js?username-migration-check');
 assert.deepEqual(loaded.db.users,usernameLegacy.users,'Bootstrap order overwrote saved identities before username migration');
 assert.deepEqual(loaded.db.accounts,usernameBefore.accounts);
 assert.deepEqual(loaded.db.sync,usernameBefore.sync);
 assert.deepEqual(usernamePersisted,loaded.db,'Username-only state must persist on reload');
}finally{globalThis.localStorage=beforeUsernameStorage;}
// Identity validation is case-insensitive, excludes the edited user, and never mutates existing records.
const identityBefore=structuredClone(db);
for(const login of ['abc','qa.user-1','x'.repeat(40),' qa_trimmed '])assert.equal(validateUserIdentity(login,'qa.unique@example.com'),'');
for(const login of ['',null,'ab','x'.repeat(41),'with space','тест','bad@name','<script>'])assert.ok(validateUserIdentity(login,'qa.unique@example.com'),String(login));
for(const email of ['',null,'no-at','name@','@example.com','name@example','one@@example.com','name @example.com'])assert.ok(validateUserIdentity('qa_unique',email),String(email));
for(const user of db.users){
 assert.ok(validateUserIdentity(user.username.toUpperCase(),'qa.unique@example.com'),'Case-insensitive duplicate username');
 assert.ok(validateUserIdentity('qa_unique',user.email.toUpperCase()),'Case-insensitive duplicate email');
 assert.equal(validateUserIdentity(user.username.toUpperCase(),user.email.toUpperCase(),user.id),'','Own identity may retain or change case');
}
assert.deepEqual(db,identityBefore,'Identity validation mutated app state');
// Only exact old built-in campaign identities migrate; saved financials and custom records survive.
const oldCampaignName=(index,id)=>['IN Voronka 2','AR Mix','BR Launch','KR Test','CL Scale'][index%5]+' ['+id+']';
const campaignLegacy=structuredClone(db);
delete campaignLegacy.demoCampaignRevision;
campaignLegacy.accounts.forEach((account,index)=>{
 account.campaigns=account.campaigns.length?[{id:'cmp-'+index,name:oldCampaignName(index,account.id),spend:account.spend,revenue:account.revenue,profit:account.profit}]:[];
});
Object.assign(campaignLegacy.accounts[0],{name:'Edited account name',cost:123.45,buyerId:'u6',spend:999.99,revenue:1234.56,profit:234.57,custom:{keep:true}});
Object.assign(campaignLegacy.accounts[0].campaigns[0],{spend:56.78,revenue:90.12,profit:33.34,customCampaignData:{keep:true}});
const userCampaign={id:'custom-campaign',name:'Keep my campaign',spend:1.23,revenue:4.56,profit:3.33};
campaignLegacy.accounts[0].campaigns.push(structuredClone(userCampaign));
campaignLegacy.accounts[1].campaigns[0].name='User renamed this campaign';
campaignLegacy.accounts[2].campaigns[0].id='user-changed-id';
campaignLegacy.accounts.push({...structuredClone(campaignLegacy.accounts[3]),id:'user-account',campaigns:[{id:'cmp-3',name:oldCampaignName(3,campaignLegacy.accounts[3].id),spend:11,revenue:22,profit:11}]});
campaignLegacy.accounts.push({...structuredClone(campaignLegacy.accounts[4]),team:'beta'});
campaignLegacy.sync.config.rpm=7;
const campaignBefore=structuredClone(campaignLegacy);
assert.equal(migrateDemoCampaigns(campaignLegacy),true);
assert.equal(campaignLegacy.demoCampaignRevision,1);
assert.equal(campaignLegacy.accounts[0].campaigns[0].id,'190842');
assert.equal(campaignLegacy.accounts[0].campaigns[0].name,'595 AR OF ['+campaignLegacy.accounts[0].id+']');
assert.deepEqual(campaignLegacy.accounts[0].campaigns[1],userCampaign);
assert.deepEqual(campaignLegacy.accounts[1],campaignBefore.accounts[1],'Renamed campaign was overwritten');
assert.deepEqual(campaignLegacy.accounts[2],campaignBefore.accounts[2],'Custom campaign ID was overwritten');
assert.deepEqual(campaignLegacy.accounts.slice(-2),campaignBefore.accounts.slice(-2),'Non-seed or wrong-team records migrated');
const withoutCampaignIdentities=state=>{
 const copy=structuredClone(state);delete copy.demoCampaignRevision;
 copy.accounts.forEach(account=>account.campaigns.forEach(campaign=>{delete campaign.id;delete campaign.name;}));
 return copy;
};
assert.deepEqual(withoutCampaignIdentities(campaignLegacy),withoutCampaignIdentities(campaignBefore),'Campaign migration changed saved metrics, ownership or custom data');
for(const [index,account] of campaignLegacy.accounts.entries())assert.equal(account.campaigns.length,campaignBefore.accounts[index].campaigns.length,'Migration split or removed saved campaigns');
const campaignOnce=structuredClone(campaignLegacy);
assert.equal(migrateDemoCampaigns(campaignLegacy),false);
assert.deepEqual(campaignLegacy,campaignOnce,'Campaign migration is not idempotent');
campaignLegacy.accounts[0].campaigns[0].name='Edit after migration';
assert.equal(migrateDemoCampaigns(campaignLegacy),false);
assert.equal(campaignLegacy.accounts[0].campaigns[0].name,'Edit after migration');
const campaignCollision=structuredClone(campaignBefore);
campaignCollision.accounts[0].campaigns.push({...userCampaign,id:'190842'});
const collidingOriginal=structuredClone(campaignCollision.accounts[0]);
assert.equal(migrateDemoCampaigns(campaignCollision),true);
assert.deepEqual(campaignCollision.accounts[0],collidingOriginal,'Existing numeric campaign ID must not be duplicated');
// A reload migrates and saves old local state without requiring resetDemo.
const savedStorage=globalThis.localStorage;
let migratedStorage;
globalThis.localStorage={getItem:()=>JSON.stringify(campaignBefore),setItem:(key,value)=>{assert.equal(key,'dv-account-lab-v1');migratedStorage=JSON.parse(value);}};
try{
 const reloaded=await import('../dist/core.js?campaign-migration-check');
 assert.equal(reloaded.db.accounts[0].campaigns[0].id,'190842');
 assert.equal(reloaded.db.demoCampaignRevision,1);
 assert.deepEqual(migratedStorage,reloaded.db,'Reload migration was not persisted');
 assert.deepEqual(withoutCampaignIdentities(reloaded.db),withoutCampaignIdentities(campaignBefore));
}finally{globalThis.localStorage=savedStorage;}
// Actual account prices and all past figures survive catalog edits / reassignment.
const before=teamAccounts().map(a=>a.cost);
db.types[0].price=999;
assert.deepEqual(teamAccounts().map(a=>a.cost),before,'Changing default price changed history');
const acc=teamAccounts()[0],originalBuyer=acc.buyerId;
const snapshot={cost:acc.cost,date:acc.date,spend:acc.spend,revenue:acc.revenue,profit:acc.profit};
acc.buyerId='u3';
assert.deepEqual(Object.fromEntries(Object.keys(snapshot).map(k=>[k,acc[k]])),snapshot);
acc.buyerId=originalBuyer;
// A Disabled drill-down must intersect with every existing cohort filter.
const defaultFilters={buyer:'all',type:'all',status:'all',period:'all',dateFrom:'',dateTo:'',geo:'all',search:'',completeness:'all'};
const focus=teamAccounts().find(a=>a.status==='Disabled'&&a.date>='2026-10-17');
assert.ok(focus,'Seed needs a recent Disabled account');
ui.filters={...defaultFilters,buyer:focus.buyerId,type:focus.typeId,geo:focus.geo,period:'week',search:focus.name};
const beforeDisabled={...ui.filters};
const initialFiltered=filteredAccounts(TEST_DATE);
assert.ok(initialFiltered.length>0);
ui.filters.status='Disabled';
assert.deepEqual({...ui.filters,status:'all'},beforeDisabled,'Applying Disabled changed another filter');
assert.deepEqual(filteredAccounts(TEST_DATE).map(a=>a.id),initialFiltered.filter(a=>a.status==='Disabled').map(a=>a.id));
assert.ok(filteredAccounts(TEST_DATE).every(a=>a.buyerId===focus.buyerId&&a.typeId===focus.typeId&&a.geo===focus.geo&&a.date>='2026-10-17'));
ui.filters={...defaultFilters,completeness:'missing'};
assert.ok(filteredAccounts(TEST_DATE).length>0);
assert.ok(filteredAccounts(TEST_DATE).every(a=>a.spend==null||a.profit==null||a.revenue==null));
ui.filters={...defaultFilters};
// Presets follow the actual Moscow calendar date, never the mock financial report date.
assert.deepEqual(ISSUE_DATE_PRESETS.map(({id,label})=>({id,label})),[
 {id:'lastMonth',label:'Последний месяц'},{id:'week',label:'Последняя неделя'},
 {id:'yesterday',label:'Вчера'},{id:'today',label:'Сегодня'},
 {id:'thisWeek',label:'Эта неделя'},{id:'month',label:'Этот месяц'},
 {id:'all',label:'За всё время'}
]);
assert.equal(getTodayDate(new Date('2026-10-24T20:59:59Z')),'2026-10-24');
assert.equal(getTodayDate(new Date('2026-10-24T21:00:00Z')),'2026-10-25');
assert.equal(getTodayDate(new Date('2026-12-31T21:00:00Z')),'2027-01-01');
assert.ok(isValidDate(getTodayDate()));
// GMT+3 is a display label change; timestamps keep Moscow's UTC+3 calendar conversion.
for(const [instant,date,time] of [['2026-10-26T20:59:00Z','26.10.2026','23:59'],['2026-10-26T21:00:00Z','27.10.2026','00:00'],['2026-12-31T21:00:00Z','01.01.2027','00:00']]){
 const formatted=timeLabel(Date.parse(instant));
 assert.equal(formatted,date+', '+time+' GMT+3',instant+' numeric Moscow timestamp');
 assert.ok(!formatted.includes('МСК'));
}
assert.equal(timeLabel(null),'Ещё не было');
const range=(period,reference,from,to)=>assert.deepEqual(getIssueDateRange({period},reference),{from,to,error:''},`${period} on ${reference}`);
range('lastMonth',TEST_DATE,'2026-09-26','2026-10-25');
range('week',TEST_DATE,'2026-10-19','2026-10-25');
range('yesterday',TEST_DATE,'2026-10-24','2026-10-24');
range('today',TEST_DATE,'2026-10-25','2026-10-25');
range('thisWeek',TEST_DATE,'2026-10-19','2026-10-25');
range('month',TEST_DATE,'2026-10-01','2026-10-25');
range('yesterday','2027-01-01','2026-12-31','2026-12-31');
range('week','2027-01-01','2026-12-26','2027-01-01');
range('lastMonth','2027-01-01','2026-12-03','2027-01-01');
range('thisWeek','2027-01-01','2026-12-28','2027-01-01');
range('month','2027-01-01','2027-01-01','2027-01-01');
range('thisWeek','2026-10-26','2026-10-26','2026-10-26');
range('week','2026-10-28','2026-10-22','2026-10-28');
range('thisWeek','2026-10-28','2026-10-26','2026-10-28');
range('thisWeek','2026-11-01','2026-10-26','2026-11-01');
range('month','2026-11-01','2026-11-01','2026-11-01');
range('yesterday','2024-03-01','2024-02-29','2024-02-29');
range('week','2024-03-01','2024-02-24','2024-03-01');
range('lastMonth','2024-03-01','2024-02-01','2024-03-01');
range('yesterday','2025-03-01','2025-02-28','2025-02-28');
range('lastMonth','2025-03-01','2025-01-31','2025-03-01');
assert.deepEqual(getIssueDateRange({period:'today'}),getIssueDateRange({period:'today'},getTodayDate()));
assert.ok(getIssueDateRange({period:'today'},'not-a-date').error);
assert.equal(formatIssuePeriod({period:'lastMonth'},TEST_DATE),'26.09.2026 — 25.10.2026');
assert.equal(formatIssuePeriod({period:'today'},TEST_DATE),'25.10.2026');
assert.ok(!Object.hasOwn(db,'unmatched'),'Fresh demo seed must not retain the removed manual-matching collection');
assert.ok(db.sync.logs.every(log=>!log.message.includes('без сопоставления')),'Seed logs advertise a removed feature');
// Arbitrary date ranges are strict calendar dates, inclusive, and independent of report cutoff.
for(const date of ['2024-02-29','2000-02-29','2026-01-31','2026-04-30','0001-01-01','0099-02-28','9999-12-31'])assert.equal(isValidDate(date),true,date);
for(const date of ['',null,undefined,'2026-2-01','01.02.2026','2026-02-29','1900-02-29','2026-04-31','2026-00-01','2026-13-01','2026-01-00','2026-01-32','0000-01-01','2026-01-01T00:00:00Z',' 2026-01-01'])assert.equal(isValidDate(date),false,String(date));
assert.equal(dateRangeError('2024-02-29','2024-02-29'),'');
assert.equal(dateRangeError('2026-09-30','2026-10-01'),'');
assert.equal(dateRangeError('2027-01-01','2027-12-31'),'','Future ranges must not be capped by mock report date');
for(const [from,to] of [['',''],['2026-10-01',''],['','2026-10-01'],['2026-10-02','2026-10-01'],['2026-02-29','2026-03-01'],['2026-02-01','2026-02-30']])assert.ok(dateRangeError(from,to),`${from} / ${to}`);
assert.deepEqual(getIssueDateRange({period:'month'},TEST_DATE),{from:'2026-10-01',to:'2026-10-25',error:''});
assert.deepEqual(getIssueDateRange({period:'week'},TEST_DATE),{from:'2026-10-19',to:'2026-10-25',error:''});
assert.deepEqual(getIssueDateRange({period:'all'}),{from:'',to:'',error:''});
assert.deepEqual(getIssueDateRange({period:'custom',dateFrom:'2026-09-30',dateTo:'2026-10-01'}),{from:'2026-09-30',to:'2026-10-01',error:''});
assert.ok(getIssueDateRange({period:'custom'}).error);
assert.ok(getIssueDateRange({period:'custom',dateFrom:'2026-10-02',dateTo:'2026-10-01'}).error);
assert.ok(getIssueDateRange({period:'unsupported'}).error);
assert.equal(formatIssuePeriod({period:'custom',dateFrom:'2026-09-30',dateTo:'2026-10-01'}),'30.09.2026 — 01.10.2026');
assert.equal(formatIssuePeriod({period:'custom',dateFrom:'2024-02-29',dateTo:'2024-02-29'}),'29.02.2024');
assert.equal(formatIssuePeriod({period:'all'}),'За всё время');
assert.equal(formatIssuePeriod({period:'custom'}),'Период не выбран');
const savedAccounts=db.accounts;
const dates=['2024-02-28','2024-02-29','2024-03-01','2026-09-25','2026-09-26','2026-09-29','2026-09-30','2026-10-01','2026-10-02','2026-10-18','2026-10-19','2026-10-23','2026-10-24','2026-10-25','2026-10-26','2027-01-01'];
db.accounts=dates.map((date,index)=>({...savedAccounts[0],id:'date-'+index,name:'date-'+index,date,buyerId:'u3',typeId:'t1',geo:'IN',status:'Disabled'}));
for(const [period,expectedDates] of [
 ['today',['2026-10-25']],['yesterday',['2026-10-24']],
 ['week',['2026-10-19','2026-10-23','2026-10-24','2026-10-25']],
 ['thisWeek',['2026-10-19','2026-10-23','2026-10-24','2026-10-25']],
 ['month',['2026-10-01','2026-10-02','2026-10-18','2026-10-19','2026-10-23','2026-10-24','2026-10-25']],
 ['lastMonth',['2026-09-26','2026-09-29','2026-09-30','2026-10-01','2026-10-02','2026-10-18','2026-10-19','2026-10-23','2026-10-24','2026-10-25']],
 ['all',dates]
]){
 ui.filters={...defaultFilters,period,buyer:'u3',type:'t1',geo:'IN',status:'Disabled',search:'date-'};
 assert.deepEqual(filteredAccounts(TEST_DATE).map(account=>account.date),expectedDates,period+' boundaries');
 ui.filters.buyer='u4';assert.equal(filteredAccounts(TEST_DATE).length,0,period+' buyer intersection');
 ui.filters.buyer='u3';ui.filters.geo='AR';assert.equal(filteredAccounts(TEST_DATE).length,0,period+' GEO intersection');
}
const dateFilters={...defaultFilters,period:'custom',dateFrom:'2026-09-30',dateTo:'2026-10-01'};
ui.filters={...dateFilters};
assert.deepEqual(filteredAccounts(TEST_DATE).map(account=>account.date),['2026-09-30','2026-10-01']);
ui.filters.dateFrom='2026-10-01';
assert.deepEqual(filteredAccounts(TEST_DATE).map(account=>account.date),['2026-10-01']);
ui.filters.dateFrom='2024-02-29';ui.filters.dateTo='2024-02-29';
assert.deepEqual(filteredAccounts(TEST_DATE).map(account=>account.date),['2024-02-29']);
ui.filters.dateFrom='2026-10-24';ui.filters.dateTo='2027-01-01';
assert.deepEqual(filteredAccounts(TEST_DATE).map(account=>account.date),['2026-10-24','2026-10-25','2026-10-26','2027-01-01']);
for(const bounds of [{dateFrom:'',dateTo:''},{dateFrom:'2026-10-01',dateTo:''},{dateFrom:'',dateTo:'2026-10-01'},{dateFrom:'2026-10-02',dateTo:'2026-10-01'},{dateFrom:'2026-02-29',dateTo:'2026-03-01'}]){
 ui.filters={...defaultFilters,period:'custom',...bounds};
 assert.deepEqual(filteredAccounts(TEST_DATE),[],'Invalid custom range must not include rows');
}
ui.filters={...dateFilters,buyer:'u3',type:'t1',geo:'IN',status:'Disabled',search:'date-'};
ui.selected.add('date-4');
const priorHash=location.hash;
location.hash='#analytics';
navigate('accounts',{buyer:'u3'});
assert.equal(ui.filters.period,'custom');
assert.equal(ui.filters.dateFrom,'2026-09-30');
assert.equal(ui.filters.dateTo,'2026-10-01');
assert.equal(ui.filters.type,'t1');
assert.equal(ui.filters.geo,'IN');
assert.equal(ui.filters.status,'Disabled');
assert.equal(ui.filters.search,'date-');
assert.equal(ui.selected.size,0);
assert.deepEqual(filteredAccounts(TEST_DATE).map(account=>account.date),['2026-09-30','2026-10-01']);
ui.filters.buyer='u4';assert.equal(filteredAccounts(TEST_DATE).length,0,'Custom date range must intersect buyer');
ui.filters.buyer='u3';ui.filters.type='t2';assert.equal(filteredAccounts(TEST_DATE).length,0,'Custom date range must intersect type');
ui.filters.type='t1';ui.filters.geo='AR';assert.equal(filteredAccounts(TEST_DATE).length,0,'Custom date range must intersect GEO');
ui.filters.geo='IN';ui.filters.status='Active';assert.equal(filteredAccounts(TEST_DATE).length,0,'Custom date range must intersect status');
location.hash=priorHash;ui.route='analytics';
db.accounts=savedAccounts;ui.filters={...defaultFilters};
// Country picker data accepts canonical codes and supports practical Russian/English searches.
assert.equal(COUNTRIES.length,249);
assert.equal(new Set(COUNTRIES.map(country=>country.code)).size,249);
assert.ok(COUNTRIES.every(country=>/^[A-Z]{2}$/.test(country.code)&&country.name&&country.nameEn));
assert.ok(COUNTRIES.every(country=>isCountryCode(country.code)));
for(const code of ['',null,undefined,'in','IN ',' IN','ZZ','USA','Индия','all'])assert.equal(isCountryCode(code),false,String(code));
for(const [query,expected] of [['IN','IN'],[' in ','IN'],['Индия','IN'],['india','IN'],['США','US'],['United Kingdom','GB'],['оаэ','AE'],['Turkey','TR'],['Гонконг','HK'],['Cote','CI']])assert.equal(searchCountries(query)[0]?.code,expected,query);
assert.equal(countryLabel('IN'),'IN — Индия');
assert.equal(countryLabel('ZZ'),'');
assert.equal(countryLabel(''),'');
assert.equal(searchCountries('').length,249);
assert.equal(searchCountries('',7).length,7);
assert.equal(searchCountries('in',1).length,1);
assert.deepEqual(searchCountries('definitely-no-such-country'),[]);
assert.deepEqual(searchCountries('IN',0),[]);
assert.ok(teamAccounts().every(account=>!account.geo||isCountryCode(account.geo)));
// Screens remain renderable without depending on analytics copy under active editing.
for(const tab of ['types','buyers','matrix']){
 ui.analysisTab=tab;
 const h=renderAnalytics();
 assert.ok(h.length>1000);
 assert.ok(!h.includes('NaN'));
 const dateButton=h.match(/<button\b[^>]*id="a-period"[^>]*>/)?.[0];
 assert.ok(dateButton?.includes('issue-date-trigger')&&dateButton.includes('aria-haspopup="dialog"'),'Analytics must use the shared date button');
 assert.ok(!/<select\b[^>]*id="a-period"/.test(h));
 assert.ok(!/Не сопоставлено|data-map-campaign|a-unmatched|CSV|Выгрузить/.test(h));
 assert.ok(!/Spend AIO|Профит/i.test(h.replace(/<[^>]+>/g,'')),'Analytics metric labels must use Spend and Profit');
}
// Registry uses the same date control and never exposes the removed manual-matching/export UI.
assert.ok(!('openUnmatched' in accountModule));
const registry=renderAccounts();
const registryDateButton=registry.match(/<button\b[^>]*id="accounts-period"[^>]*>/)?.[0];
assert.ok(registryDateButton?.includes('issue-date-trigger')&&registryDateButton.includes('aria-haspopup="dialog"'));
assert.ok(!/<select\b[^>]*id="accounts-period"/.test(registry));
assert.ok(!/account-footnotes|accounts-unmatched|data-map-campaign|Не сопоставлено|CSV|Выгрузить|¹|²/.test(registry));
assert.ok(!/Spend AIO|Профит/i.test(registry.replace(/<[^>]+>/g,'')),'Registry metric labels must use Spend and Profit');
assert.ok(!/Spend AIO|Профит/i.test(campaignDetail.replace(/<[^>]+>/g,'')),'Campaign metric labels must use Spend and Profit');
const beforeBadgeAccounts=db.accounts;
db.accounts=[
 {...beforeBadgeAccounts[0],id:'known-values-empty-campaigns',name:'Known values',spend:100,revenue:150,profit:50,campaigns:[]},
 {...beforeBadgeAccounts[0],id:'unknown-values-linked-campaign',name:'Unknown values',spend:null,revenue:null,profit:null,campaigns:[{id:'linked',name:'Existing AIO campaign'}]}
];
ui.filters={...defaultFilters,search:'known-values-empty-campaigns'};
assert.ok(renderAccounts().includes('Нет кампаний'),'Badge must depend on campaign links, not missing financials');
ui.filters.search='unknown-values-linked-campaign';
assert.ok(!renderAccounts().includes('Нет кампаний'),'A linked campaign must not be labeled absent when financials are missing');
db.accounts=beforeBadgeAccounts;ui.filters={...defaultFilters};
// The footer and mobile summary cover every filtered row, regardless of pagination or selection.
const priorRegistryState={accounts:db.accounts,filters:ui.filters,accountPage:ui.accountPage,accountSort:ui.accountSort,sortDir:ui.sortDir,selected:new Set(ui.selected)};
const registryBase={...db.accounts[0],buyerId:'u3',typeId:'t1',geo:'IN',status:'Disabled',date:'2026-10-01',team:'alpha'};
db.accounts=Array.from({length:25},(_,index)=>({...registryBase,id:'total-'+index,name:'Total '+index,cost:2,spend:100+index,revenue:200+index*2,profit:100+index,raw:101+index,campaigns:Array.from({length:index%3},(_,slot)=>({id:String(600000+index*3+slot),name:'Campaign'}))}));
db.accounts.push({...registryBase,id:'excluded-buyer',buyerId:'u4',spend:9999,campaigns:[]},{...registryBase,id:'excluded-team',team:'beta',spend:9999,campaigns:[]});
ui.filters={...defaultFilters,buyer:'u3',type:'t1',geo:'IN',status:'Disabled',period:'custom',dateFrom:'2026-10-01',dateTo:'2026-10-01'};
ui.accountPage=1;ui.selected.clear();
const footer=html=>html.match(/<tfoot>[\s\S]*?<\/tfoot>/)?.[0];
const summary=html=>html.match(/<section class="account-mobile-totals"[\s\S]*?<\/section>/)?.[0];
const footerValues=html=>[...footer(html).matchAll(/<button\b[^>]*class="account-total-value[^>]*>([\s\S]*?)<\/button>/g)].map(match=>match[1].replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/g,'').replace(/<[^>]+>/g,''));
const allRowsHtml=renderAccounts(),allRowsFooter=footer(allRowsHtml),allRowsSummary=summary(allRowsHtml);
assert.ok(allRowsFooter.includes('25 кабинетов'));
assert.deepEqual(footerValues(allRowsHtml),['$2,800.00','$5,600.00','$2,750.00','+96.5%']);
assert.ok(allRowsSummary.includes('25 каб. · 24 камп.'));
for(const page of [2,3]){
 ui.accountPage=page;ui.selected.add('total-0');ui.accountSort='spend';ui.sortDir=page===2?1:-1;
 const html=renderAccounts();
 assert.equal(footer(html),allRowsFooter,'Totals changed with pagination, sort or selection');
 assert.equal(summary(html),allRowsSummary,'Mobile totals changed with pagination, sort or selection');
}
ui.filters.buyer='u4';
assert.ok(footer(renderAccounts()).includes('1 кабинетов'),'Totals must follow the current buyer filter');
db.accounts=[{...registryBase,id:'known-total',...known[0],campaigns:[]},{...registryBase,id:'missing-total',cost:30,raw:null,spend:null,revenue:null,profit:null,campaigns:[]}];
ui.filters={...defaultFilters};
const partialHtml=renderAccounts();
assert.deepEqual(footerValues(partialHtml),['$100.00','$150.00','$0.00','0.0%']);
assert.ok(footer(partialHtml).includes('account-partial-mark')&&footer(partialHtml).includes('получен для 1 из 2 кабинетов'));
db.accounts.forEach(account=>{account.spend=null;account.revenue=null;account.profit=null;account.raw=null;});
const missingHtml=renderAccounts();
assert.deepEqual(footerValues(missingHtml),['—','—','—','—'],'Entirely unknown figures must stay unavailable');
assert.ok(footer(missingHtml).includes('получен для 0 из 2 кабинетов'));
ui.filters.search='empty-total-filter';
const emptyHtml=renderAccounts();
assert.deepEqual(footerValues(emptyHtml),['$0.00','$0.00','—','—']);
assert.ok(footer(emptyHtml).includes('0 кабинетов')&&!emptyHtml.includes('NaN'));
db.accounts=priorRegistryState.accounts;ui.filters=priorRegistryState.filters;ui.accountPage=priorRegistryState.accountPage;ui.accountSort=priorRegistryState.accountSort;ui.sortDir=priorRegistryState.sortDir;ui.selected=priorRegistryState.selected;
// Header help must preserve sorting; extended rows, headers and totals retain matching columns.
const beforeHelp={accounts:db.accounts,filters:ui.filters,sort:ui.accountSort,dir:ui.sortDir,page:ui.accountPage,document:globalThis.document,window:globalThis.window,MutationObserver:globalThis.MutationObserver};
const reasonInjection='Policy <img src=x onerror="bad()"> & review';
db.accounts=[
 {...registryBase,id:'reason-present',name:'Reason present',cost:2,spend:100,revenue:150,profit:50,raw:80,status:'Disabled',reason:reasonInjection,campaigns:[]},
 {...registryBase,id:'reason-unknown',name:'Reason unknown',cost:2,spend:200,revenue:240,profit:40,raw:210,status:'Disabled',reason:'   ',campaigns:[]},
 {...registryBase,id:'reason-inactive',name:'Active account',cost:2,spend:300,revenue:360,profit:60,raw:300,status:'Active',reason:'Stale reason must not show',campaigns:[]}
];
ui.filters={...defaultFilters};ui.accountPage=1;ui.accountSort='date';ui.sortDir=-1;
let lastPopup,extendedOn=false;
class FakeControl{
 constructor(attributes={},dataset={}){this.attributes=new Map(Object.entries(attributes));this.dataset=dataset;this.listeners=new Map();this.style={};this.className='';this.isConnected=true;this.classList={contains:name=>this.className.split(' ').includes(name)};}
 addEventListener(type,fn){this.listeners.set(type,[...(this.listeners.get(type)||[]),fn]);}
 hasAttribute(name){return this.attributes.has(name);}
 getAttribute(name){return this.attributes.get(name);}
 setAttribute(name,value){this.attributes.set(name,value);}
 removeAttribute(name){this.attributes.delete(name);}
 getBoundingClientRect(){return {left:100,right:300,top:100,bottom:130,width:200,height:100};}
 closest(){return null;}
 contains(){return false;}
 matches(){return false;}
 append(){}
 focus(){}
 remove(){this.isConnected=false;}
 fire(type,extra={}){const event={defaultPrevented:false,propagationStopped:false,preventDefault(){this.defaultPrevented=true;},stopPropagation(){this.propagationStopped=true;},...extra};for(const listener of this.listeners.get(type)||[])listener(event);this['on'+type]?.(event);return event;}
}
const spendSort=new FakeControl({'data-sort':'spend','data-account-help':'spend'},{sort:'spend',accountHelp:'spend'});
const spendHelp=new FakeControl({'data-account-help':'spend'},{accountHelp:'spend'});
const disabledHelp=new FakeControl({'data-account-disabled':'reason-present'},{accountDisabled:'reason-present'});
const toggleExtended=new FakeControl(),fakeBody=new FakeControl();fakeBody.append=node=>{lastPopup=node;};
globalThis.document={addEventListener(){},querySelector:()=>null,querySelectorAll:selector=>selector==='[data-sort]'?[spendSort]:selector.includes('[data-account-help]')?[spendSort,spendHelp,disabledHelp]:[],getElementById:id=>id==='accounts-extended'?toggleExtended:null,createElement:()=>new FakeControl(),body:fakeBody};
globalThis.window={dispatchEvent(){},addEventListener(){},innerWidth:1200,innerHeight:800};
globalThis.MutationObserver=class{observe(){}disconnect(){}};
const registryTable=html=>html.match(/<table class="data-table account-table">([\s\S]*?)<\/table>/)[1];
const cells=row=>[...row.matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/g)].map(match=>match[1]);
try{
 bindAccounts();
 const click=spendSort.fire('click');
 assert.equal(click.defaultPrevented,false,'Header tooltip must not cancel sorting');
 assert.equal(click.propagationStopped,false,'Sortable header must retain its normal click behavior');
 assert.equal(ui.accountSort,'spend');assert.equal(ui.sortDir,1);
 assert.deepEqual([...registryTable(renderAccounts()).matchAll(/<tr data-account="([^"]+)"/g)].map(match=>match[1]),['reason-present','reason-unknown','reason-inactive']);
 spendSort.fire('click');assert.equal(ui.sortDir,-1);
 assert.deepEqual([...registryTable(renderAccounts()).matchAll(/<tr data-account="([^"]+)"/g)].map(match=>match[1]),['reason-inactive','reason-unknown','reason-present']);
 const sortBeforeHelp={sort:ui.accountSort,dir:ui.sortDir};spendHelp.fire('click');
 assert.deepEqual({sort:ui.accountSort,dir:ui.sortDir},sortBeforeHelp,'Info button must not sort rows');
 assert.ok(lastPopup.innerHTML.includes(ACCOUNT_COLUMN_HELP.spend.source));
 disabledHelp.fire('click');
 assert.ok(lastPopup.innerHTML.includes('&lt;img src=x onerror=&quot;bad()&quot;&gt; &amp; review'));
 assert.ok(!lastPopup.innerHTML.includes('<img'),'Disabled reason tooltip must escape source text');
 disabledHelp.dataset.accountDisabled='reason-unknown';disabledHelp.fire('click');disabledHelp.fire('click');
 assert.ok(lastPopup.innerHTML.includes(DISABLED_REASON_MISSING),'Unknown Disabled reason must be explicit');
 toggleExtended.fire('click');extendedOn=true;
 const extendedHtml=renderAccounts(),table=registryTable(extendedHtml);
 const headerCells=cells(table.match(/<thead>([\s\S]*?)<\/thead>/)[1]);
 const footerCells=cells(table.match(/<tfoot>([\s\S]*?)<\/tfoot>/)[1]);
 const rows=[...table.matchAll(/<tr data-account="([^"]+)"[^>]*>([\s\S]*?)<\/tr>/g)];
 assert.equal(headerCells.length,15);assert.equal(footerCells.length,headerCells.length);
 assert.ok(rows.every(row=>cells(row[2]).length===headerCells.length),'Extended row alignment differs from header/footer');
 const reasonColumn=headerCells.findIndex(cell=>cell.includes('Причина Disabled'));
 assert.equal(reasonColumn,13);assert.equal(footerCells[reasonColumn],'');
 const rowById=id=>cells(rows.find(row=>row[1]===id)[2]);
 assert.ok(rowById('reason-present')[reasonColumn].includes('&lt;img'));
 assert.equal(rowById('reason-unknown')[reasonColumn],DISABLED_REASON_MISSING);
 assert.equal(rowById('reason-inactive')[reasonColumn],'—');
 assert.ok(!extendedHtml.includes('Stale reason must not show'));
 assert.equal(rowById('reason-present')[9],'+$20.00');assert.equal(rowById('reason-unknown')[9],'−$10.00');
 assert.ok(footerCells[8].includes('$590.00')&&footerCells[9].includes('+$10.00')&&footerCells[10].includes('$6.00'),'Extended totals shifted under another column');
 for(const key of ['name','typeId','campaigns','spend','revenue','net','roi','raw','cost','date','status']){
  assert.ok(new RegExp('<button[^>]*data-sort="'+key+'"[^>]*data-account-help="'+key+'"').test(table),'Sortable header lost tooltip or sort key '+key);
  assert.ok(new RegExp('<button[^>]*class="account-column-help"[^>]*data-account-help="'+key+'"').test(table),'Missing separate help button '+key);
 }
 ui.filters.search='empty-extended';
 assert.ok(registryTable(renderAccounts()).includes('colspan="15"'),'Extended empty state must span every column');
}finally{
 if(extendedOn)toggleExtended.fire('click');hideAccountTooltips();
 db.accounts=beforeHelp.accounts;ui.filters=beforeHelp.filters;ui.accountSort=beforeHelp.sort;ui.sortDir=beforeHelp.dir;ui.accountPage=beforeHelp.page;
 globalThis.document=beforeHelp.document;globalThis.window=beforeHelp.window;
 if(beforeHelp.MutationObserver)globalThis.MutationObserver=beforeHelp.MutationObserver;else delete globalThis.MutationObserver;
}
// User labels, forms and saves use username; identity edits never reassign or recalculate accounts.
const workflowState=structuredClone(db),workflowUi={route:ui.route,filters:ui.filters,analysisTab:ui.analysisTab,settingsTab:ui.settingsTab};
const workflowGlobals=Object.fromEntries(['document','window','FormData','setTimeout','clearTimeout','setInterval','clearInterval','MutationObserver'].map(key=>[key,globalThis[key]]));
const workflowHash=location.hash,controls=new Map(),timers=new Map();let timerId=0;
const control=id=>{if(!controls.has(id))controls.set(id,new FakeControl());return controls.get(id);};
const workflowDocument=new FakeControl(),workflowWindow=new FakeControl(),workflowBody=new FakeControl();
workflowBody.classList.add=()=>{};workflowBody.classList.remove=()=>{};workflowBody.append=()=>{};
workflowDocument.body=workflowBody;workflowDocument.getElementById=control;workflowDocument.createElement=()=>new FakeControl();
workflowDocument.querySelector=selector=>/^#[\w-]+$/.test(selector)?control(selector.slice(1)):['[data-close]','.modal-backdrop'].includes(selector)?control(selector):null;
const memberButtons=db.users.filter(user=>user.team===db.teamId).map(user=>new FakeControl({}, {userManage:user.id}));
const logButton=new FakeControl({}, {syncLog:db.sync.logs[0].id});
workflowDocument.querySelectorAll=selector=>selector==='[data-user-manage]'?memberButtons:selector==='[data-sync-log]'?[logButton]:[];
workflowWindow.dispatchEvent=()=>{};workflowWindow.scrollTo=()=>{};
globalThis.document=workflowDocument;globalThis.window=workflowWindow;
globalThis.FormData=class{constructor(form){this.fields=form.fields||{};}get(key){return this.fields[key]??null;}};
globalThis.setTimeout=(fn,delay)=>{const id=++timerId;timers.set(id,{fn,delay});return id;};
globalThis.clearTimeout=id=>timers.delete(id);globalThis.setInterval=()=>0;globalThis.clearInterval=()=>{};
globalThis.MutationObserver=class{observe(){}disconnect(){}};
const submit=(id,fields)=>{const form=control(id);form.fields=fields;form.fire('submit',{currentTarget:form,target:form});};
try{
 const self=db.users.find(user=>user.id===db.currentUserId),pending=db.users.find(user=>user.id==='u3');
 self.name='DO_NOT_RENDER_PERSONAL_NAME';self.username='qa_current_username';
 ui.filters={...defaultFilters};ui.analysisTab='buyers';
 for(const html of [renderAccounts(),renderAnalytics(),renderSettings('users')]){
  assert.ok(html.includes(self.username),'Username missing from a user label');
  assert.ok(!html.includes(self.name),'Obsolete personal name leaked into UI');
 }
 delete self.name;
 Object.assign(pending,{status:'invited',token:'existing-invite-token',expires:Date.now()+86400000,custom:{retained:true}});
 const pendingBefore=structuredClone(pending),financialBefore=structuredClone(db.accounts);
 bindSettings();memberButtons.find(button=>button.dataset.userManage===pending.id).fire('click');
 const participantForm=control('overlay-root').innerHTML;
 assert.ok(participantForm.includes('name="username"')&&participantForm.includes('name="email"'));
 assert.ok(!participantForm.includes('name="name"'));
 assert.ok(participantForm.includes('id="user-invitation"'),'Pending invite must remain accessible while editing identity');
 submit('user-form',{username:self.username.toUpperCase(),email:'qa_member@example.com',aio:pending.aio,role:pending.role});
 assert.deepEqual(pending,pendingBefore,'Duplicate identity submission mutated a participant');
 assert.equal(control('user-form-error').hidden,false);
 submit('user-form',{username:'qa_member',email:'not-an-email',aio:pending.aio,role:pending.role});
 assert.deepEqual(pending,pendingBefore,'Malformed identity submission mutated a participant');
 submit('user-form',{username:' qa_member ',email:' QA_MEMBER@EXAMPLE.COM ',aio:pending.aio,role:pending.role});
 assert.equal(pending.username,'qa_member');assert.equal(pending.email,'qa_member@example.com');
 assert.deepEqual(exceptNameAndUsername({...pending,email:pendingBefore.email}),exceptNameAndUsername(pendingBefore),'Admin identity edit changed tokens, role, AIO or custom values');
 assert.deepEqual(db.accounts,financialBefore,'Participant edit changed account ownership or financial history');
 memberButtons.find(button=>button.dataset.userManage===self.id).fire('click');
 const selfBefore=structuredClone(self);
 submit('user-form',{username:self.username,email:self.email,aio:self.aio,role:'buyer'});
 assert.equal(self.role,selfBefore.role,'Admin must not change own role through a disabled select');
 control('invite-user').fire('click');
 assert.ok(!control('overlay-root').innerHTML.includes('name="name"'));
 assert.ok(control('overlay-root').innerHTML.includes('name="username"')&&control('overlay-root').innerHTML.includes('name="email"'));
 const userCount=db.users.length;
 submit('invite-form',{username:self.username.toUpperCase(),email:'qa_invite@example.com',aio:'qa_aio',role:'buyer'});
 assert.equal(db.users.length,userCount,'Duplicate invite was created');
 submit('invite-form',{username:'bad name',email:'qa_invite@example.com',aio:'qa_aio',role:'buyer'});
 assert.equal(db.users.length,userCount,'Malformed invite was created');
 submit('invite-form',{username:'qa_new_buyer',email:' QA_INVITE@EXAMPLE.COM ',aio:'qa_aio',role:'buyer'});
 assert.equal(db.users.length,userCount+1);
 const invited=db.users.at(-1);
 assert.ok(!Object.hasOwn(invited,'name'));assert.equal(invited.username,'qa_new_buyer');assert.equal(invited.email,'qa_invite@example.com');
 assert.ok(invited.token&&invited.expires>Date.now());
 assert.deepEqual(db.accounts,financialBefore,'Invitation changed existing accounts');
 // Exercise the real app profile delegate and invite screen without opening a browser.
 location.hash='';await import('../dist/app.js?identity-workflow-check');
 assert.equal(ui.route,'login','Root URL must open the login screen');
 assert.ok(control('app').innerHTML.includes('Войти в Account Lab'),'Root URL did not render login');
 location.hash='#analytics';workflowWindow.fire('hashchange');
 assert.equal(ui.route,'analytics','Explicit analytics deep link should remain available');
 assert.ok(control('app').innerHTML.includes('Аналитика кабинетов'),'Analytics deep link failed');
 workflowDocument.fire('click',{target:{closest:selector=>selector==='[data-profile]'?{}:null}});
 assert.ok(control('overlay-root').innerHTML.includes('id="profile-form"'));
 assert.ok(!control('overlay-root').innerHTML.includes('name="name"'));
 const profileBefore=structuredClone(self);
 submit('profile-form',{username:pending.username.toUpperCase(),email:'qa_profile@example.com'});
 assert.deepEqual(self,profileBefore,'Self-profile duplicate validation failed');
 submit('profile-form',{username:'bad name',email:'qa_profile@example.com'});
 assert.deepEqual(self,profileBefore,'Self-profile malformed validation failed');
 submit('profile-form',{username:'qa_self_edited',email:' QA_PROFILE@EXAMPLE.COM '});
 assert.equal(self.username,'qa_self_edited');assert.equal(self.email,'qa_profile@example.com');
 assert.deepEqual(exceptNameAndUsername({...self,email:profileBefore.email}),exceptNameAndUsername(profileBefore),'Profile edit changed AIO, role, id or other data');
 assert.deepEqual(db.accounts,financialBefore);
 location.hash='#invite/'+invited.id+'/'+invited.token;workflowWindow.fire('hashchange');
 assert.ok(control('app').innerHTML.includes('Добро пожаловать, qa_new_buyer'),'Username-only invitation screen failed');
 // Synchronization exposes one manual action, while automatic retry controls remain editable.
 const syncHtml=renderSync();
 assert.ok(syncHtml.includes('id="sync-all"'));
 assert.ok(!/data-sync-source|data-sync-preset|retry-log-source|Повторить загрузку/.test(syncHtml));
 for(const field of ['retries','retryDelay','backoff','rpm','concurrency'])assert.ok(syncHtml.includes('name="'+field+'"'),'Missing sync setting '+field);
 bindSync();logButton.fire('click');
 assert.ok(!/retry-log-source|Повторить загрузку/.test(control('overlay-root').innerHTML),'Log details retained a per-source retry');
 db.sync.config.paused=false;db.sync.meta.status='fresh';db.sync.rollup.status='error';
 const syncBefore=structuredClone(db.sync),timerBefore=new Set(timers.keys());
 control('sync-all').fire('click');
 for(const source of ['meta','rollup']){
  assert.equal(db.sync[source].status,'running');
  assert.equal(db.sync[source].lastSuccess,syncBefore[source].lastSuccess,'Starting sync changed the last successful timestamp');
  assert.ok(db.sync[source].lastAttempt>=syncBefore[source].lastAttempt);
 }
 const cycle=[...timers.entries()].filter(([id])=>!timerBefore.has(id));assert.equal(cycle.length,1);
 runSync();assert.equal([...timers.keys()].filter(id=>!timerBefore.has(id)).length,1,'Parallel manual sync must not start another cycle');
 timers.delete(cycle[0][0]);cycle[0][1].fn();
 for(const source of ['meta','rollup'])assert.equal(db.sync[source].status,'fresh');
 assert.deepEqual(new Set(db.sync.logs.slice(0,2).map(log=>log.source)),new Set(['meta','rollup']));
 assert.deepEqual(db.accounts,financialBefore,'Mock refresh must not change existing financial values');
 db.sync.config.paused=true;const pausedState=structuredClone(db.sync);runSync();assert.deepEqual(db.sync,pausedState);
}finally{
 Object.assign(db,workflowState);Object.assign(ui,workflowUi);location.hash=workflowHash;
 for(const [key,value] of Object.entries(workflowGlobals)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
}
for(const tab of ['types','users','general'])assert.ok(renderSettings(tab).length>500);
assert.ok(renderSync().includes('Последняя успешная'));
assert.ok(renderSettings('general').includes('GMT+3'));
const beforeTimestampSync=structuredClone(db.sync);
db.sync.meta.lastSuccess=Date.parse('2026-10-26T21:00:00Z');
db.sync.meta.lastAttempt=Date.parse('2026-10-26T21:05:00Z');
const timestampSync=renderSync();
assert.ok(/27\.10\.2026, 00:00 GMT\+3/.test(timestampSync),'Sync success timestamp must retain Moscow conversion');
assert.ok(/27\.10\.2026, 00:05 GMT\+3/.test(timestampSync),'Sync attempt timestamp must retain Moscow conversion');
assert.ok(timestampSync.includes('Время · GMT+3'));
assert.ok(!/МСК|UTC\+3|Europe\/Moscow/.test(timestampSync+renderSettings('general')));
db.sync=beforeTimestampSync;
assert.ok(renderAccounts().includes('DV-'));
db.teamId='beta';
assert.ok(teamAccounts().every(a=>a.team==='beta'));
assert.ok(teamTypes().every(t=>t.team==='beta'));
const betaHtml=renderAccounts();
assert.ok(!betaHtml.includes('DV-'));
assert.ok(betaHtml.includes('BT-'));
ui.filters.search='no-such-account';
assert.equal(filteredAccounts(TEST_DATE).length,0);
assert.ok(renderAccounts().includes('Кабинеты не найдены'));
assert.ok(renderAnalytics().length>0);
console.log('PASS: module syntax, known-value averages, zero/negative/mixed-coverage arithmetic, non-destructive username/roster/campaign migrations, case-insensitive identity validation and real profile/member/invite saves, whole-cohort status shares, both-source refresh and simplified sync controls, numeric campaign IDs and exact-cent splits, full-filter registry totals independent of pages/selection, source metric help and retained sorting, escaped Disabled reasons and extended-column alignment, GMT+3 timestamp semantics, Moscow-relative presets, strict inclusive date ranges and drill-down preservation, searchable canonical country data, filtered Disabled drill-down, frozen prices, reassignment, screen rendering, and team isolation.');
