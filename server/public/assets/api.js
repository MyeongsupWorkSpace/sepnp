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
  const API_BASE = isLocal ? 'http://localhost:3000/api' : `${location.origin}/api`;

  // 전역 노출
  window.API_BASE = API_BASE;

  // fetch 공통 요청 (타임아웃 포함)
  async function request(path, options = {}) {
    const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
    const controller = new AbortController();
    const timeout = options.timeout ?? 15000;
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const resp = await fetch(url, {
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        signal: controller.signal,
        ...options,
      });

      if (resp.status === 204) return null;

      const isJson = (resp.headers.get('content-type') || '').includes('application/json');
      const data = isJson ? await resp.json() : await resp.text();

      if (!resp.ok) {
        const msg = (data && (data.msg || data.error)) || `HTTP ${resp.status}`;
        throw new Error(msg);
      }
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  // HTTP 메서드 래퍼
  const HTTP = {
    get: (p, opt) => request(p, { method: 'GET', ...(opt || {}) }),
    post: (p, body, opt) => request(p, { method: 'POST', body: JSON.stringify(body), ...(opt || {}) }),
    put: (p, body, opt) => request(p, { method: 'PUT', body: JSON.stringify(body), ...(opt || {}) }),
    patch: (p, body, opt) => request(p, { method: 'PATCH', body: JSON.stringify(body), ...(opt || {}) }),
    delete: (p, opt) => request(p, { method: 'DELETE', ...(opt || {}) }),
  };

  window.API = { request, HTTP };

  console.log('🔧 API 베이스:', API_BASE);
  console.log('🌍 환경:', isLocal ? 'Local' : 'Production');
})();