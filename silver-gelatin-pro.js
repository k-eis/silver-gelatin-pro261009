// ── Silver Gelatin PRO（k-eis DESIGN FILTER 006 PRO・WebGL）ステージ1：土台
// 無料版の全工程をGPUでリアルタイム化し、輝度依存の粒子・ハレーション・エッジ効果を追加
const $=id=>document.getElementById(id), cv=$('out'), gl=cv.getContext('webgl',{preserveDrawingBuffer:true,antialias:false});
const MAXPX=2048;
const FW={none:[.299,.587,.114],yellow:[.35,.55,.10],orange:[.50,.40,.10],red:[.70,.20,.10],green:[.20,.70,.10]};
const TC={none:[0,0,0],sepia:[112,66,20],selenium:[60,30,70],cyano:[10,50,110]};
// 値（無料版と同じ設計。halation/edgeがPRO新規）
const SL=[['TONAL CURVE','階調',[['tcBlack','BLACK','黒',50],['tcShadow','SHADOW','影',50],['tcMidtone','MIDTONE','中間',50],['tcHighlight','HIGHLIGHT','明',50],['tcWhite','WHITE','白',50]]],
['FILM','フィルム',[['grain','GRAIN','粒子',20],['halation','HALATION','にじみ',15],['edge','EDGE','輪郭効果',20],['detail','DETAIL','解像感',25]]],
['PRINT','焼き付け',[['paperGrade','PAPER GRADE','印画紙',50],['dodgeBurn','DODGE & BURN','覆い焼き',25],['toneStrength','TONE','調色',60],['lightLeak','LIGHT LEAK','光線引き',0]]]];
const CAM={none:{filter:'none',filterStrength:70,tcHighlight:50,tcWhite:50,detail:25,paperGrade:50,dodgeBurn:25,lightLeak:0},
mmono:{filter:'yellow',filterStrength:20,tcHighlight:44,tcWhite:45,detail:65,paperGrade:48,dodgeBurn:10,lightLeak:0},
rsharp:{filter:'red',filterStrength:20,tcHighlight:52,tcWhite:50,detail:55,paperGrade:55,dodgeBurn:42,lightLeak:0},
dream:{filter:'none',filterStrength:0,tcHighlight:45,tcWhite:44,detail:42,paperGrade:48,dodgeBurn:45,lightLeak:0},
steady:{filter:'yellow',filterStrength:25,tcHighlight:50,tcWhite:50,detail:45,paperGrade:50,dodgeBurn:15,lightLeak:0},
toy:{filter:'none',filterStrength:0,tcHighlight:54,tcWhite:52,detail:3,paperGrade:58,dodgeBurn:80,lightLeak:12}};
const FILM={none:{tcBlack:50,tcShadow:50,tcMidtone:50,grain:20,gs:1,halation:15},trix:{tcBlack:48,tcShadow:42,tcMidtone:54,grain:55,gs:1.8,halation:30},hp5:{tcBlack:53,tcShadow:55,tcMidtone:50,grain:35,gs:1.4,halation:22},delta:{tcBlack:46,tcShadow:48,tcMidtone:50,grain:15,gs:1,halation:10}};
const PAPER={standard:{paperGrade:null},fiber:{paperGrade:58},lith:{paperGrade:88,grain:70,gs:2.2,tone:'sepia',toneStrength:30,dodgeBurn:45}};
const NAMES={cam:['none:Original','mmono:M Mono','rsharp:R Sharp','dream:Dream Lens','steady:Steady Eye','toy:Toy Blur'],film:['none:Original','trix:Tri-X 400','hp5:HP5 Plus','delta:Delta 100'],paper:['standard:Standard','fiber:Fiber Base','lith:Lith Print'],filter:['none:Original','yellow:Yellow','orange:Orange','red:Red','green:Green'],tone:['none:None','sepia:Sepia','selenium:Selenium','cyano:Cyanotype']};
const V={}, S={filter:'none',tone:'none',gs:1,cam:'none',film:'none',paper:'standard'}, el={};
// ── UI生成
const gen=$('gen');
function grid(key,title,jp,on){const g=document.createElement('div');g.className='grp';g.innerHTML=`<div class="st">${title}<i>${jp}</i></div><div class="grid"></div>`;
 NAMES[key].forEach(n=>{const[k,t]=n.split(':'),b=document.createElement('div');b.className='sb';b.textContent=t;b.dataset.k=k;b.onclick=()=>{on(k);mark(key);go()};g.lastChild.appendChild(b)});gen.appendChild(g);el[key]=g}
