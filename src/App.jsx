import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import ControlPage from "./pages/ControlPage";
import DatalogsPage from "./pages/Datalogs";
import TimeAlert from "./components/TimeAlert";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/home" element={<HomePage />} />
        <Route path="/controls" element={<ControlPage />} />
        <Route path="/datalogs" element={<DatalogsPage />} />
        <Route path="/" element={<Navigate to="/home" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
