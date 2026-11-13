
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

// Candidate status colors
const CANDIDATE_COLORS = {
  Applied: "#3B82F6",
  Shortlisted: "#F59E0B",
  Selected: "#16A34A",
  Rejected: "#EF4444",
};

// Job drive status colors
const DRIVE_COLORS = {
  Draft: "#94A3B8",
  Open: "#16A34A",
  Paused: "#F59E0B",
  Closed: "#64748B",
};

// Format month labels
function formatMonth(monthValue) {
  if (!monthValue) return "";

  const [year, month] = monthValue.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);

  return date.toLocaleDateString("en", {
    month: "short",
  });
}


// Reusable dashboard statistic card
function StatCard({ title, value, description }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>

      <h2 className="mt-3 text-3xl font-bold text-slate-900">
        {value}
      </h2>

      <p className="mt-2 text-xs text-slate-400">
        {description}
      </p>
    </div>
  );
}


// Reusable donut chart using CSS
function StatusChart({ title, items, colors }) {
  const total = items.reduce(
    (sum, item) => sum + Number(item.count || 0),
    0
  );

  let currentPercentage = 0;

  const segments = items
    .filter((item) => Number(item.count || 0) > 0)
    .map((item) => {
      const percentage = (Number(item.count) / total) * 100;

      const start = currentPercentage;
      currentPercentage += percentage;

      return `${colors[item.status] || "#94A3B8"} ${start}% ${currentPercentage}%`;
    });

  const chartStyle = {
    background:
      total > 0
        ? `conic-gradient(${segments.join(", ")})`
        : "#E2E8F0",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

      <h2 className="text-lg font-semibold text-slate-900">
        {title}
      </h2>

      <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row">

        {/* Donut chart */}
        <div
          className="relative h-40 w-40 shrink-0 rounded-full"
          style={chartStyle}
        >
          <div className="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-white">

            <span className="text-2xl font-bold text-slate-900">
              {total}
            </span>

            <span className="text-xs text-slate-500">
              Total
            </span>

          </div>
        </div>

        {/* Chart legend */}
        <div className="w-full space-y-3">

          {items.map((item) => (
            <div
              key={item.status}
              className="flex items-center justify-between gap-3"
            >

              <div className="flex items-center gap-2">

                <span
                  className="h-3 w-3 rounded-full"
                  style={{
                    backgroundColor:
                      colors[item.status] || "#94A3B8",
                  }}
                />

                <span className="text-sm text-slate-600">
                  {item.status}
                </span>

              </div>

              <span className="text-sm font-semibold text-slate-900">
                {item.count}
              </span>

            </div>
          ))}

        </div>

      </div>
    </div>
  );
}


