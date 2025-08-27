import { useState } from 'react';
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000';

export default function Home() {
  const [shop, setShop] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);

  const handleInstallApp = async (e) => {
    e.preventDefault();
    if (!shop) return;

    setLoading(true);
    setError('');

    try {
      const response = await axios.get(`${API_BASE}/auth?shop=${shop}`);
      window.location.href = response.data.authURL;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate install URL');
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    if (!shop) return;

    try {
      const response = await axios.get(`${API_BASE}/products/${shop}`);
      setProducts(response.data.data.products.edges);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch products');
    }
  };

  const fetchOrders = async () => {
    if (!shop) return;

    try {
      const response = await axios.get(`${API_BASE}/orders/${shop}`);
      setOrders(response.data.data.orders.edges);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch orders');
    }
  };

  return (
    <div className="container">
      <h1>Shopify SaaS Integration</h1>
      
      <div className="install-section">
        <h2>Install App</h2>
        <form onSubmit={handleInstallApp}>
          <div className="form-group">
            <label htmlFor="shop">Shop Domain:</label>
            <input
              type="text"
              id="shop"
              value={shop}
              onChange={(e) => setShop(e.target.value)}
              placeholder="your-shop-name"
              disabled={loading}
            />
            <span className="domain-suffix">.myshopify.com</span>
          </div>
          <button type="submit" disabled={loading || !shop}>
            {loading ? 'Connecting...' : 'Connect to Shopify'}
          </button>
        </form>
        {error && <div className="error">{error}</div>}
      </div>

      {shop && (
        <div className="data-section">
          <h2>Shop Data</h2>
          <div className="actions">
            <button onClick={fetchProducts}>Fetch Products</button>
            <button onClick={fetchOrders}>Fetch Orders</button>
          </div>

          {products.length > 0 && (
            <div className="products-section">
              <h3>Products</h3>
              <div className="products-grid">
                {products.map(({ node: product }) => (
                  <div key={product.id} className="product-card">
                    <h4>{product.title}</h4>
                    <p>Status: {product.status}</p>
                    <p>Vendor: {product.vendor}</p>
                    <p>Type: {product.productType}</p>
                    <p>Inventory: {product.totalInventory}</p>
                    {product.images.edges[0] && (
                      <img 
                        src={product.images.edges[0].node.url} 
                        alt={product.images.edges[0].node.altText || product.title}
                        className="product-image"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {orders.length > 0 && (
            <div className="orders-section">
              <h3>Orders</h3>
              <div className="orders-list">
                {orders.map(({ node: order }) => (
                  <div key={order.id} className="order-card">
                    <h4>{order.name}</h4>
                    <p>Total: {order.totalPrice} {order.currency}</p>
                    <p>Status: {order.financialStatus}</p>
                    <p>Customer: {order.customer?.email || 'Guest'}</p>
                    <p>Date: {new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          font-family: Arial, sans-serif;
        }

        .install-section {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }

        .form-group {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 15px;
        }

        .form-group label {
          font-weight: bold;
          min-width: 120px;
        }

        .form-group input {
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 16px;
        }

        .domain-suffix {
          color: #666;
          font-weight: bold;
        }

        button {
          background: #5865f2;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
          font-weight: bold;
        }

        button:hover {
          background: #4752c4;
        }

        button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .error {
          color: #dc3545;
          background: #f8d7da;
          padding: 10px;
          border-radius: 4px;
          margin-top: 10px;
        }

        .data-section {
          margin-top: 30px;
        }

        .actions {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }

        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
          margin-top: 15px;
        }

        .product-card {
          background: white;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 15px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .product-image {
          width: 100%;
          max-width: 200px;
          height: 150px;
          object-fit: cover;
          border-radius: 4px;
          margin-top: 10px;
        }

        .orders-list {
          display: flex;
          flex-direction: column;
          gap: 15px;
          margin-top: 15px;
        }

        .order-card {
          background: white;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 15px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        h1 {
          color: #333;
          text-align: center;
          margin-bottom: 30px;
        }

        h2 {
          color: #444;
          margin-bottom: 15px;
        }

        h3 {
          color: #555;
          margin-bottom: 10px;
        }

        h4 {
          color: #666;
          margin-bottom: 8px;
        }
      `}</style>
    </div>
  );
}