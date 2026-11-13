# HireLens

HireLens is an HR analytics and recruitment management application. It provides
candidate, company, and job-drive management, resume uploads, resume analysis
with Groq, JWT authentication, and recruitment analytics.

## Project structure

```text
Hirelens/
├── backend/   # FastAPI API and MongoDB integration
└── frontend/  # React application powered by Vite
```

## Prerequisites

- Python 3.10 or newer
- Node.js 18 or newer
- npm
- A MongoDB database (local MongoDB or MongoDB Atlas)
- A Groq API key for resume analysis

## Backend environment variables

Create a file named `backend/.env`:

```env
# Required
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/<database>
SECRET_KEY=replace-with-a-long-random-secret
GROQ_API_KEY=replace-with-your-groq-api-key

# Optional
DATABASE_NAME=hirelens
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
GROQ_MODEL=openai/gpt-oss-20b
```

### Variable reference

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `MONGODB_URI` | Yes | — | MongoDB connection string |
| `SECRET_KEY` | Yes | — | Secret used to sign JWT access tokens |
| `GROQ_API_KEY` | Yes for resume analysis | — | Groq API key |
| `DATABASE_NAME` | No | `hirelens` | MongoDB database name |
| `ALGORITHM` | No | `HS256` | JWT signing algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `60` | JWT lifetime in minutes |
| `GROQ_MODEL` | No | `openai/gpt-oss-20b` | Groq model used for resume analysis |


## Running the backend

Open PowerShell in the project directory and run:

```powershell
cd F:\dl_proj\Hirelens\backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API is available at <http://127.0.0.1:8000>.

- Health check: <http://127.0.0.1:8000/api/health>
- Interactive API documentation: <http://127.0.0.1:8000/docs>

If PowerShell prevents virtual-environment activation, either allow local
scripts for the current user or run the commands using the Python executable
directly:

```powershell
F:\dl_proj\Hirelens\backend\venv\Scripts\python.exe -m pip install -r F:\dl_proj\Hirelens\backend\requirements.txt
F:\dl_proj\Hirelens\backend\venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

## Running the frontend

Open a second PowerShell window:

```powershell
cd F:\dl_proj\Hirelens\frontend
npm install
npm run dev
```

Open the URL printed by Vite, normally <http://localhost:5173>.

The frontend is configured to call the backend at
`http://127.0.0.1:8000/api`. Start the backend before using the frontend.

## Frontend commands

Run these commands from `frontend/`:

```powershell
npm run dev       # Start the development server
npm run build     # Create a production build
npm run preview   # Preview the production build
npm run lint      # Run Oxlint
```

## Notes

- MongoDB connectivity is checked when the backend starts.
- Resume files are stored under `backend/storage/resumes/`.
- The backend allows the Vite development origin
  `http://localhost:5173` through CORS.