function mark(key){el[key].querySelectorAll('.sb').forEach(b=>b.classList.toggle('on',b.dataset.k===S[key]))}
const PG=v=>v==50?'中間（2号相当）':v<50?`軟調-${50-v}`:`硬調+${v-50}`;
function setV(id,v){V[id]=+v;const r=$(id);r.value=v;r.style.setProperty('--p',(v-r.min)/(r.max-r.min)*100+'%');$(id+'V').textContent=id==='paperGrade'?PG(+v):v+'%'}
function apply(o){for(const k in o){const v=o[k];if(v===null)continue;if(k==='filter')S.filter=v;else if(k==='tone')S.tone=v;else if(k==='gs')S.gs=v;else setV(k,v)}}
function settle(){mark('filter');mark('tone')}
grid('cam','CAMERA','光をとらえる',k=>{S.cam=k;if(k==='none'){S.film='none';S.paper='standard';apply(CAM.none);apply(FILM.none);apply({tone:'none',toneStrength:60});mark('film');mark('paper')}else apply(CAM[k]);settle()});
grid('film','FILM STOCK','フィルムに定着',k=>{S.film=k;apply(FILM[k]);if(S.paper==='lith')apply(PAPER.lith)});
grid('paper','PAPER TYPE','印画紙に焼き付ける',k=>{S.paper=k;if(k==='standard')apply({paperGrade:CAM[S.cam].paperGrade,grain:FILM[S.film].grain,gs:FILM[S.film].gs,dodgeBurn:CAM[S.cam].dodgeBurn,tone:'none',toneStrength:60});else apply(PAPER[k]);settle()});
grid('filter','FILTER','撮影フィルター',k=>{S.filter=k});
grid('tone','TONE','調色',k=>{S.tone=k});
SL.forEach(([t,jp,items])=>{const g=document.createElement('div');g.className='grp';g.innerHTML=`<div class="st">${t}<i>${jp}</i></div>`;
 items.forEach(([id,n,j])=>{const r=document.createElement('div');r.className='row';r.innerHTML=`<div class="lb"><span>${n}<small>${j}</small></span><b id="${id}V"></b></div><input type="range" id="${id}" min="0" max="100">`;g.appendChild(r);
  r.querySelector('input').oninput=e=>{setV(id,e.target.value);go()}});gen.appendChild(g)});
const fs=document.createElement('div');fs.className='row';fs.innerHTML='<div class="lb"><span>FILTER STRENGTH<small>強さ</small></span><b id="filterStrengthV"></b></div><input type="range" id="filterStrength" min="0" max="100">';
el.filter.appendChild(fs);fs.querySelector('input').oninput=e=>{setV('filterStrength',e.target.value);go()};

