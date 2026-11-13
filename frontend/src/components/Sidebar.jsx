import { NavLink } from "react-router-dom";

const links = [
  {
    name: "Overview",
    path: "/dashboard",
    icon: "▦",
  },
  {
    name: "Companies",
    path: "/companies",
    icon: "▣",
  },
  {
    name: "Job Drives",
    path: "/job-drives",
    icon: "◈", // You can change this symbol or use an icon library later
  },
  {
    name: "Candidates",
    path: "/candidates",
    icon: "👤",
  },
];

function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-64 border-r border-slate-200 bg-white p-6 md:block">

      <h1 className="text-2xl font-bold text-blue-700">
        HireLens
      </h1>

      <p className="mt-1 text-xs text-slate-400">
        HR MANAGEMENT PLATFORM
      </p>

      <nav className="mt-10 space-y-2">

        {links.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            end={link.path === "/dashboard"}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium ${
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-100"
              }`
            }
          >
            <span>{link.icon}</span>
            {link.name}
          </NavLink>
        ))}

      </nav>

      <div className="absolute bottom-6 left-6 text-xs text-slate-400">
        HireLens © 2026
      </div>

    </aside>
  );
}

export default Sidebar;