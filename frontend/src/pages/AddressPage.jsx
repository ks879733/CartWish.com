import { useEffect, useState } from "react";
import { ArrowRight, Check, MapPin } from "lucide-react";
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

const formatAddress = ({ name, phone, village, city, state, pincode }) =>
  `${name}, ${phone}, ${village}, ${city}, ${state} - ${pincode}`;

export default function AddressPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState(emptyForm);
  const [existingAddress, setExistingAddress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!localStorage.getItem("accessToken")) {
      navigate("/login", { replace: true });
      return;
    }

    authenticatedFetch("/api/address")
      .then(async (response) => {
        if (response.status === 404) return null;
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.message || "Unable to load address.");
        return (
          data.addresses?.find((address) => address.isDefault) ||
          data.addresses?.[0]
        );
      })
      .then((address) => {
        if (address) {
          setExistingAddress(formatAddress(address));
          setForm({
            name: address.name || "",
            phone: address.phone || "",
            village: address.village || "",
            city: address.city || "",
            state: address.state || "",
            pincode: address.pincode || "",
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [navigate]);

  const updateField = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const submitAddress = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const response = await authenticatedFetch("/api/address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, isDefault: true }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Unable to save address.");

      const shippingAddress = formatAddress(form);
      localStorage.setItem("cartwishAddress", shippingAddress);
      localStorage.setItem("cartwishAddressId", data.address._id);
      const returnTo = location.state?.returnTo;
      if (returnTo === "/confirm-payment") {
        navigate(returnTo, {
          replace: true,
          state: {
            items: location.state.items,
            shippingAddress,
            addressId: data.address._id,
          },
        });
      } else {
        navigate("/profile", { replace: true });
      }
    } catch (addressError) {
      setError(addressError.message);
    } finally {
      setSubmitting(false);
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
        <h1>
          Please enter your
          <br />
          address details.
        </h1>
        <p>
          One thoughtful detail helps us bring every little find to the right
          door.
        </p>
      </header>
      <main className="address-page">
        <section className="address-form-panel">
          <div className="address-form-heading">
            <span className="address-icon">
              <MapPin size={20} />
            </span>
            <div>
              <p className="eyebrow">Your delivery address</p>
              <h2>
                {existingAddress
                  ? "Update your details"
                  : "Where should we deliver?"}
              </h2>
            </div>
          </div>
          {loading ? (
            <div className="state-message">Loading your saved address...</div>
          ) : (
            <form className="address-form" onSubmit={submitAddress}>
              <label>
                Full name
                <input
                  name="name"
                  value={form.name}
                  onChange={updateField}
                  minLength="3"
                  required
                />
              </label>
              <label>
                Phone number
                <input
                  name="phone"
                  value={form.phone}
                  onChange={updateField}
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  maxLength="10"
                  required
                />
              </label>
              <label>
                Village
                <input
                  name="village"
                  value={form.village}
                  onChange={updateField}
                  required
                />
              </label>
              <label>
                City
                <input
                  name="city"
                  value={form.city}
                  onChange={updateField}
                  required
                />
              </label>
              <label>
                State
                <input
                  name="state"
                  value={form.state}
                  onChange={updateField}
                  required
                />
              </label>
              <label>
                Pincode
                <input
                  name="pincode"
                  value={form.pincode}
                  onChange={updateField}
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength="6"
                  required
                />
              </label>
              {error && <p className="form-error">{error}</p>}
              <button
                className="login-submit"
                type="submit"
                disabled={submitting}
              >
                {submitting ? "Saving address..." : "Save address"}
                {submitting ? <Check size={17} /> : <ArrowRight size={17} />}
              </button>
            </form>
          )}
        </section>
        <aside className="address-note">
          <span>01</span>
          <p>Secure delivery</p>
          <strong>
            Your address is only used to complete and track your CartWish
            orders.
          </strong>
        </aside>
      </main>
    </>
  );
}
