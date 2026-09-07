import { useEffect, useState } from "react";
import { Check, ChevronDown, PackageCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { apiUrl, authenticatedFetch } from "../api";

const statuses = ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"];

const productImageUrl = (filename) =>
  filename
    ? apiUrl(`/upload/products/${filename}`)
    : "https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=160&q=80";

const normalizeStatus = (status) => {
  const normalized = String(status || "Pending").toLowerCase();
  return (
    statuses.find((item) => item.toLowerCase() === normalized) || "Pending"
  );
};

const readBody = async (response) => {
  const body = await response.text();
  try {
    return JSON.parse(body);
  } catch {
    return { message: body };
  }
};

const getCustomer = (order) => order.user || order.customer || {};

const getCustomerKey = (order) => {
  const customer = getCustomer(order);
  if (customer && typeof customer === "object") {
    return customer._id || customer.email || customer.name || "unknown";
  }
  return customer || "unknown";
};

const groupOrdersByCustomer = (orders) => {
  const groups = new Map();
  orders.forEach((order) => {
    const customer = getCustomer(order);
    const key = String(getCustomerKey(order));
    if (!groups.has(key)) {
      groups.set(key, { key, customer, orders: [] });
    }
    groups.get(key).orders.push(order);
  });
  return Array.from(groups.values());
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [updatedOrderIds, setUpdatedOrderIds] = useState(() => new Set());
  const [openStatusOrderId, setOpenStatusOrderId] = useState("");

  useEffect(() => {
    authenticatedFetch("/api/order/admin/all-orders")
      .then(async (response) => {
        const data = await readBody(response);
        if (!response.ok) {
          throw new Error(data.message || "Unable to load orders.");
        }
        setOrders(Array.isArray(data) ? data : data.orders || []);
      })
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, []);

  const changeStatus = async (orderId, status) => {
    setSaving(orderId);
    setError("");
    try {
      const response = await authenticatedFetch(
        `/api/order/order-status/${orderId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );
      const data = await readBody(response);
      if (!response.ok) {
        throw new Error(data.message || "Unable to update status.");
      }
      const updatedOrder = data.updatedOrder || data;
      setOrders((current) =>
        current.map((order) =>
          order._id === orderId
            ? {
                ...order,
                ...updatedOrder,
                user:
                  updatedOrder.user && typeof updatedOrder.user === "object"
                    ? updatedOrder.user
                    : order.user,
                customer:
                  updatedOrder.customer &&
                  typeof updatedOrder.customer === "object"
                    ? updatedOrder.customer
                    : order.customer,
              }
            : order,
        ),
      );
      setUpdatedOrderIds((current) => new Set(current).add(orderId));
      setOpenStatusOrderId("");
    } catch (statusError) {
      setError(statusError.message);
    } finally {
      setSaving("");
    }
  };

  return (
    <main className="dashboard-page admin-orders-page">
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow admin-orders-eyebrow">
            <Sparkles size={14} /> Admin control
          </p>
          <h1>Order collection.</h1>
          <p>Review customer details and keep every delivery moving.</p>
        </div>
        <span className="dashboard-role">{orders.length} orders</span>
      </div>
      {error && <div className="state-message">{error}</div>}
      {loading && <div className="state-message">Loading all orders...</div>}
      {!loading && !error && !orders.length && (
        <div className="state-message">No orders found.</div>
      )}
      {!loading && orders.length > 0 && (
        <div className="admin-order-groups">
          {groupOrdersByCustomer(orders).map((group) => (
            <section className="admin-order-group" key={group.key}>
              <header className="admin-order-group-heading">
                <div>
                  <p className="order-label">CUSTOMER</p>
                  <strong>{group.customer.name || "Name unavailable"}</strong>
                  <small>{group.customer.email || "Email unavailable"}</small>
                </div>
                <span>
                  {group.orders.length} order
                  {group.orders.length === 1 ? "" : "s"}
                </span>
              </header>
              <div className="admin-orders-table">
                <div className="admin-order-row admin-order-row-header">
                  <span>Order</span>
                  <span>Delivery address</span>
                  <span>Items</span>
                  <span>Total</span>
                  <span>Status</span>
                </div>
                {group.orders.map((order) => (
                  <article className="admin-order-row" key={order._id}>
                    <span className="admin-order-id">
                      <i>
                        <PackageCheck size={16} />
                      </i>
                      <span className="order-id-copy">
                        <strong>#{String(order._id).slice(-8)}</strong>
                        {updatedOrderIds.has(order._id) && (
                          <span
                            className="order-updated-tick"
                            title="Status saved"
                          >
                            <Check size={13} strokeWidth={3} />
                          </span>
                        )}
                      </span>
                      <small>
                        {new Date(order.createdAt).toLocaleDateString("en-IN")}
                      </small>
                    </span>
                    <span className="user-address admin-order-address">
                      {order.shippingAddress || "Address unavailable"}
                    </span>
                    <span className="admin-order-products">
                      {(order.products || []).map((item, index) => (
                        <span
                          className="admin-order-product"
                          key={`${item.productId || item.title}-${index}`}
                        >
                          <img
                            src={productImageUrl(item.image)}
                            alt={item.title || "Ordered product"}
                          />
                          <span>
                            <strong>
                              {item.title || "Product unavailable"}
                            </strong>
                            <small>
                              Qty: {item.quantity || 1} · ₹
                              {Number(item.price || 0).toLocaleString("en-IN")}
                            </small>
                          </span>
                        </span>
                      ))}
                      {!order.products?.length && (
                        <small>No item details</small>
                      )}
                    </span>
                    <strong className="admin-order-total">
                      ₹{Number(order.totalPrice || 0).toLocaleString("en-IN")}
                    </strong>
                    <span className="admin-order-status">
                      <b>Status</b>
                      <button
                        className="status-trigger"
                        type="button"
                        onClick={() =>
                          setOpenStatusOrderId((current) =>
                            current === order._id ? "" : order._id,
                          )
                        }
                        disabled={saving === order._id}
                        aria-expanded={openStatusOrderId === order._id}
                        aria-haspopup="listbox"
                      >
                        {normalizeStatus(order.orderStatus)}
                        <ChevronDown size={15} />
                      </button>
                      {openStatusOrderId === order._id && (
                        <div className="status-menu" role="listbox">
                          {statuses.map((status) => (
                            <button
                              type="button"
                              role="option"
                              aria-selected={
                                normalizeStatus(order.orderStatus) === status
                              }
                              className={
                                normalizeStatus(order.orderStatus) === status
                                  ? "is-selected"
                                  : ""
                              }
                              key={status}
                              onClick={() => changeStatus(order._id, status)}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      )}
                    </span>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      <Link className="back-link admin-orders-back" to="/admin">
        Back to admin dashboard
      </Link>
    </main>
  );
}
