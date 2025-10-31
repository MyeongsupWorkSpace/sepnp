(function(){
  const KEY_EMPLOYEES = 'sepnp_employees';
  const KEY_PENDING = 'sepnp_pending_employees';

  function load(key, def=[]) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(def)); }
    catch(e){ return def; }
  }
  function save(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

  async function sha256(text){
    const enc = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }

  function findEmployeeByLoginId(loginId){
    const emps = load(KEY_EMPLOYEES);
    const id = (loginId||'').trim();
    return emps.find(e => (e.username && e.username === id) || (e.empNo && e.empNo === id));
  }

  async function ensureDefaultAdmin(){
    const emps = load(KEY_EMPLOYEES);
    let changed = false;

    // 기본 관리자 1: sepnp / 0536
    if (!emps.some(e => e.username === 'sepnp' || e.empNo === 'ADMIN')) {
      const passwordHash = await sha256('0536');
      emps.push({
        id: 'emp_admin',
        empNo: 'ADMIN',
        username: 'sepnp',
        passwordHash,
        name: '관리자',
        dept: '관리부',
        position: '관리자',
        phone: '',
        email: '',
        joinDate: new Date().toISOString().slice(0,10),
        status: 'active',
        role: 'admin',
        perms: ['*'],
        createdAt: new Date().toISOString()
      });
      changed = true;
    }

    // 기본 관리자 2: test / 123
    if (!emps.some(e => e.username === 'test' || e.empNo === 'ADMIN2')) {
      const passwordHash2 = await sha256('123');
      emps.push({
        id: 'emp_admin2',
        empNo: 'ADMIN2',
        username: 'test',
        passwordHash: passwordHash2,
        name: '관리자2',
        dept: '관리부',
        position: '관리자',
        phone: '',
        email: '',
        joinDate: new Date().toISOString().slice(0,10),
        status: 'active',
        role: 'admin',
        perms: ['*'],
        createdAt: new Date().toISOString()
      });
      changed = true;
    }

    if (changed) save(KEY_EMPLOYEES, emps);
  }

  async function signIn(loginId, password){
    if(!loginId || !password) return { ok:false, msg:'ID와 비밀번호를 입력하세요.' };

    // 기본 관리자 보장
    if ((loginId === 'sepnp' || loginId === 'test') && !findEmployeeByLoginId(loginId)) {
      await ensureDefaultAdmin();
    }

    const emp = findEmployeeByLoginId(loginId);
    if(!emp) {
      const pend = load(KEY_PENDING);
      if(pend.find(p=>p.username===loginId)) return { ok:false, msg:'관리자 승인 대기 중입니다.' };
      return { ok:false, msg:'계정을 찾을 수 없습니다.' };
    }
    if(emp.status !== 'active') return { ok:false, msg:'활성화되지 않은 계정입니다.' };

    const hash = await sha256(password);
    if(emp.passwordHash !== hash) return { ok:false, msg:'비밀번호가 일치하지 않습니다.' };

    sessionStorage.setItem('sepnp_emp_no', emp.empNo);
    sessionStorage.setItem('sepnp_emp_name', emp.name || '');
    sessionStorage.setItem('sepnp_emp_role', emp.role || 'viewer');
    sessionStorage.setItem('sepnp_emp_username', emp.username || '');
    return { ok:true, emp };
  }

  function signOut(){
    sessionStorage.removeItem('sepnp_emp_no');
    sessionStorage.removeItem('sepnp_emp_name');
    sessionStorage.removeItem('sepnp_emp_role');
    sessionStorage.removeItem('sepnp_emp_username');
  }

  async function registerPending({ username, name, dept, email, password }){
    username = (username||'').trim();
    name = (name||'').trim();
    dept = (dept||'').trim();
    email = (email||'').trim();
    if(!username || !name || !dept || !password) return { ok:false, msg:'필수 항목을 입력하세요.' };

    const emps = load(KEY_EMPLOYEES);
    const pend = load(KEY_PENDING);
    if(emps.some(e => e.username === username) || pend.some(p => p.username === username)) {
      return { ok:false, msg:'이미 사용 중인 ID입니다.' };
    }

    const passwordHash = await sha256(password);
    pend.push({ id: 'pend_'+Date.now(), username, name, dept, email, passwordHash, createdAt: new Date().toISOString() });
    save(KEY_PENDING, pend);
    return { ok:true };
  }

  function listPending(){ return load(KEY_PENDING); }
  function removePending(id){
    let pend = load(KEY_PENDING);
    pend = pend.filter(p => p.id !== id);
    save(KEY_PENDING, pend);
  }

  function upsertEmployee(emp){
    const emps = load(KEY_EMPLOYEES);
    const idx = emps.findIndex(e => e.id === emp.id || e.empNo === emp.empNo);
    if(idx >= 0) emps[idx] = emp; else emps.push(emp);
    save(KEY_EMPLOYEES, emps);
  }

  // 초기 로드시 기본 관리자 1/2 생성 시도
  ensureDefaultAdmin().catch(console.error);

  window.Auth = {
    signIn, signOut, registerPending,
    listPending, removePending, upsertEmployee,
    ensureDefaultAdmin
  };
})();