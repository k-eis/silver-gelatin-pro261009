// ── Silver Gelatin PRO（k-eis DESIGN FILTER 006 PRO・WebGL）ステージ1：土台
// 無料版の全工程をGPUでリアルタイム化し、輝度依存の粒子・ハレーション・エッジ効果を追加
const $=id=>document.getElementById(id), cv=$('out'), gl=cv.getContext('webgl',{preserveDrawingBuffer:true,antialias:false});
const MAXPX=2048;
const FW={none:[.299,.587,.114],yellow:[.35,.55,.10],orange:[.50,.40,.10],red:[.70,.20,.10],green:[.20,.70,.10]};
const TC={none:[0,0,0],sepia:[112,66,20],selenium:[60,30,70],cyano:[10,50,110]};
// 値（無料版と同じ設計。halation/edgeがPRO新規）
const SL=[['TONAL CURVE','階調',[['tcBlack','BLACK','黒',50],['tcShadow','SHADOW','影',50],['tcMidtone','MIDTONE','中間',50],['tcHighlight','HIGHLIGHT','明',50],['tcWhite','WHITE','白',50]]],
['FILM','フィルム',[['grain','GRAIN','粒子',20],['halation','HALATION','にじみ',15],['edge','EDGE','輪郭効果',20],['detail','DETAIL','解像感',25]]],
['DEVELOPER','現像',[['pushPull','PUSH / PULL','増感・減感',50]]],
['PRINT','焼き付け',[['paperGrade','PAPER GRADE','印画紙',50],['dodgeBurn','DODGE & BURN','覆い焼き',25],['toneStrength','TONE','調色',60]]],
['BRUSH','覆い焼き・焼き込みブラシ',[['brushSize','SIZE','大きさ',40],['brushStr','STRENGTH','強さ',50]]],
['SPLIT TONE','スプリットトーン',[['shHue','SHADOW HUE','影の色',220,0,360],['hiHue','HIGHLIGHT HUE','明部の色',35,0,360],['split','SPLIT','強さ',0]]],
['LIGHT LEAK','光線引き',[['lightLeak','LIGHT LEAK','強さ',0],['leakX','POSITION X','位置X',80],['leakY','POSITION Y','位置Y',20],['leakR','RANGE','範囲',50,5,100]]],
['FINISH','仕上げ',[['margin','MARGIN','余白',0,0,30],['rebate','NEGATIVE EDGE','ネガ縁',0],['dust','DUST','ホコリ',0],['scratch','SCRATCH','キズ',0]]],
['DEVELOP','現像アニメーション',[['develop','DEVELOP','現像の進み',100]]]];
const ZR=['I','II','III','IV','V','VI','VII','VIII','IX','X'],ZJ=['ほぼ黒','深い影','影の質感','暗い中間','18%グレー','明るい中間','明るい肌','ハイライトの質感','明るい白','ほぼ純白'];
SL.splice(1,0,['ZONE SYSTEM','ゾーンシステム（階調の微調整）',ZR.map((z,i)=>['z'+(i+1),'ZONE '+z,ZJ[i],0,-100,100])]);
const CAM={none:{filter:'none',filterStrength:70,tcHighlight:50,tcWhite:50,detail:25,paperGrade:50,dodgeBurn:25,lightLeak:0},
mmono:{filter:'yellow',filterStrength:20,tcHighlight:44,tcWhite:45,detail:65,paperGrade:48,dodgeBurn:10,lightLeak:0},
rsharp:{filter:'red',filterStrength:20,tcHighlight:52,tcWhite:50,detail:55,paperGrade:55,dodgeBurn:42,lightLeak:0},
dream:{filter:'none',filterStrength:0,tcHighlight:45,tcWhite:44,detail:42,paperGrade:48,dodgeBurn:45,lightLeak:0},
steady:{filter:'yellow',filterStrength:25,tcHighlight:50,tcWhite:50,detail:45,paperGrade:50,dodgeBurn:15,lightLeak:0},
toy:{filter:'none',filterStrength:0,tcHighlight:54,tcWhite:52,detail:3,paperGrade:58,dodgeBurn:80,lightLeak:12}};
const FILM={none:{tcBlack:50,tcShadow:50,tcMidtone:50,grain:20,gs:1,halation:15},trix:{tcBlack:48,tcShadow:42,tcMidtone:54,grain:55,gs:1.8,halation:30},hp5:{tcBlack:53,tcShadow:55,tcMidtone:50,grain:35,gs:1.4,halation:22},delta:{tcBlack:46,tcShadow:48,tcMidtone:50,grain:15,gs:1,halation:10}};
const PAPER={standard:{paperGrade:null},fiber:{paperGrade:58},lith:{paperGrade:88,grain:70,gs:2.2,tone:'sepia',toneStrength:30,dodgeBurn:45}};
const NAMES={cam:['none:Original','mmono:M Mono','rsharp:R Sharp','dream:Dream Lens','steady:Steady Eye','toy:Toy Blur'],film:['none:Original','trix:Tri-X 400','hp5:HP5 Plus','delta:Delta 100'],paper:['standard:Standard','fiber:Fiber Base','lith:Lith Print'],filter:['none:Original','yellow:Yellow','orange:Orange','red:Red','green:Green'],tone:['none:None','sepia:Sepia','selenium:Selenium','cyano:Cyanotype']};
Object.assign(NAMES,{dev:['d76:D-76','rod:Rodinal','hc:HC-110'],leak:['0:Circular','1:Top','2:Bottom','3:Left','4:Right'],brush:['off:Brush Off','dodge:Dodge','burn:Burn','clear:Clear']});
const V={}, S={filter:'none',tone:'none',gs:1,cam:'none',film:'none',paper:'standard',dev:'d76',leak:'0',brush:'off'}, el={}, G={}, WT=['tcBlack','tcShadow','tcMidtone','tcHighlight','tcWhite','paperGrade','dodgeBurn','develop'];
const DV={d76:[1,1,1],rod:[1.8,1.4,1],hc:[1,1.1,1.15]};
// ── UI生成
const gen=$('gen');
const H=document.createElement('canvas');H.id='hist';H.width=300;H.height=56;gen.appendChild(H);
const zb=document.createElement('div');zb.className='zbar';zb.innerHTML=[...Array(10)].map((_,i)=>`<span style="background:rgb(${Math.round((i+.5)*25.5)},${Math.round((i+.5)*25.5)},${Math.round((i+.5)*25.5)});color:${i<5?'#aaa':'#333'}">${['I','II','III','IV','V','VI','VII','VIII','IX','X'][i]}</span>`).join('');gen.appendChild(zb);
const fl=document.createElement('label');fl.className='c';fl.innerHTML='<input type="checkbox" id="free"> FREE MODE 選択中のパッチをもう一度押すと他の軸を戻す';gen.appendChild(fl);
function grid(key,title,jp,on){const g=document.createElement('div');g.className='grp';g.innerHTML=`<div class="st">${title}<i>${jp}</i></div><div class="grid"></div>`;
 NAMES[key].forEach(n=>{const[k,t]=n.split(':'),b=document.createElement('div');b.className='sb';b.textContent=t;b.dataset.k=k;b.onclick=()=>{if($('free')&&$('free').checked&&S[key]===k&&['cam','film','paper'].includes(key))freeSnap(key);on(k);['cam','film','paper'].forEach(mark);mark(key);go()};g.lastChild.appendChild(b)});gen.appendChild(g);el[key]=g}