function resetAll(){Object.assign(S,{cam:'none',film:'none',paper:'standard'});apply(CAM.none);apply(FILM.none);apply({tone:'none',toneStrength:60});['cam','film','paper','filter','tone'].forEach(mark)}
resetAll();
$('wedge').style.background='linear-gradient(90deg,'+[...Array(11)].map((_,i)=>{const c=Math.round(i/10*255);return`rgb(${c},${c},${c}) ${i*9.09}% ${(i+1)*9.09}%`}).join(',')+')';
document.querySelectorAll('.th').forEach(b=>b.onclick=()=>{document.body.className='theme-'+b.dataset.t;document.querySelectorAll('.th').forEach(x=>x.classList.toggle('on',x===b));try{localStorage.setItem('sgpro-theme',b.dataset.t)}catch(e){}});
try{const t=localStorage.getItem('sgpro-theme');if(t)document.querySelector(`.th[data-t=${t}]`).click()}catch(e){}
// ── シェーダー
const VS='attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
const FS=`precision highp float;
uniform sampler2D uI,uL;uniform vec2 uR;uniform vec3 uW,uTC;
uniform float uGr,uGn,uGS,uHal,uEdge,uDet,uDB,uTS,uLk,uRaw,uSc;
vec2 P;
float lm(vec2 o){return dot(texture2D(uI,(P+o)/uR).rgb,uW);}
float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
float ring(float r){float s=0.;for(int i=0;i<6;i++){float a=float(i)*1.0472;s+=lm(vec2(cos(a),sin(a))*r);}return s/6.;}
void main(){
 P=vec2(gl_FragCoord.x,uR.y-gl_FragCoord.y);
 if(uRaw>.5){gl_FragColor=vec4(texture2D(uI,P/uR).rgb,1.);return;}
 float g=lm(vec2(0.));
 float b1=ring(1.4*uSc),b2=ring(4.*uSc),b3=(ring(9.*uSc)+ring(18.*uSc))*.5;
 g+=(g-b1)*uDet*1.2+(g-b2)*uEdge*1.1+max(b3-.5,0.)*uHal*1.4;
 g=clamp(g,0.,1.);
 g=texture2D(uL,vec2(g*.99609+.00195,.5)).r;
 g=clamp(.5+(g-.5)*uGr,0.,1.);
 float w=4.*g*(1.-g);
 float n=(h(floor(P/uGS)+6000.)+.7*h(floor(P/(uGS*2.3))+91.))/1.7-.5;
 g+=n*2.*uGn*(.3+.7*w)*.11;
 vec2 ce=uR*.5;float d=length(P-ce)/length(ce);
 g+=d<.35?(.35-d)*uDB*.235:-max(0.,d-.5)*uDB*.353;
 g=clamp(g,0.,1.);
 vec3 col=mix(vec3(g),uTC*g,uTS);
 float lw=max(0.,1.-length(P-uR*vec2(.8,.2))/(length(uR)*.5));
 col=mix(col,vec3(1.),lw*lw*lw*uLk);
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
function render(){if(!has)return;gl.viewport(0,0,cv.width,cv.height);
 gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,T1);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.LUMINANCE,256,1,0,gl.LUMINANCE,gl.UNSIGNED_BYTE,lut(V.tcBlack,V.tcShadow,V.tcMidtone,V.tcHighlight,V.tcWhite));
 gl.uniform1i(loc('uI'),0);gl.uniform1i(loc('uL'),1);gl.uniform2f(loc('uR'),cv.width,cv.height);
 const fw=FW.none.map((n,i)=>n+(FW[S.filter][i]-n)*V.filterStrength/100),tc=TC[S.tone].map(x=>x/255);
 gl.uniform3f(loc('uW'),...fw);gl.uniform3f(loc('uTC'),...tc);
 f1('uGr',1+(V.paperGrade-50)/50*1.6);f1('uGn',V.grain/100);f1('uGS',Math.max(1,S.gs*sc));f1('uHal',V.halation/100);f1('uEdge',V.edge/100);f1('uDet',V.detail/100);
 f1('uDB',V.dodgeBurn/100);f1('uTS',S.tone==='none'?0:V.toneStrength/100);f1('uLk',V.lightLeak/100);f1('uRaw',raw);f1('uSc',sc);
 gl.drawArrays(gl.TRIANGLES,0,3)}
let q=0;function go(){if(q)return;q=requestAnimationFrame(()=>{q=0;render()})}
// ── 写真読み込み
$('drop').onclick=()=>$('file').click();
$('file').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>{const im=new Image();im.onload=()=>{
 const k=Math.min(1,MAXPX/Math.max(im.width,im.height)),w=Math.round(im.width*k),h=Math.round(im.height*k),c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(im,0,0,w,h);
 cv.width=w;cv.height=h;long=Math.max(w,h);sc=long/900;tex(0,T0);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,c);tex(1,T1);
 has=true;$('drop').style.display='none';cv.style.display='block';$('save').disabled=false;render()};im.src=ev.target.result};r.readAsDataURL(f)};
// ── COMPARE／保存／リセット
let ct=0;$('cmp').onchange=e=>{clearInterval(ct);raw=0;$('badge').style.display='none';if(e.target.checked)ct=setInterval(()=>{raw=raw?0:1;$('badge').textContent=raw?'BEFORE':'AFTER';$('badge').style.display='block';render()},1500);else render()};
$('save').onclick=()=>{const k=raw;raw=0;render();const u=cv.toDataURL('image/png');raw=k;
 if(/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)){$('ovi').src=u;$('ov').style.display='flex'}
 else{const a=document.createElement('a');a.href=u;a.download='silver-gelatin-pro.png';a.click()}};
$('ovc').onclick=()=>$('ov').style.display='none';
$('reset').onclick=()=>{resetAll();$('cmp').checked=false;clearInterval(ct);raw=0;$('badge').style.display='none';has=false;cv.style.display='none';$('drop').style.display='flex';$('save').disabled=true;$('file').value=''};
if(!gl)$('drop').textContent='このブラウザはWebGLに対応していません（無料版をお使いください）';
