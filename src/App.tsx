import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Nutrition } from "./pages/Nutrition";
import { Fitness } from "./pages/Fitness";
import { Journal } from "./pages/Journal";
import { Memory } from "./pages/Memory";
import { DynamicPage } from "./pages/DynamicPage";

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/nutrition" element={<Nutrition />} />
          <Route path="/fitness" element={<Fitness />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/memory" element={<Memory />} />
          <Route path="/page/:slug" element={<DynamicPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