function mark(key){if(!el[key])return;el[key].querySelectorAll('.sb').forEach(b=>b.classList.toggle('on',b.dataset.k===S[key]))}
const PG=v=>v==50?'中間（2号相当）':v<50?`軟調-${50-v}`:`硬調+${v-50}`;
const FM={paperGrade:PG,pushPull:v=>((v-50)/25>=0?'+':'')+((v-50)/25).toFixed(1)+' EV',shHue:v=>v+'°',hiHue:v=>v+'°'};
function setV(id,v){V[id]=+v;const r=$(id);r.value=v;r.style.setProperty('--p',(v-r.min)/(r.max-r.min)*100+'%');$(id+'V').textContent=(FM[id]||(/^z\d+$/.test(id)?(x=>(x>0?'+':'')+x):(x=>x+'%')))(+v)}
function apply(o){for(const k in o){const v=o[k];if(v===null)continue;if(k==='filter')S.filter=v;else if(k==='tone')S.tone=v;else if(k==='gs')S.gs=v;else setV(k,v)}}
function freeSnap(key){['cam','film','paper'].forEach(x=>{if(x!==key)S[x]=x==='paper'?'standard':'none'});apply(CAM[S.cam]);apply(FILM[S.film]);apply({tone:'none',toneStrength:60});settle()}
function settle(){mark('filter');mark('tone')}
grid('cam','CAMERA','光をとらえる',k=>{S.cam=k;if(k==='none'){S.film='none';S.paper='standard';apply(CAM.none);apply(FILM.none);apply({tone:'none',toneStrength:60});mark('film');mark('paper')}else apply(CAM[k]);settle()});
grid('film','FILM STOCK','フィルムに定着',k=>{S.film=k;apply(FILM[k]);if(S.paper==='lith')apply(PAPER.lith)});
grid('paper','PAPER TYPE','印画紙に焼き付ける',k=>{S.paper=k;if(k==='standard')apply({paperGrade:CAM[S.cam].paperGrade,grain:FILM[S.film].grain,gs:FILM[S.film].gs,dodgeBurn:CAM[S.cam].dodgeBurn,tone:'none',toneStrength:60});else apply(PAPER[k]);settle()});
grid('filter','FILTER','撮影フィルター',k=>{S.filter=k});
grid('tone','TONE','調色',k=>{S.tone=k});
SL.forEach(([t,jp,items])=>{const g=document.createElement('div');g.className='grp';g.innerHTML=`<div class="st">${t}<i>${jp}</i></div>`;
 items.forEach(([id,n,j,d,mn=0,mx=100])=>{const r=document.createElement('div');r.className='row';r.innerHTML=`<div class="lb"><span>${n}<small>${j}</small></span><b id="${id}V"></b></div><input type="range" id="${id}" min="${mn}" max="${mx}" class="${WT.includes(id)?'wt':/Hue$/.test(id)?'hue':''}">`;g.appendChild(r);
  r.querySelector('input').oninput=e=>{setV(id,e.target.value);go()}});gen.appendChild(g);G[t]=g});
