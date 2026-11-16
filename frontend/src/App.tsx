import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import DetectionPage from "./pages/orang_tua/DetectionPage";
import TrainingDataPage from "./pages/volunteer/TrainingDataPage";
import AdminTrainingDataPage from "./pages/admin/AdminTrainingDataPage";
import AdminCMSPage from "./pages/admin/AdminCMSPage";
import VolunteerHistoryPage from "./pages/volunteer/VolunteerHistoryPage";
import OverviewPage from "./pages/orang_tua/OverviewPage";
import ChildGrowthPage from "./pages/orang_tua/ChildGrowthPage";
import AboutPage from "./pages/AboutPage";
import LabelPage from "./pages/LabelPage";
import RoleOverviewPage from "./pages/RoleOverviewPage";
import VolunteerCommunityPage from "./pages/volunteer/VolunteerCommunityPage";
import AdminLeaderboardPage from "./pages/admin/AdminLeaderboardPage";
import AdminParentsPage from "./pages/admin/AdminParentsPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/labels" element={<LabelPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        
        <Route path="/dashboard/:role" element={<DashboardPage />}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<RoleOverviewPage />} />
          <Route path="community" element={<VolunteerCommunityPage />} />
          <Route path="leaderboard" element={<AdminLeaderboardPage />} />
          <Route path="parents" element={<AdminParentsPage />} />
          <Route path="overview" element={<OverviewPage />} />
          <Route path="growth" element={<ChildGrowthPage />} />
          <Route path="detection" element={<DetectionPage />} />
          <Route path="training" element={<TrainingDataPage />} />
          <Route path="history" element={<VolunteerHistoryPage />} />
          
          <Route path="review-training" element={<AdminTrainingDataPage />} />
          <Route path="cms" element={<AdminCMSPage />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
