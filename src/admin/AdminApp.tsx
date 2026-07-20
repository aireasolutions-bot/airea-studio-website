import { Routes, Route, Navigate } from "react-router-dom";
import { AdminAuthProvider, RequireAuth } from "./auth";
import { AdminLayout } from "./AdminLayout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Assets } from "./pages/Assets";
import { Editor } from "./pages/Editor";
import { PricingStudio } from "./pages/PricingStudio";
import { AgentBuilder } from "./pages/AgentBuilder";
import { Comments } from "./pages/Comments";
import { Publish } from "./pages/Publish";
import { Settings } from "./pages/Settings";
import { SeoConsole } from "./pages/SeoConsole";
import { Blog } from "./pages/Blog";
import { Activity } from "./pages/Activity";

export function AdminApp() {
  return (
    <AdminAuthProvider>
      <Routes>
        <Route path="login" element={<Login />} />
        <Route
          element={
            <RequireAuth>
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="agent" element={<AgentBuilder />} />
          <Route path="editor" element={<Editor />} />
          <Route path="pricing" element={<PricingStudio />} />
          <Route path="assets" element={<Assets />} />
          <Route path="comments" element={<Comments />} />
          <Route path="seo" element={<SeoConsole />} />
          <Route path="blog" element={<Blog />} />
          <Route path="publish" element={<Publish />} />
          <Route path="settings" element={<Settings />} />
          <Route path="activity" element={<Activity />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminAuthProvider>
  );
}
