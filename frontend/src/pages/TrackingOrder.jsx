import { PackageSearch } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function TrackingOrder() {
  const navigate = useNavigate();

  return (
    <button onClick={() => navigate("/orders")}>
      <PackageSearch size={15} /> Track your order
    </button>
  );
}
