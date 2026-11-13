
import { useEffect, useState } from "react";
import api from "../services/api";

function ResumeAnalysisModal({ candidate, onClose }) {
  const [analysis, setAnalysis] = useState(null);
  const [history, setHistory] = useState([]);

  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch previous analyses when the modal opens
  useEffect(() => {
    fetchHistory();
  }, [candidate._id]);

  // Fetch analysis history
  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);

      const response = await api.get(
        `/resume-analysis/${candidate._id}/history`
      );

      const records = Array.isArray(response.data)
        ? response.data
        : response.data.analyses || [];

      setHistory(records);

      // Display the latest saved analysis
      if (records.length > 0) {
        setAnalysis(records[0]);
      }
    } catch (err) {
      console.error("History error:", err);
      setError(
        err.response?.data?.detail ||
        "Unable to load analysis history. Please try again."
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  // Analyze candidate resume
  const handleAnalyze = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.post(
        `/resume-analysis/${candidate._id}`
      );

      const newAnalysis = response.data;

      setAnalysis(newAnalysis);

      // Refresh history after successful analysis
      await fetchHistory();

      // Keep the newly generated result visible
      setAnalysis(newAnalysis);

    } catch (err) {
      console.error("Analysis error:", err);

      setError(
        err.response?.data?.detail ||
        "Unable to analyze this resume. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Select a previous analysis
  const handleHistorySelect = (record) => {
    setAnalysis(record);
    setError("");
  };

  // Analysis is stored inside the "analysis" property
  const result = analysis?.analysis;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">

      <div className="bg-white w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-xl shadow-xl">

        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              AI Resume Analysis
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Candidate: {candidate.name}
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 text-2xl"
            aria-label="Close analysis"
          >
            &times;
          </button>
        </div>

        <div className="p-5 space-y-6">

          {/* Analyze button */}
          <div className="flex flex-wrap justify-between items-center gap-3">

            <p className="text-sm text-gray-600">
              Analyze the resume against its associated job description.
            </p>

            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Analyzing Resume..." : "Analyze Resume"}
            </button>

          </div>

          {/* Loading */}
          {loading && (
            <div className="bg-indigo-50 text-indigo-700 p-4 rounded-lg">
              Groq AI is analyzing the resume. Please wait...
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg">
              {error}
            </div>
          )}

          {/* Analysis results */}
          {result && (
            <>

              {/* Matching score */}
              <section className="border rounded-lg p-5">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-semibold text-lg">
                    Matching Score
                  </h3>

                  <p className="text-3xl font-bold text-indigo-600">
                    {result.matching_score}%
                  </p>
                </div>
              </section>

              {/* Summary */}
              <section className="border rounded-lg p-5">
                <h3 className="font-semibold text-lg mb-3">
                  Candidate Summary
                </h3>

                <p className="text-gray-700 leading-7">
                  {result.summary}
                </p>
              </section>

              {/* Matched skills */}
              <section className="border rounded-lg p-5">
                <h3 className="font-semibold text-lg mb-3 text-green-700">
                  Matched Skills
                </h3>

                {result.matched_skills?.length > 0 ? (
                  <div className="space-y-3">
                    {result.matched_skills.map((item, index) => (
                      <div
                        key={index}
                        className="bg-green-50 p-3 rounded-lg"
                      >
                        <p className="font-medium text-green-800">
                          {item.skill}
                        </p>

                        <p className="text-sm text-gray-700 mt-1">
                          Evidence: {item.evidence}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">
                    No matched skills were identified.
                  </p>
                )}
              </section>

              {/* Missing or unverified skills */}
              <section className="border rounded-lg p-5">
                <h3 className="font-semibold text-lg mb-3 text-orange-700">
                  Missing or Unverified Skills
                </h3>

                {result.missing_or_unverified_skills?.length > 0 ? (
                  <div className="space-y-3">
                    {result.missing_or_unverified_skills.map(
                      (item, index) => (
                        <div
                          key={index}
                          className="bg-orange-50 p-3 rounded-lg"
                        >
                          <p className="font-medium text-orange-800">
                            {item.skill}
                          </p>

                          <p className="text-sm text-gray-700 mt-1">
                            {item.reason}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500">
                    No additional skills were flagged for verification.
                  </p>
                )}
              </section>

              {/* Relevant experience */}
              <section className="border rounded-lg p-5">
                <h3 className="font-semibold text-lg mb-3">
                  Relevant Experience
                </h3>

                <p className="text-gray-700 leading-7">
                  {result.relevant_experience}
                </p>
              </section>

              {/* Strengths */}
              <section className="border rounded-lg p-5">
                <h3 className="font-semibold text-lg mb-3 text-green-700">
                  Candidate Strengths
                </h3>

                {result.strengths?.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-2 text-gray-700">
                    {result.strengths.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">
                    No strengths were identified.
                  </p>
                )}
              </section>

              {/* Areas to verify */}
              <section className="border rounded-lg p-5">
                <h3 className="font-semibold text-lg mb-3 text-blue-700">
                  Areas HR Should Verify
                </h3>

                {result.areas_to_verify?.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-2 text-gray-700">
                    {result.areas_to_verify.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">
                    No additional verification areas were identified.
                  </p>
                )}
              </section>

              {/* Extracted candidate skills */}
              <section className="border rounded-lg p-5">
                <h3 className="font-semibold text-lg mb-3">
                  Skills Extracted from Resume
                </h3>

                <div className="flex flex-wrap gap-2">
                  {result.extracted_candidate_skills?.map(
                    (skill, index) => (
                      <span
                        key={index}
                        className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                      >
                        {skill}
                      </span>
                    )
                  )}
                </div>
              </section>

              <p className="text-xs text-gray-500">
                AI-generated information is decision-support only.
                HR should verify the candidate's qualifications and
                experience independently. Unverified skills are not
                proof that a candidate lacks those skills.
              </p>

            </>
          )}

          {/* No analysis available */}
          {!result && !loading && !error && (
            <div className="text-center py-12 text-gray-500">
              <p className="font-medium">
                No resume analysis available yet.
              </p>

              <p className="text-sm mt-2">
                Click Analyze Resume to generate the first analysis.
              </p>
            </div>
          )}

          {/* Analysis history */}
          <section className="border-t pt-5">
            <h3 className="font-semibold text-lg mb-3">
              Analysis History
            </h3>

            {historyLoading ? (
              <p className="text-gray-500 text-sm">
                Loading history...
              </p>
            ) : history.length > 0 ? (
              <div className="space-y-2">
                {history.map((record, index) => (
                  <button
                    key={record.id || index}
                    onClick={() => handleHistorySelect(record)}
                    className={`w-full text-left p-3 rounded-lg border hover:bg-gray-50 ${
                      analysis?.id === record.id
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-gray-200"
                    }`}
                  >
                    <p className="font-medium text-gray-800">
                      Analysis {history.length - index}
                    </p>

                    <p className="text-sm text-gray-500 mt-1">
                      {record.created_at
                        ? new Date(record.created_at).toLocaleString()
                        : "Date unavailable"}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                No previous analyses found.
              </p>
            )}
          </section>

        </div>
      </div>
    </div>
  );
}

export default ResumeAnalysisModal;