const ZG=G['ZONE SYSTEM'];ZG.classList.add('fz','fold');ZG.querySelector('.st').onclick=()=>ZG.classList.toggle('fold');
function sub(key,parent,on){const g=document.createElement('div');g.className='grid';g.style.marginBottom='8px';NAMES[key].forEach(n=>{const[k,t]=n.split(':'),b=document.createElement('div');b.className='sb';b.textContent=t;b.dataset.k=k;b.onclick=()=>{on(k);mark(key);go()};g.appendChild(b)});el[key]=g;parent.insertBefore(g,parent.children[1])}
sub('dev',G['DEVELOPER'],k=>{S.dev=k});sub('leak',G['LIGHT LEAK'],k=>{S.leak=k});
sub('brush',G['BRUSH'],k=>{if(k==='clear'){initMask();S.brush='off'}else S.brush=k;cv.style.touchAction=S.brush==='off'?'':'none'});
const mkBtn=(t,f,p)=>{const b=document.createElement('button');b.className='btn s';b.style.cssText='width:100%;margin-top:8px;flex:none';b.textContent=t;b.onclick=f;p.appendChild(b)};
mkBtn('▶ DEVELOP 現像する',()=>playDev(),G['DEVELOP']);mkBtn('SHUFFLE ホコリ・キズの位置を変える',()=>{seed++;go()},G['FINISH']);
const fs=document.createElement('div');fs.className='row';fs.innerHTML='<div class="lb"><span>FILTER STRENGTH<small>強さ</small></span><b id="filterStrengthV"></b></div><input type="range" id="filterStrength" min="0" max="100">';
el.filter.appendChild(fs);fs.querySelector('input').oninput=e=>{setV('filterStrength',e.target.value);go()};

