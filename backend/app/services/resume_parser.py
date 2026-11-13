from pathlib import Path

from pypdf import PdfReader
from docx import Document


# Maximum text we will pass to the AI service.
MAX_EXTRACTED_CHARACTERS = 30000


class ResumeParsingError(Exception):
    """Raised when a resume cannot be processed."""
    pass


def clean_text(text: str) -> str:
    """
    Clean extracted text by removing unnecessary whitespace.
    """

    lines = []

    for line in text.splitlines():

        # Remove extra spaces from each line.
        cleaned_line = " ".join(line.split())

        if cleaned_line:
            lines.append(cleaned_line)

    return "\n".join(lines)


def extract_pdf_text(file_path: Path) -> str:
    """
    Extract text from a PDF resume.
    """

    try:
        reader = PdfReader(str(file_path))

        # Encrypted PDFs cannot be processed without a password.
        if reader.is_encrypted:
            raise ResumeParsingError(
                "Password-protected PDF resumes are not supported."
            )

        extracted_pages = []

        for page_number, page in enumerate(reader.pages, start=1):

            try:
                page_text = page.extract_text() or ""
                extracted_pages.append(page_text)

            except Exception as error:
                raise ResumeParsingError(
                    f"Unable to extract text from PDF page {page_number}."
                ) from error

        return "\n".join(extracted_pages)

    except ResumeParsingError:
        raise

    except Exception as error:
        raise ResumeParsingError(
            "Unable to read this PDF resume."
        ) from error


def extract_docx_text(file_path: Path) -> str:
    """
    Extract text from a DOCX resume.
    """

    try:
        document = Document(str(file_path))

        extracted_text = []

        # Extract normal paragraphs.
        for paragraph in document.paragraphs:

            if paragraph.text.strip():
                extracted_text.append(paragraph.text)

        # Extract text from tables.
        for table in document.tables:

            for row in table.rows:

                row_text = [
                    cell.text.strip()
                    for cell in row.cells
                    if cell.text.strip()
                ]

                if row_text:
                    extracted_text.append(" | ".join(row_text))

        return "\n".join(extracted_text)

    except Exception as error:
        raise ResumeParsingError(
            "Unable to read this DOCX resume."
        ) from error


def parse_resume(file_path: str) -> str:
    """
    Main function:
    Detect file type, extract text and return cleaned content.
    """

    path = Path(file_path)

    # Check whether the file exists.
    if not path.is_file():
        raise ResumeParsingError(
            "Resume file does not exist."
        )

    # Identify the extension.
    extension = path.suffix.lower()

    # Extract based on file type.
    if extension == ".pdf":

        raw_text = extract_pdf_text(path)

    elif extension == ".docx":

        raw_text = extract_docx_text(path)

    else:

        raise ResumeParsingError(
            "Unsupported resume format. Only PDF and DOCX are supported."
        )

    # Clean extracted content.
    cleaned_text = clean_text(raw_text)

    # Reject empty documents.
    if not cleaned_text:
        raise ResumeParsingError(
            "No readable text found in this resume. "
            "If this is a scanned PDF, OCR processing is required."
        )

    # Prevent extremely large prompts.
    if len(cleaned_text) > MAX_EXTRACTED_CHARACTERS:
        cleaned_text = cleaned_text[:MAX_EXTRACTED_CHARACTERS]

    return cleaned_text