(function(){
  const KEY_EMPLOYEES='sepnp_employees';
  const ROLE_PRESETS = {
    admin: ['*'],
    manager: [
      'employee.view','employee.manage','employee.export',
      'dispatch.view','dispatch.create','dispatch.edit','dispatch.cancel','dispatch.delete',
      'sales.view','inventory.view','quotation.view',
      'product.view','order.view','plan.view','assign.view','work.view'
    ],
    staff: [
      'employee.view',
      'dispatch.view','dispatch.create','dispatch.edit','dispatch.cancel',
      'sales.view','inventory.view','quotation.view',
      'product.view','order.view','plan.view','assign.view','work.view'
    ],
    viewer: ['employee.view','dispatch.view','sales.view','inventory.view','quotation.view','product.view','work.view']
  };

  function loadEmployees(){
    try { return JSON.parse(localStorage.getItem(KEY_EMPLOYEES)||'[]'); }
    catch(e){ return []; }
  }

  function getCurrentUser(){
    const empNo = sessionStorage.getItem('sepnp_emp_no');
    if(!empNo) return null;
    const emp = loadEmployees().find(e=>e.empNo===empNo);
    if(!emp) return {role:'viewer', perms:ROLE_PRESETS.viewer};
    const role = emp.role || 'viewer';
    const perms = Array.isArray(emp.perms) && emp.perms.length
      ? emp.perms
      : (ROLE_PRESETS[role] || ROLE_PRESETS.viewer);
    return {emp, role, perms};
  }

  function has(perm){
    const cu = getCurrentUser();
    if(!cu) return false;
    if(cu.perms.includes('*')) return true;
    return cu.perms.includes(perm);
  }

  function any(perms){ return perms.some(has); }

  function applyGates(root=document){
    const nodes = root.querySelectorAll('[data-perm]');
    nodes.forEach(el=>{
      const need = el.getAttribute('data-perm').split(',').map(s=>s.trim()).filter(Boolean);
      const mode = el.getAttribute('data-perm-mode')||'disable'; // hide | disable
      const ok = any(need);
      if(ok){
        if(mode==='hide'){ el.style.display=''; }
        else{ el.disabled=false; el.classList.remove('disabled'); el.title=''; }
      }else{
        if(mode==='hide'){ el.style.display='none'; }
        else{ el.disabled=true; el.classList.add('disabled'); if(!el.title) el.title='권한이 없습니다'; }
      }
    });
  }

  window.Permissions = { has, any, applyGates, ROLE_PRESETS, getCurrentUser };
})();