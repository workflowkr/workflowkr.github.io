/* Local WebGL explorer: original illustrative geometry, no external runtime. */
(()=>{'use strict';
const dialog=document.getElementById('worldDialog'),scene=document.getElementById('worldScene');
if(!dialog||!scene)return;
const canvas=document.createElement('canvas');canvas.id='world3dCanvas';canvas.setAttribute('aria-label','드래그로 회전하고 이동할 수 있는 3D 공간');canvas.tabIndex=0;scene.insertBefore(canvas,scene.firstChild);
const gl=canvas.getContext('webgl',{antialias:true,alpha:false});if(!gl){canvas.remove();return;}
scene.classList.add('has-3d');
const doorLabels = document.documentElement.classList.contains('app-mode') ? document.createElement('div') : null;
if (doorLabels) {
  doorLabels.className = 'app-world-doors';
  scene.append(doorLabels);
}
const doorDestinations = [
  {world: 'cell', label: '실험의 공간', color: '82e4cf'},
  {world: 'reality', label: '실행의 아지트', color: '9fbdff'},
  {world: 'cosmos', label: '순환의 허브', color: 'dcacff'},
];
const doorZ = 3;
const doorHalfWidth = .58;
const doorHeight = 2.75;
let doors = [];
let portalWalk = null;
const controls=document.createElement('div');controls.className='world-3d-controls';controls.innerHTML='<button data-camera="in" aria-label="확대">＋</button><button data-camera="out" aria-label="축소">−</button><button data-camera="reset">시점 초기화</button><button data-camera="auto" aria-pressed="false">자동 회전</button><button data-camera="follow" aria-pressed="true">전체 보기</button><button data-camera="labels" aria-pressed="true">지점 표시</button>';scene.append(controls);
const pad=document.createElement('div');pad.className='world-move-pad';pad.setAttribute('aria-label','캐릭터 이동');pad.innerHTML='<button data-move="forward" aria-label="앞으로 이동">↑</button><button data-move="left" aria-label="왼쪽으로 이동">←</button><button data-move="back" aria-label="뒤로 이동">↓</button><button data-move="right" aria-label="오른쪽으로 이동">→</button>';scene.append(pad);const flightPad=document.createElement('div');flightPad.className='world-flight-pad';flightPad.innerHTML='<button data-move="up" aria-label="올라가기">↑ Z</button><button data-move="down" aria-label="내려가기">↓ Z</button>';scene.append(flightPad);const positionHud=document.createElement('div');positionHud.className='world-position-hud';scene.append(positionHud);
const hint=scene.querySelector('.world-instruction');hint.textContent='드래그 회전 · 휠/핀치 확대 · WASD/화살표 이동';
const VS='attribute vec3 a_p;attribute vec3 a_n;uniform mat4 u_m;uniform mat4 u_vp;uniform float u_point;varying vec3 v_n;varying vec3 v_p;void main(){vec4 p=u_m*vec4(a_p,1.0);v_p=p.xyz;v_n=normalize(mat3(u_m)*a_n);gl_Position=u_vp*p;gl_PointSize=u_point;}';
const FS='precision mediump float;uniform float u_daylight;uniform float u_pointMode;uniform vec3 u_color;uniform vec3 u_eye;uniform vec3 u_fog;uniform float u_emission;uniform float u_alpha;varying vec3 v_n;varying vec3 v_p;void main(){if(u_pointMode>.5&&length(gl_PointCoord-.5)>.5)discard;vec3 N=normalize(v_n);float light=(0.32+u_daylight*.25)+max(dot(N,normalize(vec3(-0.5,0.9,0.5))),0.0)*(0.35+u_daylight*.35);float rim=pow(1.0-max(dot(N,normalize(u_eye-v_p)),0.0),3.0)*0.14;vec3 color=u_color*(mix(light,1.0,u_emission)+rim);float fog=1.0-exp(-length(u_eye-v_p)*0.012);gl_FragColor=vec4(mix(color,u_fog,fog),u_alpha);}';
function shader(type,text){const s=gl.createShader(type);gl.shaderSource(s,text);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,VS));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,FS));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('WebGL program failed');gl.useProgram(program);
const loc={};for(const name of ['a_p','a_n'])loc[name]=gl.getAttribLocation(program,name);for(const name of ['u_m','u_vp','u_color','u_eye','u_fog','u_emission','u_alpha','u_point','u_daylight','u_pointMode'])loc[name]=gl.getUniformLocation(program,name);
function I(){return [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];}
function mul(a,b){const out=Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];return out;}
function sub(a,b){return a.map((v,i)=>v-b[i]);}function dot(a,b){return a.reduce((s,v,i)=>s+v*b[i],0);}function cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}function norm(v){const l=Math.hypot(...v)||1;return v.map(x=>x/l);}
function model(p=[0,0,0],s=[1,1,1],r=[0,0,0]){let a=I();a[12]=p[0];a[13]=p[1];a[14]=p[2];const [x,y,z]=r;const rx=[1,0,0,0,0,Math.cos(x),Math.sin(x),0,0,-Math.sin(x),Math.cos(x),0,0,0,0,1],ry=[Math.cos(y),0,-Math.sin(y),0,0,1,0,0,Math.sin(y),0,Math.cos(y),0,0,0,0,1],rz=[Math.cos(z),Math.sin(z),0,0,-Math.sin(z),Math.cos(z),0,0,0,0,1,0,0,0,0,1];a=mul(mul(mul(a,ry),rx),rz);return mul(a,[s[0],0,0,0,0,s[1],0,0,0,0,s[2],0,0,0,0,1]);}
function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2);return [f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0];}
function look(eye,target){const z=norm(sub(eye,target)),x=norm(cross([0,1,0],z)),y=cross(z,x);return [x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1];}
function color(hex){return hex.match(/[\da-f]{2}/gi).map(x=>parseInt(x,16)/255);}
function geometry(positions,normals,indices,lines=false){const p=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,p);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(positions),gl.STATIC_DRAW);const n=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,n);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(normals),gl.STATIC_DRAW);const i=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,i);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);return {p,n,i,count:indices.length,mode:lines?gl.LINES:gl.TRIANGLES};}
function sphere(wire=false){const p=[],n=[],idx=[],w=24,h=16;for(let y=0;y<=h;y++)for(let x=0;x<=w;x++){const t=y/h*Math.PI,a=x/w*Math.PI*2,v=[Math.sin(t)*Math.cos(a),Math.cos(t),Math.sin(t)*Math.sin(a)];p.push(...v);n.push(...v);}for(let y=0;y<h;y++)for(let x=0;x<w;x++){const a=y*(w+1)+x,b=a+w+1;if(wire){if(y%2===0)idx.push(a,a+1);if(x%3===0)idx.push(a,b);}else idx.push(a,b,a+1,b,b+1,a+1);}return geometry(p,n,idx,wire);}
function box(){const p=[],n=[],idx=[];const faces=[[[1,0,0],[1,-1,-1],[1,1,-1],[1,1,1],[1,-1,1]],[[-1,0,0],[-1,-1,1],[-1,1,1],[-1,1,-1],[-1,-1,-1]],[[0,1,0],[-1,1,-1],[-1,1,1],[1,1,1],[1,1,-1]],[[0,-1,0],[-1,-1,1],[-1,-1,-1],[1,-1,-1],[1,-1,1]],[[0,0,1],[1,-1,1],[1,1,1],[-1,1,1],[-1,-1,1]],[[0,0,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1],[1,-1,-1]]];for(const f of faces){const b=p.length/3;for(let j=1;j<=4;j++){p.push(...f[j]);n.push(...f[0]);}idx.push(b,b+1,b+2,b,b+2,b+3);}return geometry(p,n,idx);}
function torus(){const p=[],n=[],idx=[],u=64,v=8;for(let j=0;j<=v;j++)for(let i=0;i<=u;i++){const a=i/u*Math.PI*2,b=j/v*Math.PI*2;p.push((1+.025*Math.cos(b))*Math.cos(a),.025*Math.sin(b),(1+.025*Math.cos(b))*Math.sin(a));n.push(Math.cos(b)*Math.cos(a),Math.sin(b),Math.cos(b)*Math.sin(a));}for(let j=0;j<v;j++)for(let i=0;i<u;i++){const a=j*(u+1)+i,b=a+u+1;idx.push(a,b,a+1,b,b+1,a+1);}return geometry(p,n,idx);}
function cone(){const p=[],n=[],idx=[];for(let i=0;i<4;i++){const a=i*Math.PI/2,b=(i+1)*Math.PI/2,points=[[Math.cos(a),-1,Math.sin(a)],[0,1,0],[Math.cos(b),-1,Math.sin(b)]];const normal=norm(cross(sub(points[1],points[0]),sub(points[2],points[0]))),base=p.length/3;for(const point of points){p.push(...point);n.push(...normal);}idx.push(base,base+1,base+2);}return geometry(p,n,idx);}
const meshes={sphere:sphere(),wire:sphere(true),box:box(),ring:torus(),cone:cone()};let objects=[],key='cell',yaw=.55,pitch=.4,distance=20,auto=false,follow=false,firstPerson=true,fov=Math.PI/3,labels=true,eye=[0,0,20],target=[0,1,0],avatar=[0,0,5],keys=new Set(),vp=I(),last=0,animTime=0;
function obj(type,p,s,c,r=[0,0,0],emission=0,alpha=1){const o={type,p,s,c:color(c),r,emission,alpha};objects.push(o);return o;}
function beam(a,b,c,width=.05){const mid=a.map((x,i)=>(x+b[i])/2),d=sub(b,a),length=Math.hypot(...d),y=norm(d),x=norm(cross(Math.abs(y[1])>.95?[1,0,0]:[0,1,0],y)),z=cross(x,y);const m=[x[0]*width,x[1]*width,x[2]*width,0,y[0]*length/2,y[1]*length/2,y[2]*length/2,0,z[0]*width,z[1]*width,z[2]*width,0,...mid,1];const o=obj('box',mid,[1,1,1],c);o.matrix=m;return o;}
let seed=1234;function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
const anchors={cell:[[-3,2,-1],[2,2,0],[4.3,2,-3]],reality:[[-1,1.8,0],[4,1,2],[-4,2,-4]],cosmos:[[0,2,-8],[-10,4,-15],[-7,10,-48]]};
function reset(){yaw=key==='reality'?.05:key==='cosmos'?0:.5;pitch=.32;distance=key==='cosmos'?27:key==='cell'?20:23;avatar=[0,0,key==='reality'?9:key==='cosmos'?10:6];if(doorLabels){yaw=0;avatar=[0,0,11.4];portalWalk=null;}target=[0,1,0];follow=false;firstPerson=true;pitch=.06;fov=Math.PI/3;auto=false;controls.querySelector('[data-camera=follow]').setAttribute('aria-pressed','true');controls.querySelector('[data-camera=follow]').textContent='전체 보기';controls.querySelector('[data-camera=auto]').setAttribute('aria-pressed','false');}
function build(world){key=world;flightPad.hidden=key!=='cosmos';objects=[];seed=1234;reset();if(key==='cell'){
obj('box',[0,-.3,0],[120,.3,120],'102f38');
obj('sphere',[-3,1.8,-1],[2.1,1.8,2.1],'695ca2',[0,0,0],.1,.16);obj('wire',[-3,1.8,-1],[2.2,1.9,2.2],'b3a5e9',[0,0,0],.4,.5);
// DNA double helix and nucleotide bridges, enlarged schematic.
let prevA,prevB;for(let i=0;i<24;i++){const a=i*.6,y=.35+i*.14,pa=[-3+.62*Math.cos(a),y,-1+.62*Math.sin(a)],pb=[-3+.62*Math.cos(a+Math.PI),y,-1+.62*Math.sin(a+Math.PI)];obj('sphere',pa,[.12,.12,.12],'8adbd4');obj('sphere',pb,[.12,.12,.12],'b9a2ef');beam(pa,pb,i%2?'e6b783':'98b8ed',.035);if(prevA){beam(prevA,pa,'72c8c1',.06);beam(prevB,pb,'a38bd8',.06);}prevA=pa;prevB=pb;}
// RNA and protein: deliberately illustrative, not a PDB model.
let prev;for(let i=0;i<30;i++){const a=i*.55,p=[1.2+Math.cos(a)*.65,.65+i*.07,Math.sin(a)*.65];obj('sphere',p,[.11,.11,.11],'f1bb75');if(prev)beam(prev,p,'e3a76b',.06);prev=p;}
prev=null;for(let i=0;i<55;i++){const a=i*.52,p=[4.3+Math.sin(a)*.55+Math.sin(i*.15)*.5,1.5+Math.cos(a)*.55,-3+(i-27)*.075];obj('sphere',p,[.15,.15,.15],i<18?'7eb3e8':i<37?'8ad7c3':'e6b77e');if(prev)beam(prev,p,'b4cee7',.07);prev=p;}
for(let j=0;j<9;j++){const a=j*2.4,p=[Math.cos(a)*6.6,.7,Math.sin(a)*6];obj('sphere',p,[.9,.45,.4],'528c72',[0,a,0]);for(let k=0;k<4;k++)obj('sphere',[p[0]+(k-1.5)*.28,p[1]+.2,p[2]],[.1,.15,.23],'9dc990');}
for(let i=0;i<65;i++)obj('sphere',[(random()-.5)*17,.2+random()*4,(random()-.5)*15],[.04,.04,.04],'a5e4df',[0,0,0],.6);
for(let j=0;j<5;j++)obj('ring',[1,.7+j*.16,-4],[1.9,1,.8],'5c9ba9',[.2,0,.1]);
}else if(key==='reality'){
obj('box',[0,-.25,0],[120,.25,120],'25394a');
for(let x=-18;x<=18;x+=6){obj('box',[x,.15,-9],[2.5,.15,.6],'51687a');obj('sphere',[x,2.9,-10],[1.2,1.7,1.2],'496e64');beam([x,0,-10],[x,2.7,-10],'746955',.12);}
for(let i=0;i<16;i++){const x=(i%8-3.5)*2.8;obj('box',[x,1.5,-12-Math.floor(i/8)*4],[.9,2+random()*3,.8],'28435b');}
function desk(x,z){obj('box',[x,1.3,z],[1.8,.12,.9],'a28667');for(const dx of [-1.5,1.5])for(const dz of [-.65,.65])obj('box',[x+dx,.6,z+dz],[.06,.6,.06],'435061');obj('box',[x,2.1,z-.2],[.75,.5,.055],'152c43');obj('box',[x,2.1,z-.13],[.67,.41,.02],'417aa1',[0,0,0],.6);for(let j=0;j<4;j++)obj('box',[x-.2,2.35-j*.14,z-.1],[.3-(j%2)*.12,.015,.01],'a4d7cc',[0,0,0],.7);obj('box',[x,1.46,z+.35],[.5,.025,.23],'485c6e');obj('box',[x, .7,z+1.8],[.65,.1,.65],'36546e');obj('box',[x,1.4,z+2.35],[.65,.65,.08],'36546e');}
desk(-2,0);desk(3,-3);obj('box',[4,1.1,3],[1.5,.1,1.3],'987c61');obj('sphere',[4,1.4,3],[.23,.3,.23],'e9d6b7');
obj('box',[-5,2,-5],[1.6,1,.08],'839eaa');for(let j=0;j<5;j++)obj('box',[-5.9+j*.43,2.3-(j%2)*.5,-4.88],[.15,.18,.03],j%2?'e8c28d':'a3cfc6');
for(const p of [[-7,0,4],[7,0,-5]]){obj('box',[p[0],.4,p[2]],[.45,.4,.45],'b1a18c');for(let j=0;j<5;j++){const a=j*1.26;obj('sphere',[p[0]+Math.cos(a)*.35,1.25,p[2]+Math.sin(a)*.35],[.2,.8,.18],'4b8a6e',[0,a,.3]);}}
for(let x=-8;x<=8;x+=2)beam([x,.02,-7],[x,.02,7],'3d5366',.012);for(let z=-6;z<=6;z+=2)beam([-8,.02,z],[8,.02,z],'3d5366',.012);
}else{
obj('sphere',[0,2,-8],[3.3,3.3,3.3],'638dc3');obj('wire',[0,2,-8],[3.34,3.34,3.34],'c0d8e0',[.2,.3,.4],.1,.13);
obj('sphere',[-10,4,-15],[2.1,2.1,2.1],'bda376');for(const r of [3,3.2,3.5,3.8])obj('ring',[-10,4,-15],[r,1,r],'c5b493',[.25,0,.3],.1,.75);
obj('sphere',[12,6,-20],[2.5,2.5,2.5],'629f9b');obj('sphere',[5,9,-30],[1.2,1.2,1.2],'c58e78');obj('sphere',[-19,-3,-28],[1.7,1.7,1.7],'8e89bb');obj('sphere',[22,-1,-42],[3,3,3],'a2b4d4');obj('sphere',[0,-4,-4],[.45,.45,.45],'a7a7a1');obj('sphere',[-15,13,-40],[1.1,1.1,1.1],'f1d397',[0,0,0],1);
function cloud(name,points,c,size){if(meshes[name]){gl.deleteBuffer(meshes[name].p);gl.deleteBuffer(meshes[name].n);gl.deleteBuffer(meshes[name].i);}const normals=[],indices=[];for(let i=0;i<points.length/3;i++){normals.push(0,1,0);indices.push(i);}const g=geometry(points,normals,indices);g.mode=gl.POINTS;meshes[name]=g;const o=obj(name,[0,0,0],[1,1,1],c,[0,0,0],1);o.pointSize=size;}
for(let group=0;group<3;group++){const pts=[];for(let i=0;i<600;i++){const a=random()*Math.PI*2,z=random()*2-1,r=65+random()*45,t=Math.sqrt(1-z*z);pts.push(Math.cos(a)*r*t,z*r,Math.sin(a)*r*t);}cloud('stars'+group,pts,['a9c6ef','e1d7c8','a6aecf'][group],group===0?2.5:1.6);}
for(let arm=0;arm<3;arm++){const pts=[];for(let i=0;i<600;i++){const r=2+random()*30,a=r*.16+arm*Math.PI*2/3+(random()-.5)*.45,x=r*Math.cos(a),z=r*Math.sin(a),y=(random()-.5)*1.5;pts.push(x-7,y*.55+z*.83+10,z*.55-y*.83-48);}cloud('galaxy'+arm,pts,['c5b8e5','a5b8e4','d8c4dd'][arm],2.2);}

}

// Extra cell structures (illustrative animal cell) and visual analysis stations.
if(key==='cell'){
// Rough ER: stacked curved membrane strands with ribosome beads.
for(let row=0;row<5;row++){let prev;for(let k=0;k<16;k++){const a=k*.2,p=[-5+Math.cos(a)*1.5,.6+row*.2,-3.8+Math.sin(a)*1.1];if(prev)beam(prev,p,'6a99b0',.07);if(k%3===0)obj('sphere',[p[0],p[1]+.12,p[2]],[.09,.09,.09],'cfbbd8');prev=p;}}
// Ribosome subunits and a short chain.
obj('sphere',[2.4,.7,1.8],[.55,.3,.42],'a790bd');obj('sphere',[2.4,1.15,1.8],[.48,.35,.35],'d1bed9');for(let i=0;i<8;i++)obj('sphere',[2.8+i*.11,.9+Math.sin(i*.5)*.15,1.8],[.09,.09,.09],'dbb47e');
// Lysosomes and vesicles.
for(let i=0;i<7;i++){const p=[-5+Math.cos(i)*1.1,.5+random()*.8,3+Math.sin(i)*1.1];obj('sphere',p,[.23,.23,.23],i%2?'b888b3':'c7a37c');obj('wire',p,[.26,.26,.26],'e1cad9',[0,0,0],.2,.5);}
// Membrane lipids, receptors and cytoskeleton.
for(let i=0;i<70;i++){const a=i*Math.PI*2/70,x=Math.cos(a)*9,z=Math.sin(a)*8;obj('sphere',[x,.2,z],[.12,.12,.12],'82bebc');obj('sphere',[x,.6,z],[.12,.12,.12],'aacfc0');beam([x,.23,z],[x,.56,z],'527e82',.025);if(i%8===0){obj('sphere',[x,1,z],[.17,.32,.15],'aac2e6');beam([x,.6,z],[x,1.4,z],'92afd8',.035);}}
for(let i=0;i<10;i++){const a=i*.63;beam([Math.cos(a)*7,.15,Math.sin(a)*6],[Math.cos(a+2.3)*6,.2,Math.sin(a+2.3)*6],'456d7d',.025);}
// Conceptual analysis terminals: colored datacards, not physical organelles.
const stations=[[-6,1,-1],[-5,1,5],[0,1,6],[5,1,5.5],[-6,1,-5],[6,1,-1],[6.4,1,2.5],[-7,1,2.5],[0,1,-6.5]];
stations.forEach((p,j)=>{obj('ring',[p[0],.04,p[2]],[.48,1,.48],'71b9c1',[0,0,0],.7);obj('box',[p[0],.7,p[2]],[.32,.45,.035],'254c63',[0,j*.3,0]);for(let k=0;k<3;k++)obj('sphere',[p[0]-.14+k*.14,1.15+(k%2)*.13,p[2]],[.055,.055,.055],j%2?'a1d4c4':'acc8ef',[0,0,0],.7);});
}
// Populate the workshop with books, a server rack, labware and a whiteboard.
if(key==='reality'){
for(let shelf=0;shelf<3;shelf++){obj('box',[-7,1+shelf*.85,-3],[.6,.05,2.3],'806f5e');for(let i=0;i<8;i++)obj('box',[-7,1.35+shelf*.85,-5+i*.53],[.35,.3,.14],['718dad','8cb5aa','c2a778'][i%3]);}
obj('box',[6,1.4,-6],[.65,1.4,.65],'1a2a3e');for(let i=0;i<6;i++){obj('box',[6,.4+i*.38,-5.31],[.5,.12,.025],'38526c');obj('sphere',[6.35,.4+i*.38,-5.25],[.04,.04,.04],'7ce4b3',[0,0,0],1);}
for(let i=0;i<5;i++){obj('sphere',[4.7+i*.2,1.45,2.6],[.07,.2,.07],i%2?'85bfb9':'c7a5cb');}for(let i=0;i<4;i++)obj('box',[-5.7+i*.4,2.8,-4.85],[.16,.17,.02],i%2?'dfba8a':'96c3d0');
}

if(key!=='cosmos')for(let k=-60;k<=60;k+=5){beam([k,.01,-60],[k,.01,60],key==='cell'?'1d424b':key==='reality'?'334c5e':'14263f',.008);beam([-60,.01,k],[60,.01,k],key==='cell'?'1d424b':key==='reality'?'334c5e':'14263f',.008);}
const lightColors=key==='cell'?['75d9c5','d1b5ef']:['a9c6ff','8de0ca'];for(let i=0;key!=='cosmos'&&i<anchors[key].length;i++){const p=anchors[key][i];obj('ring',[p[0],.12,p[2]],[.55,1,.55],lightColors[i%2],[0,0,0],1);}
buildAppDoors();
setTimeout(updateHotspots,0);
}
function buildAppDoors() {
  if (!doorLabels) return;
  doorLabels.replaceChildren();
  doors = doorDestinations.filter(destination => destination.world !== key).map((destination, index) => {
    const x = index === 0 ? -1.4 : 1.4;
    for (const side of [-1, 1]) {
      obj('box', [x + side * (doorHalfWidth + .08), doorHeight / 2, doorZ],
        [.08, doorHeight / 2, .14], destination.color, [0, 0, 0], .65);
    }
    obj('box', [x, doorHeight, doorZ], [doorHalfWidth + .16, .09, .14],
      destination.color, [0, 0, 0], .65);
    obj('box', [x, .035, doorZ], [doorHalfWidth + .16, .035, .19],
      destination.color, [0, 0, 0], .7);
    obj('box', [x, doorHeight / 2, doorZ], [doorHalfWidth, doorHeight / 2 - .1, .025],
      destination.color, [0, 0, 0], .6, .17);
    const label = document.createElement('button');
    label.type = 'button';
    label.dataset.destination = destination.world;
    label.textContent = destination.label;
    label.style.setProperty('--door-color', '#' + destination.color);
    label.hidden = true;
    label.addEventListener('click', () => {
      keys.clear();
      portalWalk = {x, exitZ: avatar[2] >= doorZ ? doorZ - .35 : doorZ + .35};
      yaw = portalWalk.exitZ < doorZ ? 0 : Math.PI;
      pitch = .06;
      canvas.focus();
    });
    doorLabels.append(label);
    return {destination: destination.world, x, label};
  });
}

