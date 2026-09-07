import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { authenticatedFetch } from "../api";

const initialForm = {
  title: "",
  description: "",
  category: "",
  price: "",
  stock: "",
};

export default function SellerPage() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [images, setImages] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/category")
      .then((response) => response.json())
      .then(setCategories)
      .catch(() => setError("Unable to load categories"));
  }, []);

  const updateField = (event) =>
    setForm({ ...form, [event.target.name]: event.target.value });
  const submitProduct = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");
    const productData = new FormData();
    Object.entries(form).forEach(([key, value]) =>
      productData.append(key, value),
    );
    Array.from(images).forEach((image) => productData.append("images", image));
    try {
      const response = await authenticatedFetch("/api/products", {
        method: "POST",
        headers: {},
        body: productData,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Unable to add product");
      setForm(initialForm);
      setImages([]);
      event.target.reset();
      setMessage("Product added successfully.");
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="dashboard-page">
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">Seller studio</p>
          <h1>Add a new product.</h1>
          <p>Bring your next great find to the CartWish shelf.</p>
        </div>
        <span className="dashboard-role">Seller</span>
      </div>
      <form className="dashboard-form" onSubmit={submitProduct}>
        <label>
          Product title
          <input
            name="title"
            value={form.title}
            onChange={updateField}
            maxLength="100"
            required
          />
        </label>
        <label>
          Category
          <select
            name="category"
            value={form.category}
            onChange={updateField}
            required
          >
            <option value="">Choose a category</option>
            {categories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="wide-field">
          Description
          <textarea
            name="description"
            value={form.description}
            onChange={updateField}
            minLength="50"
            required
          />
        </label>
        <label>
          Price
          <input
            name="price"
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={updateField}
            required
          />
        </label>
        <label>
          Stock
          <input
            name="stock"
            type="number"
            min="0"
            value={form.stock}
            onChange={updateField}
            required
          />
        </label>
        <label className="wide-field">
          Product images
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif"
            multiple
            onChange={(event) => setImages(event.target.files)}
            required
          />
          <small>Up to 8 images, 2 MB each.</small>
        </label>
        {error && <p className="form-error wide-field">{error}</p>}
        {message && <p className="form-success wide-field">{message}</p>}
        <button className="login-submit wide-field" disabled={submitting}>
          {submitting ? "Adding product..." : "Add product"}
          <ArrowRight size={17} />
        </button>
      </form>
    </main>
  );
}
