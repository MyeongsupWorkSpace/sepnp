/* 제품 등록 페이지 스크립트 (인라인 제거 버전) */
(function(){
  // 유틸
  const $ = id => document.getElementById(id);
  const qs = sel => document.querySelector(sel);

  // 상태
  let selectedVendor = null;

  // --- VENDOR (거래처) 관리 ---
  async function fetchVendors(){
    try{
      const res = await fetch('/api/suppliers');
      if(!res.ok) throw new Error('suppliers fetch failed');
      return await res.json();
    }catch(e){
      console.warn('fetchVendors failed', e);
      return [];
    }
  }

  function renderVendorList(list){
    const wrap = $('vendorListArea');
    wrap.innerHTML = '';
    if(!list.length){
      wrap.innerHTML = '<div class="mini">거래처가 없습니다.</div>';
      return;
    }
    list.forEach(v=>{
      const el = document.createElement('div');
      el.style.padding='8px';
      el.style.borderBottom='1px solid #eee';
      el.style.display='flex';
      el.style.justifyContent='space-between';
      el.style.alignItems='center';
      el.innerHTML = `<div style="min-width:0">
                        <div style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${v.name}</div>
                        <div class="mini">${v.contact||''} ${v.phone||''}</div>
                      </div>
                      <div style="margin-left:8px">
                        <button class="btn select-vendor" data-id="${v.id}">선택</button>
                      </div>`;
      wrap.appendChild(el);
    });
    // 바인딩
    wrap.querySelectorAll('.select-vendor').forEach(b=>{
      b.addEventListener('click', async e=>{
        const id = b.dataset.id;
        const chosen = list.find(x=>String(x.id)===String(id));
        if(chosen){
          selectVendor(chosen);
          closeVendorModal();
        }
      });
    });
  }

  async function openVendorModal(){
    $('vendorModal').classList.add('show');
    $('vendorSearch').value = '';
    const list = await fetchVendors();
    renderVendorList(list);
    $('vendorSearch').focus();
  }
  function closeVendorModal(){ $('vendorModal').classList.remove('show'); }

  function selectVendor(v){
    selectedVendor = v;
    $('prodVendor').value = v.name;
    $('prodVendor').dataset.vendorId = v.id;
  }

  async function handleVendorSearch(){
    const q = $('vendorSearch').value.trim().toLowerCase();
    const list = await fetchVendors();
    const filtered = list.filter(v => (v.name||'').toLowerCase().includes(q) || (v.contact||'').toLowerCase().includes(q));
    renderVendorList(filtered);
  }

  // Vendor add/update/delete (간단 구현)
  async function vendorAdd(){
    const name = prompt('추가할 거래처 이름을 입력하세요');
    if(!name) return;
    try{
      const res = await fetch('/api/suppliers', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ name })
      });
      if(!res.ok) throw new Error('add failed');
      const list = await fetchVendors();
      renderVendorList(list);
    }catch(e){ alert('거래처 추가 실패'); console.error(e); }
  }

  async function vendorDelete(){
    const id = $('vendorListArea').querySelector('.select-vendor')?.dataset?.id;
    // 단순화: 삭제는 리스트에서 선택후 처리 별도 구현 권장
    alert('거래처 삭제는 목록에서 항목 선택 후 구현하세요.');
  }

  // --- PAPER (용지 / 합지) 관리 ---
  async function loadPapers(){
    try{
      const res = await fetch('/api/papers');
      if(!res.ok) throw new Error('papers fetch failed');
      const list = await res.json();
      populatePaperSelects(list);
      return list;
    }catch(e){
      console.warn('loadPapers failed', e);
      return [];
    }
  }

  function populatePaperSelects(list){
    const selP = $('prodPaperType');
    const selL = $('prodLaminateType');
    const makeOpt = (p) => {
      const o = document.createElement('option');
      o.value = p.id ?? (`local:${p.name}`);
      o.textContent = p.name + (p.size ? ` (${p.size})` : '');
      return o;
    };
    // 기본 초기화
    [selP, selL].forEach(s => { s.innerHTML = '<option value="">용지 선택</option>'; });
    list.forEach(p=>{
      selP.appendChild(makeOpt(p));
      selL.appendChild(makeOpt(p));
    });
  }

  async function openPaperModal(){
    $('paperModal').classList.add('show');
    $('paperTypeInput').value = '';
    $('paperSpecInput').value = '';
    $('paperTypeInput').focus();
  }
  function closePaperModal(){ $('paperModal').classList.remove('show'); }

  // 저장: 타입 레지스트리도 생성(선택시) + 규격 포함한 복합 레코드 생성
  async function savePaperEntries(){
    const type = $('paperTypeInput').value.trim();
    const spec = $('paperSpecInput').value.trim();
    const createType = $('paperCreateType').checked;

    if(!type && !spec){ alert('타입 또는 규격 중 하나를 입력하세요.'); return; }

    try{
      // 1) 타입 레지스트리(선택시)
      if(createType && type){
        // create minimal paper row for type (name=type)
        await fetch('/api/papers', {
          method:'POST',
          headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify({ name: type })
        }).catch(()=>{ /* ignore */ });
      }

      // 2) 복합 규격 레코드: name = `${type} ${spec}` , size = spec
      const combinedName = (type && spec) ? `${type} ${spec}` : (type || spec);
      let createdId = null;
      try{
        const res = await fetch('/api/papers', {
          method:'POST',
          headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify({ name: combinedName, size: spec || null })
        });
        if(res.ok){
          const json = await res.json();
          // 서버가 생성된 id 반환하면 선택시 사용
          createdId = json.id || json.insertId || null;
        }
      }catch(e){
        console.warn('create combined paper failed', e);
      }

      // 3) reload select list and select created item if possible
      const list = await loadPapers();
      if(createdId){
        // 선택
        ['prodPaperType','prodLaminateType'].forEach(sid=>{
          const s = $(sid);
          const opt = Array.from(s.options).find(o => String(o.value) === String(createdId));
          if(opt) s.value = createdId;
        });
      } else {
        // fallback: select option by matching text
        ['prodPaperType','prodLaminateType'].forEach(sid=>{
          const s = $(sid);
          const targetText = combinedName + (spec ? ` (${spec})` : '');
          const opt = Array.from(s.options).find(o => o.textContent === targetText);
          if(opt) s.value = opt.value;
        });
      }

      alert('용지(합지) 등록 완료');
      closePaperModal();
    }catch(e){
      console.error(e);
      alert('용지 등록 중 오류');
    }
  }

  // --- 초기화 바인딩 ---
  document.addEventListener('DOMContentLoaded', async ()=>{
    // vendor modal open
    $('btnVendorManage').addEventListener('click', openVendorModal);
    $('btnVendorClose').addEventListener('click', closeVendorModal);
    $('btnVendorComplete').addEventListener('click', ()=>{ closeVendorModal(); });

    $('vendorSearch').addEventListener('input', debounce(handleVendorSearch, 250));
    $('btnVendorAdd').addEventListener('click', vendorAdd);
    $('btnVendorUpdate').addEventListener('click', ()=>alert('거래처 수정 기능은 추후 구현하세요.'));
    $('btnVendorDelete').addEventListener('click', vendorDelete);

    // paper modal open
    $('btnAddPaper').addEventListener('click', openPaperModal);
    $('btnPaperCancel').addEventListener('click', closePaperModal);
    $('btnPaperSave').addEventListener('click', savePaperEntries);

    // load initial lists
    await loadPapers();
  });

  // debounce
  function debounce(fn, wait){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), wait); }; }

  // expose for debugging
  window._pr = { openVendorModal, openPaperModal, loadPapers };

})();

