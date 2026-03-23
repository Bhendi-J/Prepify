# Prepify

Prepify is a lightweight preparation tool designed to help students organize their study workflow, practice consistently, and track progress in a structured way. It focuses on simplicity and practical usage rather than being a full-scale learning platform.

## Features
- Topic-wise preparation
- Practice and revision support
- Progress tracking
- Clean and minimal interface

## Use Case
Prepify is suitable for students preparing for exams, interviews, or skill assessments who need a focused and efficient preparation system.

## Run Locally On `localhost:5001`

Prepify can be served as a single app from Flask, including the built React frontend.

1. Install backend dependencies:

```bash
pip install -r requirements.txt
```

2. Build the frontend:

```bash
cd frontend
npm install
npm run build
cd ..
```

3. Start Flask:

```bash
python run.py
```

4. Open `http://localhost:5001`

Direct visits to frontend routes like `/library` and `/notes/1` will now load the React app through Flask. API endpoints remain under `/api/*`.

## Database Migration Flow (Flask-Migrate)

Prepify now uses Alembic via Flask-Migrate for schema-safe changes.

### One-time setup

1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. Export Flask app target:

```bash
export FLASK_APP=webapp:app
```

3. Initialize migrations folder (first time only):

```bash
flask db init
```

### Create a migration after model changes

```bash
flask db migrate -m "describe schema change"
```

### Apply migrations

```bash
flask db upgrade
```

### Rollback last migration

```bash
flask db downgrade -1
```

### Recommended workflow

1. Change models in `webapp/models.py`.
2. Run `flask db migrate -m "..."`.
3. Inspect generated migration file.
4. Run `flask db upgrade`.
5. Run tests.

Do not rely on `db.create_all()` for ongoing schema evolution once migrations are enabled.

