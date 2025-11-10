async function loadProducts() {
  try {
    let products = [];
    
    if (window.USE_MYSQL) {
      products = await API.getProducts();
    } else {
      products = JSON.parse(localStorage.getItem('sepnp_products') || '[]');
    }
    
    // 테이블에 표시
    renderProductTable(products);
  } catch (error) {
    console.error('제품 로드 오류:', error);
    alert('제품 목록을 불러오는데 실패했습니다.');
  }
}

async function saveProduct(productData) {
  try {
    if (window.USE_MYSQL) {
      if (productData.isEdit) {
        await API.updateProduct(productData.id, productData);
      } else {
        await API.createProduct(productData);
      }
    } else {
      // localStorage 저장
      let products = JSON.parse(localStorage.getItem('sepnp_products') || '[]');
      const index = products.findIndex(p => p.id === productData.id);
      
      if (index >= 0) {
        products[index] = productData;
      } else {
        products.push(productData);
      }
      
      localStorage.setItem('sepnp_products', JSON.stringify(products));
    }
    
    alert('저장되었습니다.');
    loadProducts();
  } catch (error) {
    console.error('제품 저장 오류:', error);
    alert('저장에 실패했습니다.');
  }
}

async function deleteProduct(id) {
  if (!confirm('정말 삭제하시겠습니까?')) return;
  
  try {
    if (window.USE_MYSQL) {
      await API.deleteProduct(id);
    } else {
      let products = JSON.parse(localStorage.getItem('sepnp_products') || '[]');
      products = products.filter(p => p.id !== id);
      localStorage.setItem('sepnp_products', JSON.stringify(products));
    }
    
    alert('삭제되었습니다.');
    loadProducts();
  } catch (error) {
    console.error('제품 삭제 오류:', error);
    alert('삭제에 실패했습니다.');
  }
}