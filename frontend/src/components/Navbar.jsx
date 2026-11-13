import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">

      <div>
        <h2 className="font-semibold text-slate-800">
          HR Workspace
        </h2>

        <p className="text-xs text-slate-500">
          Manage your recruitment activities
        </p>
      </div>

      <div className="flex items-center gap-4">

        <div className="text-right">
          <p className="text-sm font-semibold text-slate-800">
            {user?.name}
          </p>

          <p className="text-xs text-slate-500">
            {user?.email}
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100"
        >
          Logout
        </button>

      </div>

    </header>
  );
}

export default Navbar;