function resetAll(){Object.assign(S,{cam:'none',film:'none',paper:'standard',dev:'d76',leak:'0',brush:'off'});SL.forEach(g=>g[2].forEach(i=>setV(i[0],i[3])));apply(CAM.none);apply(FILM.none);apply({tone:'none',toneStrength:60});['cam','film','paper','filter','tone','dev','leak','brush'].forEach(mark)}
resetAll();
$('wedge').style.background='linear-gradient(90deg,'+[...Array(11)].map((_,i)=>{const c=Math.round(i/10*255);return`rgb(${c},${c},${c}) ${i*9.09}% ${(i+1)*9.09}%`}).join(',')+')';
document.documentElement.style.setProperty('--steps',$('wedge').style.background);
document.querySelectorAll('.th').forEach(b=>b.onclick=()=>{document.body.className='theme-'+b.dataset.t;document.querySelectorAll('.th').forEach(x=>x.classList.toggle('on',x===b));try{localStorage.setItem('sgpro-theme',b.dataset.t)}catch(e){}});
try{const t=localStorage.getItem('sgpro-theme');if(t)document.querySelector(`.th[data-t=${t}]`).click()}catch(e){}
// ── シェーダー
const VS='attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
const FS=`precision highp float;
uniform sampler2D uI,uL,uM;uniform vec2 uR;uniform vec3 uW,uTC,uSh,uHi;
uniform float uGr,uGn,uGS,uHal,uEdge,uDet,uDB,uTS,uLk,uRaw,uSc,uEx,uSp,uMg,uRb,uDu,uScr,uSd,uDev,uLP,uLX,uLY,uLR;
vec2 P;
float lm(vec2 o){return dot(texture2D(uI,(P+o)/uR).rgb,uW);}
float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
float ring(float r){float s=0.;for(int i=0;i<6;i++){float a=float(i)*1.0472;s+=lm(vec2(cos(a),sin(a))*r);}return s/6.;}
void main(){
 vec2 S=vec2(gl_FragCoord.x,uR.y-gl_FragCoord.y);
 vec2 q=(S/uR-.5)/(1.-2.*uMg)+.5;
 if(q.x<0.||q.x>1.||q.y<0.||q.y>1.){gl_FragColor=vec4(.965,.955,.925,1.);return;}
 if(uRaw>.5){gl_FragColor=vec4(texture2D(uI,q).rgb,1.);return;}
 P=q*uR;
 float g=lm(vec2(0.));
 float b1=ring(1.4*uSc),b2=ring(4.*uSc),b3=(ring(9.*uSc)+ring(18.*uSc))*.5;
 g+=(g-b1)*uDet*1.2+(g-b2)*uEdge*1.1+max(b3-.5,0.)*uHal*1.4;
 g=clamp(g*uEx,0.,1.);
 g=texture2D(uL,vec2(g*.99609+.00195,.5)).r;
 g=clamp(.5+(g-.5)*uGr+(texture2D(uM,q).r-.5)*.9,0.,1.);
 float w=4.*g*(1.-g);
 float n=(h(floor(P/uGS)+6000.)+.7*h(floor(P/(uGS*2.3))+91.))/1.7-.5;
 g+=n*2.*uGn*(.3+.7*w)*.11;
 vec2 ce=uR*.5;float d=length(P-ce)/length(ce);
 g+=d<.35?(.35-d)*uDB*.235:-max(0.,d-.5)*uDB*.353;
 g=clamp(g,0.,1.);
 vec3 col=mix(vec3(g),uTC*g,uTS);
 col=mix(col,col*mix(uSh,uHi,smoothstep(.2,.8,g)),uSp);
 float lw;
 if(uLP<.5){lw=max(0.,1.-length(P-uR*vec2(uLX,uLY))/(length(uR)*uLR));lw=lw*lw*lw;}
 else{float dd=uLP<1.5?P.y:(uLP<2.5?uR.y-P.y:(uLP<3.5?P.x:uR.x-P.x));float sp=(uLP<2.5?uR.y:uR.x)*uLR;lw=max(0.,1.-dd/sp);lw*=lw;}
 col=mix(col,vec3(1.),lw*uLk);
 col=mix(vec3(1.),col,clamp(uDev*1.5-g*.5,0.,1.));
 vec2 cd=floor(P/(7.*uSc));
 if(h(cd+uSd)>1.-uDu*.03){vec2 c0=(cd+vec2(h(cd+1.3+uSd),h(cd+2.7+uSd)))*7.*uSc;float rad=(.8+2.2*h(cd+5.1))*uSc;col=mix(col,vec3(1.),smoothstep(rad,rad*.5,length(P-c0))*.95);}
 float cx=floor(P.x/(60.*uSc));float xs=(cx+h(vec2(cx,uSd)))*60.*uSc;
 float on=step(1.-uScr*.35,h(vec2(cx,9.+uSd)))*step(.5,h(vec2(cx,floor(P.y/(160.*uSc))+uSd)));
 col=mix(col,vec3(1.),on*smoothstep(.8*uSc,.2*uSc,abs(P.x-xs))*.5);
 float e=min(min(q.x,1.-q.x),min(q.y,1.-q.y));
 if(uRb>0.&&e<(.035+.012*h(floor(S/2.)))*uRb)col=vec3(.03);
 gl_FragColor=vec4(col,1.);}`;