// 예시: 폼에서 값 읽어 POST
async function submitProductForm(evt) {
  evt.preventDefault();
  const payload = {
    code: document.querySelector('#code').value,
    name: document.querySelector('#name').value,
    description: document.querySelector('#description').value,
    price: parseFloat(document.querySelector('#price').value || 0),
    supplier: {
      name: document.querySelector('#supplier_name').value,
      contact: document.querySelector('#supplier_contact').value
    },
    paper: {
      name: document.querySelector('#paper_name').value,
      size: document.querySelector('#paper_size').value,
      weight: document.querySelector('#paper_weight').value
    }
  };

  const res = await fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const j = await res.json();
  if (res.ok) {
    alert('제품 등록 완료: ' + j.productId);
  } else {
    alert('등록 실패: ' + (j.error || res.status));
  }
}

// --- 거래처 자동완성 추가 / 교체 섹션 ---
(async function vendorAutocompleteModule(){
  const $ = id => document.getElementById(id);
  let cacheVendors = null;
  let suggestions = [];
  let selIndex = -1;

  async function fetchVendors(force=false){
    if(cacheVendors && !force) return cacheVendors;
    try{
      const res = await fetch('/api/suppliers');
      cacheVendors = res.ok ? await res.json() : [];
    }catch(e){
      cacheVendors = [];
    }
    return cacheVendors;
  }

  function score(vName, q){
    if(!q) return 9999;
    const name = (vName||'').toLowerCase();
    const ql = q.toLowerCase();
    if(name.startsWith(ql)) return 0;
    const idx = name.indexOf(ql);
    if(idx>=0) return 10 + idx; // includes, prefer earlier matches
    // approximate match: count sequential matching chars
    let matched = 0, pi = 0;
    for(const ch of ql){
      const pos = name.indexOf(ch, pi);
      if(pos>=0){ matched++; pi = pos+1; } else break;
    }
    return 200 - matched*5 + name.length*0.1;
  }

  function renderDropdown(list, q){
    const wrap = $('vendorDropdown');
    wrap.innerHTML = '';
    suggestions = list;
    selIndex = -1;
    if(list.length === 0){
      const no = document.createElement('div');
      no.className = 'mini';
      no.style.padding = '10px';
      no.textContent = `결과 없음 — Enter로 "${q}" 신규 거래처 생성`;
      wrap.appendChild(no);
      wrap.style.display = 'block';
      return;
    }
    for(let i=0;i<list.length;i++){
      const v = list[i];
      const row = document.createElement('div');
      row.className = 'vendor-row';
      row.dataset.index = i;
      row.style.padding = '8px 10px';
      row.style.cursor = 'pointer';
      row.style.borderBottom = '1px solid #f2f6f8';
      row.innerHTML = `<div style="min-width:0">
                         <div style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(v.name)}</div>
                         <div class="mini">${escapeHtml(v.contact||'')} ${escapeHtml(v.phone||'')}</div>
                       </div>
                       <div style="margin-left:8px;color:#666">선택</div>`;
      row.addEventListener('click', ()=> chooseByIndex(i));
      wrap.appendChild(row);
    }
    wrap.style.display = 'block';
  }

  function hideDropdown(){ const w=$('vendorDropdown'); if(w) w.style.display='none'; suggestions=[]; selIndex=-1; }

  function chooseByIndex(i){
    const v = suggestions[i];
    if(!v) return;
    const input = $('prodVendor');
    input.value = v.name;
    input.dataset.vendorId = v.id;
    hideDropdown();
  }

  async function createVendor(name){
    try{
      const res = await fetch('/api/suppliers', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ name })
      });
      const text = await res.text();
      let json;
      try{ json = text ? JSON.parse(text) : null; } catch(e){ json = { raw: text }; }
      if(!res.ok){
        console.error('POST /api/suppliers 실패', res.status, json);
        throw new Error(`서버 응답 ${res.status}`);
      }
      // 응답에 id 반환 기대
      const newId = (json && (json.id || json.insertId)) || null;
      // 캐시 갱신
      await fetchVendors(true);
      if(newId){
        const found = cacheVendors.find(x=>String(x.id)===String(newId));
        if(found){
          $('prodVendor').value = found.name;
          $('prodVendor').dataset.vendorId = found.id;
        } else {
          $('prodVendor').value = name;
          $('prodVendor').dataset.vendorId = newId;
        }
      } else {
        // 서버가 id를 안줬을 때의 안전 처리
        $('prodVendor').value = name;
        $('prodVendor').dataset.vendorId = '';
      }
      hideDropdown();
      return json;
    }catch(e){
      console.error('createVendor error', e);
      throw e;
    }
  }

  function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  async function onInput(e){
    const q = e.target.value.trim();
    if(!q){ hideDropdown(); return; }
    const list = await fetchVendors();
    const scored = list
      .map(v=>({ v, s: score(v.name, q) }))
      .filter(x=>x.s < 1000) // includes or fuzzy
      .sort((a,b)=> a.s - b.s)
      .map(x=>x.v)
      .slice(0,50);
    renderDropdown(scored, q);
  }

  function highlight(index){
    const wrap = $('vendorDropdown');
    if(!wrap) return;
    Array.from(wrap.children).forEach((ch,i)=>{
      ch.style.background = i===index ? '#f6fbff' : '#fff';
    });
    const el = wrap.children[index];
    if(el) el.scrollIntoView({ block:'nearest' });
  }

  // 기존 onKey -> 아래로 교체
  async function onKey(e){
    const wrap = $('vendorDropdown');
    const visible = wrap && wrap.style.display !== 'none';
    if(e.key === 'ArrowDown' && visible){
      selIndex = Math.min(suggestions.length - 1, selIndex + 1);
      highlight(selIndex);
      e.preventDefault();
      return;
    }
    if(e.key === 'ArrowUp' && visible){
      selIndex = Math.max(0, selIndex - 1);
      highlight(selIndex);
      e.preventDefault();
      return;
    }

    if(e.key === 'Enter'){
      // 드롭다운에서 선택된 항목이 있으면 그것으로, 없으면 입력값으로 신규 생성 시도
      if(visible && selIndex >= 0 && suggestions[selIndex]) {
        chooseByIndex(selIndex);
      } else {
        const name = $('prodVendor').value.trim();
        if(name){
          // 비동기로 시도하고 실패하면 콘솔/alert로 노출
          try{
            await createVendor(name);
          }catch(err){
            console.error('createVendor failed:', err);
            alert('거래처 생성 실패 (서버 에러). 개발자 콘솔을 확인하세요.');
          }
        }
      }
      e.preventDefault();
      return;
    }

    if(e.key === 'Escape' && visible){
      hideDropdown();
      e.preventDefault();
    }
  }

  document.addEventListener('click', (ev)=>{
    if(!ev.target.closest || (!ev.target.closest('#vendorDropdown') && ev.target.id !== 'prodVendor')){
      hideDropdown();
    }
  });

  document.addEventListener('DOMContentLoaded', async ()=>{
    const input = $('prodVendor');
    if(!input) return;
    input.removeAttribute('readonly'); // 기존 readonly 제거
    input.addEventListener('input', debounce(onInput, 180));
    input.addEventListener('keydown', onKey);

    // vendor manage 버튼은 기존 모달 유지
    const btn = $('btnVendorManage');
    if(btn) btn.addEventListener('click', ()=> {
      // open existing vendor modal if present
      const modal = document.getElementById('vendorModal');
      if(modal) modal.classList.add('show');
    });

    // preload vendors
    await fetchVendors();
  });

  function debounce(fn, t){ let h; return (...a)=>{ clearTimeout(h); h=setTimeout(()=>fn(...a), t); }; }

})(); 
// --- end 거래처 자동완성 섹션 ---