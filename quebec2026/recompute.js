// Corridor Quebec 2026 recompute engine. JS port of daily.py.
// Verified against Python: seats, vote shares, ENEP, all 127 ridings, all 17
// regions and poll weights identical. Only the simulation differs, at the
// interval edges, because the RNG differs.
// Runs in the browser so the page always shows today's numbers with no
// scheduled job. {skipSim:true} is the ~4ms fast path; full sim is ~750ms.
var HW={"Leger":1,"Leger-regional":1,"Liaison":.75,"Pallas":.85,"Mainstreet":.85,"Angus Reid":.9,"Ipsos":.9,"CROP":.9};
var TAU=10,POLL_ERR=2.2,DRIFT=.075;
var PROV22={PQ:14.61,CAQ:40.98,PLQ:14.37,PCQ:12.91,QS:15.43};
var ELECTION=Date.UTC(2026,9,5);
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function makeGauss(rnd){var sp=null;return function(sd){if(sp!==null){var z=sp;sp=null;return z*sd}var u,v,s;do{u=rnd()*2-1;v=rnd()*2-1;s=u*u+v*v}while(s>=1||s===0);var m=Math.sqrt(-2*Math.log(s)/s);sp=v*m;return u*m*sd}}
function _days(a,b){return Math.round((a-b)/86400000)}
function _iso(ms){return new Date(ms).toISOString().slice(0,10)}
function _pi(s){var p=s.split("-").map(Number);return Date.UTC(p[0],p[1]-1,p[2])}
function _r1(x){return Math.round(x*10)/10}
function _r2(x){return Math.round(x*100)/100}
function recompute(d,todayMs,opts){
 opts=opts||{};var RUNS=opts.runs||4000,skipSim=!!opts.skipSim,P=d.P;
 var tot=0,acc={},used=[];P.forEach(function(p){acc[p]=0});
 d.polls.forEach(function(pl){
  var age=_days(todayMs,_pi(pl.date));if(age<0)return;
  var w=Math.sqrt(pl.n)*Math.exp(-age/TAU)*(HW[pl.house]!==undefined?HW[pl.house]:.8);
  tot+=w;P.forEach(function(p){acc[p]+=((pl.s||{})[p]||0)*w});
  var c={};for(var k in pl)c[k]=pl[k];c.age=age;c.weight=_r1(w);used.push(c)});
 var sh={};
 if(tot===0){P.forEach(function(p){sh[p]=d.v[p]})}
 else{var e0={};P.forEach(function(p){e0[p]=acc[p]/tot});var t0=P.reduce(function(s,p){return s+e0[p]},0);P.forEach(function(p){sh[p]=e0[p]/t0*100})}
 used.sort(function(a,b){return a.age-b.age});
 var RB={};
 d.ri.forEach(function(r){if(!r[6])return;var i=r[1];if(!RB[i]){RB[i]={w:0};P.forEach(function(p){RB[i][p]=0})}var w=r[6][6];RB[i].w+=w;P.forEach(function(p,k){RB[i][p]+=r[6][0][k]*w})});
 var BASE={};Object.keys(RB).forEach(function(i){BASE[i]={};P.forEach(function(p){BASE[i][p]=RB[i][p]/RB[i].w})});
 var LEGER={},ANCHOR={};
 Object.keys(d.reg).forEach(function(i){if(d.reg[i].src==="SOURCED")LEGER[i]=true;ANCHOR[i]=(d.reg[i].a||d.reg[i].v).slice()});
 var AP=d.anchor_prov||(function(){var o={};Object.keys(d.v).forEach(function(k){o[k]=d.v[k]});return o})();
 function project(shx){
  var sw={},dr={};P.forEach(function(p){sw[p]=shx[p]-PROV22[p];dr[p]=shx[p]-AP[p]});
  var tg={};
  Object.keys(BASE).forEach(function(i){
   var v={};
   if(LEGER[i])P.forEach(function(p,k){v[p]=Math.max(.5,ANCHOR[i][k]+dr[p])});
   else P.forEach(function(p){v[p]=Math.max(.5,BASE[i][p]+sw[p])});
   var t=P.reduce(function(s,p){return s+v[p]},0);
   tg[i]={};P.forEach(function(p){tg[i][p]=v[p]/t*100})});
  var seats={};P.forEach(function(p){seats[p]=0});var rows=[];
  d.ri.forEach(function(r){
   var t=tg[r[1]];if(!t){rows.push(null);return}
   var v={};
   if(r[6])P.forEach(function(p,k){v[p]=Math.max(.2,r[6][0][k]*(t[p]/Math.max(BASE[r[1]][p],.5)))});
   else P.forEach(function(p){v[p]=t[p]});
   var s=P.reduce(function(a,p){return a+v[p]},0);P.forEach(function(p){v[p]=v[p]/s*100});
   var rk=P.slice().sort(function(a,b){return v[b]-v[a]});
   rows.push([P.map(function(p){return _r1(v[p])}),P.indexOf(rk[0]),P.indexOf(rk[1]),_r1(v[rk[0]]-v[rk[1]])]);
   seats[rk[0]]+=1});
  return{seats:seats,tg:tg,rows:rows}}
 var dl=Math.max(_days(ELECTION,todayMs),0);
 if(!skipSim){
  var rnd=mulberry32(20261005),gauss=makeGauss(rnd);
  var n=RUNS,sd=Math.sqrt(POLL_ERR*POLL_ERR+Math.pow(DRIFT*dl,2));
  var tal={},maj={},dist={};P.forEach(function(p){tal[p]=0;maj[p]=0;dist[p]=[]});
  var mino=0;
  for(var it=0;it<n;it++){
   var e=P.map(function(){return gauss(sd)});
   var m=e.reduce(function(a,b){return a+b},0)/e.length;
   var drw={};P.forEach(function(p,i){drw[p]=Math.max(1,sh[p]+e[i]-m)});
   var t=P.reduce(function(a,p){return a+drw[p]},0);P.forEach(function(p){drw[p]=drw[p]/t*100});
   var s=project(drw).seats;
   var top=P[0];P.forEach(function(p){if(s[p]>s[top])top=p});
   tal[top]+=1;P.forEach(function(p){dist[p].push(s[p])});
   if(s[top]>=64)maj[top]+=1;else mino+=1}
  var q=function(l,x){var a=l.slice().sort(function(u,v){return u-v});return a[Math.floor(x*(a.length-1))]};
  var ms={},mj={},ci={};
  P.forEach(function(p){ms[p]=_r1(tal[p]/n*100);mj[p]=_r1(maj[p]/n*100);ci[p]=[q(dist[p],.05),q(dist[p],.5),q(dist[p],.95)]});
  d.sim={most_seats:ms,majority:mj,p_minority:_r1(mino/n*100),seat_ci:ci,sd_used:_r2(sd),runs:n}}
 var c=project(sh);
 d.ri.forEach(function(r,i){if(c.rows[i]){r[2]=c.rows[i][0];r[3]=c.rows[i][1];r[4]=c.rows[i][2];r[5]=c.rows[i][3]}});
 d.asof=_iso(todayMs);d.dl=dl;
 d.v={};P.forEach(function(p){d.v[p]=_r1(sh[p])});
 d.s=c.seats;
 d.enep=_r2(1/P.reduce(function(a,p){return a+Math.pow(sh[p]/100,2)},0));
 d.polls=used;
 if(!d.anchor_prov){d.anchor_prov={};P.forEach(function(p){d.anchor_prov[p]=d.v[p]})}
 Object.keys(d.reg).forEach(function(i){
  var t=c.tg[i];if(!t)return;
  if(!d.reg[i].a)d.reg[i].a=d.reg[i].v.slice();
  d.reg[i].v=P.map(function(p){return _r1(t[p])});
  d.reg[i].s=P.map(function(p){return d.ri.filter(function(r){return String(r[1])===String(i)&&P[r[3]]===p}).length});
  var best=P[0];P.forEach(function(p){if(t[p]>t[best])best=p});
  d.reg[i].l=P.indexOf(best)});
 return d}
if(typeof window!=="undefined"){window.CorridorRecompute=recompute}
if(typeof module!=="undefined"&&module.exports){module.exports={recompute:recompute}}
