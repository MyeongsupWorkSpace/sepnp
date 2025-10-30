/* 제품 등록 페이지 스크립트 (인라인 제거 버전) */
(function(){
  const NF = new Intl.NumberFormat('ko-KR');
  const $ = s=>document.querySelector(s);
  const $$ = s=>Array.from(document.querySelectorAll(s));

  // ========== 거래처 ==========
  const VENDOR_KEY='sepnp_vendors_v1';
  const loadVendors = ()=> JSON.parse(localStorage.getItem(VENDOR_KEY)||'[]');
  const saveVendors = list => localStorage.setItem(VENDOR_KEY, JSON.stringify(list));
  const vendorRankedList = (term)=>{
    const t=(term||'').trim().toLowerCase();
    let list = loadVendors().slice();
    list.sort((a,b)=>a.localeCompare(b,'ko'));
    return t? list.filter(v=>v.toLowerCase().includes(t)) : list;
  };

  let selectedVendor=null;

  function bindVendorModal(){
    const prodVendor = $('#prodVendor');
    $('#btnVendorManage').addEventListener('click', ()=>{
      selectedVendor=null;
      $('#vendorSearch').value=prodVendor.value;
      renderVendorList();
      $('#vendorModal').classList.add('show');
    });
    $('#btnVendorClose').addEventListener('click', ()=>$('#vendorModal').classList.remove('show'));
    $('#vendorModal').addEventListener('click', (e)=>{ if(e.target===$('#vendorModal')) $('#vendorModal').classList.remove('show'); });
    $('#vendorSearch').addEventListener('input', renderVendorList);

    $('#btnVendorComplete').addEventListener('click', ()=>{
      if(selectedVendor){ prodVendor.value = selectedVendor; }
      $('#vendorModal').classList.remove('show');
    });

    function renderVendorList(){
      const term = $('#vendorSearch').value;
      const list = vendorRankedList(term);
      if(!list.length){ $('#vendorListArea').innerHTML='<div class="mini" style="padding:8px;">등록된 거래처가 없습니다.</div>'; return; }
      $('#vendorListArea').innerHTML = list.map(v=>
        `<div class="row-inline" style="justify-content:space-between; padding:4px 6px;">
          <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${v}</span>
          <button type="button" class="btn ${selectedVendor===v?'vendor-selected':''}" data-select="${v}">선택</button>
        </div>`).join('');
    }
    $('#vendorListArea').addEventListener('click', (e)=>{
      const v = e.target?.dataset?.select;
      if(!v) return;
      selectedVendor=v; $('#vendorSearch').value=v;
      const term = $('#vendorSearch').value;
      const list = vendorRankedList(term);
      $('#vendorListArea').innerHTML = list.map(x=>
        `<div class="row-inline" style="justify-content:space-between; padding:4px 6px;">
          <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${x}</span>
          <button type="button" class="btn ${selectedVendor===x?'vendor-selected':''}" data-select="${x}">선택</button>
        </div>`).join('');
    });
    $('#btnVendorAdd').addEventListener('click', ()=>{
      const v = $('#vendorSearch').value.trim();
      if(!v) return;
      const list = loadVendors();
      if(list.includes(v)){ alert('이미 등록됨'); return; }
      list.push(v); saveVendors(list); selectedVendor=v; renderVendorList();
    });
    $('#btnVendorUpdate').addEventListener('click', ()=>{
      if(!selectedVendor){ alert('수정할 거래처 선택'); return; }
      const v = $('#vendorSearch').value.trim();
      if(!v){ alert('거래처명 입력'); return; }
      const list = loadVendors(); const idx = list.indexOf(selectedVendor);
      if(idx>-1){ list[idx]=v; saveVendors(list); selectedVendor=v; renderVendorList(); }
    });
    $('#btnVendorDelete').addEventListener('click', ()=>{
      if(!selectedVendor){ alert('삭제할 거래처 선택'); return; }
      let list = loadVendors().filter(x=>x!==selectedVendor);
      saveVendors(list); selectedVendor=null; $('#vendorSearch').value=''; renderVendorList();
    });
  }

  // ========== 용지 / 합지 ==========
  const PAPER_KEY = 'sepnp_papers_v1';
  const loadPapers = () => JSON.parse(localStorage.getItem(PAPER_KEY)||'[]');
  const savePapers = arr => localStorage.setItem(PAPER_KEY, JSON.stringify(arr));
  function renderPaperSelect(selVal){
    const sel = $('#prodPaperType');
    const list = loadPapers().sort((a,b)=>a.localeCompare(b,'ko'));
    sel.innerHTML = '<option value="">용지 선택</option>' + list.map(v=>`<option value="${v}">${v}</option>`).join('');
    if(selVal) sel.value = selVal;
  }

  const LAMINATE_KEY = 'sepnp_laminates_v1';
  const loadLaminates = () => JSON.parse(localStorage.getItem(LAMINATE_KEY)||'[]');
  const saveLaminates = arr => localStorage.setItem(LAMINATE_KEY, JSON.stringify(arr));
  function renderLaminateSelect(selVal){
    const sel = $('#prodLaminateType');
    const list = loadLaminates().sort((a,b)=>a.localeCompare(b,'ko'));
    sel.innerHTML = '<option value="">합지 선택</option>' + list.map(v=>`<option value="${v}">${v}</option>`).join('');
    if(selVal) sel.value = selVal;
  }

  function bindPaperLaminate(){
    $('#btnAddPaper').addEventListener('click', ()=>{
      const name = (prompt('추가할 용지명')||'').trim();
      if(!name) return;
      const list = loadPapers();
      if(!list.includes(name)){ list.push(name); savePapers(list); }
      renderPaperSelect(name);
    });
    renderPaperSelect();

    $('#btnAddLaminate').addEventListener('click', ()=>{
      const name = (prompt('추가할 합지명')||'').trim();
      if(!name) return;
      const list = loadLaminates();
      if(!list.includes(name)){ list.push(name); saveLaminates(list); }
      renderLaminateSelect(name);
    });
    renderLaminateSelect();

    const lamNone=$('#lamNone'), lamSel=$('#prodLaminateType'), lamAddBtn=$('#btnAddLaminate'), lamW=$('#prodLamWidth'), lamH=$('#prodLamHeight'), lamRow=$('#laminateRow');
    function updateLaminateDisabled(){
      const dis=lamNone.checked;
      lamSel.disabled=dis; lamSel.classList.toggle('is-disabled',dis); if(dis) lamSel.value='';
      lamAddBtn.disabled=dis; lamAddBtn.classList.toggle('is-disabled',dis);
      [lamW,lamH].forEach(el=>{ el.disabled=dis; el.classList.toggle('is-disabled',dis); if(dis) el.value=''; });
      lamRow.classList.toggle('is-disabled',dis);
    }
    lamNone.addEventListener('change', updateLaminateDisabled);
    updateLaminateDisabled();
  }

  // ========== 단가 ==========
  const priceEl = ()=>$('#prodPrice');
  function cleanDecimal(raw){ let s=(raw||'').replace(/[^\d.]/g,''); const i=s.indexOf('.'); if(i!==-1) s=s.slice(0,i+1)+s.slice(i+1).replace(/\./g,''); if(s==='.') s='0.'; return s; }
  function formatWithCommaDecimal(raw){ const s=cleanDecimal(raw); const hasDot=s.includes('.'); const [iRaw,d='']=s.split('.'); const i=iRaw.replace(/^0+(?=\d)/,''); const f=i?NF.format(Number(i)):'0'; return hasDot?`${f}.${d}`:f; }
  function bindPrice(){
    const el = priceEl();
    el.addEventListener('focus', ()=>{ el.value=(el.value||'').replace(/,/g,''); setTimeout(()=>el.setSelectionRange(el.value.length,el.value.length),0); });
    el.addEventListener('input', ()=>{ el.value=formatWithCommaDecimal(el.value); });
    el.addEventListener('blur', ()=>{ el.value=formatWithCommaDecimal(el.value); });
  }
  const getPriceValue = ()=>{ const raw=(priceEl().value||'').replace(/,/g,''); const n=parseFloat(raw); return Number.isNaN(n)?null:n; };

  // ========== 공정 ==========
  let processSummaries = [];
  function renderProcessSummary(){
    const processSummaryList = $('#processSummaryList');
    if(!processSummaries.length){
      processSummaryList.innerHTML = '<li class="mini">등록된 공정이 없습니다.</li>'; return;
    }
    // 카테고리 그룹핑
    const grouped = {};
    processSummaries.forEach((s, idx)=>{
      let category='';
      if(s.startsWith('UV인쇄') || s.startsWith('옵셋인쇄')) category='인쇄';
      else if(s.startsWith('코팅')) category='코팅';
      else if(s.startsWith('금박')) category='금박';
      else if(s.startsWith('형압')) category='형압';
      else if(s.startsWith('합지')) category='합지';
      else if(s.startsWith('톰슨')) category='톰슨';
      else if(s.startsWith('접착')) category='접착';
      else category = s.split(' ')[0];
      if(!grouped[category]) grouped[category]=[];
      grouped[category].push({text:s, index:idx}); // .p 오타 수정
    });
    const order = ['인쇄','코팅','금박','형압','합지','톰슨','접착'];
    let html='';
    order.forEach(cat=>{
      if(grouped[cat]){
        html += `<li style="background:#e7f3ff; border-color:#0078d4; font-weight:600; padding:4px 10px;">${cat}</li>`;
        grouped[cat].forEach(item=>{
          html += `<li data-index="${item.index}" style="cursor:pointer; margin-left:16px; background:#fff;" title="우클릭으로 삭제">${item.text}</li>`;
        });
      }
    });
    processSummaryList.innerHTML = html;

    // 우클릭 삭제
    processSummaryList.addEventListener('contextmenu', (e)=>{
      e.preventDefault();
      const li = e.target.closest('li[data-index]');
      if(!li) return;
      const idx = parseInt(li.dataset.index,10);
      const name = processSummaries[idx];
      if(confirm(`"${name}" 공정을 삭제하시겠습니까?`)){
        processSummaries.splice(idx,1);
        renderProcessSummary();
      }
    });
  }

  function attachRegisterHandler(){ const b=$('#btnProcessRegister'); b && b.addEventListener('click', registerCurrentProcess); }

  const processDetailEl = ()=>$('#processDetail');
  function renderPrintDetail(){
    processDetailEl().innerHTML = `
      <div style="margin-bottom:8px;"><strong>인쇄</strong></div>
      <div class="row-inline" style="margin-bottom:8px;">
        <span>도수:</span>
        <select id="printColorCount" class="sel" style="width:70px">
          <option value="0">0도</option><option value="1">1도</option><option value="2">2도</option>
          <option value="3">3도</option><option value="4" selected>4도</option><option value="5">5도</option><option value="6">6도</option>
        </select>
        <span class="mini">별색:</span>
        <select id="printSpotCount" class="sel" style="width:70px">
          <option value="0" selected>0도</option><option value="1">1도</option><option value="2">2도</option><option value="3">3도</option>
        </select>
      </div>
      <div class="row-inline" style="margin-bottom:8px;">
        <span>면:</span>
        <label><input type="checkbox" id="printSideFront"> 전면</label>
        <label><input type="checkbox" id="printSideBack"> 후면</label>
        <span class="mini">(둘 다 체크 = 양면)</span>
      </div>
      <div class="row-inline" style="margin-bottom:8px;">
        <span>방식:</span>
        <label><input type="radio" name="printMethod" value="옵셋" checked> 옵셋인쇄</label>
        <label><input type="radio" name="printMethod" value="UV"> UV인쇄</label>
      </div>
      <div class="row-inline"><button type="button" class="btn primary" id="btnProcessRegister">등록</button></div>
    `;
    processDetailEl().style.display='block'; attachRegisterHandler();
  }
  function renderCoatingDetail(){
    processDetailEl().innerHTML = `
      <div style="margin-bottom:8px;"><strong>코팅</strong></div>
      <div class="row-inline" style="margin-bottom:8px;">
        <span>종류:</span><select id="coatingType" class="sel" style="width:150px;">
          <option value="무광CR">무광CR</option><option value="유광CR">유광CR</option><option value="무광라미">무광라미</option>
          <option value="유광라미">유광라미</option><option value="부분UV">부분UV</option><option value="전면UV">전면UV</option>
          <option value="오버코팅">오버코팅</option><option value="실크">실크</option><option value="기타">기타</option>
        </select>
      </div>
      <div class="row-inline" style="margin-bottom:8px;">
        <span>면:</span>
        <label><input type="checkbox" id="coatingSideFront"> 전면</label>
        <label><input type="checkbox" id="coatingSideBack"> 후면</label>
        <span class="mini">(둘 다 체크 = 양면)</span>
      </div>
      <div class="row-inline" style="margin-bottom:8px;">
        <span>메모:</span><input id="coatingNote" class="inp" placeholder="코팅 상세 (기타 시 필수)" />
      </div>
      <div class="row-inline"><button type="button" class="btn primary" id="btnProcessRegister">등록</button></div>
    `;
    processDetailEl().style.display='block'; attachRegisterHandler();
  }
  function renderFoilDetail(){
    processDetailEl().innerHTML = `
      <div style="margin-bottom:8px;"><strong>금박</strong></div>
      <div class="row-inline" style="margin-bottom:8px;">
        <span>색상:</span><input id="foilColor" class="inp" placeholder="예: 금색, 은색, 로즈골드 등" />
      </div>
      <div class="row-inline"><button type="button" class="btn primary" id="btnProcessRegister">등록</button></div>
    `; processDetailEl().style.display='block'; attachRegisterHandler();
  }
  function renderEmbossDetail(){
    processDetailEl().innerHTML = `
      <div style="margin-bottom:8px;"><strong>형압</strong></div>
      <div class="row-inline" style="margin-bottom:8px;">
        <span>종류:</span><select id="embossType" class="sel" style="width:150px;">
          <option value="볼록(엠보)">볼록(엠보)</option><option value="오목(디보)">오목(디보)</option>
        </select>
      </div>
      <div class="row-inline"><button type="button" class="btn primary" id="btnProcessRegister">등록</button></div>
    `; processDetailEl().style.display='block'; attachRegisterHandler();
  }
  function renderLaminateDetail(){
    processDetailEl().innerHTML = `
      <div style="margin-bottom:8px;"><strong>합지</strong></div>
      <div class="row-inline" style="margin-bottom:8px;">
        <span>종류:</span><select id="laminateType" class="sel">
          <option value="F골">F골</option><option value="E골">E골</option><option value="B골">B골</option>
          <option value="AB골">AB골</option><option value="A골">A골</option>
        </select>
      </div>
      <div class="row-inline" style="margin-bottom:8px;">
        <span>면:</span>
        <label><input type="radio" name="laminateSide" value="편면" checked> 편면</label>
        <label><input type="radio" name="laminateSide" value="양면"> 양면</label>
      </div>
      <div class="row-inline"><button type="button" class="btn primary" id="btnProcessRegister">등록</button></div>
    `; processDetailEl().style.display='block'; attachRegisterHandler();
  }
  function renderGlueDetail(){
    processDetailEl().innerHTML = `
      <div style="margin-bottom:8px;"><strong>접착</strong></div>
      <div class="row-inline" style="margin-bottom:8px;">
        <span>종류:</span><select id="glueType" class="sel" style="width:150px;">
          <option value="1면">1면</option><option value="2면">2면</option><option value="3면">3면</option>
          <option value="4면">4면</option><option value="5면">5면</option><option value="6면">6면</option>
          <option value="창문접착 +1면">창문접착 +1면</option><option value="창문접착 +2면">창문접착 +2면</option>
          <option value="창문접착 +3면">창문접착 +3면</option><option value="창문접착 +4면">창문접착 +4면</option>
          <option value="기타">기타</option>
        </select>
      </div>
      <div class="row-inline" style="margin-bottom:8px;">
        <span>메모:</span><input id="glueNote" class="inp" placeholder="접착 상세 (기타 시 필수)" />
      </div>
      <div class="row-inline"><button type="button" class="btn primary" id="btnProcessRegister">등록</button></div>
    `; processDetailEl().style.display='block'; attachRegisterHandler();
  }

  function updateProcessUI(val){
    switch(val){
      case '인쇄':   return renderPrintDetail();
      case '코팅':   return renderCoatingDetail();
      case '금박':   return renderFoilDetail();
      case '형압':   return renderEmbossDetail();
      case '합지':   return renderLaminateDetail();
      case '톰슨':
        processDetailEl().style.display='none'; processDetailEl().innerHTML='';
        processSummaries.push('톰슨 일반'); renderProcessSummary(); alert('공정이 등록되었습니다: 톰슨 일반');
        const tomsonCheck = $$('input[name="process"]').find(cb=>cb.value==='톰슨'); tomsonCheck && (tomsonCheck.checked=false);
        return;
      case '접착':   return renderGlueDetail();
      default:
        processDetailEl().style.display='none'; processDetailEl().innerHTML='';
    }
  }

  function bindProcess(){
    const checks = $$('input[name="process"]');
    const list = $('#processSection');
    list.addEventListener('change',(e)=>{
      const clicked = e.target;
      if(clicked && clicked.name==='process'){
        if(clicked.checked){
          checks.forEach(cb=>{ if(cb!==clicked) cb.checked=false; });
          updateProcessUI(clicked.value);
        }else{
          processDetailEl().style.display='none'; processDetailEl().innerHTML='';
        }
      }
    });
  }

  function registerCurrentProcess(){
    const checked = $$('input[name="process"]').find(cb=>cb.checked);
    if(!checked){ alert('공정을 선택하세요.'); return; }
    let summary='';
    switch(checked.value){
      case '인쇄':{
        const color = parseInt($('#printColorCount')?.value||'0',10);
        const spot  = parseInt($('#printSpotCount')?.value||'0',10);
        const front = $('#printSideFront')?.checked||false;
        const back  = $('#printSideBack')?.checked||false;
        let sides = front&&back?'양면':front?'전면':back?'후면':'';
        if(!sides){ alert('전면/후면 중 최소 1개 선택하세요.'); return; }
        const method = (document.querySelector('input[name="printMethod"]:checked')?.value)||'옵셋';
        const methodLabel = method==='UV'?'UV인쇄':'옵셋인쇄';
        const total = color+spot;
        const spotPart = spot>0?`(별색${spot}도)`:''; summary = `${methodLabel} ${total}도${spotPart} ${sides}`; break;
      }
      case '코팅':{
        let type = $('#coatingType')?.value||''; const f=$('#coatingSideFront')?.checked||false; const b=$('#coatingSideBack')?.checked||false;
        let sides = f&&b?'양면':f?'전면':b?'후면':'';
        if(!sides){ alert('전면/후면 중 최소 1개 선택하세요.'); return; }
        const note = $('#coatingNote')?.value?.trim()||'';
        if(type==='기타'){ if(!note){ alert('기타 선택 시 메모 입력하세요.'); return; } type = note; summary = `코팅 ${type} ${sides}`; }
        else summary = `코팅 ${type} ${sides}${note?` (${note})`:''}`; break;
      }
      case '금박':{
        const color = $('#foilColor')?.value?.trim()||''; if(!color){ alert('금박 색상 입력하세요.'); return; } summary = `금박 ${color}`; break;
      }
      case '형압':{
        const type = $('#embossType')?.value||''; summary = `형압 ${type}`; break;
      }
      case '합지':{
        const type = $('#laminateType')?.value||''; const side = (document.querySelector('input[name="laminateSide"]:checked')?.value)||'편면';
        summary = `합지 ${type} ${side}`; break;
      }
      case '접착':{
        let type = $('#glueType')?.value||''; const note = $('#glueNote')?.value?.trim()||'';
        if(type==='기타'){ if(!note){ alert('기타 선택 시 메모 입력하세요.'); return; } type = note; summary = `접착 ${type}`; }
        else summary = `접착 ${type}${note?` (${note})`:''}`; break;
      }
      default: summary = checked.value;
    }
    processSummaries.push(summary);
    renderProcessSummary();
    alert(`공정이 등록되었습니다: ${summary}`);
    checked.checked=false; processDetailEl().style.display='none'; processDetailEl().innerHTML='';
  }

  // ========== 폼 ==========
  function bindForm(){
    $('#prodForm').addEventListener('submit',(e)=>{
      e.preventDefault();
      const product = {
        vendor: ($('#prodVendor').value||'').trim(),
        name: ($('#prodName').value||'').trim(),
        size: { l:+($('#prodLength').value||'')||null, w:+($('#prodWidth').value||'')||null, h:+($('#prodHeight').value||'')||null },
        paper:{ type:$('#prodPaperType').value||null, sizeW:+($('#prodPaperWidth').value||'')||null, sizeH:+($('#prodPaperHeight').value||'')||null },
        laminate: $('#prodLaminateType').value||null,
        laminationSize: $('#lamNone').checked ? null : { w:+($('#prodLamWidth').value||'')||null, h:+($('#prodLamHeight').value||'')||null },
        price: getPriceValue(),
        cutCount: +($('#prodCutCount').value||'')||null,
        knifeSize: { w:+($('#prodKnifeWidth').value||'')||null, h:+($('#prodKnifeHeight').value||'')||null },
        shipping: ($('#prodShipping').value||'').trim(),
        manager:  ($('#prodManager').value||'').trim(),
        managerPhone: ($('#prodManagerPhone').value||'').trim(),
        processes: processSummaries.slice(),
        createdAt: Date.now()
      };
      console.log('제품 등록:', product);
      alert('제품 정보가 콘솔에 출력되었습니다.');
    });

    $('#clearProducts').addEventListener('click', ()=>{
      if(confirm('입력한 내용을 모두 지울까요?')) location.reload();
    });
  }

  // 초기화
  document.addEventListener('DOMContentLoaded', ()=>{
    bindVendorModal();
    bindPaperLaminate();
    bindPrice();
    bindProcess();
    renderProcessSummary();
    bindForm();
  });
})();