const mk=(t,s)=>{const x=gl.createShader(t);gl.shaderSource(x,s);gl.compileShader(x);if(!gl.getShaderParameter(x,gl.COMPILE_STATUS))console.error(gl.getShaderInfoLog(x));return x};
const pg=gl.createProgram();gl.attachShader(pg,mk(gl.VERTEX_SHADER,VS));gl.attachShader(pg,mk(gl.FRAGMENT_SHADER,FS));gl.linkProgram(pg);gl.useProgram(pg);
gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
const aL=gl.getAttribLocation(pg,'a');gl.enableVertexAttribArray(aL);gl.vertexAttribPointer(aL,2,gl.FLOAT,false,0,0);
const U={},loc=n=>U[n]||(U[n]=gl.getUniformLocation(pg,n)),f1=(n,v)=>gl.uniform1f(loc(n),v);
// ── TONAL CURVE LUT（無料版と同じCatmull-Rom 5点）
const cr=(p0,p1,p2,p3,t)=>.5*(2*p1+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t);
function lut(b,s,m,hi,w){const X=[0,64,128,191,255],A=[50,60,70,60,50],Y=[b,s,m,hi,w].map((v,i)=>Math.max(0,Math.min(255,X[i]+(v-50)/50*A[i]))),E=[Y[0],...Y,Y[4]],o=new Uint8Array(256);let k=0;
 for(let x=0;x<256;x++){while(k<3&&x>X[k+1])k++;o[x]=Math.max(0,Math.min(255,cr(E[k],E[k+1],E[k+2],E[k+3],(x-X[k])/(X[k+1]-X[k]))))}return o}
