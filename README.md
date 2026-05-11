# ZavodMusic

Ћокальное музыкальное веб-приложение:
- `backend` Ч Flask API + JSON-хранилище
- `frontend` Ч React/Vite клиент

## “ребовани€

- Python 3.11+
- Node.js 20+

## Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

API по умолчанию: `http://127.0.0.1:5000`

## Frontend

```powershell
cd frontend
npm install
copy .env.example .env
npm run dev
```

 лиент по умолчанию: `http://127.0.0.1:5173`

## Production build (frontend)

```powershell
cd frontend
npm run build
npm run preview
```

## √енераци€ JSON треков (опционально)

```powershell
cd backend
python scripts/generate_tracks_json.py --music-dir "E:\\Music" --output data/tracks.json
```

—крипт генерации использует `mutagen` (уже включен в `requirements.txt`).