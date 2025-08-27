// Global registry for simple mounting
window.MOUNT_ACTIVITY = window.MOUNT_ACTIVITY || {};
window.MOUNT_ACTIVITY['ch1-electrification'] = function mount(rootEl) {
  // Guard p5
  if (typeof window.p5 === 'undefined') {
    console.error('p5 not loaded. Make sure the <script> tag is present on this page.');
    return;
  }

  // ---- PASTE/ADAPT YOUR EXISTING CODE BELOW ----
  // Small tweaks:
  // 1) After createCanvas(...), do: canvas.parent(rootEl) so it renders inside the activity box.
  // 2) Do NOT recreate the Rod controls here; we already have #rodA, #rodB, etc. on the page.

  const TRIBO = {
    Glass:  { sign:+1, cloth:'Silk/Wool' },
    Plastic:{ sign:-1, cloth:"Cat's Fur" }
  };
  const CONTACT_GAP = 14;

  let rods = [ makeRod('Glass', 220, 330), makeRod('Plastic', window.innerWidth-220, 330) ];
  let dragging = null;

  function makeRod(material, x, y){
    return { material, x, y, w:28, h:180, charge:0, sign:0,
             rubbing:false, rubT:0, clothPhase:0, vx:0, vy:0, m:1 };
  }
  function resetCharge(r){ r.charge=0; r.sign=0; r.rubbing=false; r.rubT=0; r.vx=r.vy=0; }
  function startRub(rod){ rod.rubbing=true; rod.sign = TRIBO[rod.material].sign; }

  // Hook up existing controls from the page
  const selA = document.getElementById('rodA');
  const selB = document.getElementById('rodB');
  const rubA = document.getElementById('rubA');
  const rubB = document.getElementById('rubB');
  const dis  = document.getElementById('discharge');

  selA.value = rods[0].material; selB.value = rods[1].material;
  selA.addEventListener('change', e=>{ rods[0].material=e.target.value; resetCharge(rods[0]); });
  selB.addEventListener('change', e=>{ rods[1].material=e.target.value; resetCharge(rods[1]); });
  rubA.addEventListener('click', ()=> startRub(rods[0]));
  rubB.addEventListener('click', ()=> startRub(rods[1]));
  dis.addEventListener('click', ()=> { resetCharge(rods[0]); resetCharge(rods[1]); });

  // p5 (global mode)
  window.setup = function(){
    const h = Math.round(window.innerHeight * 0.7);
    const canvas = createCanvas(rootEl.clientWidth, h);
    canvas.parent(rootEl); // key: render inside the activity box
    textFont('system-ui, -apple-system, Segoe UI, Roboto');
  };
  window.windowResized = function(){
    const h = Math.round(window.innerHeight * 0.7);
    resizeCanvas(rootEl.clientWidth, h);
  };

  window.draw = function(){
    background(11,16,32);
    noStroke(); fill(232,238,252); textSize(16);
    text("Rubbing creates charges; like repel, unlike attract — rods also move now, without overlapping.", 14, 24);

    for(const r of rods){
      if(r.rubbing){
        r.rubT += deltaTime/1000; r.clothPhase += 5*deltaTime/1000;
        r.charge = Math.min(1, r.charge + 0.6*(deltaTime/1000));
        if(r.charge>=1) r.rubbing=false;
      }
    }

    physicsStep();
    for(const r of rods) drawRod(r);
    drawForcesAndVerdict();
  };

  function physicsStep(){
    handleDrag();

    const A = rods[0], B = rods[1];
    const both = (A.sign!==0 && B.sign!==0 && A.charge>0 && B.charge>0);

    let axA=0, ayA=0, axB=0, ayB=0;
    if(both){
      const dx=B.x-A.x, dy=B.y-A.y;
      const soft = 30, rSoft = Math.max(20, Math.hypot(dx,dy,soft));
      const ux=dx/rSoft, uy=dy/rSoft;

      const qA=A.sign*A.charge, qB=B.sign*B.charge;
      const k=5e7, F = -k*(qA*qB)/(rSoft*rSoft);

      axA +=  F*ux; ayA +=  F*uy;
      axB += -F*ux; ayB += -F*uy;
    }

    const dt = Math.min(0.032, deltaTime/1000);
    const damp = Math.exp(-2.5*dt);

    for(let i=0;i<2;i++){
      const R = rods[i];
      if(dragging && dragging.idx===i){ R.vx=R.vy=0; continue; }
      const ax = (i===0? axA:axB), ay=(i===0? ayA:ayB);
      R.vx = (R.vx + ax*dt)*damp; R.vy = (R.vy + ay*dt)*damp;
      R.x += R.vx*dt; R.y += R.vy*dt;

      const pad=10, minX=pad+R.w/2, maxX=width-pad-R.w/2, minY=pad+R.h/2, maxY=height-pad-R.h/2;
      if(R.x<minX){ R.x=minX; R.vx*=-0.3; }
      if(R.x>maxX){ R.x=maxX; R.vx*=-0.3; }
      if(R.y<minY){ R.y=minY; R.vy*=-0.3; }
      if(R.y>maxY){ R.y=maxY; R.vy*=-0.3; }
    }

    enforceNoOverlap(rods[0], rods[1]);
  }

  function enforceNoOverlap(A, B){
    const dx = B.x - A.x, dy = B.y - A.y;
    let r = Math.hypot(dx, dy);
    if(r === 0){ r = 0.0001; }
    const ux = dx / r, uy = dy / r;

    const minR = (A.w/2 + B.w/2) + CONTACT_GAP;
    if(r < minR){
      const corr = (minR - r) * 0.5;
      A.x -= ux * corr; A.y -= uy * corr;
      B.x += ux * corr; B.y += uy * corr;

      const vAu = A.vx*ux + A.vy*uy;
      const vBu = B.vx*ux + B.vy*uy;
      const avg = (vAu + vBu) * 0.5;
      A.vx += (avg - vAu)*ux;  A.vy += (avg - vAu)*uy;
      B.vx += (avg - vBu)*ux;  B.vy += (avg - vBu)*uy;
    }
  }

  function drawRod(rod){
    push(); translate(rod.x, rod.y);
    stroke(40,58,104); strokeWeight(2);
    const body = rod.material==='Glass' ? color(140,190,255,220) : color(200,200,200,220);
    fill(body); rectMode(CENTER); rect(0,0, rod.w, rod.h, 10);

    noStroke(); fill(200); textAlign(CENTER); text(rod.material, 0, rod.h/2 + 18);

    const n = Math.round(12*rod.charge);
    for(let i=0;i<n;i++){
      const t=i/(n||1), y=lerp(-rod.h/2+12, rod.h/2-12, t);
      const side=(i%2===0)?1:-1, x=side*(rod.w/2+10+(i%3===0?2:0));
      if(rod.sign>0){ fill('#ff6b6b'); text('+', x, y); }
      else if(rod.sign<0){ fill('#74c0ff'); text('−', x, y+1); }
    }

    if(rod.rubbing){
      const cloth = TRIBO[rod.material].cloth;
      const ccol = rod.material==='Glass' ? color('#74c0ff') : color('#ffd166');
      ccol.setAlpha(200);
      noStroke(); fill(ccol);
      const t = Math.sin(rod.clothPhase), cx = (rod.w/2 + 18)*Math.sign(t);
      rect(cx, 0, 18, rod.h*0.9, 6);
      fill(170); textSize(12); textAlign(CENTER);
      text(cloth, cx, rod.h/2 + 34);
    }

    noFill(); stroke(80,100,160); rect(0, -rod.h/2-24, 80, 8, 4);
    noStroke(); fill(rod.sign>0? '#ff6b6b' : rod.sign<0? '#74c0ff' : '#3b3f55');
    rectMode(CORNER); const left=-40; rect(left, -rod.h/2-24, 80*rod.charge, 8, 4);
    pop();
  }

  function handleDrag(){
    if(mouseIsPressed && !dragging){
      for(let i=rods.length-1;i>=0;i--){
        const r = rods[i];
        if(Math.abs(mouseX-r.x)<=r.w/2+10 && Math.abs(mouseY-r.y)<=r.h/2+10){
          dragging = { idx:i, dx:mouseX-r.x, dy:mouseY-r.y }; break;
        }
      }
    }
    if(!mouseIsPressed) dragging=null;
    if(dragging){
      const r = rods[dragging.idx];
      r.x = mouseX - dragging.dx; r.y = mouseY - dragging.dy;
      r.vx = r.vy = 0;
    }
  }

  function drawForcesAndVerdict(){
    const A = rods[0], B = rods[1];
    if(A.sign!==0 && B.sign!==0 && A.charge>0 && B.charge>0){
      const dx=B.x-A.x, dy=B.y-A.y, r=Math.max(40, Math.hypot(dx,dy));
      const ux=dx/r, uy=dy/r;
      const qA=A.sign*A.charge, qB=B.sign*B.charge, same=(qA*qB>0);
      const k=90000, mag=Math.abs((qA*qB)/(r*r));
      drawArrow(A.x,A.y,(same?-1:+1)*ux*k*mag,(same?-1:+1)*uy*k*mag, A.sign>0?'#ff6b6b':'#74c0ff');
      drawArrow(B.x,B.y,(same?+1:-1)*ux*k*mag,(same?+1:-1)*uy*k*mag, B.sign>0?'#ff6b6b':'#74c0ff');

      const verdict = same ? 'Repel (like charges) — rods move apart' : 'Attract (unlike charges) — rods move together (no overlap)';
      const vcol = same ? '#ff8585' : '#87d37c';
      noStroke(); fill(vcol); textSize(18); textAlign(CENTER);
      text(verdict, width/2, 48);
    }

    noStroke(); fill(200); textSize(13); textAlign(LEFT);
    text(`Rub rules: Glass ↔ Silk/Wool → Glass + ; Plastic ↔ Cat's Fur → Plastic −`, 14, height-20);
  }

  function drawArrow(x,y,vx,vy,col){
    push(); stroke(col); strokeWeight(2); fill(col);
    line(x,y, x+vx, y+vy);
    const a=Math.atan2(vy,vx), L=10;
    line(x+vx,y+vy, x+vx-L*Math.cos(a-0.6), y+vy-L*Math.sin(a-0.6));
    line(x+vx,y+vy, x+vx-L*Math.cos(a+0.6), y+vy-L*Math.sin(a+0.6));
    pop();
  }
  // ---- END OF YOUR DEMO CODE ----
};

// Auto-mount when the file loads (loader created the <script> tag)
(function(){
  const root = document.getElementById('activity-root');
  if (!root) return;
  const id = root.getAttribute('data-activity');
  if (window.MOUNT_ACTIVITY && window.MOUNT_ACTIVITY[id]) {
    window.MOUNT_ACTIVITY[id](root);
  }
})();
