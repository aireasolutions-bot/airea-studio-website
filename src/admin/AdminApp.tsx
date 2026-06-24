import { Routes, Route, Navigate } from "react-router-dom";
import { AdminAuthProvider, RequireAuth } from "./auth";
import { AdminLayout } from "./AdminLayout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Assets } from "./pages/Assets";
import { Editor } from "./pages/Editor";
import { Comments } from "./pages/Comments";
import { Publish } from "./pages/Publish";
import { Settings } from "./pages/Settings";

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
          <Route path="editor" element={<Editor />} />
          <Route path="assets" element={<Assets />} />
          <Route path="comments" element={<Comments />} />
          <Route path="publish" element={<Publish />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminAuthProvider>
  );
}
