import { useEffect, useState } from "react";
import api from "../services/api";

const emptyForm = {
  name: "",
  industry: "",
  website: "",
  location: "",
  contact_person: "",
  contact_email: "",
  contact_phone: "",
  description: "",
};

function Companies() {
  const [companies, setCompanies] = useState([]);
  const [form, setForm] = useState(emptyForm);

  const [editingId, setEditingId] = useState(null);

  const [showForm, setShowForm] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Fetch all companies
  const fetchCompanies = async () => {
    try {
      setError("");

      const response = await api.get("/companies/");

      setCompanies(response.data.companies);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Unable to fetch companies"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  // Handle form input changes
  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  // Open add company form
  const handleAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setMessage("");
    setError("");
    setShowForm(true);
  };

  // Open edit company form
  const handleEdit = (company) => {
    setEditingId(company.id);

    setForm({
      name: company.name || "",
      industry: company.industry || "",
      website: company.website || "",
      location: company.location || "",
      contact_person: company.contact_person || "",
      contact_email: company.contact_email || "",
      contact_phone: company.contact_phone || "",
      description: company.description || "",
    });

    setMessage("");
    setError("");
    setShowForm(true);
  };

  // Save company
  const handleSubmit = async (e) => {
    e.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (editingId) {
        await api.put(
          `/companies/${editingId}`,
          form
        );

        setMessage("Company updated successfully");
      } else {
        await api.post("/companies/", form);

        setMessage("Company added successfully");
      }

      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);

      await fetchCompanies();

    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Unable to save company"
      );
    } finally {
      setSaving(false);
    }
  };

  // Delete company
  const handleDelete = async (companyId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this company?"
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      await api.delete(`/companies/${companyId}`);

      setMessage("Company deleted successfully");

      await fetchCompanies();

    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Unable to delete company"
      );
    }
  };

  return (
    <div className="p-6 md:p-8">

      {/* Page Heading */}
      <div className="flex flex-wrap items-center justify-between gap-4">

        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Company Management
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage companies and their recruitment information.
          </p>
        </div>

        <button
          onClick={handleAdd}
          className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + Add Company
        </button>

      </div>

      {/* Messages */}
      {message && (
        <p className="mt-5 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          {message}
        </p>
      )}

      {error && (
        <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Company Form */}
      {showForm && (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="mb-6 flex items-center justify-between">

            <h2 className="text-lg font-semibold">
              {editingId ? "Edit Company" : "Add New Company"}
            </h2>

            <button
              onClick={() => setShowForm(false)}
              className="text-slate-500 hover:text-red-600"
            >
              ✕
            </button>

          </div>

          <form onSubmit={handleSubmit}>

            <div className="grid gap-5 md:grid-cols-2">

              {[
                {
                  name: "name",
                  label: "Company Name",
                  required: true,
                },
                {
                  name: "industry",
                  label: "Industry",
                },
                {
                  name: "website",
                  label: "Website",
                },
                {
                  name: "location",
                  label: "Location",
                },
                {
                  name: "contact_person",
                  label: "Contact Person",
                },
                {
                  name: "contact_email",
                  label: "Contact Email",
                  type: "email",
                },
                {
                  name: "contact_phone",
                  label: "Contact Phone",
                },
              ].map((field) => (
                <div key={field.name}>

                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    {field.label}
                    {field.required && " *"}
                  </label>

                  <input
                    type={field.type || "text"}
                    name={field.name}
                    value={form[field.name]}
                    onChange={handleChange}
                    required={field.required || false}
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                  />

                </div>
              ))}

              <div className="md:col-span-2">

                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Description
                </label>

                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows="4"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                  placeholder="Enter company description"
                />

              </div>

            </div>

            <div className="mt-6 flex gap-3">

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Company"
                    : "Save Company"}
              </button>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-slate-300 px-6 py-3 text-sm font-medium hover:bg-slate-100"
              >
                Cancel
              </button>

            </div>

          </form>

        </div>
      )}

      {/* Company Table */}
      <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

        <div className="border-b border-slate-200 p-5">

          <h2 className="font-semibold text-slate-900">
            Your Companies ({companies.length})
          </h2>

        </div>

        {loading ? (
          <p className="p-8 text-center text-slate-500">
            Loading companies...
          </p>
        ) : companies.length === 0 ? (
          <div className="p-10 text-center">

            <h3 className="font-semibold text-slate-700">
              No companies added yet
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Add your first company to get started.
            </p>

            <button
              onClick={handleAdd}
              className="mt-5 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white"
            >
              + Add Company
            </button>

          </div>
        ) : (

          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="bg-slate-50 text-slate-600">

                <tr>
                  <th className="px-6 py-4">Company</th>
                  <th className="px-6 py-4">Industry</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>

              </thead>

              <tbody className="divide-y divide-slate-100">

                {companies.map((company) => (

                  <tr key={company.id} className="hover:bg-slate-50">

                    <td className="px-6 py-4 font-semibold text-slate-800">
                      {company.name}
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      {company.industry || "—"}
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      {company.location || "—"}
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      {company.contact_person || "—"}
                    </td>

                    <td className="px-6 py-4">

                      <div className="flex gap-3">

                        <button
                          onClick={() => handleEdit(company)}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => handleDelete(company.id)}
                          className="font-medium text-red-600 hover:underline"
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

    </div>
  );
}

export default Companies;