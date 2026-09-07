import { useState } from "react";
import { LogOut, MapPin, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { authenticatedFetch } from "../api";
import TrackingOrder from "./TrackingOrder";

export default function LogoutMenu({ initial }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const logout = async () => {
    try {
      await authenticatedFetch("/api/user/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("wishlist");
      navigate("/login");
    }
  };

  return (
    <div className="user-menu" onClick={(event) => event.stopPropagation()}>
      <button
        className="user-avatar"
        onClick={() => setOpen(!open)}
        aria-label="Open account menu"
        aria-expanded={open}
      >
        {initial}
      </button>
      {open && (
        <div className="user-menu-popover">
          <button onClick={() => navigate("/profile")}>
            <UserRound size={15} /> View profile
          </button>
          <button onClick={() => navigate("/address")}>
            <MapPin size={15} /> Add address
          </button>
          <TrackingOrder />
          <button onClick={logout}>
            <LogOut size={15} /> Logout
          </button>
        </div>
      )}
    </div>
  );
}
