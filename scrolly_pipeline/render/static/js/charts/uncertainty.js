/* Vis4AI refusal-uncertainty lab. Qwen3Guard scores and full response text
   are imported locally, never embedded in the public essay. */
(function () {
  'use strict';
  const root = document.getElementById('probability-lab');
  if (!root) return;
  const $ = id => document.getElementById(id);
  const d3 = window.d3;
  const OUTCOMES = ['refusal','safe','borderline','harmful'];
  const LABELS = {refusal:'Refusal',safe:'Safe answer',borderline:'Borderline',harmful:'Harmful',unknown:'Unclassified'};
  const COLORS = {refusal:'var(--o-refusal)',safe:'var(--o-safe)',borderline:'var(--o-borderline)',harmful:'var(--o-harmful)',unknown:'var(--muted)'};
  const state = {records:[],pairs:[],selectedId:null,sourceName:'',errorCount:0,binFilter:null,scatterCoords:[],nearbyPool:[]};
  const pct = x => Number.isFinite(x)?`${(x*100).toFixed(1)}%`:'—';
  const pp = x => Number.isFinite(x)?`${x>=0?'+':''}${(x*100).toFixed(1)} pp`:'—';
  const isP = value => (typeof value==='number' || (typeof value==='string' && value.trim()!=='')) && Number.isFinite(Number(value)) && +value>=0 && +value<=1;
  const brief = (s,n=160) => {const x=String(s??'').replace(/\s+/g,' ').trim(); return x.length>n?x.slice(0,n)+'…':x;};
  const variantName = x => x==='baseline'?'Baseline':'Ablation';
  const outcomeName = x => LABELS[x]||LABELS.unknown;
  const idKey = r => r.id+'\u0000'+r.variant;
  const color = x => COLORS[x]||COLORS.unknown;
  const near = probability => probability>=.35 && probability<=.65;
  const chance = p => 1-2*Math.abs(p-.5);
  // Explicit tie policy: exactly 50% is NO refusal (not Yes).
  const scoreLabel = p => p > .5 ? 'Yes' : 'No';
  const binIndex = p => Math.min(19, Math.floor(p*20));
  const hash = s => {let n=2166136261;for(let i=0;i<s.length;i++) n=Math.imul(n^s.charCodeAt(i),16777619);return n>>>0;};
  function cleanLabel(x){const v=String(x??'').trim().toLowerCase();return v==='yes'?'Yes':v==='no'?'No':null;}
  function cleanSafety(x){const v=String(x??'').trim().toLowerCase();return ['safe','unsafe','controversial'].includes(v)?v:null;}
  // Exactly the same four OUTCOME DEFINITIONS as the original essay, but using
  // fresh generated moderation decisions from the new Kaggle run.
  // Faithfully reproduce the colleague's outcome precedence: Unsafe wins
  // even when the generated refusal flag is Yes (rare contradictory outputs).
  function classify(r){
    if(r.safety==='unsafe')return 'harmful';
    if(r.generatedLabel==='Yes')return 'refusal';
    if(r.generatedLabel!=='No')return 'unknown';
    return {safe:'safe',controversial:'borderline'}[r.safety]||'unknown';
  }
  function parseText(text,filename){
    const raw=text.trim();if(!raw)throw Error('The selected file is empty.');
    if(/\.csv$/i.test(filename))return {rows:d3.csvParse(text),issues:0};
    if(raw.startsWith('[')){const a=JSON.parse(raw);if(!Array.isArray(a))throw Error('Expected an array.');return {rows:a,issues:0};}
    if(!raw.startsWith('{'))return {rows:d3.csvParse(text),issues:0};
    const rows=[];let issues=0;
    for(const [i,line] of text.split(/\r?\n/).entries()){
      if(!line.trim())continue;
      try{rows.push(JSON.parse(line));}catch(err){issues++;console.warn('Skipped invalid JSONL line',i+1);}
    }
    return {rows,issues};
  }
  function normalize(raw){
    const map=new Map();let invalid=0,duplicates=0;
    for(const r of raw){
      if(!r || typeof r!=='object' || Array.isArray(r)){invalid++;continue;}
      const variant=r.variant==='ablated'?'ablation':r.variant;
      if(!r.id||!['baseline','ablation'].includes(variant)){invalid++;continue;}
      const generatedLabel=cleanLabel(r.refusal_label_generated ?? r.qwen3guard_refusal);
      const safety=cleanSafety(r.safety ?? r.qwen3guard_safety);
      const row={...r,id:String(r.id),variant,p:isP(r.p_refusal_yes)?+r.p_refusal_yes:null,
        category:String(r.category||'unknown'),prompt:String(r.prompt??''),response:String(r.response??''),
        generatedLabel,safety,valid:isP(r.p_refusal_yes) && (r.status==null||r.status==='ok')};
      row.outcome=classify(row);
      if(map.has(idKey(row)))duplicates++;
      map.set(idKey(row),row);
    }
    return {rows:[...map.values()].sort((a,b)=>a.id.localeCompare(b.id)||a.variant.localeCompare(b.variant)),invalid,duplicates};
  }
  function buildPairs(records){
    const m=new Map();for(const r of records){if(!m.has(r.id))m.set(r.id,{id:r.id,category:r.category||'unknown'});m.get(r.id)[r.variant]=r;}
    return [...m.values()].filter(d=>d.baseline?.valid&&d.ablation?.valid)
      .map(d=>({...d,b:d.baseline.p,a:d.ablation.p,delta:d.ablation.p-d.baseline.p}));
  }
  function setStatus(message,problem=false){$('pl-status').textContent=message;$('pl-status').classList.toggle('pl-warning',problem);}
  function updateRows(data,filename,issues){
    const n=normalize(data);state.records=n.rows;state.pairs=buildPairs(n.rows);state.sourceName=filename;
    state.selectedId=state.pairs[0]?.id||state.records[0]?.id||null;state.binFilter=null;state.scatterCoords=[];state.nearbyPool=[];
    const cats=[...new Set(state.records.map(r=>r.category||'unknown'))].sort();
    $('pl-category').replaceChildren(new Option('All categories','all'),...cats.map(k=>new Option(k.replaceAll('_',' '),k)));
    const transitions=[...new Set(state.pairs.map(d=>`${d.baseline.outcome}|${d.ablation.outcome}`))].sort();
    $('pl-transition').replaceChildren(new Option('All transitions','all'),...transitions.map(k=>{
      const [b,a]=k.split('|');return new Option(`${outcomeName(b)} → ${outcomeName(a)}`,k);
    }));
    $('pl-category').value='all';$('pl-outcome').value='all';$('pl-outcome-side').value='ablation';$('pl-transition').value='all';
    $('pl-variant').value='all';$('pl-focus').value='all';$('pl-search').value='';
    const scored=state.records.filter(r=>r.valid).length;
    const unknown=state.records.filter(r=>r.valid&&r.outcome==='unknown').length;
    const extras=[issues&&`${issues} invalid JSONL line(s)`,n.duplicates&&`${n.duplicates} duplicate ID/variant(s) replaced`,n.invalid&&`${n.invalid} malformed record(s)`,unknown&&`${unknown} scored rows missing an outcome label`].filter(Boolean);
    setStatus(`Loaded ${filename}: ${scored} scored responses, ${state.pairs.length} complete pairs.${extras.length?' Note: '+extras.join('; ')+'.':''}`,!!issues||!!n.invalid);
    render();
  }
  function pairMatchesOutcome(pair){
    const wanted=$('pl-outcome').value;
    if(wanted==='all')return true;
    const side=$('pl-outcome-side').value;
    if(side==='either')return pair.baseline.outcome===wanted||pair.ablation.outcome===wanted;
    return pair[side].outcome===wanted;
  }
  function pairMatchesFilter(pair){
    const cat=$('pl-category').value,q=$('pl-search').value.trim().toLowerCase(),focus=$('pl-focus').value;
    if(cat!=='all'&&pair.category!==cat)return false;
    if(!pairMatchesOutcome(pair))return false;
    const transition=$('pl-transition').value;
    if(transition!=='all'&&`${pair.baseline.outcome}|${pair.ablation.outcome}`!==transition)return false;
    if(q&&!pair.id.toLowerCase().includes(q)&&!(pair.baseline.prompt||pair.ablation.prompt||'').toLowerCase().includes(q))return false;
    if(focus==='uncertain'&&!near(pair.b)&&!near(pair.a))return false;
    if(focus==='decrease'&&!(pair.delta<-.25))return false;
    if(focus==='increase'&&!(pair.delta>.10))return false;
    if(focus==='flip'&&(scoreLabel(pair.b)===scoreLabel(pair.a)))return false;
    if(focus==='mismatch'&&![pair.baseline,pair.ablation].some(r=>r.generatedLabel&&r.generatedLabel!==scoreLabel(r.p)))return false;
    return true;
  }
  function filteredPairs(){return state.pairs.filter(pairMatchesFilter);}
  function filteredRecords(){
    const cat=$('pl-category').value,variant=$('pl-variant').value,q=$('pl-search').value.trim().toLowerCase(),wanted=$('pl-outcome').value;
    return state.records.filter(r=>r.valid && (cat==='all'||r.category===cat)
      && (variant==='all'||r.variant===variant)
      && (wanted==='all'||r.outcome===wanted)
      && (!q||r.id.toLowerCase().includes(q)||(r.prompt||'').toLowerCase().includes(q)));
  }
  function selectId(id){state.selectedId=id;renderScatter();renderHistogram();renderInspector();renderKpis();}
  function renderKpis(){
    const scored=state.records.filter(r=>r.valid);
    const uncertain=scored.filter(r=>near(r.p)).length;
    const filtered=filteredPairs().length;
    const items=[
      [scored.length.toLocaleString(),'Scored responses (including singles)'],
      [state.pairs.length.toLocaleString(),'Total complete pairs'],
      [filtered.toLocaleString(),'Pairs matching filters'],
      [(state.scatterCoords?.length||0).toLocaleString(),'Dots drawn (overlaps possible)'],
      [uncertain.toLocaleString(),'Scores between 0.35 and 0.65']
    ];
    $('pl-kpis').replaceChildren(...items.map(([v,l])=>{
      const a=document.createElement('div');a.className='pl-kpi';const b=document.createElement('b');b.textContent=v;const s=document.createElement('span');s.textContent=l;a.append(b,s);return a;
    }));
  }
  function tooltip(ev,s){const el=$('pl-local-tooltip');el.textContent=s;el.style.display='block';el.style.left=Math.max(10,Math.min(innerWidth-340,ev.clientX+14))+'px';el.style.top=Math.max(8,Math.min(innerHeight-170,ev.clientY+16))+'px';}
  function hideTip(){$('pl-local-tooltip').style.display='none';}
  function drawLegend(target,keys){
    const el=$(target);el.replaceChildren(...keys.map(k=>{
      const n=document.createElement('span');const i=document.createElement('i');i.className='pl-dot';i.style.background=color(k);n.append(i,document.createTextNode(outcomeName(k)));return n;
    }));
  }
  function pointXY(d,x,y,m,W,H){
    // Deterministic visual jitter helps distinguish clumps without changing the scored values.
    return {
      x:Math.max(m.left,Math.min(W-m.right,x(d.b)+(hash(d.id)%23-11)*.75)),
      y:Math.max(m.top,Math.min(H-m.bottom,y(d.a)+(hash('a'+d.id)%23-11)*.75))
    };
  }
  function updateNearby(){
    const select=$('pl-nearby');
    const coords=state.scatterCoords;
    const active=coords.find(d=>d.id===state.selectedId);
    if(!active){
      state.nearbyPool=[];$('pl-next-nearby').disabled=true;
      select.replaceChildren(new Option('Choose a plotted pair', ''));
      select.value='';select.disabled=true;
      $('pl-nearby-count').textContent='';return;
    }
    // Points whose glyphs overlap or almost overlap at current viewBox scale.
    const candidates=coords.map(d=>({...d,dist:Math.hypot(d.x-active.x,d.y-active.y)}))
      .filter(d=>d.dist<=13).sort((a,b)=>a.dist-b.dist||a.id.localeCompare(b.id));
    state.nearbyPool=candidates.map(d=>d.id);$('pl-next-nearby').disabled=candidates.length<2;
    select.replaceChildren(...candidates.map(d=>new Option(`${d.id} · ${pct(d.b)} → ${pct(d.a)}`,d.id)));
    select.value=state.selectedId;select.disabled=candidates.length<2;
    $('pl-nearby-count').textContent=candidates.length>1
      ?`${candidates.length} nearby pairs at the selected location; choose one to inspect.`
      :'No other pairs overlap the selected point.';
  }
  function renderScatter(){
    const target=$('pl-paired-chart');target.replaceChildren();const points=filteredPairs();
    $('pl-filter-count').textContent=`${points.length.toLocaleString()} filtered pairs · ${state.pairs.length.toLocaleString()} total complete pairs · ${points.length.toLocaleString()} rendered dots (some overlap)`;
    if(!points.length){
      state.scatterCoords=[];updateNearby();target.className='pl-empty';
      target.textContent=state.records.length?'No complete pairs match your filters.':'Load a partial JSONL or CSV to begin.';
      return;
    }
    target.className='';const W=740,H=440,m={left:54,right:16,top:15,bottom:45};
    const svg=d3.select(target).append('svg').attr('class','pl-plot').attr('viewBox',`0 0 ${W} ${H}`);
    const x=d3.scaleLinear().domain([0,1]).range([m.left,W-m.right]);
    const y=d3.scaleLinear().domain([0,1]).range([H-m.bottom,m.top]);
    [0,.25,.5,.75,1].forEach(v=>{
      svg.append('line').attr('x1',x(v)).attr('x2',x(v)).attr('y1',y(0)).attr('y2',y(1)).attr('stroke','var(--grid)');
      svg.append('line').attr('x1',x(0)).attr('x2',x(1)).attr('y1',y(v)).attr('y2',y(v)).attr('stroke','var(--grid)');
    });
    svg.append('line').attr('x1',x(0)).attr('y1',y(0)).attr('x2',x(1)).attr('y2',y(1)).attr('stroke','var(--ink-2)').attr('stroke-dasharray','5 4').attr('opacity',.55);
    svg.append('line').attr('x1',x(.5)).attr('x2',x(.5)).attr('y1',y(0)).attr('y2',y(1)).attr('stroke','var(--axis)').attr('stroke-dasharray','3 4');
    svg.append('line').attr('x1',x(0)).attr('x2',x(1)).attr('y1',y(.5)).attr('y2',y(.5)).attr('stroke','var(--axis)').attr('stroke-dasharray','3 4');
    svg.append('g').attr('transform',`translate(0,${H-m.bottom})`).call(d3.axisBottom(x).tickValues([0,.25,.5,.75,1]).tickFormat(d3.format('.0%')));
    svg.append('g').attr('transform',`translate(${m.left},0)`).call(d3.axisLeft(y).tickValues([0,.25,.5,.75,1]).tickFormat(d3.format('.0%')));
    svg.append('text').attr('x',W/2).attr('y',H-6).attr('text-anchor','middle').text('Baseline P(refusal)');
    svg.append('text').attr('transform',`translate(12,${H/2}) rotate(-90)`).attr('text-anchor','middle').text('Ablated P(refusal)');
    const coords=points.map(d=>({...d,...pointXY(d,x,y,m,W,H)}));
    state.scatterCoords=coords;
    const g=svg.append('g').selectAll('g.pl-pairmark').data(coords).join('g')
      .attr('class','pl-pairmark')
      .attr('transform',d=>`translate(${d.x},${d.y})`)
      .attr('tabindex',0).attr('role','button')
      .attr('aria-label',d=>`${d.id}; baseline ${pct(d.b)}, ${outcomeName(d.baseline.outcome)}; ablation ${pct(d.a)}, ${outcomeName(d.ablation.outcome)}`)
      .on('mousemove',(ev,d)=>tooltip(ev,`${d.id} · ${d.category}\nBaseline: ${pct(d.b)} · ${outcomeName(d.baseline.outcome)}\nAblation: ${pct(d.a)} · ${outcomeName(d.ablation.outcome)}\nChange: ${pp(d.delta)}\n${brief(d.baseline.prompt,125)}\nClick to inspect`))
      .on('mouseout',hideTip)
      .on('click',(ev,d)=>selectId(d.id))
      .on('keydown',(ev,d)=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();selectId(d.id);}});
    // Outer ring = baseline outcome. Inner fill = ablated outcome.
    g.append('circle').attr('r',5.8).attr('fill',d=>color(d.baseline.outcome)).attr('opacity',.9);
    g.append('circle').attr('r',3.3).attr('fill',d=>color(d.ablation.outcome));
    g.filter(d=>d.id===state.selectedId).append('circle').attr('r',8.2).attr('fill','none')
      .attr('stroke','var(--ink)').attr('stroke-width',1.7).attr('pointer-events','none');
    updateNearby();
  }
  function renderHistogram(){
    const target=$('pl-uncertainty-chart');target.replaceChildren();const data=filteredRecords();
    if(!data.length){
      target.className='pl-empty';target.textContent='No scored responses match these category, outcome, or variant filters.';
      $('pl-distribution-info').textContent='No matching scored responses.';
      renderTopTable();return;
    }
    target.className='';const W=740,H=418,m={left:48,right:20,top:12,bottom:40};
    const svg=d3.select(target).append('svg').attr('class','pl-plot').attr('viewBox',`0 0 ${W} ${H}`);
    const x=d3.scaleLinear().domain([0,1]).range([m.left,W-m.right]);
    const binCount=20,width=(x(1)-x(0))/binCount;
    const stacked=['baseline','ablation'].map(variant=>{
      const bins=Array.from({length:binCount},()=>({total:0,groups:Object.fromEntries([...OUTCOMES,'unknown'].map(k=>[k,0]))}));
      for(const r of data.filter(r=>r.variant===variant)){const idx=binIndex(r.p);bins[idx].total++;bins[idx].groups[r.outcome]++;}
      return {variant,bins};
    });
    const max=d3.max(stacked.flatMap(v=>v.bins),b=>b.total)||1;
    const rows=[{variant:'baseline',top:29,bottom:184},{variant:'ablation',top:218,bottom:373}];
    rows.forEach(({variant,top,bottom})=>{
      if($('pl-variant').value!=='all'&&$('pl-variant').value!==variant)return;
      const v=stacked.find(d=>d.variant===variant),yy=d3.scaleLinear().domain([0,max]).nice().range([bottom,top]);
      svg.append('rect').attr('x',x(.35)).attr('y',top).attr('width',x(.65)-x(.35)).attr('height',bottom-top).attr('fill','var(--o-borderline)').attr('opacity',.09);
      svg.append('text').attr('x',m.left+5).attr('y',top-9).attr('font-weight','700').text(variantName(variant));
      svg.append('g').attr('transform',`translate(${m.left},0)`).call(d3.axisLeft(yy).ticks(3).tickSizeOuter(0));
      v.bins.forEach((b,i)=>{
        const xx=x(i/binCount)+.7;
        let y0=0;
        OUTCOMES.concat('unknown').forEach(k=>{
          const count=b.groups[k];if(!count)return;
          svg.append('rect').attr('x',xx).attr('y',yy(y0+count))
            .attr('width',Math.max(1,width-1.4)).attr('height',Math.max(0,yy(y0)-yy(y0+count)))
            .attr('fill',color(k)).attr('opacity',.88).attr('pointer-events','none');
          y0+=count;
        });
        if(!b.total)return;
        if(state.binFilter?.variant===variant&&state.binFilter?.index===i){
          svg.append('rect').attr('x',xx-.8).attr('y',top).attr('width',width-.1).attr('height',bottom-top)
            .attr('fill','none').attr('stroke','var(--ink)').attr('stroke-width',2).attr('pointer-events','none');
        }
        // The invisible hit target spans the full bin for a reliable click, even on thin stacks.
        svg.append('rect').attr('class','pl-bin-hit').attr('x',xx).attr('y',top).attr('width',width-1.4).attr('height',bottom-top)
          .attr('fill','transparent').attr('tabindex',0).attr('role','button')
          .attr('aria-label',`${variantName(variant)} probability ${pct(i/binCount)} to ${pct((i+1)/binCount)}: ${b.total} responses. Click to filter uncertainty table.`)
          .on('mousemove',ev=>tooltip(ev,`${variantName(variant)}\nP(refusal) ${pct(i/binCount)}–${pct((i+1)/binCount)}\n${b.total} scored responses\nClick to inspect this bin`))
          .on('mouseout',hideTip)
          .on('click',()=>chooseBin(variant,i))
          .on('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();chooseBin(variant,i);}});
      });
      // Selecting a pair adds a vertical score marker to each variant's distribution.
      const selected=state.records.find(r=>r.id===state.selectedId&&r.variant===variant&&r.valid);
      if(selected){
        const sx=x(selected.p);
        svg.append('line').attr('class','pl-selection-marker').attr('x1',sx).attr('x2',sx).attr('y1',top).attr('y2',bottom)
          .attr('stroke','var(--ink)').attr('stroke-width',1.8).attr('stroke-dasharray','4 3').attr('pointer-events','none');
        svg.append('circle').attr('cx',sx).attr('cy',top+7).attr('r',4.2).attr('fill','var(--ink)').attr('stroke','var(--surface)').attr('stroke-width',1.5).attr('pointer-events','none');
        const label=variant==='baseline'?'B':'A';
        const leftHalf=sx>W/2;
        svg.append('text').attr('x',sx+(leftHalf?-7:7)).attr('y',top+19).attr('text-anchor',leftHalf?'end':'start')
          .attr('fill','var(--ink)').attr('font-weight',700).attr('pointer-events','none')
          .text(`${label}: ${pct(selected.p)}`);
      }
      svg.append('line').attr('x1',m.left).attr('x2',W-m.right).attr('y1',bottom).attr('y2',bottom).attr('stroke','var(--axis)');
    });
    svg.append('g').attr('transform',`translate(0,${H-m.bottom})`).call(d3.axisBottom(x).tickValues([0,.25,.5,.75,1]).tickFormat(d3.format('.0%')));
    svg.append('text').attr('x',W/2).attr('y',H-4).attr('text-anchor','middle').text('Qwen3Guard P(refusal)');
    const counts=Object.fromEntries(OUTCOMES.map(o=>[o,data.filter(r=>r.outcome===o).length]));
    $('pl-distribution-info').textContent=`${data.length} scored response(s) in these filters · `+OUTCOMES.map(k=>`${outcomeName(k)} ${counts[k]}`).join(' · ');
    renderTopTable();
  }
  function chooseBin(variant,index){
    if(state.binFilter?.variant===variant&&state.binFilter?.index===index)state.binFilter=null;
    else state.binFilter={variant,index};
    renderHistogram();
  }
  function renderTopTable(){
    const all=filteredRecords();
    const bin=state.binFilter;
    const narrowed=bin?all.filter(r=>r.variant===bin.variant&&binIndex(r.p)===bin.index):all;
    const data=narrowed.sort((a,b)=>Math.abs(a.p-.5)-Math.abs(b.p-.5)).slice(0,18);
    const table=$('pl-uncertain-table');table.replaceChildren();
    if(!data.length){
      const row=document.createElement('tr'),cell=document.createElement('td');cell.colSpan=4;cell.textContent='No responses match the selected bin and filters.';row.append(cell);table.append(row);
    }
    for(const r of data){
      const row=document.createElement('tr');row.dataset.id=r.id;row.tabIndex=0;
      if(r.id===state.selectedId)row.classList.add('pl-selected-row');
      for(const t of [r.id,variantName(r.variant),outcomeName(r.outcome),pct(r.p)]){const cell=document.createElement('td');cell.textContent=t;row.append(cell);}
      row.addEventListener('click',()=>selectId(r.id));
      row.addEventListener('keydown',ev=>{if(ev.key==='Enter'){selectId(r.id);}});
      table.append(row);
    }
    const status=$('pl-bin-status');const clear=$('pl-clear-bin');
    if(bin){
      status.textContent=`Inspecting ${narrowed.length} ${variantName(bin.variant).toLowerCase()} response(s) with P(refusal) ${pct(bin.index/20)}–${pct((bin.index+1)/20)}. Click the bin again or clear to restore the queue.`;
      clear.hidden=false;
    }else{
      status.textContent=`Showing the ${data.length} responses closest to 50% from ${all.length} in the current filters. Click a histogram bin to inspect that interval.`;
      clear.hidden=true;
    }
  }
  function renderInspector(){
    const id=state.selectedId;$('pl-current-id').textContent=id||'No response selected';
    const group=state.records.filter(r=>r.id===id),base=group.find(r=>r.variant==='baseline'),abl=group.find(r=>r.variant==='ablation');
    $('pl-prompt').textContent=base?.prompt||abl?.prompt||'Load a result file to inspect responses.';
    for(const [tag,r] of [['base',base],['abl',abl]]){
      $('pl-text-'+tag).textContent=r?.response||'Not yet present in this partial file.';
      $('pl-score-'+tag).textContent=r?.valid?pct(r.p):'—';
      $('pl-bar-'+tag).style.width=r?.valid?(r.p*100)+'%':'0%';
      const badge=$('pl-outcome-'+tag);badge.textContent=r?outcomeName(r.outcome):'Not available';badge.style.background=r?color(r.outcome):'var(--surface-2)';
      const summary=r?`Generated refusal: ${r.generatedLabel||'unknown'} · Probability-based refusal: ${r.valid?scoreLabel(r.p):'unknown'}${r.valid&&r.p===.5?' (50% tie → No refusal)':''} · Safety: ${r.safety||'unknown'} · ${r.score_method||'method unknown'}`:'Pending';
      const mismatch=r?.valid&&r.generatedLabel&&r.generatedLabel!==scoreLabel(r.p);
      $('pl-judge-'+tag).textContent=summary+(mismatch?' · LABEL / SCORE MISMATCH':'');
      $('pl-judge-'+tag).classList.toggle('pl-warning',!!mismatch);
    }
  }
  function render(){renderScatter();renderHistogram();renderInspector();renderKpis();}
  $('pl-upload').addEventListener('change',async event=>{
    const f=event.target.files?.[0];if(!f)return;
    try{const {rows,issues}=parseText(await f.text(),f.name);if(!rows.length)throw Error('No complete records found.');updateRows(rows,f.name,issues);}
    catch(e){setStatus('Unable to load file: '+e.message,true);console.error(e);}
  });
  for(const id of ['pl-category','pl-outcome','pl-outcome-side','pl-transition','pl-variant','pl-focus','pl-search']){
    $(id).addEventListener(id==='pl-search'?'input':'change',()=>{renderScatter();renderHistogram();renderKpis();});
  }
  $('pl-clear-bin').addEventListener('click',()=>{state.binFilter=null;renderHistogram();});
  $('pl-nearby').addEventListener('change',event=>{if(event.target.value)selectId(event.target.value);});
  $('pl-next-nearby').addEventListener('click',()=>{
    const ids=state.nearbyPool;
    if(ids.length<2)return;
    const current=ids.indexOf(state.selectedId);
    selectId(ids[(current+1)%ids.length]);
  });
  drawLegend('pl-outcome-legend',[...OUTCOMES,'unknown']);
  drawLegend('pl-hist-legend',[...OUTCOMES,'unknown']);
  render();
})();
