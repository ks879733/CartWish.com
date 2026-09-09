<button
  type="button"
  onClick={() =>
    navigate("/addresses", {
      state: { returnTo: "/confirm-payment", items },
    })
  }
>
  Add Address
</button>;
import { createContext, useContext, useEffect, useState } from "react";
import {
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  ArrowRight,
  Heart,
  Menu,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Star,
  Trash2,
  UserRound,
  Check,
  ChevronDown,
} from "lucide-react";
import SellerPage from "./pages/SellerPage";
import AdminPage from "./pages/AdminPage";
import AdminOrdersPage from "./pages/AdminOrdersPage";
import LogoutMenu from "./pages/LogoutMenu";
import AddressPage from "./pages/AddressPage";
import AddAnotherAddress from "./pages/AddAnotherAddress";
import CartWishAssistant from "./components/CartWishAssistant";
import { apiUrl, authenticatedFetch } from "./api";

const CartCountContext = createContext({
  cartCount: 0,
  setCartCount: () => {},
});

const api = async (path) => {
  const response = await fetch(apiUrl(path), {
    credentials: "include",
  });
  if (!response.ok) throw new Error("Unable to load data");
  return response.json();
};

const readResponse = async (response) => {
  const body = await response.text();
  try {
    return JSON.parse(body);
  } catch {
    throw new Error(
      response.ok
        ? "The server returned an invalid response."
        : "Unable to connect to the account service.",
    );
  }
};

const normalizeProductImages = (images) => {
  if (Array.isArray(images)) return images.filter(Boolean);
  if (images) return [images];
  return [];
};

const imageUrl = (folder, filename) =>
  filename
    ? apiUrl(`/upload/${folder}/${filename}`)
    : "https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=700&q=80";

const formatSavedAddress = ({ name, phone, village, city, state, pincode }) =>
  `${name}, ${phone}, ${village}, ${city}, ${state} - ${pincode}`;

const formatOrderAddress = (address) =>
  typeof address === "string" ? address : formatSavedAddress(address || {});

const getAvailableAddress = async () => {
  try {
    const addressResponse = await authenticatedFetch("/api/address");
    if (addressResponse.ok) {
      const data = await addressResponse.json();
      const address =
        data.addresses?.find((item) => item.isDefault) || data.addresses?.[0];
      if (address) {
        const shippingAddress = formatSavedAddress(address);
        localStorage.setItem("cartwishAddress", shippingAddress);
        localStorage.setItem("cartwishAddressId", address._id);
        return { label: shippingAddress, id: address._id };
      }
    }
  } catch {
    // Fall back to the address captured during signup.
  }

  try {
    const profileResponse = await authenticatedFetch("/api/user");
    if (profileResponse.ok) {
      const profile = await profileResponse.json();
      if (profile.deleveryAdress) {
        localStorage.setItem("cartwishAddress", profile.deleveryAdress);
        return { label: profile.deleveryAdress, id: "" };
      }
    }
  } catch {
    return "";
  }
  return "";
};

const loadRazorpay = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(window.Razorpay);
      return;
    }
    const existingScript = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.Razorpay));
      existingScript.addEventListener("error", reject);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () => reject(new Error("Unable to load Razorpay."));
    document.body.appendChild(script);
  });

const getUserInitial = () => {
  const token = localStorage.getItem("accessToken");
  if (!token) return "";
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.name?.trim().charAt(0).toUpperCase() || "U";
  } catch {
    return "";
  }
};

const getUserRole = () => {
  const token = localStorage.getItem("accessToken");
  if (!token) return "";
  try {
    return JSON.parse(atob(token.split(".")[1])).role || "";
  } catch {
    return "";
  }
};

