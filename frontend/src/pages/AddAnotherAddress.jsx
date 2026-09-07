import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { authenticatedFetch } from "../api";

const emptyForm = {
  name: "",
  phone: "",
  village: "",
  city: "",
  state: "",
  pincode: "",
};

const formatAddress = (address) =>
  `${address.name}, ${address.phone}, ${address.village}, ${address.city}, ${address.state} - ${address.pincode}`;

export default function AddAnotherAddress() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [addresses, setAddresses] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!localStorage.getItem("accessToken")) {
      navigate("/login", { replace: true });
      return;
    }

    authenticatedFetch("/api/address")
      .then(async (response) => {
        if (response.status === 404) return [];
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.message || "Unable to load addresses");
        return data.addresses || [];
      })
      .then(setAddresses)
      .catch((addressError) => setError(addressError.message))
      .finally(() => setLoading(false));
  }, [navigate]);

  const updateField = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const saveAddress = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await authenticatedFetch("/api/address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, isDefault: addresses.length === 0 }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Unable to save address");

      setAddresses((current) => [...current, data.address]);
      setForm(emptyForm);
      setShowForm(false);
      if (state?.returnTo) {
        navigate(state.returnTo, {
          replace: true,
          state: { items: state.items, addressId: data.address._id },
        });
      }
    } catch (addressError) {
      setError(addressError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <header className="address-hero">
        <button
          className="address-back"
          type="button"
          onClick={() => navigate(-1)}
        >
          <ArrowRight size={16} /> Back
        </button>
        <p className="eyebrow">CartWish delivery</p>
        <h1>Your saved addresses.</h1>
        <p>
          Choose a saved address during checkout or add another delivery
          location.
        </p>
      </header>

      <main className="address-page address-list-page">
        <section className="address-form-panel">
          <div className="address-form-heading">
            <div>
              <p className="eyebrow">Delivery locations</p>
              <h2>Saved addresses</h2>
            </div>
          </div>

          {loading && (
            <div className="state-message">Loading your addresses...</div>
          )}
          {error && <p className="form-error">{error}</p>}

          {!loading && addresses.length === 0 && (
            <div className="state-message">
              You have not added an address yet.
            </div>
          )}

          <div className="saved-addresses">
            {addresses.map((address) => (
              <article className="saved-address" key={address._id}>
                <strong>{address.name}</strong>
                <p>{formatAddress(address)}</p>
              </article>
            ))}
          </div>

          {!showForm && (
            <button
              className="detail-action buy-now"
              type="button"
              onClick={() => setShowForm(true)}
            >
              Add Address <ArrowRight size={17} />
            </button>
          )}

          {showForm && (
            <form className="address-form" onSubmit={saveAddress}>
              {Object.keys(emptyForm).map((field) => (
                <label key={field}>
                  {field === "pincode"
                    ? "Pincode"
                    : field[0].toUpperCase() + field.slice(1)}
                  <input
                    name={field}
                    value={form[field]}
                    onChange={updateField}
                    required
                    minLength={field === "name" ? 3 : undefined}
                    maxLength={
                      field === "phone"
                        ? 10
                        : field === "pincode"
                          ? 6
                          : undefined
                    }
                    pattern={
                      field === "phone"
                        ? "[0-9]{10}"
                        : field === "pincode"
                          ? "[0-9]{6}"
                          : undefined
                    }
                  />
                </label>
              ))}
              <div className="address-form-actions">
                <button
                  className="detail-action buy-now"
                  type="submit"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Address"}
                </button>
                <button
                  className="payment-back"
                  type="button"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>
      </main>
    </>
  );
}
