import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import DetectionPage from "./pages/DetectionPage";
import TrainingDataPage from "./pages/TrainingDataPage";
import AdminTrainingDataPage from "./pages/AdminTrainingDataPage";
import AdminCMSPage from "./pages/AdminCMSPage";
import VolunteerHistoryPage from "./pages/VolunteerHistoryPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        
        <Route path="/dashboard/:role" element={<DashboardPage />}>
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