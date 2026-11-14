import { Navigate, useParams } from "react-router-dom";
import AdminOverviewPage from "./admin/AdminOverviewPage";
import VolunteerOverviewPage from "./volunteer/VolunteerOverviewPage";
import OverviewPage from "./orang_tua/OverviewPage";

export default function RoleOverviewPage() {
  const { role } = useParams();
  if (role === "admin") return <AdminOverviewPage />;
  if (role === "volunteer") return <VolunteerOverviewPage />;
  if (role === "orang_tua") return <OverviewPage />;
  return <Navigate to="/login" replace />;
}