// Main Dashboard
function Dashboard() {

  const [analytics, setAnalytics] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");


  // Fetch analytics from FastAPI
  useEffect(() => {

    let isMounted = true;

    const fetchAnalytics = async () => {

      try {

        setLoading(true);
        setError("");

        const response = await api.get("/analytics/overview");

        if (isMounted) {
          setAnalytics(response.data);
        }

      } catch (err) {

        if (isMounted) {

          setError(
            err.response?.data?.detail ||
            "Unable to load dashboard analytics."
          );

        }

      } finally {

        if (isMounted) {
          setLoading(false);
        }

      }

    };

    fetchAnalytics();

    return () => {
      isMounted = false;
    };

  }, []);


  // Extract API response data
  const summary = analytics?.summary || {};

  const candidateStatuses =
    analytics?.candidate_status || [];

  const driveStatuses =
    analytics?.job_drive_status || [];

  const monthlyCandidates =
    analytics?.monthly_candidates || [];

  const companyComparison =
    analytics?.company_comparison || [];

  const drivePerformance =
    analytics?.job_drive_performance || [];


  // Find maximum monthly candidate count
  const maxMonthlyCandidates = Math.max(
    1,
    ...monthlyCandidates.map(
      (item) => Number(item.candidates || 0)
    )
  );


  // Dashboard KPI cards
  const stats = [

    {
      title: "Total Companies",
      value: summary.total_companies ?? 0,
      description: "Companies managed by you",
    },

    {
      title: "Job Drives",
      value: summary.total_job_drives ?? 0,
      description: "Recruitment drives created",
    },

    {
      title: "Candidates",
      value: summary.total_candidates ?? 0,
      description: "Candidates registered",
    },

    {
      title: "Selected Candidates",
      value: summary.selected_candidates ?? 0,
      description: `${summary.selection_rate_percent ?? 0}% selection rate`,
    },

  ];


  return (

    <div className="p-6 md:p-8">

      {/* Dashboard Header - Existing UI preserved */}

      <div className="flex flex-wrap items-center justify-between gap-4">

        <div>

          <h1 className="text-2xl font-bold text-slate-900">
            Dashboard Overview
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Welcome to your HireLens AI workspace.
          </p>

        </div>

        <Link
          to="/companies"
          className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + Manage Companies
        </Link>

      </div>


      {/* Error Message */}

      {error && (

        <div
          className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600"
          role="alert"
        >
          {error}
        </div>

      )}


      {/* KPI Statistics Cards */}

      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">

        {stats.map((stat) => (

          <StatCard
            key={stat.title}
            title={stat.title}
            value={loading ? "..." : stat.value}
            description={stat.description}
          />

        ))}

      </div>


      {/* Loading State */}

      {loading && (

        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">

          Loading recruitment analytics...

        </div>

      )}


      {/* Analytics Content */}

      {!loading && analytics && (

        <>

          {/* Candidate and Job Drive Status */}

          <div className="mt-8 grid gap-5 xl:grid-cols-2">

            <StatusChart
              title="Candidate Recruitment Status"
              items={candidateStatuses}
              colors={CANDIDATE_COLORS}
            />

            <StatusChart
              title="Job Drive Status"
              items={driveStatuses}
              colors={DRIVE_COLORS}
            />

          </div>


          {/* Monthly Candidate Registration Chart */}

          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

            <h2 className="text-lg font-semibold text-slate-900">
              Monthly Candidate Registrations
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Candidate registrations over the latest 12 months
            </p>


            {monthlyCandidates.length > 0 ? (

              <div className="mt-6 flex h-56 items-end gap-2 overflow-x-auto pb-2">

                {monthlyCandidates.map((item) => {

                  const count = Number(item.candidates || 0);

                  const height = Math.max(
                    count > 0 ? 6 : 2,
                    (count / maxMonthlyCandidates) * 100
                  );

                  return (

                    <div
                      key={item.month}
                      className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
                      title={`${item.month}: ${count} candidates`}
                    >

                      <span className="text-xs font-medium text-slate-600">
                        {count}
                      </span>

                      <div className="flex h-40 w-full items-end">

                        <div
                          className="w-full rounded-t-md bg-blue-500 transition-all"
                          style={{
                            height: `${height}%`,
                          }}
                        />

                      </div>

                      <span className="text-xs text-slate-500">
                        {formatMonth(item.month)}
                      </span>

                    </div>

                  );

                })}

              </div>

            ) : (

              <p className="mt-5 text-sm text-slate-500">
                No monthly candidate data available.
              </p>

            )}

          </div>


          {/* Company-wise Analytics */}

          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

            <h2 className="text-lg font-semibold text-slate-900">
              Company-wise Recruitment Analytics
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Candidate and job drive performance by company
            </p>


            {companyComparison.length > 0 ? (

              <div className="mt-5 overflow-x-auto">

                <table className="w-full min-w-162.5 text-left text-sm">

                  <thead>

                    <tr className="border-b border-slate-200 text-slate-500">

                      <th className="px-3 py-3 font-medium">
                        Company
                      </th>

                      <th className="px-3 py-3 font-medium">
                        Job Drives
                      </th>

                      <th className="px-3 py-3 font-medium">
                        Openings
                      </th>

                      <th className="px-3 py-3 font-medium">
                        Candidates
                      </th>

                      <th className="px-3 py-3 font-medium">
                        Shortlisted
                      </th>

                      <th className="px-3 py-3 font-medium">
                        Selected
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {companyComparison.map((company) => (

                      <tr
                        key={company.company_id}
                        className="border-b border-slate-100 last:border-0"
                      >

                        <td className="px-3 py-3 font-medium text-slate-900">
                          {company.company_name}
                        </td>

                        <td className="px-3 py-3 text-slate-600">
                          {company.job_drives}
                        </td>

                        <td className="px-3 py-3 text-slate-600">
                          {company.openings}
                        </td>

                        <td className="px-3 py-3 text-slate-600">
                          {company.candidates}
                        </td>

                        <td className="px-3 py-3 text-slate-600">
                          {company.shortlisted}
                        </td>

                        <td className="px-3 py-3 font-semibold text-green-700">
                          {company.selected}
                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            ) : (

              <p className="mt-5 text-sm text-slate-500">
                No company analytics available yet.
              </p>

            )}

          </div>


          {/* Job Drive Performance */}

          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

            <h2 className="text-lg font-semibold text-slate-900">
              Job Drive Performance
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Your top 10 job drives by candidate applications
            </p>


            {drivePerformance.length > 0 ? (

              <div className="mt-5 overflow-x-auto">

                <table className="w-full min-w-150 text-left text-sm">

                  <thead>

                    <tr className="border-b border-slate-200 text-slate-500">

                      <th className="px-3 py-3 font-medium">
                        Job Title
                      </th>

                      <th className="px-3 py-3 font-medium">
                        Company
                      </th>

                      <th className="px-3 py-3 font-medium">
                        Status
                      </th>

                      <th className="px-3 py-3 font-medium">
                        Openings
                      </th>

                      <th className="px-3 py-3 font-medium">
                        Applicants
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {drivePerformance.map((drive) => (

                      <tr
                        key={drive.job_drive_id}
                        className="border-b border-slate-100 last:border-0"
                      >

                        <td className="px-3 py-3 font-medium text-slate-900">
                          {drive.job_title}
                        </td>

                        <td className="px-3 py-3 text-slate-600">
                          {drive.company_name}
                        </td>

                        <td className="px-3 py-3 text-slate-600">
                          {drive.status}
                        </td>

                        <td className="px-3 py-3 text-slate-600">
                          {drive.openings}
                        </td>

                        <td className="px-3 py-3 font-semibold text-slate-900">
                          {drive.applicants}
                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            ) : (

              <p className="mt-5 text-sm text-slate-500">
                No job drive performance data available.
              </p>

            )}

          </div>

        </>

      )}


      {/* Existing Getting Started Section - Preserved */}

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6">

        <h2 className="text-lg font-semibold text-slate-900">
          Getting Started
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Start by adding companies for which you manage recruitment.
          You can then create job drives and evaluate candidates.
        </p>

        <Link
          to="/companies"
          className="mt-5 inline-block font-semibold text-blue-600 hover:underline"
        >
          Go to Company Management →
        </Link>

      </div>

    </div>

  );

}

export default Dashboard;
