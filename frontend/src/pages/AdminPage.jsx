import { useEffect, useState } from "react";
import { ArrowRight, Check, UserRound } from "lucide-react";
import { authenticatedFetch } from "../api";

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [categoryIcon, setCategoryIcon] = useState(null);
  const [categoryMessage, setCategoryMessage] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [saving, setSaving] = useState("");
  const loadUsers = () =>
    authenticatedFetch("/api/admin/users")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.message || "Unable to load users");
        return data;
      })
      .then(setUsers)
      .catch((loadError) => setError(loadError.message));

  useEffect(() => {
    loadUsers();
  }, []);

  const changeRole = async (userId, role) => {
    setSaving(userId);
    setError("");
    try {
      const response = await authenticatedFetch(
        `/api/admin/sellers/${userId}/role`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ role }),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Unable to update role");
      setUsers((currentUsers) =>
        currentUsers.map((user) => (user._id === userId ? data : user)),
      );
    } catch (roleError) {
      setError(roleError.message);
    } finally {
      setSaving("");
    }
  };

  const addCategory = async (event) => {
    event.preventDefault();
    setAddingCategory(true);
    setError("");
    setCategoryMessage("");
    const categoryData = new FormData();
    categoryData.append("name", categoryName);
    categoryData.append("icon", categoryIcon);
    try {
      const response = await authenticatedFetch("/api/category", {
        method: "POST",
        body: categoryData,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Unable to add category");
      setCategoryName("");
      setCategoryIcon(null);
      event.target.reset();
      setCategoryMessage("Category added successfully.");
    } catch (categoryError) {
      setError(categoryError.message);
    } finally {
      setAddingCategory(false);
    }
  };

  return (
    <main className="dashboard-page admin-page">
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">Admin control</p>
          <h1>Your user community.</h1>
          <p>
            View every account and manage whether they are a user or seller.
          </p>
        </div>
        <span className="dashboard-role">Admin</span>
      </div>
      {error && <div className="state-message">{error}</div>}
      <form className="category-form" onSubmit={addCategory}>
        <div>
          <p className="eyebrow">Catalog</p>
          <h2>Add category</h2>
        </div>
        <label>
          Name
          <input
            value={categoryName}
            onChange={(event) => setCategoryName(event.target.value)}
            required
          />
        </label>
        <label>
          Category image
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif"
            onChange={(event) => setCategoryIcon(event.target.files[0])}
            required
          />
        </label>
        <button className="login-submit" disabled={addingCategory}>
          {addingCategory ? "Adding..." : "Add category"}
          <ArrowRight size={17} />
        </button>
        {categoryMessage && <p className="form-success">{categoryMessage}</p>}
      </form>
      <div className="seller-table">
        <div className="seller-row seller-row-header">
          <span>Member</span>
          <span>Email</span>
          <span>Delivery address</span>
          <span>Role</span>
        </div>
        {users.map((user) => (
          <div className="seller-row" key={user._id}>
            <span className="member-name">
              <i>
                <UserRound size={16} />
              </i>
              {user.name}
            </span>
            <span>{user.email}</span>
            <span className="user-address">
              {user.deleveryAdress || "Not provided"}
            </span>
            <select
              value={user.role}
              onChange={(event) => changeRole(user._id, event.target.value)}
              disabled={saving === user._id}
            >
              <option value="user">User</option>
              <option value="seller">Seller</option>
            </select>
            {saving === user._id && <Check size={16} />}
          </div>
        ))}
        {!users.length && !error && (
          <div className="state-message">No sellers or users found.</div>
        )}
      </div>
    </main>
  );
}