function Header({
  search,
  setSearch,
  onMenu = () => {},
  navOpen: controlledNavOpen,
  onNavOpenChange,
}) {
  const navigate = useNavigate();
  const { cartCount } = useContext(CartCountContext);
  const userInitial = getUserInitial();
  const [query, setQuery] = useState(search);
  const [suggestions, setSuggestions] = useState([]);
  const [internalNavOpen, setInternalNavOpen] = useState(false);
  const navOpen = controlledNavOpen ?? internalNavOpen;
  const setNavOpen = (nextOpen) => {
    if (onNavOpenChange) onNavOpenChange(nextOpen);
    else setInternalNavOpen(nextOpen);
  };
  useEffect(() => setQuery(search), [search]);
  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return undefined;
    }
    const timer = setTimeout(() => {
      fetch(
        apiUrl(
          `/api/products/suggestions?search=${encodeURIComponent(query.trim())}`,
        ),
        { credentials: "include" },
      )
        .then((response) => (response.ok ? response.json() : []))
        .then(setSuggestions)
        .catch(() => setSuggestions([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);
  const submitSearch = (event) => {
    event.preventDefault();
    setSearch(query);
    setSuggestions([]);
    navigate(query ? `/?search=${encodeURIComponent(query)}` : "/");
  };
  return (
    <header className="site-header">
      <div className="header-inner">
        <button
          className="icon-button mobile-menu"
          onClick={() => {
            const nextOpen = !navOpen;
            setNavOpen(nextOpen);
            onMenu(nextOpen);
          }}
          aria-expanded={navOpen}
          aria-label="Open menu"
        >
          <Menu size={21} />
        </button>
        <Link className="brand" to="/">
          cart<span>Wish</span>
        </Link>
        <form className="search-box" onSubmit={submitSearch}>
          <Search size={18} />
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search your next favourite thing"
            aria-label="Search products"
          />
          <button type="submit" aria-label="Submit search">
            <ArrowRight size={17} />
          </button>
          {suggestions.length > 0 && (
            <div className="search-suggestions">
              {suggestions.map((suggestion) => (
                <button
                  type="button"
                  key={suggestion._id}
                  onClick={() => {
                    setSuggestions([]);
                    navigate(`/product/${suggestion._id}`);
                  }}
                >
                  {suggestion.title}
                </button>
              ))}
            </div>
          )}
        </form>
        <nav
          className={`main-nav ${navOpen ? "is-open" : ""}`}
          aria-label="Main navigation"
          onClick={() => setNavOpen(false)}
        >
          <NavLink to="/">Home</NavLink>
          <NavLink to="/products">Product</NavLink>
          <NavLink to="/orders">My order</NavLink>
          {getUserRole() === "seller" && (
            <NavLink to="/seller">Add product</NavLink>
          )}
          {getUserRole() === "admin" && (
            <>
              <NavLink to="/admin">Admin</NavLink>
              <NavLink to="/admin/orders">Order collection</NavLink>
            </>
          )}
          {userInitial ? (
            <LogoutMenu initial={userInitial} />
          ) : (
            <NavLink to="/login">Login</NavLink>
          )}
          <NavLink className="cart-link" to="/cart">
            <span>Cart</span>
            <span className="cart-icon">
              <ShoppingBag size={19} />
              <b>{cartCount}</b>
            </span>
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

function Categories({ categories, selected, onSelect, open, onToggle }) {
  return (
    <aside className={`category-panel ${open ? "is-open" : ""}`}>
      <div className="category-heading">
        <div>
          <p className="eyebrow">Browse by mood</p>
          <h2>
            Find your kind
            <br />
            of lovely.
          </h2>
        </div>
        <button
          className="category-menu-toggle"
          type="button"
          onClick={onToggle}
          aria-label="Open categories"
          aria-expanded={open}
        >
          <SlidersHorizontal size={19} />
        </button>
      </div>
      <button
        className={`category-option ${!selected ? "active" : ""}`}
        onClick={() => onSelect("")}
      >
        <span>All discoveries</span>
        <small>All</small>
      </button>
      {categories.map((category) => (
        <button
          className={`category-option ${selected === category.name ? "active" : ""}`}
          key={category._id}
          onClick={() => onSelect(category.name)}
        >
          <span>
            <img src={imageUrl("category", category.image)} alt="" />
            {category.name}
          </span>
          <small>→</small>
        </button>
      ))}
      <div className="category-note">
        <Heart size={17} fill="currentColor" />
        <p>
          Small joys, delivered.
          <br />
          <span>Free delivery over ₹999</span>
        </p>
      </div>
    </aside>
  );
}

function ProductCard({ product, onDeleted }) {
  const navigate = useNavigate();
  const { setCartCount } = useContext(CartCountContext);
  const rating = product.review?.averageRating || 0;
  const productImage = normalizeProductImages(product.images)[0] || "";
  const [saved, setSaved] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("wishlist") || "[]").includes(
        product._id,
      );
    } catch {
      return false;
    }
  });
  const [adding, setAdding] = useState(false);
  const [feedback, setFeedback] = useState("");
  const toggleWishlist = (event) => {
    event.stopPropagation();
    const current = JSON.parse(localStorage.getItem("wishlist") || "[]");
    const next = saved
      ? current.filter((item) => item !== product._id)
      : [...new Set([...current, product._id])];
    localStorage.setItem("wishlist", JSON.stringify(next));
    setSaved(!saved);
  };
  const addToCart = async (event) => {
    event.stopPropagation();
    if (!localStorage.getItem("accessToken")) {
      navigate("/login");
      return;
    }
    setAdding(true);
    try {
      const response = await authenticatedFetch(`/api/cart/${product._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: 1 }),
      });
      const data = await readResponse(response);
      if (!response.ok) throw new Error(data.message || "Unable to add item");
      setCartCount(Number(data.cart?.totalProducts) || 0);
      setFeedback("Added to cart");
      window.setTimeout(() => setFeedback(""), 1800);
    } catch (addError) {
      setFeedback(addError.message);
    } finally {
      setAdding(false);
    }
  };

  return (
    <article
      className="product-card"
      onClick={() => navigate(`/product/${product._id}`)}
    >
      <div className="product-image">
        <img src={imageUrl("products", productImage)} alt={product.title} />
        <button
          className={`wishlist-button ${saved ? "is-saved" : ""}`}
          type="button"
          onClick={toggleWishlist}
          aria-label={
            saved
              ? `Remove ${product.title} from wishlist`
              : `Save ${product.title} to wishlist`
          }
        >
          <Heart size={17} fill={saved ? "currentColor" : "none"} />
        </button>
        {!product.stock && (
          <span className="product-badge sold-out">Out of stock</span>
        )}
        {product.stock <= 5 && product.stock > 0 && (
          <span className="product-badge">Almost gone</span>
        )}
      </div>
      <div className="product-info">
        <div className="product-title-row">
          <h3>{product.title}</h3>
          <strong>₹{Number(product.price).toLocaleString("en-IN")}</strong>
        </div>
        <div className="product-meta">
          <span className="rating">
            <Star size={14} fill="currentColor" /> {rating.toFixed(1)}{" "}
            <em>({product.review?.numberOfReviews || 0})</em>
          </span>
          <span className={product.stock ? "in-stock" : "out-stock"}>
            {product.stock ? `${product.stock} in stock` : "Out of stock"}
          </span>
        </div>
        <button
          className="card-cart-button"
          type="button"
          onClick={addToCart}
          disabled={!product.stock || adding}
        >
          {adding ? "Adding..." : product.stock ? "Add to cart" : "Unavailable"}
          <ShoppingBag size={15} />
        </button>
        {feedback && (
          <span className="card-feedback" role="status">
            {feedback}
          </span>
        )}
      </div>
    </article>
  );
}

function Hero({ onShop }) {
  return (
    <section className="hero-section">
      <div className="hero-copy">
        <p className="eyebrow">The considered edit</p>
        <h1>
          Everything you love, <em>in one place.</em>
        </h1>
        <p>
          Discover useful, beautiful things chosen to make everyday living feel
          a little better.
        </p>
        <button className="hero-button" type="button" onClick={onShop}>
          Shop the collection <ArrowRight size={17} />
        </button>
      </div>
      <div
        className="hero-visual"
        aria-label="A curated selection of CartWish products"
      >
        <div className="hero-orbit orbit-one" />
        <div className="hero-orbit orbit-two" />
        <div className="hero-product hero-product-main">CW</div>
        <div className="hero-product hero-product-small">+</div>
        <span className="hero-note">Curated for you</span>
      </div>
    </section>
  );
}

function CategoryStrip({ categories, onSelect }) {
  const fallbackCategories = [
    "Smartphones",
    "Laptops",
    "Headphones",
    "Gaming",
    "Smart Watches",
    "Drones",
  ];
  const items = categories.length
    ? categories.slice(0, 6)
    : fallbackCategories.map((name) => ({ name }));
  return (
    <section className="category-strip">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Find your next favourite</p>
          <h2>Shop by category</h2>
        </div>
        <button
          type="button"
          className="text-link"
          onClick={() => onSelect("")}
        >
          View all <ArrowRight size={15} />
        </button>
      </div>
      <div className="category-cards">
        {items.map((category) => (
          <button
            className="category-card"
            key={category._id || category.name}
            type="button"
            onClick={() => onSelect(category.name)}
          >
            {category.image ? (
              <img src={imageUrl("category", category.image)} alt="" />
            ) : (
              <span className="category-icon">
                <ShoppingBag size={18} />
              </span>
            )}
            <span>{category.name}</span>
            <ArrowRight size={15} />
          </button>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <span className="brand">
          cart<span>Wish</span>
        </span>
        <p>Useful things, chosen with feeling.</p>
      </div>
      <div className="footer-column">
        <strong>Shop</strong>
        <Link to="/products">All products</Link>
        <Link to="/">Categories</Link>
        <Link to="/products">New arrivals</Link>
      </div>
      <div className="footer-column">
        <strong>Customer care</strong>
        <a href="mailto:hello@cartwish.com">Contact us</a>
        <span>Shipping & returns</span>
        <span>FAQs</span>
      </div>
      <div className="footer-column">
        <strong>Follow along</strong>
        <div className="social-links">
          <a href="https://instagram.com">Instagram</a>
          <a href="https://facebook.com">Facebook</a>
          <a href="https://twitter.com">Twitter</a>
        </div>
      </div>
      <p className="footer-bottom">© 2026 CartWish. All rights reserved.</p>
    </footer>
  );
}

function Shop() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const selectedFromUrl = params.get("category") || "";
  const searchFromUrl = params.get("search") || "";
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(selectedFromUrl);
  const [search, setSearch] = useState(searchFromUrl);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [sort, setSort] = useState("featured");
  const [priceFilter, setPriceFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [stockOnly, setStockOnly] = useState(false);

  useEffect(() => {
    setSelected(selectedFromUrl);
    setSearch(searchFromUrl);
  }, [selectedFromUrl, searchFromUrl]);
  useEffect(() => {
    api("/api/category")
      .then(setCategories)
      .catch(() =>
        setError("Could not load categories. Is the backend running?"),
      );
  }, []);
  useEffect(() => {
    setLoading(true);
    setError("");
    const query = new URLSearchParams({ page: "1", perPage: "12" });
    if (selected) query.set("category", selected);
    if (search) query.set("search", search);
    api(`/api/products?${query}`)
      .then((data) => setProducts(data.products || []))
      .catch(() => setError("Could not load products right now."))
      .finally(() => setLoading(false));
  }, [selected, search]);
  const chooseCategory = (category) => {
    setSelected(category);
    setMenuOpen(false);
    setNavOpen(false);
    navigate(category ? `/?category=${encodeURIComponent(category)}` : "/");
  };
  const toggleCategories = () => {
    setMenuOpen((current) => !current);
    setNavOpen(false);
  };
  const displayedProducts = [...products]
    .filter((product) => {
      const price = Number(product.price);
      if (priceFilter === "under-1000" && price >= 1000) return false;
      if (priceFilter === "1000-5000" && (price < 1000 || price > 5000))
        return false;
      if (priceFilter === "5000-20000" && (price < 5000 || price > 20000))
        return false;
      if (priceFilter === "over-20000" && price <= 20000) return false;
      if (
        ratingFilter !== "all" &&
        Number(product.review?.averageRating || 0) < Number(ratingFilter)
      )
        return false;
      return !stockOnly || Number(product.stock) > 0;
    })
    .sort((left, right) => {
      if (sort === "price-low") return Number(left.price) - Number(right.price);
      if (sort === "price-high")
        return Number(right.price) - Number(left.price);
      if (sort === "rating")
        return (
          Number(right.review?.averageRating || 0) -
          Number(left.review?.averageRating || 0)
        );
      return 0;
    });
  const resetFilters = () => {
    setPriceFilter("all");
    setRatingFilter("all");
    setStockOnly(false);
    setSort("featured");
  };
  const isHome = !selected && !search;
  return (
    <>
      <Header
        search={search}
        setSearch={setSearch}
        navOpen={navOpen}
        onNavOpenChange={setNavOpen}
        onMenu={() => setMenuOpen((current) => !current)}
      />
      <main className={`shop-layout ${isHome ? "is-home" : ""}`}>
        {isHome && (
          <Hero
            onShop={() =>
              document
                .querySelector(".catalog")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          />
        )}
        {isHome && (
          <CategoryStrip categories={categories} onSelect={chooseCategory} />
        )}
        <Categories
          categories={categories}
          selected={selected}
          onSelect={chooseCategory}
          open={menuOpen}
          onToggle={toggleCategories}
        />
        <section className="catalog">
          <div className="catalog-intro">
            <div>
              <p className="eyebrow">The CartWish edit</p>
              <h1>
                {selected ||
                  (search
                    ? `Results for “${search}”`
                    : "Made for your everyday")}
              </h1>
              <p className="catalog-subtitle">
                Objects with a little more feeling, for every corner of your
                life.
              </p>
            </div>
            <div className="catalog-tools">
              <span className="result-count">
                {displayedProducts.length} pieces
              </span>
              <label className="sort-control">
                Sort by
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                >
                  <option value="featured">Featured</option>
                  <option value="price-low">Price: low to high</option>
                  <option value="price-high">Price: high to low</option>
                  <option value="rating">Rating</option>
                </select>
                <ChevronDown size={14} />
              </label>
            </div>
          </div>
          <div className="filter-row">
            <label>
              Price{" "}
              <select
                value={priceFilter}
                onChange={(event) => setPriceFilter(event.target.value)}
              >
                <option value="all">All prices</option>
                <option value="under-1000">Under ₹1,000</option>
                <option value="1000-5000">₹1,000 - ₹5,000</option>
                <option value="5000-20000">₹5,000 - ₹20,000</option>
                <option value="over-20000">₹20,000+</option>
              </select>
            </label>
            <label>
              Rating{" "}
              <select
                value={ratingFilter}
                onChange={(event) => setRatingFilter(event.target.value)}
              >
                <option value="all">Any rating</option>
                <option value="4">4+ stars</option>
                <option value="3">3+ stars</option>
              </select>
            </label>
            <label className="stock-filter">
              <input
                type="checkbox"
                checked={stockOnly}
                onChange={(event) => setStockOnly(event.target.checked)}
              />{" "}
              In stock
            </label>
            <button
              type="button"
              className="reset-filter"
              onClick={resetFilters}
            >
              Reset filters
            </button>
          </div>
          {error && <div className="state-message">{error}</div>}
          {loading ? (
            <div className="product-grid">
              {[1, 2, 3, 4].map((item) => (
                <div className="skeleton" key={item} />
              ))}
            </div>
          ) : displayedProducts.length ? (
            <div className="product-grid">
              {displayedProducts.map((product) => (
                <ProductCard
                  product={product}
                  key={product._id}
                  onDeleted={(productId) =>
                    setProducts((current) =>
                      current.filter((item) => item._id !== productId),
                    )
                  }
                />
              ))}
            </div>
          ) : (
            <div className="state-message">
              No pieces found. Try another category or search.
            </div>
          )}
        </section>
      </main>
    </>
  );
}

function CartPage() {
  const navigate = useNavigate();
  const { setCartCount } = useContext(CartCountContext);
  const [cart, setCart] = useState(null);
  const [error, setError] = useState("");
  const startCheckout = async () => {
    const address = await getAvailableAddress();
    if (!address?.id) {
      navigate("/address", {
        state: { returnTo: "/confirm-payment", items: cart.products },
      });
      return;
    }
    navigate("/confirm-payment", {
      state: {
        items: cart.products,
        shippingAddress: address.label,
        addressId: address.id,
      },
    });
  };
  useEffect(() => {
    if (!localStorage.getItem("accessToken")) {
      navigate("/login");
      return;
    }
    authenticatedFetch("/api/cart")
      .then(async (response) => {
        const data = await readResponse(response);
        if (!response.ok)
          throw new Error(data.message || "Unable to load cart");
        const products = await Promise.all(
          data.products.map(async (item) => {
            try {
              const product = await api(`/api/products/${item.productId}`);
              return { ...item, description: product.description };
            } catch {
              return {
                ...item,
                description: "Product description unavailable.",
              };
            }
          }),
        );
        setCart({ ...data, products });
        setCartCount(Number(data.totalProducts) || 0);
      })
      .catch((cartError) => setError(cartError.message));
  }, [navigate]);
  const removeItem = async (productId) => {
    const response = await authenticatedFetch(`/api/cart/${productId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
    });
    if (response.ok) {
      const updatedCart = await response.json();
      setCart({
        ...updatedCart,
        products: updatedCart.products.map((item) => ({
          ...item,
          description: cart?.products.find(
            (oldItem) => oldItem.productId === item.productId,
          )?.description,
        })),
      });
      setCartCount(Number(updatedCart.totalProducts) || 0);
    }
  };
  const increaseItem = async (productId) => {
    const response = await authenticatedFetch(
      `/api/cart/increase/${productId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      },
    );
    const data = await readResponse(response);
    if (!response.ok) {
      setError(data.message || "Unable to increase quantity");
      return;
    }
    setCart({
      ...data.cart,
      products: data.cart.products.map((item) => ({
        ...item,
        description: cart?.products.find(
          (oldItem) => oldItem.productId === item.productId,
        )?.description,
      })),
    });
    setCartCount(Number(data.cart.totalProducts) || 0);
  };
  const decreaseItem = async (productId) => {
    const response = await authenticatedFetch(
      `/api/cart/decrease/${productId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      },
    );
    const data = await readResponse(response);
    if (!response.ok) {
      setError(data.message || "Unable to decrease quantity");
      return;
    }
    setCart({
      ...data.cart,
      products: data.cart.products.map((item) => ({
        ...item,
        description: cart?.products.find(
          (oldItem) => oldItem.productId === item.productId,
        )?.description,
      })),
    });
    setCartCount(Number(data.cart.totalProducts) || 0);
  };
  return (
    <>
      <Header search="" setSearch={() => {}} onMenu={() => {}} />
      <main className="cart-page">
        <div className="catalog-intro">
          <div>
            <p className="eyebrow">Your saved picks</p>
            <h1>My cart</h1>
          </div>
        </div>
        {error && <div className="state-message">{error}</div>}
        {cart && !cart.products.length && (
          <div className="state-message">
            Your cart is empty. Add something lovely from the shop.
          </div>
        )}
        {cart && cart.products.length > 0 && (
          <div className="cart-layout">
            <section className="cart-items">
              {cart.products.map((item) => (
                <article className="cart-item" key={item.productId}>
                  <img
                    src={imageUrl("products", item.image)}
                    alt={item.title}
                  />
                  <div className="cart-item-copy">
                    <h2>{item.title}</h2>
                    <p className="cart-item-description">{item.description}</p>
                    <div className="cart-quantity">
                      <button
                        type="button"
                        onClick={() => decreaseItem(item.productId)}
                        aria-label={`Decrease quantity of ${item.title}`}
                      >
                        <Minus size={14} />
                      </button>
                      <span>Quantity: {item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => increaseItem(item.productId)}
                        aria-label={`Increase quantity of ${item.title}`}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <strong>
                      ₹{Number(item.price).toLocaleString("en-IN")}
                    </strong>
                    <p className="cart-item-total-price">
                      Total price is ₹
                      {(Number(item.price) * item.quantity).toLocaleString(
                        "en-IN",
                      )}
                    </p>
                    <button
                      className="remove-item-button"
                      type="button"
                      onClick={() => removeItem(item.productId)}
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </section>
            <aside className="cart-summary">
              <p>PRICE DETAILS</p>
              <div>
                <span>Price ({cart.totalProducts} items)</span>
                <strong>
                  ₹{Number(cart.totalCartPrice).toLocaleString("en-IN")}
                </strong>
              </div>
              <div>
                <span>Delivery</span>
                <strong className="free-delivery">FREE</strong>
              </div>
              <hr />
              <div className="cart-total">
                <span>Total Amount</span>
                <strong>
                  ₹{Number(cart.totalCartPrice).toLocaleString("en-IN")}
                </strong>
              </div>
              <button
                className="detail-action buy-now"
                type="button"
                onClick={startCheckout}
              >
                Buy now <ArrowRight size={17} />
              </button>
            </aside>
          </div>
        )}
      </main>
    </>
  );
}

function SimplePage({ title, text }) {
  return (
    <>
      <Header search="" setSearch={() => {}} onMenu={() => {}} />
      <main className="simple-page">
        <p className="eyebrow">CartWish</p>
        <h1>{title}</h1>
        <p>{text}</p>
        <Link className="back-link" to="/">
          Return to the shop <ArrowRight size={16} />
        </Link>
      </main>
    </>
  );
}

function OrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    authenticatedFetch("/api/order")
      .then(async (response) => {
        const data = await readResponse(response);
        if (!response.ok)
          throw new Error(data.message || "Unable to load orders.");
        const enrichedOrders = await Promise.all(
          (Array.isArray(data) ? data : []).map(async (order) => ({
            ...order,
            products: await Promise.all(
              (order.products || []).map(async (product) => {
                try {
                  const details = await api(
                    `/api/products/${product.productId}`,
                  );
                  return { ...product, description: details.description };
                } catch {
                  return product;
                }
              }),
            ),
          })),
        );
        setOrders(enrichedOrders);
      })
      .catch((ordersError) => setError(ordersError.message))
      .finally(() => setLoading(false));
  }, [navigate]);

  return (
    <>
      <Header search="" setSearch={() => {}} onMenu={() => {}} />
      <main className="orders-page">
        <div className="catalog-intro">
          <div>
            <p className="eyebrow">Your CartWish history</p>
            <h1>My orders</h1>
          </div>
          <p className="catalog-subtitle">
            Track every purchase and its delivery details.
          </p>
        </div>
        {loading && <div className="state-message">Loading your orders...</div>}
        {error && <div className="state-message">{error}</div>}
        {!loading && !error && !orders.length && (
          <div className="state-message">
            No orders yet. Your confirmed purchases will appear here.
            <Link className="back-link" to="/products">
              Explore the shop <ArrowRight size={16} />
            </Link>
          </div>
        )}
        {!loading && !error && orders.length > 0 && (
          <section className="orders-list">
            {orders.map((order) => (
              <article className="order-card" key={order._id}>
                <div className="order-card-heading">
                  <div>
                    <p className="order-label">ORDER PLACED</p>
                    <strong>
                      {new Date(order.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </strong>
                  </div>
                  <span
                    className={`order-status ${order.orderStatus || "pending"}`}
                  >
                    {order.orderStatus || "pending"}
                  </span>
                </div>
                <div className="order-products">
                  {order.products?.map((product) => (
                    <div
                      className="order-product"
                      key={`${order._id}-${product.productId}`}
                      role="link"
                      tabIndex="0"
                      onClick={() => navigate(`/product/${product.productId}`)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          navigate(`/product/${product.productId}`);
                        }
                      }}
                    >
                      <img
                        src={imageUrl("products", product.image)}
                        alt={product.title}
                      />
                      <div>
                        <h2>{product.title}</h2>
                        {product.description && (
                          <p className="order-product-description">
                            {product.description}
                          </p>
                        )}
                        <p>Quantity: {product.quantity}</p>
                        <strong>
                          ₹
                          {(
                            Number(product.price) * product.quantity
                          ).toLocaleString("en-IN")}
                        </strong>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="order-card-footer">
                  <span>Payment: {order.paymentStatus}</span>
                  <strong>
                    Total ₹{Number(order.totalPrice).toLocaleString("en-IN")}
                  </strong>
                  <span className="order-delivery-address">
                    Deliver to: {formatOrderAddress(order.shippingAddress)}
                  </span>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
    </>
  );
}

function PaymentConfirmationPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [shippingAddress, setShippingAddress] = useState(
    state?.shippingAddress || "",
  );
  const [addressId, setAddressId] = useState(state?.addressId || "");
  const items = state?.items || [];
  const total = items.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
    0,
  );

  useEffect(() => {
    if (!localStorage.getItem("accessToken"))
      navigate("/login", { replace: true });
    if (!items.length) navigate("/", { replace: true });
    authenticatedFetch("/api/address")
      .then(async (response) => {
        if (response.status === 404) return [];
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.message || "Unable to load addresses");
        return data.addresses || [];
      })
      .then((savedAddresses) => {
        if (!savedAddresses.length) {
          navigate("/addresses", {
            replace: true,
            state: { returnTo: "/confirm-payment", items },
          });
          return;
        }

        setAddresses(savedAddresses);
        const selectedAddress =
          savedAddresses.find((address) => address._id === state?.addressId) ||
          savedAddresses[0];
        setAddressId(selectedAddress._id);
        setShippingAddress(formatSavedAddress(selectedAddress));
      })
      .catch(() =>
        navigate("/addresses", {
          replace: true,
          state: { returnTo: "/confirm-payment", items },
        }),
      );
  }, [items, navigate]);

  const confirmPayment = async () => {
    setError("");
    setProcessing(true);
    try {
      const token = localStorage.getItem("accessToken");
      const response = await authenticatedFetch("/api/order/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ addressId }),
      });
      const order = await readResponse(response);
      if (!response.ok || !order.orderId) {
        throw new Error(order.message || "Unable to create the payment order.");
      }
      const Razorpay = await loadRazorpay();
      const key = import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!key) throw new Error("Razorpay public key is not configured.");

      const payment = new Razorpay({
        key,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "CartWish",
        description:
          items.length === 1
            ? items[0].title
            : `${items.length} CartWish items`,
        order_id: order.orderId,
        handler: async (result) => {
          try {
            const verifyResponse = await authenticatedFetch(
              "/api/order/paymentverify",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ ...result, addressId }),
              },
            );
            const verification = await readResponse(verifyResponse);
            if (!verifyResponse.ok || !verification.success) {
              throw new Error(
                verification.message || "Payment verification failed.",
              );
            }
            navigate("/orders");
          } catch (verificationError) {
            setError(verificationError.message);
            setProcessing(false);
          }
        },
        modal: { ondismiss: () => setProcessing(false) },
        theme: { color: "#ca593b" },
      });
      payment.open();
    } catch (paymentError) {
      setError(paymentError.message);
      setProcessing(false);
    }
  };

  if (!items.length) return null;
  return (
    <>
      <Header search="" setSearch={() => {}} onMenu={() => {}} />
      <main className="payment-page">
        <div className="payment-heading">
          <div>
            <p className="eyebrow">Almost yours</p>
            <h1>Confirm your payment</h1>
            <p>
              Review your order details before continuing to secure Razorpay
              checkout.
            </p>
          </div>
          <span className="payment-secure">
            <Check size={16} /> Secure checkout
          </span>
        </div>
        <section className="payment-layout">
          <div className="payment-items">
            {items.map((item) => (
              <article
                className="payment-item"
                key={item.productId || item._id}
              >
                <img
                  src={imageUrl("products", item.image || item.images?.[0])}
                  alt={item.title}
                />
                <div>
                  <h2>{item.title}</h2>
                  <p>{item.description || "CartWish selection"}</p>
                  <span>Quantity: {item.quantity || 1}</span>
                </div>
                <strong>
                  ₹
                  {(
                    Number(item.price) * Number(item.quantity || 1)
                  ).toLocaleString("en-IN")}
                </strong>
              </article>
            ))}
          </div>
          <div className="payment-address-selector">
            <div className="payment-address-selector-heading">
              <p className="eyebrow">Delivery address</p>
              <button type="button" onClick={() => navigate("/addresses")}>
                Add Address
              </button>
            </div>
            {addresses.map((address) => (
              <label className="address-option" key={address._id}>
                <input
                  type="radio"
                  name="checkout-address"
                  checked={addressId === address._id}
                  onChange={() => {
                    setAddressId(address._id);
                    setShippingAddress(formatSavedAddress(address));
                  }}
                />
                <span>{formatSavedAddress(address)}</span>
              </label>
            ))}
          </div>
          <aside className="payment-total">
            <p>PAYMENT SUMMARY</p>
            <div>
              <span>Items</span>
              <strong>
                {items.reduce(
                  (sum, item) => sum + Number(item.quantity || 1),
                  0,
                )}
              </strong>
            </div>
            <div>
              <span>Delivery</span>
              <strong className="free-delivery">FREE</strong>
            </div>
            <hr />
            <div className="payment-grand-total">
              <span>Total amount</span>
              <strong>₹{total.toLocaleString("en-IN")}</strong>
            </div>
            <div className="payment-address">
              <span>Deliver to</span>
              <strong>{shippingAddress || "Loading address..."}</strong>
            </div>
            {error && <p className="form-error">{error}</p>}
            <button
              className="detail-action buy-now"
              type="button"
              onClick={confirmPayment}
              disabled={processing}
            >
              {processing ? "Opening checkout..." : "Confirm payment"}
              <ArrowRight size={17} />
            </button>
            <button
              className="payment-back"
              type="button"
              onClick={() => navigate(-1)}
              disabled={processing}
            >
              Go back and edit order
            </button>
          </aside>
        </section>
      </main>
    </>
  );
}

function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setCartCount } = useContext(CartCountContext);
  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [saved, setSaved] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("wishlist") || "[]").includes(id);
    } catch {
      return false;
    }
  });
  const addToCart = async () => {
    if (!localStorage.getItem("accessToken")) {
      navigate("/login");
      return false;
    }
    const response = await authenticatedFetch(`/api/cart/${product._id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
      body: JSON.stringify({ quantity }),
    });
    const data = await readResponse(response);
    setActionMessage(response.ok ? "Added to cart." : data.message);
    if (response.ok) setCartCount(Number(data.cart?.totalProducts) || 0);
    return response.ok;
  };
  const buyNow = async () => {
    if (!localStorage.getItem("accessToken")) {
      navigate("/login");
      return;
    }
    const address = await getAvailableAddress();
    if (!address?.id) {
      navigate("/address", {
        state: {
          returnTo: "/confirm-payment",
          items: [{ ...product, productId: product._id, quantity }],
        },
      });
      return;
    }
    navigate("/confirm-payment", {
      state: {
        items: [{ ...product, productId: product._id, quantity }],
        shippingAddress: address.label,
        addressId: address.id,
      },
    });
  };
  const toggleWishlist = () => {
    const current = JSON.parse(localStorage.getItem("wishlist") || "[]");
    const next = saved
      ? current.filter((item) => item !== id)
      : [...new Set([...current, id])];
    localStorage.setItem("wishlist", JSON.stringify(next));
    setSaved(!saved);
  };
  useEffect(() => {
    api(`/api/products/${id}`)
      .then(setProduct)
      .catch(() => setError("Product not found."));
  }, [id]);
  if (error) return <SimplePage title="Product unavailable" text={error} />;
  if (!product)
    return (
      <>
        <Header search="" setSearch={() => {}} onMenu={() => {}} />
        <main className="simple-page">
          <p>Loading product...</p>
        </main>
      </>
    );
  const images = normalizeProductImages(product.images);
  const rating = product.review?.length
    ? product.review.reduce((sum, review) => sum + review.rating, 0) /
      product.review.length
    : 0;
  return (
    <>
      <Header search="" setSearch={() => {}} onMenu={() => {}} />
      <main className="product-detail">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span>/</span>
          <Link to="/products">Products</Link>
          <span>/</span>
          <strong>{product.title}</strong>
        </nav>
        <div className="product-gallery">
          <div className="thumbnail-list">
            {images.map((image, index) => (
              <button
                key={image}
                className={selectedImage === index ? "selected" : ""}
                onClick={() => setSelectedImage(index)}
              >
                <img
                  src={imageUrl("products", image)}
                  alt={`${product.title} view ${index + 1}`}
                />
              </button>
            ))}
          </div>
          <div className="detail-main-image">
            <img
              src={imageUrl("products", images[selectedImage])}
              alt={product.title}
            />
          </div>
        </div>
        <section className="detail-copy">
          <p className="eyebrow">CartWish detail</p>
          <h1>{product.title}</h1>
          <strong className="detail-price">
            ₹{Number(product.price).toLocaleString("en-IN")}
          </strong>
          <span className="unit-price">
            ₹{Number(product.price).toLocaleString("en-IN")} each
          </span>
          <div className="detail-rating">
            <Star size={16} fill="currentColor" /> {rating.toFixed(1)}{" "}
            <span>({product.review?.length || 0} reviews)</span>
          </div>
          <p className="detail-description">{product.description}</p>
          <p className={product.stock ? "in-stock" : "out-stock"}>
            {product.stock ? `${product.stock} in stock` : "Out of stock"}
          </p>
          <label className="quantity-picker">
            Quantity
            <span className="quantity-controls">
              <button
                type="button"
                onClick={() =>
                  setQuantity((current) => Math.max(1, current - 1))
                }
                disabled={!product.stock || quantity <= 1}
                aria-label="Decrease quantity"
              >
                <Minus size={15} />
              </button>
              <output aria-live="polite">{quantity}</output>
              <button
                type="button"
                onClick={() =>
                  setQuantity((current) => Math.min(product.stock, current + 1))
                }
                disabled={!product.stock || quantity >= product.stock}
                aria-label="Increase quantity"
              >
                <Plus size={15} />
              </button>
            </span>
          </label>
          <div className="detail-actions">
            <button className="detail-action" type="button" onClick={addToCart}>
              Add to cart <ShoppingBag size={17} />
            </button>
            <button
              className="detail-action buy-now"
              type="button"
              onClick={buyNow}
            >
              <span className="buy-now-copy">
                <span>Buy now</span>
                <span className="buy-now-price">
                  at ₹{Number(product.price).toLocaleString("en-IN")}
                </span>
              </span>
              <ArrowRight size={17} />
            </button>
          </div>
          <button
            className={`detail-wishlist ${saved ? "is-saved" : ""}`}
            type="button"
            onClick={toggleWishlist}
          >
            <Heart size={17} fill={saved ? "currentColor" : "none"} />{" "}
            {saved ? "Saved to wishlist" : "Add to wishlist"}
          </button>
          {(getUserRole() === "admin" || getUserRole() === "seller") && (
            <button
              className="delete-detail"
              type="button"
              onClick={async () => {
                if (!window.confirm(`Delete ${product.title}?`)) return;
                const response = await authenticatedFetch(
                  `/api/products/${product._id}`,
                  {
                    method: "DELETE",
                    headers: {
                      Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
                    },
                  },
                );
                if (response.ok) navigate("/");
                else setActionMessage("You cannot delete this product.");
              }}
            >
              <Trash2 size={16} />
              Delete item
            </button>
          )}
          {actionMessage && <p className="form-success">{actionMessage}</p>}
        </section>
        {Array.isArray(product.review) && product.review.length > 0 && (
          <section className="detail-reviews">
            <div>
              <p className="eyebrow">From the community</p>
              <h2>Customer reviews</h2>
            </div>
            <div className="review-summary">
              <strong>{rating.toFixed(1)}</strong>
              <span>
                <Star size={15} fill="currentColor" /> Based on{" "}
                {product.review.length} reviews
              </span>
            </div>
            <div className="review-list">
              {product.review.slice(0, 4).map((review, index) => (
                <article className="review-item" key={review._id || index}>
                  <div>
                    <strong>
                      {review.userName || review.name || "CartWish customer"}
                    </strong>
                    <span>
                      <Star size={13} fill="currentColor" /> {review.rating}
                    </span>
                  </div>
                  <p>
                    {review.comment ||
                      review.text ||
                      review.review ||
                      "A lovely addition to my everyday."}
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}

function ProtectedPage({ role, children }) {
  return getUserRole() === role ? (
    <>
      <Header search="" setSearch={() => {}} onMenu={() => {}} />
      {children}
    </>
  ) : (
    <Navigate to="/login" replace />
  );
}

function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    authenticatedFetch("/api/user")
      .then(async (response) => {
        const data = await readResponse(response);
        if (!response.ok)
          throw new Error(data.message || "Unable to load profile");
        return data;
      })
      .then(setProfile)
      .catch((profileError) => setError(profileError.message));
  }, []);

  return (
    <>
      <Header search="" setSearch={() => {}} onMenu={() => {}} />
      <main className="profile-page">
        <p className="eyebrow">Your CartWish account</p>
        <h1>Your profile.</h1>
        {error && <div className="state-message">{error}</div>}
        {profile && (
          <div className="profile-details">
            <div className="profile-avatar">
              {profile.name?.trim().charAt(0).toUpperCase()}
            </div>
            <div>
              <span>Name</span>
              <strong>{profile.name}</strong>
            </div>
            <div>
              <span>Email</span>
              <strong>{profile.email}</strong>
            </div>
            <div>
              <span>Delivery address</span>
              <strong>
                {profile.deleveryAdress ||
                  localStorage.getItem("cartwishAddress") ||
                  "No address saved yet"}
              </strong>
            </div>
            <div>
              <span>Account type</span>
              <strong>{profile.role}</strong>
            </div>
          </div>
        )}
        <Link className="profile-address-action" to="/address">
          <span>
            {profile?.deleveryAdress ? "Update address" : "Add address"}
          </span>
          <ArrowRight size={17} />
        </Link>
      </main>
    </>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submitLogin = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(apiUrl("/api/user/login"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await readResponse(response);
      if (!response.ok) {
        throw new Error(
          typeof data === "string" ? data : data.message || "Login failed",
        );
      }
      localStorage.setItem("accessToken", data);
      navigate("/");
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Header search="" setSearch={() => {}} onMenu={() => {}} />
      <main className="login-page">
        <div className="login-copy">
          <p className="eyebrow">Welcome to CartWish</p>
          <h1>
            Keep your
            <br />
            favourites close.
          </h1>
          <p>
            Sign in to save products to your wishlist and revisit the things you
            love.
          </p>
        </div>
        <form className="login-form" onSubmit={submitLogin}>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm({ ...form, password: event.target.value })
              }
              required
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="login-submit" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
            <ArrowRight size={17} />
          </button>
          <p className="signup-prompt">
            New user? <Link to="/signup">Please sign up</Link>
          </p>
        </form>
      </main>
    </>
  );
}

function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    deleveryAdress: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submitSignup = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await authenticatedFetch("/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await readResponse(response);
      if (!response.ok) {
        throw new Error(
          typeof data === "string" ? data : data.message || "Signup failed",
        );
      }
      localStorage.setItem("accessToken", data);
      navigate("/");
    } catch (signupError) {
      setError(
        typeof signupError.message === "string"
          ? signupError.message
          : "Signup failed",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Header search="" setSearch={() => {}} onMenu={() => {}} />
      <main className="login-page">
        <div className="login-copy">
          <p className="eyebrow">Join CartWish</p>
          <h1>
            Make room for
            <br />
            more lovely.
          </h1>
          <p>
            Create your account to save favourites and keep every order in one
            place.
          </p>
        </div>
        <form className="login-form" onSubmit={submitSignup}>
          <label>
            Name
            <input
              type="text"
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm({ ...form, password: event.target.value })
              }
              minLength="6"
              required
            />
          </label>
          <label>
            Delivery address
            <input
              type="text"
              value={form.deleveryAdress}
              onChange={(event) =>
                setForm({ ...form, deleveryAdress: event.target.value })
              }
              minLength="5"
              required
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="login-submit" disabled={submitting}>
            {submitting ? "Creating account..." : "Create account"}
            <ArrowRight size={17} />
          </button>
          <p className="signup-prompt">
            Already a user? <Link to="/login">Sign in</Link>
          </p>
        </form>
      </main>
    </>
  );
}

export default function App() {
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    authenticatedFetch("/api/cart")
      .then((response) => (response.ok ? response.json() : null))
      .then((cart) => {
        if (cart) setCartCount(Number(cart.totalProducts) || 0);
      })
      .catch(() => {});
  }, []);

  return (
    <CartCountContext.Provider value={{ cartCount, setCartCount }}>
      <Routes>
        <Route path="*" element={<Shop />} />
        <Route path="/products" element={<Shop />} />
        <Route path="/product/:id" element={<ProductDetailPage />} />
        <Route path="/confirm-payment" element={<PaymentConfirmationPage />} />
        <Route path="/address" element={<AddressPage />} />
        <Route path="/addresses" element={<AddAnotherAddress />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route
          path="/seller"
          element={
            <ProtectedPage role="seller">
              <SellerPage />
            </ProtectedPage>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedPage role="admin">
              <AdminPage />
            </ProtectedPage>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <ProtectedPage role="admin">
              <AdminOrdersPage />
            </ProtectedPage>
          }
        />
        <Route
          path="/profile"
          element={
            localStorage.getItem("accessToken") ? (
              <ProfilePage />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="/cart" element={<CartPage />} />
      </Routes>
      <Footer />
      <CartWishAssistant />
    </CartCountContext.Provider>
  );
}
