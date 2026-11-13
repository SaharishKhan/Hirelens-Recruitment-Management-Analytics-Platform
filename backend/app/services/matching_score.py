
import re


# --------------------------------------------------
# SCORE WEIGHTS
# --------------------------------------------------

REQUIRED_WEIGHT = 80
STRENGTH_WEIGHT = 20


# --------------------------------------------------
# NORMALIZE SKILL NAMES
# --------------------------------------------------

def normalize_skill(skill: str) -> str:
    """
    Convert skill names into a consistent format
    for comparison.
    """

    skill = skill.lower().strip()

    skill = re.sub(r"[^a-z0-9+#.]+", " ", skill)

    return " ".join(skill.split())


# --------------------------------------------------
# EXTRACT SKILL NAMES
# --------------------------------------------------

def get_skill_names(skills):
    """
    Supports:
    1. ["Python", "Java"]
    2. "Python, Java"
    3. [{"skill": "Python"}, {"name": "Java"}]
    """

    if isinstance(skills, str):
        skills = re.split(r"[,;\n]", skills)

    if not isinstance(skills, list):
        return []

    result = []
    seen = set()

    for item in skills:

        if isinstance(item, dict):
            item = item.get("skill") or item.get("name") or ""

        if not isinstance(item, str):
            continue

        skill = item.strip()

        if not skill:
            continue

        normalized = normalize_skill(skill)

        if normalized and normalized not in seen:
            seen.add(normalized)
            result.append(skill)

    return result


# --------------------------------------------------
# GET SKILLS SUPPORTED BY RESUME EVIDENCE
# --------------------------------------------------

def get_evidence_lookup(analysis):
    """
    Only skills with actual supporting evidence
    are counted as matched.
    """

    matched_skills = analysis.get("matched_skills", [])

    evidence_lookup = {}

    for item in matched_skills:

        if not isinstance(item, dict):
            continue

        skill = item.get("skill", "")
        evidence = item.get("evidence", "")

        if not isinstance(skill, str):
            continue

        if not isinstance(evidence, str):
            continue

        normalized = normalize_skill(skill)

        if normalized and evidence.strip():

            evidence_lookup[normalized] = evidence.strip()

    return evidence_lookup


# --------------------------------------------------
# GET REASONS FOR UNVERIFIED SKILLS
# --------------------------------------------------

def get_unverified_lookup(analysis):

    unverified_skills = analysis.get(
        "missing_or_unverified_skills", []
    )

    result = {}

    for item in unverified_skills:

        if not isinstance(item, dict):
            continue

        skill = item.get("skill", "")
        reason = item.get("reason", "")

        if not isinstance(skill, str):
            continue

        normalized = normalize_skill(skill)

        if normalized:
            result[normalized] = reason

    return result


# --------------------------------------------------
# EVALUATE ONE SKILL CATEGORY
# --------------------------------------------------

def evaluate_skill_category(
    skills,
    evidence_lookup,
    unverified_lookup
):
    """
    Checks every skill in a category.

    A skill is matched only when the AI analysis
    provides supporting resume evidence.
    """

    comparison = []
    matched_count = 0

    for skill in skills:

        normalized = normalize_skill(skill)

        evidence = evidence_lookup.get(normalized)

        if evidence:

            matched_count += 1

            comparison.append({
                "skill": skill,
                "status": "Matched",
                "evidence": evidence,
                "reason": None
            })

        else:

            reason = unverified_lookup.get(
                normalized,
                "No clear supporting evidence found in the resume."
            )

            comparison.append({
                "skill": skill,
                "status": "Not evidenced",
                "evidence": None,
                "reason": reason
            })

    total_count = len(skills)

    return {
        "matched_count": matched_count,
        "unverified_count": total_count - matched_count,
        "total_count": total_count,
        "comparison": comparison
    }


# --------------------------------------------------
# CALCULATE WEIGHTED JOB MATCH SCORE
# --------------------------------------------------