const T0=gl.createTexture(),T1=gl.createTexture();
function tex(u,t){gl.activeTexture(gl.TEXTURE0+u);gl.bindTexture(gl.TEXTURE_2D,t);[gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER].forEach(p=>gl.texParameteri(gl.TEXTURE_2D,p,gl.LINEAR));[gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T].forEach(p=>gl.texParameteri(gl.TEXTURE_2D,p,gl.CLAMP_TO_EDGE))}
let has=false,raw=0,sc=1,long=900;
let seed=0,da=0;
const DV2=()=>DV[S.dev];
function hsl(h){h/=360;const f=n=>{const k=(n+h*12)%12;return .5-.225*Math.max(-1,Math.min(k-3,9-k,1))},c=[f(0),f(8),f(4)],m=(c[0]+c[1]+c[2])/3;return c.map(x=>x/m)}
function zoneLut(L){const z=[...Array(10)].map((_,i)=>V['z'+(i+1)]||0);if(!z.some(Boolean))return L;
 for(let x=0;x<256;x++){const u=Math.max(0,Math.min(9,x/255*10-.5)),i=Math.min(8,Math.floor(u)),f=u-i,t=f*f*(3-2*f),o=z[i]*(1-t)+z[i+1]*t;L[x]=Math.max(0,Math.min(255,Math.round(L[x]+o*.3)))}return L}
function render(){if(!has)return;gl.viewport(0,0,cv.width,cv.height);
 gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,T1);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.LUMINANCE,256,1,0,gl.LUMINANCE,gl.UNSIGNED_BYTE,zoneLut(lut(V.tcBlack,V.tcShadow,V.tcMidtone,V.tcHighlight,V.tcWhite)));
 ['uI','uL','uM'].forEach((n,i)=>gl.uniform1i(loc(n),i));gl.uniform2f(loc('uR'),cv.width,cv.height);
 const fw=FW.none.map((n,i)=>n+(FW[S.filter][i]-n)*V.filterStrength/100),tc=TC[S.tone].map(x=>x/255),dv=DV2(),pp=(V.pushPull-50)/25;
 gl.uniform3f(loc('uW'),...fw);gl.uniform3f(loc('uTC'),...tc);gl.uniform3f(loc('uSh'),...hsl(V.shHue));gl.uniform3f(loc('uHi'),...hsl(V.hiHue));
 f1('uEx',1+pp*.3);f1('uGr',(1+(V.paperGrade-50)/50*1.6)*dv[2]*(1+pp*.12));f1('uGn',V.grain/100*dv[1]*(1+pp*.35));f1('uGS',Math.max(1,S.gs*sc));
 f1('uHal',V.halation/100);f1('uEdge',V.edge/100*dv[0]);f1('uDet',V.detail/100);f1('uDB',V.dodgeBurn/100);f1('uTS',S.tone==='none'?0:V.toneStrength/100);
 f1('uLk',V.lightLeak/100);f1('uLP',+S.leak);f1('uLX',V.leakX/100);f1('uLY',V.leakY/100);f1('uLR',V.leakR/100);
 f1('uSp',V.split/100);f1('uMg',V.margin/100);f1('uRb',V.rebate/100);f1('uDu',V.dust/100);f1('uScr',V.scratch/100);f1('uSd',seed*13.7+1);f1('uDev',V.develop/100);
 f1('uRaw',raw);f1('uSc',sc);gl.drawArrays(gl.TRIANGLES,0,3);hist()}
