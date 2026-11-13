import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import ResumeAnalysisModal from "../components/ResumeAnalysisModal";

const initialForm = {
  job_drive_id: "",
  name: "",
  email: "",
  phone: "",
  resume: null,
};

const statuses = [
  "Applied",
  "Shortlisted",
  "Rejected",
  "Selected",
];

const statusStyles = {
  Applied: "bg-blue-100 text-blue-700",
  Shortlisted: "bg-yellow-100 text-yellow-700",
  Rejected: "bg-red-100 text-red-700",
  Selected: "bg-green-100 text-green-700",
};

export default function Candidates() {
  const [candidates, setCandidates] = useState([]);
  const [jobDrives, setJobDrives] = useState([]);

  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [search, setSearch] = useState("");
  const [driveFilter, setDriveFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  // -----------------------------------------
  // LOAD JOB DRIVES AND CANDIDATES
  // -----------------------------------------

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const [driveResponse, candidateResponse] = await Promise.all([
        api.get("/job-drives/"),
        api.get("/candidates/"),
      ]);

      setJobDrives(driveResponse.data.job_drives || []);
      setCandidates(candidateResponse.data.candidates || []);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load candidate information."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // -----------------------------------------
  // FORM INPUT HANDLING
  // -----------------------------------------

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;

    setForm((previous) => ({
      ...previous,
      resume: file,
    }));
  };

  // -----------------------------------------
  // OPEN CREATE FORM
  // -----------------------------------------

  const openCreateForm = () => {
    setEditingId(null);
    setForm({
      ...initialForm,
      job_drive_id: driveFilter !== "All" ? driveFilter : "",
    });

    setError("");
    setMessage("");
    setShowForm(true);
  };

  // -----------------------------------------
  // OPEN EDIT FORM
  // -----------------------------------------

  const openEditForm = (candidate) => {
    setEditingId(candidate._id);

    setForm({
      job_drive_id: candidate.job_drive_id,
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone || "",
      resume: null,
    });

    setError("");
    setMessage("");
    setShowForm(true);
  };

  // -----------------------------------------
  // CREATE OR UPDATE CANDIDATE
  // -----------------------------------------

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      if (!editingId) {
        // Resume is mandatory when registering a candidate.
        if (!form.resume) {
          setError("Please select a resume.");
          return;
        }

        const formData = new FormData();

        formData.append("job_drive_id", form.job_drive_id);
        formData.append("name", form.name.trim());
        formData.append("email", form.email.trim());
        formData.append("phone", form.phone.trim());
        formData.append("resume", form.resume);

        await api.post("/candidates/", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        setMessage("Candidate registered successfully.");
      } else {
        // Update candidate's normal details.
        const payload = {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
        };

        await api.put(`/candidates/${editingId}`, payload);

        // Replace resume only if a new file was selected.
        if (form.resume) {
          const resumeData = new FormData();
          resumeData.append("resume", form.resume);

          await api.put(
            `/candidates/${editingId}/resume`,
            resumeData,
            {
              headers: {
                "Content-Type": "multipart/form-data",
              },
            }
          );
        }

        setMessage("Candidate updated successfully.");
      }

      setShowForm(false);
      setForm(initialForm);
      setEditingId(null);

      await fetchData();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to save candidate information."
      );
    } finally {
      setSaving(false);
    }
  };

  // -----------------------------------------
  // UPDATE CANDIDATE STATUS
  // -----------------------------------------

  const handleStatusChange = async (candidateId, newStatus) => {
    try {
      setError("");
      setMessage("");

      await api.put(`/candidates/${candidateId}`, {
        status: newStatus,
      });

      setCandidates((previous) =>
        previous.map((candidate) =>
          candidate._id === candidateId
            ? { ...candidate, status: newStatus }
            : candidate
        )
      );

      setMessage("Candidate status updated successfully.");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to update candidate status."
      );
    }
  };

  // -----------------------------------------
  // DOWNLOAD RESUME
  // -----------------------------------------

  const handleDownload = async (candidate) => {
    try {
      setDownloadingId(candidate._id);
      setError("");

      const response = await api.get(
        `/candidates/${candidate._id}/resume`,
        {
          responseType: "blob",
        }
      );

      const blobUrl = window.URL.createObjectURL(
        new Blob([response.data], {
          type: candidate.resume_content_type ||
            "application/octet-stream",
        })
      );

      const link = document.createElement("a");

      link.href = blobUrl;
      link.download = candidate.resume_file_name || "resume";

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setError(
        "Unable to download resume. Please check your login session."
      );
    } finally {
      setDownloadingId(null);
    }
  };

  // -----------------------------------------
  // DELETE CANDIDATE
  // -----------------------------------------

  const handleDelete = async (candidateId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this candidate and their uploaded resume?"
    );

    if (!confirmed) return;

    try {
      setError("");
      setMessage("");

      await api.delete(`/candidates/${candidateId}`);

      setCandidates((previous) =>
        previous.filter(
          (candidate) => candidate._id !== candidateId
        )
      );

      setMessage("Candidate deleted successfully.");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to delete candidate."
      );
    }
  };

  // -----------------------------------------
  // GET JOB DRIVE TITLE
  // -----------------------------------------

  const getJobTitle = (jobDriveId) => {
    const drive = jobDrives.find(
      (item) => item._id === jobDriveId
    );

    return drive?.job_title || "Unknown Job Drive";
  };

  // -----------------------------------------
  // SEARCH AND FILTER
  // -----------------------------------------

  const filteredCandidates = useMemo(() => {
    return candidates.filter((candidate) => {
      const searchText = search.toLowerCase();

      const matchesSearch =
        candidate.name.toLowerCase().includes(searchText) ||
        candidate.email.toLowerCase().includes(searchText) ||
        getJobTitle(candidate.job_drive_id)
          .toLowerCase()
          .includes(searchText);

      const matchesDrive =
        driveFilter === "All" ||
        candidate.job_drive_id === driveFilter;

      const matchesStatus =
        statusFilter === "All" ||
        candidate.status === statusFilter;

      return matchesSearch && matchesDrive && matchesStatus;
    });
  }, [
    candidates,
    jobDrives,
    search,
    driveFilter,
    statusFilter,
  ]);

  // -----------------------------------------
  // DASHBOARD COUNTS
  // -----------------------------------------

  const shortlistedCount = candidates.filter(
    (candidate) => candidate.status === "Shortlisted"
  ).length;

  const selectedCount = candidates.filter(
    (candidate) => candidate.status === "Selected"
  ).length;

  const appliedCount = candidates.filter(
    (candidate) => candidate.status === "Applied"
  ).length;

  // -----------------------------------------
  // UI
  // -----------------------------------------

  return (
    <div className="space-y-6">

      {/* PAGE HEADER */}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Candidates
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Manage candidates, resumes and recruitment progress.
          </p>
        </div>

        <button
          onClick={openCreateForm}
          disabled={jobDrives.length === 0}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          + Add Candidate
        </button>
      </div>

      {/* SUCCESS AND ERROR MESSAGES */}

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

      {/* SUMMARY CARDS */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Total Candidates</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-800">
            {candidates.length}
          </h2>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Applied</p>
          <h2 className="mt-2 text-3xl font-bold text-blue-600">
            {appliedCount}
          </h2>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Shortlisted</p>
          <h2 className="mt-2 text-3xl font-bold text-yellow-600">
            {shortlistedCount}
          </h2>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Selected</p>
          <h2 className="mt-2 text-3xl font-bold text-green-600">
            {selectedCount}
          </h2>
        </div>

      </div>

      {/* CANDIDATE FORM */}

      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                {editingId ? "Edit Candidate" : "Register Candidate"}
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Enter candidate information and attach their resume.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-xl text-gray-500 hover:text-gray-800"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* JOB DRIVE */}

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Job Drive *
              </label>

              <select
                name="job_drive_id"
                value={form.job_drive_id}
                onChange={handleChange}
                required
                disabled={Boolean(editingId)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 disabled:bg-gray-100"
              >
                <option value="">Select Job Drive</option>

                {jobDrives.map((drive) => (
                  <option key={drive._id} value={drive._id}>
                    {drive.job_title}
                  </option>
                ))}
              </select>
            </div>

            {/* NAME AND EMAIL */}

            <div className="grid gap-5 md:grid-cols-2">

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Candidate Name *
                </label>

                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  minLength={2}
                  maxLength={100}
                  placeholder="Enter full name"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Email Address *
                </label>

                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder="candidate@example.com"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5"
                />
              </div>

            </div>

            {/* PHONE */}

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Phone Number
              </label>

              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="Enter phone number"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5"
              />
            </div>

            {/* RESUME UPLOAD */}

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Resume {editingId ? "(Optional)" : "*"}
              </label>

              <input
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
                required={!editingId}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 file:mr-4 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-indigo-700"
              />

              <p className="mt-1 text-xs text-gray-500">
                PDF or DOCX only. Maximum file size: 5 MB.
              </p>

              {editingId && (
                <p className="mt-1 text-xs text-gray-500">
                  Select a new file only if you want to replace the existing resume.
                </p>
              )}

              {form.resume && (
                <p className="mt-2 text-sm text-indigo-600">
                  Selected file: {form.resume.name}
                </p>
              )}
            </div>

            {/* BUTTONS */}

            <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-5">

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-indigo-600 px-6 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Candidate"
                    : "Register Candidate"}
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
        </div>
      )}

      {/* SEARCH AND FILTERS */}

      <div className="grid gap-3 md:grid-cols-3">

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email or job..."
          className="rounded-lg border border-gray-300 bg-white px-4 py-2.5"
        />

        <select
          value={driveFilter}
          onChange={(e) => setDriveFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2.5"
        >
          <option value="All">All Job Drives</option>

          {jobDrives.map((drive) => (
            <option key={drive._id} value={drive._id}>
              {drive.job_title}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2.5"
        >
          <option value="All">All Statuses</option>

          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

      </div>

      {/* CANDIDATE TABLE */}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

        {loading ? (
          <p className="p-10 text-center text-gray-500">
            Loading candidates...
          </p>
        ) : filteredCandidates.length === 0 ? (
          <div className="p-10 text-center">
            <h3 className="font-semibold text-gray-800">
              No candidates found
            </h3>

            <p className="mt-2 text-sm text-gray-500">
              Register a candidate to start managing recruitment.
            </p>
          </div>
        ) : (

          <div className="overflow-x-auto">

            <table className="w-full min-w-262.5 text-left text-sm">

              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-5 py-4 font-semibold">Candidate</th>
                  <th className="px-5 py-4 font-semibold">Job Drive</th>
                  <th className="px-5 py-4 font-semibold">Phone</th>
                  <th className="px-5 py-4 font-semibold">Resume</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">

                {filteredCandidates.map((candidate) => (

                  <tr key={candidate._id} className="hover:bg-gray-50">

                    {/* CANDIDATE */}

                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-800">
                        {candidate.name}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {candidate.email}
                      </p>
                    </td>

                    {/* JOB DRIVE */}

                    <td className="px-5 py-4 text-gray-600">
                      {getJobTitle(candidate.job_drive_id)}
                    </td>

                    {/* PHONE */}

                    <td className="px-5 py-4 text-gray-600">
                      {candidate.phone || "—"}
                    </td>

                    {/* RESUME */}

                    <td className="px-5 py-4">
                      <button
                        onClick={() => handleDownload(candidate)}
                        disabled={downloadingId === candidate._id}
                        className="font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                      >
                        {downloadingId === candidate._id
                          ? "Downloading..."
                          : "Download Resume"}
                      </button>

                      <p className="mt-1 max-w-40 truncate text-xs text-gray-400">
                        {candidate.resume_file_name}
                      </p>
                    </td>

                    {/* STATUS */}

                    <td className="px-5 py-4">

                      <select
                        value={candidate.status}
                        onChange={(e) =>
                          handleStatusChange(
                            candidate._id,
                            e.target.value
                          )
                        }
                        className={`rounded-full border-0 px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-indigo-300 ${
                          statusStyles[candidate.status] ||
                          "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {statuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>

                    </td>

                    {/* ACTIONS */}

                    <td className="px-5 py-4">

                      <div className="flex gap-3">

                        <button
                          onClick={() => openEditForm(candidate)}
                          className="font-medium text-indigo-600 hover:text-indigo-800"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => handleDelete(candidate._id)}
                          className="font-medium text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setSelectedCandidate(candidate)}
                          className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-indigo-700"
                        >
                          Analyze Resume
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
        Showing {filteredCandidates.length} of {candidates.length} candidates
      </p>
       {selectedCandidate && (
          <ResumeAnalysisModal
            candidate={selectedCandidate}
            onClose={() => setSelectedCandidate(null)}
          />
        )}
    </div>
  );
}