def calculate_matching_score(
    analysis: dict,
    required_skills,
    strength_skills=None
):
    """
    Required skills contribute 80%.
    Strength skills contribute 20%.

    If no strength skills are configured,
    required skills contribute 100%.

    Returns None if no required skills exist.
    """

    required_skills = get_skill_names(required_skills)

    strength_skills = get_skill_names(strength_skills or [])

    evidence_lookup = get_evidence_lookup(analysis)

    unverified_lookup = get_unverified_lookup(analysis)

    # Evaluate required skills.
    required_result = evaluate_skill_category(
        required_skills,
        evidence_lookup,
        unverified_lookup
    )

    # Evaluate additional strength skills.
    strength_result = evaluate_skill_category(
        strength_skills,
        evidence_lookup,
        unverified_lookup
    )

    total_required = required_result["total_count"]

    total_strength = strength_result["total_count"]

    matched_required = required_result["matched_count"]

    matched_strength = strength_result["matched_count"]

    # A meaningful job match score requires
    # at least one required skill.
    if total_required == 0:

        return {
            "matching_score": None,
            "score_label": "Required skills are not configured",

            "required_skill_score": None,
            "strength_skill_score": None,

            "required_weight": REQUIRED_WEIGHT,
            "strength_weight": STRENGTH_WEIGHT,

            "matched_required_count": 0,
            "total_required_skills": 0,

            "matched_strength_count": matched_strength,
            "total_strength_skills": total_strength,

            "matched_skill_count": (
                matched_required + matched_strength
            ),

            "unverified_skill_count": (
                required_result["unverified_count"]
                + strength_result["unverified_count"]
            ),

            "total_evaluated_skills": (
                total_required + total_strength
            ),

            "skill_comparison": (
                [
                    {
                        **item,
                        "category": "Required"
                    }
                    for item in required_result["comparison"]
                ]
                +
                [
                    {
                        **item,
                        "category": "Strength"
                    }
                    for item in strength_result["comparison"]
                ]
            )
        }

    # Calculate required skill score.
    required_percentage = (
        matched_required / total_required
    ) * 100

    # Calculate strength skill score.
    if total_strength > 0:

        strength_percentage = (
            matched_strength / total_strength
        ) * 100

    else:
        strength_percentage = None

    # If strength skills are not configured,
    # required skills receive the full 100%.
    if total_strength == 0:

        final_score = required_percentage

        required_contribution = required_percentage

        strength_contribution = 0

    else:

        required_contribution = (
            required_percentage * REQUIRED_WEIGHT / 100
        )

        strength_contribution = (
            strength_percentage * STRENGTH_WEIGHT / 100
        )

        final_score = (
            required_contribution + strength_contribution
        )

    # Combine both categories for frontend display.
    skill_comparison = (
        [
            {
                **item,
                "category": "Required"
            }
            for item in required_result["comparison"]
        ]
        +
        [
            {
                **item,
                "category": "Strength"
            }
            for item in strength_result["comparison"]
        ]
    )

    return {
        "matching_score": round(final_score, 2),

        "score_label": "Weighted Job Match Score",

        "required_skill_score": round(
            required_percentage, 2
        ),

        "strength_skill_score": (
            round(strength_percentage, 2)
            if strength_percentage is not None
            else None
        ),

        "required_weight": (
            100 if total_strength == 0 else REQUIRED_WEIGHT
        ),

        "strength_weight": (
            0 if total_strength == 0 else STRENGTH_WEIGHT
        ),

        "required_contribution": round(
            required_contribution, 2
        ),

        "strength_contribution": round(
            strength_contribution, 2
        ),

        "matched_required_count": matched_required,

        "total_required_skills": total_required,

        "matched_strength_count": matched_strength,

        "total_strength_skills": total_strength,

        "matched_skill_count": (
            matched_required + matched_strength
        ),

        "unverified_skill_count": (
            required_result["unverified_count"]
            + strength_result["unverified_count"]
        ),

        "total_evaluated_skills": (
            total_required + total_strength
        ),

        "skill_comparison": skill_comparison
    }
