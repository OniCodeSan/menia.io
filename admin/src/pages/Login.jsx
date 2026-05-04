import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../App";
import { Lock } from "lucide-react";

export default function Login() {
  const { user, login, loading, error: globalError } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate("/");
    } catch (err) {
      setError(err.message || JSON.stringify(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand/20 mb-4">
            <Lock className="text-brand" size={28} />
          </div>
          <h1 className="text-2xl font-bold">Menia Admin</h1>
          <p className="text-gray-500 text-sm mt-1">Accesso riservato</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          {globalError && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2 text-yellow-400 text-xs font-mono break-all">
              DEBUG: {globalError}
            </div>
          )}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              required
            />
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? "Accesso..." : "Accedi"}
          </button>
        </form>
      </div>
    </div>
  );
}
