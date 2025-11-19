(function(){
  // Railway 배포 시 자동으로 같은 도메인 사용
  const hostname = window.location.hostname;
  const isProduction = hostname !== 'localhost' && hostname !== '127.0.0.1';
  
  // 배포/로컬 모두 동작: 현재 도메인 기준으로 API 사용
  const API_BASE = `${window.location.origin}/api`;
  console.log('API BASE:', API_BASE);
  
  window.USE_MYSQL = true;

  async function request(endpoint, options = {}) {
    if (!window.USE_MYSQL) {
      throw new Error('MySQL 모드가 비활성화되어 있습니다.');
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.msg || data.error || `HTTP ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error('API 요청 실패:', error);
      throw error;
    }
  }

  window.API = {
    // 인증
    login: (loginId, password) => request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ loginId, password })
    }),
    
    getEmployees: () => request('/auth/employees'),
    
    saveEmployee: (emp) => request('/auth/employees', {
      method: 'POST',
      body: JSON.stringify(emp)
    }),
    
    // 작업자 편성
    getAssignments: (date) => {
      const query = date ? `?date=${date}` : '';
      return request(`/assignments${query}`);
    },
    
    createAssignment: (data) => request('/assignments', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    
    updateAssignment: (id, data) => request(`/assignments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    
    deleteAssignment: (id) => request(`/assignments/${id}`, {
      method: 'DELETE'
    }),
    
    // 제품
    getProducts: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/products${query ? '?' + query : ''}`);
    },
    
    getProduct: (id) => request(`/products/${id}`),
    
    createProduct: (data) => request('/products', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    
    updateProduct: (id, data) => request(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    
    deleteProduct: (id) => request(`/products/${id}`, {
      method: 'DELETE'
    }),
    
    updateStock: (id, stock) => request(`/products/${id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ stock })
    }),
    
    // 거래처
    getCustomers: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/customers${query ? '?' + query : ''}`);
    },
    
    createCustomer: (data) => request('/customers', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    
    updateCustomer: (id, data) => request(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    
    deleteCustomer: (id) => request(`/customers/${id}`, {
      method: 'DELETE'
    }),
    
    // 수주
    getOrders: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/orders${query ? '?' + query : ''}`);
    },
    
    createOrder: (data) => request('/orders', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    
    updateOrder: (id, data) => request(`/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    
    deleteOrder: (id) => request(`/orders/${id}`, {
      method: 'DELETE'
    }),
    
    // 통계
    getStats: () => request('/stats')
  };

  console.log('✅ API 모듈 로드 완료');
})();

/* ===== API 헬퍼(비파괴 추가) ===== */
(() => {
  'use strict';

  // 배포/로컬 자동 감지
  const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
  const API_BASE = `${location.origin}/api`; // 동일 도메인 사용
  console.log('[API] BASE:', API_BASE);

  async function request(path, options = {}) {
    const url = path.startsWith('/') ? API_BASE + path : path;
    const resp = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...(options.headers||{}) },
      ...options
    });
    const isJson = (resp.headers.get('content-type')||'').includes('application/json');
    const data = isJson ? await resp.json() : await resp.text();
    if (!resp.ok) throw new Error((data && (data.msg||data.error)) || `HTTP ${resp.status}`);
    return data;
  }

  const API = {
    postSupplier: (name) => request('/suppliers', {
      method: 'POST', body: JSON.stringify({ name })
    }),
    listSuppliers: (q='') => request(`/suppliers${q?`?q=${encodeURIComponent(q)}`:''}`),
    // 필요한 다른 엔드포인트 추가 가능
  };

  window.API = API;
})();

export async function postSupplier(name) {
  const res = await fetch('/api/suppliers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  if (!res.ok) throw new Error(`suppliers ${res.status}`);
  return res.json();
}