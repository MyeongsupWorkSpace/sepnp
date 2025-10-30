(function () {
  const NAV_ITEMS = [
    { href: 'print-plan.html', label: '인쇄계획표' },
    { href: 'assign.html', label: '인쇄배정' },
    { href: 'work-status.html', label: '작업현황' },
    { href: 'product-register.html', label: '제품 등록' },
    { href: 'order-register.html', label: '수주 오더 등록' },
    { href: 'product-list.html', label: '제품 목록' },
    { href: 'inventory.html', label: '재고현황' },
    { href: 'dispatch.html', label: '배차관리' },
    { href: 'sales.html', label: '매출현황' }
  ];

  function buildHeader() {
    const header = document.querySelector('header.fixed-header');
    if (!header) return;
    document.body.classList.add('has-header');

    const current = (location.pathname.split('/').pop() || '').toLowerCase();
    const links = NAV_ITEMS.map(it => {
      const active = current === it.href.toLowerCase() ? 'active' : '';
      return `<a href="${it.href}" class="${active}">${it.label}</a>`;
    }).join('');

    header.innerHTML = `
      <h1 style="cursor:pointer" onclick="location.href='employee.html'">SEPNP 포털</h1>
      <nav class="header-tabs">${links}</nav>
      <button id="btnLogout" class="btn-logout">로그아웃</button>
    `;

    header.querySelector('#btnLogout')?.addEventListener('click', () => {
      sessionStorage.removeItem('sepnp_emp_no');
      sessionStorage.removeItem('sepnp_emp_name');
      location.href = 'index.html';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildHeader);
  } else {
    buildHeader();
  }
})();