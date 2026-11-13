
import json

from pydantic import ValidationError

from app.schemas.analysis import ResumeAnalysisResponse


class AnalysisValidationError(Exception):
    """Raised when the AI response is invalid."""
    pass


def validate_analysis_response(raw_response):

    try:

        # If Groq returns a JSON string,
        # convert it into a Python dictionary.
        if isinstance(raw_response, str):
            raw_response = json.loads(raw_response)

        # Validate the dictionary using Pydantic.
        validated_response = ResumeAnalysisResponse.model_validate(
            raw_response
        )

        return validated_response

    except json.JSONDecodeError as error:

        raise AnalysisValidationError(
            "Groq returned invalid JSON."
        ) from error

    except ValidationError as error:

        raise AnalysisValidationError(
            f"Groq response validation failed: {error}"
        ) from error

    except (TypeError, ValueError) as error:

        raise AnalysisValidationError(
            "Unexpected format in Groq response."
        ) from error
