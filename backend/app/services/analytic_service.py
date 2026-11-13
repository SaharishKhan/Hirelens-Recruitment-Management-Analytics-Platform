from collections import Counter
from datetime import datetime, timezone

from app.database.connection import get_database

CANDIDATE_STATUSES = ("Applied", "Shortlisted", "Selected", "Rejected")
JOB_DRIVE_STATUSES = ("Draft", "Open", "Paused", "Closed")


def _as_datetime(value):
    if isinstance(value, datetime):
        parsed = value
    elif isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    else:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def build_dashboard_analytics(current_user):
    db = get_database()
    owner_id = current_user["_id"]

    # Match the ownership pattern used by the supplied CRUD routes.
    companies = list(db.companies.find({"created_by": owner_id}))
    drives = list(db.job_drives.find({"created_by": owner_id}))
    candidates = list(db.candidates.find({"created_by": owner_id}))

    company_by_id = {c["_id"]: c for c in companies}
    drive_by_id = {d["_id"]: d for d in drives}

    candidate_counts = Counter(c.get("status", "Unknown") for c in candidates)
    drive_counts = Counter(d.get("status", "Unknown") for d in drives)

    candidate_status = [
        {"status": s, "count": int(candidate_counts.get(s, 0))}
        for s in CANDIDATE_STATUSES
    ]
    candidate_status += [
        {"status": str(s), "count": int(n)}
        for s, n in sorted(candidate_counts.items()) if s not in CANDIDATE_STATUSES
    ]

    job_drive_status = [
        {"status": s, "count": int(drive_counts.get(s, 0))}
        for s in JOB_DRIVE_STATUSES
    ]
    job_drive_status += [
        {"status": str(s), "count": int(n)}
        for s, n in sorted(drive_counts.items()) if s not in JOB_DRIVE_STATUSES
    ]

    company_stats = {}
    for company in companies:
        cid = company["_id"]
        company_stats[cid] = {
            "company_id": str(cid),
            "company_name": company.get("name", "Unnamed company"),
            "job_drives": 0, "openings": 0, "candidates": 0,
            "selected": 0, "shortlisted": 0, "rejected": 0,
        }

    for drive in drives:
        stats = company_stats.get(drive.get("company_id"))
        if stats:
            stats["job_drives"] += 1
            stats["openings"] += int(drive.get("openings") or 0)

    applicants_per_drive = Counter()
    for candidate in candidates:
        drive_id = candidate.get("job_drive_id")
        if drive_id is not None:
            applicants_per_drive[drive_id] += 1
        drive = drive_by_id.get(drive_id)
        if not drive:
            continue
        stats = company_stats.get(drive.get("company_id"))
        if not stats:
            continue
        stats["candidates"] += 1
        status = candidate.get("status")
        if status in ("Selected", "Shortlisted", "Rejected"):
            stats[status.lower()] += 1

    company_comparison = sorted(
        company_stats.values(),
        key=lambda x: (x["candidates"], x["company_name"].lower()),
        reverse=True,
    )

    job_drive_performance = []
    for drive in drives:
        company = company_by_id.get(drive.get("company_id"))
        job_drive_performance.append({
            "job_drive_id": str(drive["_id"]),
            "job_title": drive.get("job_title", "Untitled job"),
            "company_name": company.get("name", "Unknown company") if company else "Unknown company",
            "status": drive.get("status", "Unknown"),
            "openings": int(drive.get("openings") or 0),
            "applicants": int(applicants_per_drive.get(drive["_id"], 0)),
        })
    job_drive_performance.sort(key=lambda x: x["applicants"], reverse=True)

    # Rolling 12 calendar months, including months with zero registrations.
    now = datetime.now(timezone.utc)
    month_counts = {}
    for offset in range(11, -1, -1):
        absolute_month = now.year * 12 + now.month - 1 - offset
        y, m0 = divmod(absolute_month, 12)
        month_counts[f"{y:04d}-{m0 + 1:02d}"] = 0

    for candidate in candidates:
        created = _as_datetime(candidate.get("created_at"))
        if created:
            key = created.strftime("%Y-%m")
            if key in month_counts:
                month_counts[key] += 1

    total_candidates = len(candidates)
    selected = int(candidate_counts.get("Selected", 0))

    return {
        "summary": {
            "total_companies": len(companies),
            "total_job_drives": len(drives),
            "total_candidates": total_candidates,
            "total_openings": sum(int(d.get("openings") or 0) for d in drives),
            "selected_candidates": selected,
            "selection_rate_percent": round(selected / total_candidates * 100, 2) if total_candidates else 0,
        },
        "candidate_status": candidate_status,
        "job_drive_status": job_drive_status,
        "monthly_candidates": [
            {"month": month, "candidates": count}
            for month, count in month_counts.items()
        ],
        "company_comparison": company_comparison,
        "job_drive_performance": job_drive_performance[:10],
        "meta": {
            "period": "rolling_12_months",
            "timezone": "UTC",
            "note": "Only records owned by the authenticated user are included.",
        },
    }
