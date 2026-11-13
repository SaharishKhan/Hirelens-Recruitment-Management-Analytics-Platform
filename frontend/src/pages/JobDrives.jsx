import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

const initialForm = {
  company_id: "",
  job_title: "",
  job_description: "",
  required_skills: "",
  preferred_skills: "",
  experience_min: 0,
  experience_max: "",
  location: "",
  employment_type: "Full-time",
  openings: 1,
  deadline: "",
  status: "Draft",
};

const statusStyles = {
  Draft: "bg-gray-100 text-gray-700",
  Open: "bg-green-100 text-green-700",
  Paused: "bg-yellow-100 text-yellow-700",
  Closed: "bg-red-100 text-red-700",
};

export default function JobDrives() {
  const [jobDrives, setJobDrives] = useState([]);
  const [companies, setCompanies] = useState([]);

  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Load companies and job drives
  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const [companyResponse, driveResponse] = await Promise.all([
        api.get("/companies/"),
        api.get("/job-drives/"),
      ]);

      setCompanies(companyResponse.data.companies || []);
      console.log("Companies API response:", companyResponse.data);
      setJobDrives(driveResponse.data.job_drives || []);
    } catch (err) {
      setError(
        err.response?.data?.detail || "Unable to load job drives."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update form fields
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // Open create form
  const openCreateForm = () => {
    setEditingId(null);
    setForm(initialForm);
    setError("");
    setMessage("");
    setShowForm(true);
  };

  // Open edit form
  const openEditForm = (drive) => {
    setEditingId(drive._id);

    setForm({
      company_id: drive.company_id,
      job_title: drive.job_title,
      job_description: drive.job_description,
      required_skills: (drive.required_skills || []).join(", "),
      preferred_skills: (drive.preferred_skills || []).join(", "),
      experience_min: drive.experience_min ?? 0,
      experience_max: drive.experience_max ?? "",
      location: drive.location || "",
      employment_type: drive.employment_type || "Full-time",
      openings: drive.openings || 1,
      deadline: drive.deadline ? drive.deadline.slice(0, 10) : "",
      status: drive.status || "Draft",
    });

    setError("");
    setMessage("");
    setShowForm(true);
  };

  // Submit create or update form
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const payload = {
        company_id: form.company_id,
        job_title: form.job_title.trim(),
        job_description: form.job_description.trim(),

        required_skills: form.required_skills
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean),
        preferred_skills: form.preferred_skills
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean),

        experience_min: Number(form.experience_min),

        experience_max:
          form.experience_max === ""
            ? null
            : Number(form.experience_max),

        location: form.location.trim() || null,
        employment_type: form.employment_type,
        openings: Number(form.openings),

        deadline: form.deadline
          ? `${form.deadline}T23:59:00`
          : null,

        status: form.status,
      };

      if (editingId) {
        // Update existing job drive
        await api.put(`/job-drives/${editingId}`, payload);
        setMessage("Job drive updated successfully.");
      } else {
        // Create new job drive
        await api.post("/job-drives/", payload);
        setMessage("Job drive created successfully.");
      }

      setShowForm(false);
      setForm(initialForm);
      setEditingId(null);

      await fetchData();
    } catch (err) {
      setError(
        err.response?.data?.detail || "Unable to save job drive."
      );
    } finally {
      setSaving(false);
    }
  };

  // Delete job drive
  const handleDelete = async (driveId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this job drive?"
    );

    if (!confirmed) return;

    try {
      setError("");
      setMessage("");

      await api.delete(`/job-drives/${driveId}`);

      setMessage("Job drive deleted successfully.");
      await fetchData();
    } catch (err) {
      setError(
        err.response?.data?.detail || "Unable to delete job drive."
      );
    }
  };

  // Get company name using company_id
  const getCompanyName = (companyId) => {
    const company = companies.find(
      (item) => item.id === companyId
    );

    return company?.name || "Unknown Company";
  };

  // Search and status filtering
  const filteredDrives = useMemo(() => {
    return jobDrives.filter((drive) => {
      const companyName = getCompanyName(drive.company_id);

      const matchesSearch =
        drive.job_title.toLowerCase().includes(search.toLowerCase()) ||
        companyName.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "All" || drive.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [jobDrives, companies, search, statusFilter]);

  return (
    <div className="space-y-6">

      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Job Drives
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Create and manage recruitment drives for your companies.
          </p>
        </div>

        <button
          onClick={openCreateForm}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700"
        >
          + Create Job Drive
        </button>
      </div>

      {/* Messages */}
      {message && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Create / Edit form */}
      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">
              {editingId ? "Edit Job Drive" : "Create New Job Drive"}
            </h2>

            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-gray-500 hover:text-gray-800"
            >
              ✕
            </button>
          </div>

          {companies.length === 0 ? (
            <p className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800">
              You need to create a company before creating a job drive.
              Go to Company Management and add a company first.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Company and job title */}
              <div className="grid gap-5 md:grid-cols-2">

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Company *
                  </label>

                  <select
                    name="company_id"
                    value={form.company_id}
                    onChange={handleChange}
                    required
                    disabled={Boolean(editingId)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 disabled:bg-gray-100"
                  >
                    <option value="">Select company</option>

                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Job Title *
                  </label>

                  <input
                    name="job_title"
                    value={form.job_title}
                    onChange={handleChange}
                    required
                    minLength={2}
                    maxLength={150}
                    placeholder="e.g. Python Developer"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5"
                  />
                </div>
              </div>

              {/* Job description */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Job Description *
                </label>

                <textarea
                  name="job_description"
                  value={form.job_description}
                  onChange={handleChange}
                  required
                  minLength={20}
                  rows={5}
                  placeholder="Describe the job role, responsibilities and qualifications..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5"
                />
              </div>

              {/* Required skills */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Required Skills *
                </label>

                <input
                  name="required_skills"
                  value={form.required_skills}
                  onChange={handleChange}
                  placeholder="Python, FastAPI, MongoDB, React"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5"
                />

                <p className="mt-1 text-xs text-gray-500">
                  Separate skills using commas.
                </p>
              </div>
              {/* Preferred skills */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Preferred Skills
                </label>

                <input
                  name="preferred_skills"
                  value={form.preferred_skills}
                  onChange={handleChange}
                  placeholder="JavaScript, Node.js, Express, PostgreSQL"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5"
                />

                <p className="mt-1 text-xs text-gray-500">
                  Separate skills using commas.
                </p>
              </div>

              {/* Experience and openings */}
              <div className="grid gap-5 md:grid-cols-3">

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Minimum Experience (years)
                  </label>

                  <input
                    type="number"
                    name="experience_min"
                    min="0"
                    value={form.experience_min}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Maximum Experience (years)
                  </label>

                  <input
                    type="number"
                    name="experience_max"
                    min="0"
                    value={form.experience_max}
                    onChange={handleChange}
                    placeholder="No limit"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Number of Openings *
                  </label>

                  <input
                    type="number"
                    name="openings"
                    min="1"
                    required
                    value={form.openings}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5"
                  />
                </div>
              </div>

              {/* Location, employment type, deadline */}
              <div className="grid gap-5 md:grid-cols-3">

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Location
                  </label>

                  <input
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    placeholder="e.g. Bengaluru"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Employment Type
                  </label>

                  <select
                    name="employment_type"
                    value={form.employment_type}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5"
                  >
                    <option>Full-time</option>
                    <option>Part-time</option>
                    <option>Internship</option>
                    <option>Contract</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Application Deadline
                  </label>

                  <input
                    type="date"
                    name="deadline"
                    value={form.deadline}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="max-w-sm">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Recruitment Status
                </label>

                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5"
                >
                  <option>Draft</option>
                  <option>Open</option>
                  <option>Paused</option>
                  <option>Closed</option>
                </select>
              </div>

              {/* Form buttons */}
              <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-5">

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-indigo-600 px-6 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Update Job Drive"
                      : "Create Job Drive"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-gray-300 px-6 py-2.5 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>

            </form>
          )}
        </div>
      )}

      {/* Search and filter */}
      <div className="flex flex-col gap-3 sm:flex-row">

        <input
          type="text"
          placeholder="Search by job title or company..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2.5"
        >
          <option value="All">All Statuses</option>
          <option value="Draft">Draft</option>
          <option value="Open">Open</option>
          <option value="Paused">Paused</option>
          <option value="Closed">Closed</option>
        </select>
      </div>

      {/* Job Drives table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

        {loading ? (
          <p className="p-8 text-center text-gray-500">
            Loading job drives...
          </p>
        ) : filteredDrives.length === 0 ? (
          <div className="p-10 text-center">
            <h3 className="font-semibold text-gray-800">
              No job drives found
            </h3>

            <p className="mt-2 text-sm text-gray-500">
              Create a job drive to start managing recruitment.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-212.5 text-left text-sm">

              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-5 py-4 font-semibold">Job Title</th>
                  <th className="px-5 py-4 font-semibold">Company</th>
                  <th className="px-5 py-4 font-semibold">Location</th>
                  <th className="px-5 py-4 font-semibold">Openings</th>
                  <th className="px-5 py-4 font-semibold">Deadline</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">

                {filteredDrives.map((drive) => (
                  <tr key={drive._id} className="hover:bg-gray-50">

                    <td className="px-5 py-4 font-medium text-gray-800">
                      {drive.job_title}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {getCompanyName(drive.company_id)}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {drive.location || "—"}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {drive.openings}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {drive.deadline
                        ? new Date(drive.deadline).toLocaleDateString()
                        : "—"}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          statusStyles[drive.status] || statusStyles.Draft
                        }`}
                      >
                        {drive.status}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex gap-3">
                        <button
                          onClick={() => openEditForm(drive)}
                          className="font-medium text-indigo-600 hover:text-indigo-800"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => handleDelete(drive._id)}
                          className="font-medium text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}

              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-sm text-gray-500">
        Showing {filteredDrives.length} of {jobDrives.length} job drives
      </p>

    </div>
  );
}