function showAppDoorLabels() {
  for (const door of doors) {
    const point = project([door.x, doorHeight + .15, doorZ]);
    door.label.hidden = !point.visible || point.x < 20 || point.x > canvas.clientWidth - 20 ||
      point.y < 50 || point.y > canvas.clientHeight - 45;
    if (!door.label.hidden) {
      door.label.style.left = point.x + 'px';
      door.label.style.top = point.y + 'px';
    }
  }
}

function walkThroughDoor(deltaTime) {
  const step = deltaTime * (key === 'cosmos' ? 6 : 3);
  const shift = (position, target) => Math.abs(target - position) <= step
    ? target : position + Math.sign(target - position) * step;
  avatar[0] = shift(avatar[0], portalWalk.x);
  avatar[1] = shift(avatar[1], 0);
  if (avatar[0] === portalWalk.x && avatar[1] === 0) {
    avatar[2] = shift(avatar[2], portalWalk.exitZ);
  }
}

function enterCrossedDoor(origin) {
  const displacement = avatar[2] - origin[2];
  if (!displacement) return false;
  const time = (doorZ - origin[2]) / displacement;
  if (time < 0 || time > 1) return false;
  const doorX = origin[0] + time * (avatar[0] - origin[0]);
  const footHeight = origin[1] + time * (avatar[1] - origin[1]);
  const crossed = doors.find(door => Math.abs(doorX - door.x) <= doorHalfWidth);
  if (!crossed || footHeight < -.25 || footHeight > doorHeight - 1.55) return false;
  portalWalk = null;
  keys.clear();
  scene.dispatchEvent(new CustomEvent('workflow-world-door', {detail: crossed.destination}));
  return true;
}
function draw(type,m,c,emission=0,alpha=1,pointSize=2){const g=meshes[type];gl.uniform1f(loc.u_point,pointSize);gl.uniform1f(loc.u_pointMode,g.mode===gl.POINTS?1:0);gl.bindBuffer(gl.ARRAY_BUFFER,g.p);gl.vertexAttribPointer(loc.a_p,3,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(loc.a_p);gl.bindBuffer(gl.ARRAY_BUFFER,g.n);gl.vertexAttribPointer(loc.a_n,3,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(loc.a_n);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,g.i);gl.uniformMatrix4fv(loc.u_m,false,m);gl.uniform3fv(loc.u_color,c);gl.uniform1f(loc.u_emission,emission);gl.uniform1f(loc.u_alpha,alpha);gl.depthMask(alpha===1);gl.drawElements(g.mode,g.count,gl.UNSIGNED_SHORT,0);}
function avatarDraw(t,moving,position=avatar){const x=position[0],z=position[2],bounce=moving?Math.sin(t*9)*.05:0,base=key==='cosmos'?.1:0;const c=key==='cell'?'7ac9b7':key==='reality'?'6c9de1':'d7e4f2';function part(type,p,s,col,r=[0,0,0]){draw(type,model([x+p[0],base+p[1]+bounce,z+p[2]],s,r),color(col));}part('sphere',[0,1.35,0],[.28,.3,.28],c);part('sphere',[0,1.38,.2],[.23,.16,.13],'213f5d');part('sphere',[0,.88,0],[.25,.34,.19],c);const swing=moving?Math.sin(t*9)*.4:0;for(const side of [-1,1]){part('box',[side*.13,.35,0],[.09,.29,.1],'455d79',[swing*side,0,0]);part('sphere',[side*.34,.85,0],[.08,.27,.09],c,[-swing*side,0,side*.1]);}part('box',[0,.95,-.22],[.19,.23,.09],'3c607a');}
function project(p){const v=[...p,1],o=[0,0,0,0];for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[r]+=vp[k*4+r]*v[k];return {x:(o[0]/o[3]*.5+.5)*canvas.clientWidth,y:(-.5*o[1]/o[3]+.5)*canvas.clientHeight,visible:o[3]>0};}
function updateHotspots(){const buttons=[...document.querySelectorAll('#worldHotspots button')],placed=[];buttons.forEach((b,i)=>{const a=anchors[key][i];if(!a)return;const p=project(a);let x=Math.max(65,Math.min(canvas.clientWidth-65,p.x)),y=Math.max(canvas.clientWidth<500?120:95,Math.min(canvas.clientHeight-135,p.y));for(let tries=0;tries<4&&placed.some(q=>Math.abs(q.x-x)<120&&Math.abs(q.y-y)<38);tries++)y+=42;placed.push({x,y});b.style.left=x+'px';b.style.top=y+'px';b.style.visibility=labels&&p.visible?'visible':'hidden';});}
function focusStop(i){const p=anchors[key][i];if(!p)return;inspect(p);}
function inspect(p){target=[...p];distance=6;pitch=.3;firstPerson=false;follow=false;controls.querySelector('[data-camera=follow]').setAttribute('aria-pressed','false');controls.querySelector('[data-camera=follow]').textContent='1인칭';}
scene.addEventListener('workflow-lab-focus',e=>inspect(e.detail.position));
scene.addEventListener('click',e=>{const b=e.target.closest('.world-spot');if(b)focusStop([...b.parentNode.children].indexOf(b));});
controls.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const type=b.dataset.camera;if(type==='in'){if(firstPerson)fov=Math.max(.4,fov*.85);else distance=Math.max(3,distance*.8);}if(type==='out'){if(firstPerson)fov=Math.min(1.5,fov*1.18);else distance=Math.min(55,distance*1.25);}if(type==='reset')reset();if(type==='auto'){auto=!auto;if(auto){firstPerson=false;target=[0,1,0];pitch=.3;distance=20;controls.querySelector('[data-camera=follow]').textContent='1인칭';controls.querySelector('[data-camera=follow]').setAttribute('aria-pressed','false');}b.setAttribute('aria-pressed',String(auto));}if(type==='follow'){firstPerson=!firstPerson;follow=false;auto=false;b.setAttribute('aria-pressed',String(firstPerson));b.textContent=firstPerson?'전체 보기':'1인칭';controls.querySelector('[data-camera=auto]').setAttribute('aria-pressed','false');if(firstPerson){pitch=.06;fov=Math.PI/3;}else{target=[avatar[0],1,avatar[2]];distance=16;pitch=.35;}}if(type==='labels'){labels=!labels;b.setAttribute('aria-pressed',String(labels));}});
const pointerMap=new Map();let pinched=0;canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);pointerMap.set(e.pointerId,[e.clientX,e.clientY]);canvas.focus();auto=false;controls.querySelector('[data-camera=auto]').setAttribute('aria-pressed','false');if(pointerMap.size===2){const p=[...pointerMap.values()];pinched=Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1]);}});canvas.addEventListener('pointermove',e=>{if(!pointerMap.has(e.pointerId))return;const prev=pointerMap.get(e.pointerId);pointerMap.set(e.pointerId,[e.clientX,e.clientY]);if(pointerMap.size===2){const p=[...pointerMap.values()],d=Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1]);if(pinched){if(firstPerson)fov=Math.max(.4,Math.min(1.5,fov*pinched/d));else distance=Math.max(3,Math.min(55,distance*pinched/d));}pinched=d;}else{yaw-=(e.clientX-prev[0])*.006;pitch=Math.max(firstPerson?-1.1:.05,Math.min(1.25,pitch+(e.clientY-prev[1])*.005));}});for(const name of ['pointerup','pointercancel'])canvas.addEventListener(name,e=>pointerMap.delete(e.pointerId));canvas.addEventListener('wheel',e=>{e.preventDefault();if(firstPerson)fov=Math.max(.4,Math.min(1.5,fov*Math.exp(e.deltaY*.001)));else distance=Math.max(3,Math.min(55,distance*Math.exp(e.deltaY*.001)));},{passive:false});
const mappings={w:'forward',ArrowUp:'forward',s:'back',ArrowDown:'back',a:'left',ArrowLeft:'left',d:'right',ArrowRight:'right',q:'down',e:'up'};
window.addEventListener('keydown',e=>{if(dialog.open&&!['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)&&mappings[e.key]){e.preventDefault();portalWalk=null;keys.add(mappings[e.key]);}});window.addEventListener('keyup',e=>keys.delete(mappings[e.key]));window.addEventListener('blur',()=>keys.clear());
[...pad.querySelectorAll('button'),...flightPad.querySelectorAll('button')].forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();portalWalk=null;b.setPointerCapture(e.pointerId);keys.add(b.dataset.move);});for(const n of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(n,()=>keys.delete(b.dataset.move));});dialog.addEventListener('close',()=>keys.clear());new MutationObserver(()=>{if(dialog.open)reset();}).observe(dialog,{attributes:true,attributeFilter:['open']});
new MutationObserver(()=>{if(scene.dataset.world&&scene.dataset.world!==key)build(scene.dataset.world);}).observe(scene,{attributes:true,attributeFilter:['data-world']});
new ResizeObserver(()=>{const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(scene.clientWidth*dpr);canvas.height=Math.round(scene.clientHeight*dpr);}).observe(scene);

// Procedural sky and lighting respond to the selected local time.
let atmosphere={phase:'day',hour:12},remotePeers=[];
scene.addEventListener('workflow-atmosphere',e=>{atmosphere=e.detail;});
window.WorkflowWorld3D={getState:()=>({world:key,position:[...avatar],yaw,firstPerson,open:dialog.open}),setPeers:peers=>{remotePeers=peers.slice(0,12);}};
const skyVS='attribute vec2 a_sky;varying vec2 v_uv;void main(){v_uv=a_sky*.5+.5;gl_Position=vec4(a_sky,1.0,1.0);}';
const skyFS='precision mediump float;varying vec2 v_uv;uniform vec3 u_top;uniform vec3 u_bottom;uniform vec2 u_sun;uniform float u_night;uniform float u_aspect;uniform float u_yaw;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}void main(){vec3 c=mix(u_bottom,u_top,smoothstep(0.0,1.0,v_uv.y));vec2 q=(v_uv-u_sun)*vec2(u_aspect,1.0);float d=length(q);vec3 light=mix(vec3(1.0,.84,.52),vec3(.79,.87,1.0),u_night);float glow=exp(-d*14.0)*.18;float disk=1.0-smoothstep(.025,.028,d);if(u_night>.5){float cut=1.0-smoothstep(.025,.028,length(q-vec2(.014,.008)));disk=max(0.0,disk-cut);}c+=light*(glow+disk*.85);vec2 stars=(v_uv+vec2(u_yaw*.06,0.0))*vec2(240.0*u_aspect,240.0);vec2 cell=floor(stars);float star=step(.997,hash(cell))*(1.0-smoothstep(.05,.28,length(fract(stars)-.5)));c+=vec3(.7,.8,1.0)*star*u_night;gl_FragColor=vec4(c,1.0);}';
const skyProgram=gl.createProgram();gl.attachShader(skyProgram,shader(gl.VERTEX_SHADER,skyVS));gl.attachShader(skyProgram,shader(gl.FRAGMENT_SHADER,skyFS));gl.linkProgram(skyProgram);
const skyBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,skyBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
const skyLocations={a:gl.getAttribLocation(skyProgram,'a_sky')};for(const n of ['u_top','u_bottom','u_sun','u_night','u_aspect','u_yaw'])skyLocations[n]=gl.getUniformLocation(skyProgram,n);
function skyPalette(){if(key==='cosmos')return ['020513','0a1025'];const phase=atmosphere.phase;return phase==='night'?['030a19','183047']:phase==='dusk'?['36334c','b57b6a']:phase==='dawn'?['455673','bca48b']:['2a557b','a6c4ca'];}
function drawSky(){const [top,bottom]=skyPalette();gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.depthMask(false);gl.useProgram(skyProgram);gl.bindBuffer(gl.ARRAY_BUFFER,skyBuffer);gl.enableVertexAttribArray(skyLocations.a);gl.vertexAttribPointer(skyLocations.a,2,gl.FLOAT,false,0,0);gl.uniform3fv(skyLocations.u_top,color(top));gl.uniform3fv(skyLocations.u_bottom,color(bottom));gl.uniform2fv(skyLocations.u_sun,key==='cosmos'?[-5,-5]:[.72-yaw*.08,.75+pitch*.28]);gl.uniform1f(skyLocations.u_night,(key==='cosmos'||atmosphere.phase==='night')?1:0);gl.uniform1f(skyLocations.u_aspect,canvas.width/Math.max(1,canvas.height));gl.uniform1f(skyLocations.u_yaw,yaw);gl.drawArrays(gl.TRIANGLES,0,6);gl.depthMask(true);gl.useProgram(program);}
function mascotDraw(index,t,level=4){
 const positions=[[-2,2],[4,0],[-5,-3]],x=positions[index][0],z=positions[index][1],base=level===4?1.4+Math.sin(t*1.4)*.12:.7;
 const root=model([x,base,z],[1.25,1.25,1.25],[0,Math.atan2(eye[0]-x,eye[2]-z),0]);
 function part(type,p,s,c,r=[0,0,0],alpha=1,emission=0){draw(type,mul(root,model(p,s,r)),color(c),emission,alpha);}
 function face(y,z,cream){for(const side of [-1,1]){part('sphere',[side*.13,y,z],[.085,.11,.045],cream);part('sphere',[side*.13,y+.008,z+.04],[.045,.065,.02],'241f26');part('sphere',[side*.14-.015,y+.035,z+.06],[.015,.018,.01],'fff6e6',[0,0,0],1,.3);}part('sphere',[0,y-.15,z+.02],[.065,.025,.025],'8d5946');}
 if(level===1){
 part('sphere',[0,0,-.24],[.45,.51,.33],'345684');part('wire',[0,0,-.25],[.46,.52,.34],'7190b2');part('sphere',[0,-.05,.06],[.35,.43,.28],'b8ba72');part('sphere',[0,.58,.06],[.4,.35,.33],'b6c77b');face(.65,.35,'f3edca');
 for(const side of [-1,1]){part('sphere',[side*.35,-.1,.12],[.15,.22,.16],'a9bc70');part('sphere',[side*.23,-.46,.11],[.19,.13,.23],'a6b16d');part('sphere',[side*.23,-.45,.3],[.15,.05,.045],'e8d8a7');}
 part('box',[0,.03,.37],[.22,.27,.035],'eee2c3',[0,0,-.08]);part('box',[-.2,.03,.41],[.025,.27,.015],'de9e53',[0,0,-.08]);for(let i=0;i<4;i++)part('ring',[-.14+i*.09,.3,.4],[.035,.04,.035],'45618c',[Math.PI/2,0,0]);
 part('box',[0,1.02,-.04],[.025,.15,.025],'738f3c');part('sphere',[-.12,1.11,-.02],[.16,.045,.08],'8caa48',[0,0,-.4]);part('sphere',[.12,1.17,-.02],[.16,.045,.08],'a2b85a',[0,0,.5]);
 }else if(level===2){
 part('sphere',[0,-.04,0],[.33,.48,.27],'d78b4e');part('sphere',[0,.02,.22],[.23,.35,.08],'f4e5cb');part('sphere',[0,.6,0],[.39,.31,.28],'dd9253');
 for(const side of [-1,1]){part('cone',[side*.24,1.0,-.02],[.16,.3,.12],'a65b38',[0,0,-side*.12]);part('cone',[side*.24,1.0,.04],[.095,.22,.04],'e9c5ae',[0,0,-side*.12]);part('sphere',[side*.24,-.47,.08],[.19,.12,.23],'81513b');part('sphere',[side*.33,.02,.1],[.13,.27,.13],'d78b4e',[0,0,side*.3]);}
 part('sphere',[0,.43,.25],[.25,.14,.16],'f5e6ce');face(.66,.29,'f5e9d6');part('sphere',[0,.48,.4],[.065,.04,.035],'493931');
 part('sphere',[-.42,-.17,-.2],[.22,.29,.25],'cf7f42',[0,0,-.5]);part('sphere',[-.66,.06,-.12],[.21,.33,.23],'dc9557',[0,0,-.3]);part('sphere',[-.77,.35,-.05],[.17,.23,.18],'f2e5cd',[0,0,-.1]);
 part('box',[-.22,-.05,.35],[.18,.18,.07],'355c8d',[0,0,.1]);part('box',[0,.27,.3],[.04,.43,.025],'355c8d',[0,0,-.65]);part('box',[-.22,-.05,.43],[.06,.055,.02],'e8a251');
 part('ring',[.44,.58,.4],[.22,.22,.22],'355684',[Math.PI/2,0,0]);part('ring',[.44,.58,.4],[.2,.2,.2],'355684',[Math.PI/2,0,0]);part('sphere',[.44,.58,.4],[.18,.18,.018],'c3dced',[0,0,0],.5);part('box',[.44,.27,.4],[.035,.17,.035],'df9b53');
 }else if(level===3){
 part('sphere',[0,-.04,0],[.39,.44,.29],'a77651');part('sphere',[0,.57,0],[.43,.34,.34],'b4835e');for(const side of [-1,1]){part('sphere',[side*.33,.8,0],[.12,.13,.1],'9c684a');part('sphere',[side*.12,.46,.31],[.17,.12,.07],'ead5ae');part('sphere',[side*.28,-.45,.1],[.19,.12,.22],'87634f');part('sphere',[side*.36,.02,.17],[.14,.27,.14],'a77651',[0,0,side*.35]);}face(.65,.34,'f4dfbc');part('sphere',[0,.5,.42],[.085,.05,.04],'725044');for(const side of [-1,1])part('box',[side*.045,.34,.4],[.04,.09,.025],'fff0cf');
 part('sphere',[0,-.23,-.5],[.3,.09,.55],'78533f',[.3,0,0]);for(let j=-2;j<=2;j++)part('box',[j*.09,-.12,-.63],[.012,.012,.27],'a27c5e',[0,0,0]);
 part('box',[0,-.08,.31],[.29,.3,.04],'365c92');for(const side of [-1,1]){part('box',[side*.22,.25,.27],[.045,.21,.025],'365c92',[0,0,side*.15]);part('sphere',[side*.2,.13,.38],[.045,.045,.02],'e9a046');}part('box',[.31,.34,.44],[.14,.14,.14],'f3a743');part('box',[.4,-.02,.5],[.13,.13,.13],'f7c552');part('box',[-.12,-.18,.39],[.035,.11,.02],'d8a156');
}else{
 // Connector honeybee: yellow-black abdomen, translucent wings and blue scarf.
 part('sphere',[0,-.04,0],[.32,.43,.27],'e8b84f');for(const y of [-.28,-.06,.16]){part('ring',[0,y,0],[.315,1,.275],'433c39');part('ring',[0,y+.035,0],[.318,1,.278],'433c39');part('ring',[0,y-.035,0],[.315,1,.275],'433c39');}
 part('sphere',[0,.6,0],[.36,.32,.3],'edc664');part('sphere',[0,.58,.2],[.29,.25,.14],'f3dfa9');face(.65,.34,'fff0ca');
 part('ring',[0,.25,0],[.37,.25,.33],'3768a4');part('box',[-.24,.03,.25],[.07,.25,.03],'3768a4',[0,0,-.35]);
 for(const side of [-1,1]){const flap=Math.sin(t*11)*.17;part('sphere',[side*.39,.22,-.09],[.33,.055,.19],'d5e9f0',[0,0,side*(.45+flap)],.7);part('sphere',[side*.36,-.03,-.1],[.28,.05,.17],'c6dfe9',[0,0,-side*(.4+flap)],.6);part('box',[side*.18,.95,.01],[.022,.14,.022],'4b4036',[0,0,-side*.4]);part('sphere',[side*.24,1.08,.01],[.045,.045,.045],'544232');for(let leg=0;leg<3;leg++)part('box',[side*.31,-.27+leg*.13,.09],[.025,.1,.025],'544232',[0,0,side*.65]);part('sphere',[side*.3,.06,.23],[.07,.16,.08],'685335',[0,0,-side*.7]);}
 const nodes=[[-.14,.1,.53],[.23,.13,.57],[.1,.4,.54]];for(const p of nodes)part('sphere',p,[.06,.06,.06],'6cc9e7',[0,0,0],1,.7);for(let i=0;i<3;i++){const a=nodes[i],b=nodes[(i+1)%3],d=sub(b,a),mid=a.map((v,j)=>(v+b[j])/2),len=Math.hypot(...d);part('box',mid,[.009,len/2,.009],'cfecf5',[0,0,-Math.atan2(d[0],d[1])]);}
 }
}

function tick(now){requestAnimationFrame(tick);const dt=Math.min((now-last)/1000,.05);last=now;if(!dialog.open||document.hidden)return;animTime+=dt;const positionText='X '+avatar[0].toFixed(1)+' / Y '+avatar[1].toFixed(1)+' / Z '+avatar[2].toFixed(1)+(firstPerson?' · 1인칭':' · 둘러보기');if(positionHud.textContent!==positionText)positionHud.textContent=positionText;if(auto)yaw+=dt*.12;const moving=keys.size>0||Boolean(portalWalk);const origin=doors.length&&moving?[...avatar]:null;if(portalWalk){walkThroughDoor(dt);}else{let forward=(keys.has('forward')?1:0)-(keys.has('back')?1:0),right=(keys.has('right')?1:0)-(keys.has('left')?1:0);if(forward||right){const speed=dt*(key==='cosmos'?6:3);avatar[0]+=(-Math.sin(yaw)*forward+Math.cos(yaw)*right)*speed;avatar[2]+=(-Math.cos(yaw)*forward-Math.sin(yaw)*right)*speed;target=[avatar[0],1,avatar[2]];}if(key==='cosmos'){avatar[1]+=((keys.has('up')?1:0)-(keys.has('down')?1:0))*dt*4;}}if(origin&&enterCrossedDoor(origin))return;if(follow)target=[avatar[0],avatar[1]+1,avatar[2]];
if(firstPerson){eye=[avatar[0],avatar[1]+1.55,avatar[2]];target=[eye[0]-Math.sin(yaw)*Math.cos(pitch),eye[1]-Math.sin(pitch),eye[2]-Math.cos(yaw)*Math.cos(pitch)];}else{eye=[target[0]+Math.sin(yaw)*Math.cos(pitch)*distance,target[1]+Math.sin(pitch)*distance,target[2]+Math.cos(yaw)*Math.cos(pitch)*distance];}vp=mul(perspective(firstPerson?fov:Math.PI/3,Math.max(.1,canvas.width/canvas.height),.1,180),look(eye,target));const fog=color(key==='cell'?'09232b':key==='reality'?'101f30':'050d20');gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(...fog,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);drawSky();gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.uniformMatrix4fv(loc.u_vp,false,vp);gl.uniform3fv(loc.u_eye,eye);gl.uniform3fv(loc.u_fog,fog);gl.uniform1f(loc.u_point,2);gl.uniform1f(loc.u_daylight,atmosphere.phase==='day'?1:atmosphere.phase==='night'?0:.45);for(const o of objects.filter(x=>x.alpha===1))draw(o.type,o.matrix||model(o.p,o.s,o.r),o.c,o.emission,o.alpha,o.pointSize||2);if(!firstPerson)avatarDraw(animTime,moving);const npcLevels=key==='cell'?[4,1,2]:key==='reality'?[4,2,3]:[4];for(let bee=0;bee<npcLevels.length;bee++)mascotDraw(bee,animTime,npcLevels[bee]);for(const peer of remotePeers)avatarDraw(animTime,false,peer.position);for(const o of objects.filter(x=>x.alpha!==1))draw(o.type,o.matrix||model(o.p,o.s,o.r),o.c,o.emission,o.alpha,o.pointSize||2);gl.depthMask(true);updateHotspots();showAppDoorLabels();scene.dispatchEvent(new CustomEvent('workflow-world-frame',{detail:{time:animTime,project}}));}
build(scene.dataset.world||'cell');requestAnimationFrame(tick);
})();