// ヒストグラム（赤い線＝Zone V）
const sc2=document.createElement('canvas'),sx=sc2.getContext('2d',{willReadFrequently:true});
function hist(){const w=160,h=Math.max(1,Math.round(w*cv.height/cv.width));sc2.width=w;sc2.height=h;sx.drawImage(cv,0,0,w,h);const d=sx.getImageData(0,0,w,h).data,b=new Array(64).fill(0);for(let i=0;i<d.length;i+=4)b[d[i]>>2]++;const m=Math.max(...b)||1,c=H.getContext('2d'),cs=getComputedStyle(document.body);c.clearRect(0,0,300,56);c.globalAlpha=.85;c.fillStyle=cs.getPropertyValue('--a').trim()||'#ddd';b.forEach((n,i)=>{const bh=Math.sqrt(n/m)*52;c.fillRect(i*300/64,56-bh,300/64-.6,bh)});c.globalAlpha=1;c.fillStyle=cs.getPropertyValue('--red').trim()||'#c9332a';c.fillRect(149,0,2,56)}
// 覆い焼き・焼き込みブラシ（マスクを指でなぞって描く）
const mkc=document.createElement('canvas'),mc=mkc.getContext('2d'),T2=gl.createTexture();
function upMask(){tex(2,T2);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,mkc);go()}
function initMask(w,h){if(w){mkc.width=512;mkc.height=Math.max(1,Math.round(512*h/w))}mc.fillStyle='#808080';mc.fillRect(0,0,mkc.width,mkc.height);upMask()}
let pd=0;function paint(e){const r=cv.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*mkc.width,y=(e.clientY-r.top)/r.height*mkc.height,rad=V.brushSize/100*60+8,gr=mc.createRadialGradient(x,y,0,x,y,rad),c=S.brush==='dodge'?'255,255,255':'0,0,0';gr.addColorStop(0,`rgba(${c},${V.brushStr/100*.25})`);gr.addColorStop(1,`rgba(${c},0)`);mc.fillStyle=gr;mc.fillRect(x-rad,y-rad,rad*2,rad*2);upMask()}
cv.addEventListener('pointerdown',e=>{if(!has||(S.brush!=='dodge'&&S.brush!=='burn'))return;pd=1;cv.setPointerCapture(e.pointerId);paint(e)});
cv.addEventListener('pointermove',e=>{if(pd)paint(e)});['pointerup','pointercancel'].forEach(t=>cv.addEventListener(t,()=>{pd=0}));
// 現像アニメーション
function playDev(){cancelAnimationFrame(da);const t0=performance.now();(function f(n){const t=Math.min(1,(n-t0)/6000);setV('develop',Math.round(t*100));go();if(t<1)da=requestAnimationFrame(f)})(t0)}
let q=0;function go(){if(q)return;q=requestAnimationFrame(()=>{q=0;render()})}
// ── 写真読み込み
$('drop').onclick=()=>$('file').click();
$('file').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>{const im=new Image();im.onload=()=>{
 const k=Math.min(1,MAXPX/Math.max(im.width,im.height)),w=Math.round(im.width*k),h=Math.round(im.height*k),c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(im,0,0,w,h);
 cv.width=w;cv.height=h;long=Math.max(w,h);sc=long/900;tex(0,T0);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,c);tex(1,T1);
 initMask(w,h);has=true;$('drop').style.display='none';cv.style.display='block';$('save').disabled=false;render()};im.src=ev.target.result};r.readAsDataURL(f)};
// ── COMPARE／保存／リセット
let ct=0;$('cmp').onchange=e=>{clearInterval(ct);raw=0;$('badge').style.display='none';if(e.target.checked)ct=setInterval(()=>{raw=raw?0:1;$('badge').textContent=raw?'BEFORE':'AFTER';$('badge').style.display='block';render()},1500);else render()};
$('save').onclick=()=>{const k=raw;raw=0;render();const u=cv.toDataURL('image/png');raw=k;
 if(/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)){$('ovi').src=u;$('ov').style.display='flex'}
 else{const a=document.createElement('a');a.href=u;a.download='silver-gelatin-pro.png';a.click()}};
$('ovc').onclick=()=>$('ov').style.display='none';
$('reset').onclick=()=>{cancelAnimationFrame(da);seed=0;resetAll();cv.style.touchAction='';$('cmp').checked=false;clearInterval(ct);raw=0;$('badge').style.display='none';has=false;cv.style.display='none';$('drop').style.display='flex';$('save').disabled=true;$('file').value=''};
if(!gl)$('drop').textContent='このブラウザはWebGLに対応していません（無料版をお使いください）';
