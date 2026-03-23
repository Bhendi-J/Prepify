import os
import json
import uuid
from datetime import date, timedelta
from flask import request, jsonify, abort, send_from_directory
from werkzeug.utils import secure_filename
from webapp import app, db, bcrypt_
from webapp.models import User, Folder, StudyNote, FlashcardSet, QuizSet, QuizAttempt, StudyActivity, Todo, WeeklyGoal
from flask_login import login_user, current_user, logout_user, login_required
from webapp.ml_models.ocr import extract_text_from_image
from webapp.ml_models.summariser import summarize_text, generate_flashcards, generate_quiz, generate_title


MAX_UPLOAD_SIZE_BYTES = 15 * 1024 * 1024
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg'}
ALLOWED_MIMETYPES = {
    'text/plain',
    'application/pdf',
    'image/png',
    'image/jpeg'
}


def _safe_load_json(raw, default):
    if not raw:
        return default
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return default


def _serialize_quiz_attempt(attempt):
    return {
        'id': attempt.id,
        'score': attempt.score,
        'total_questions': attempt.total_questions,
        'answers': _safe_load_json(attempt.answers_json, {}),
        'date_attempted': attempt.date_attempted
    }


def _frontend_build_missing_response():
    return (
        'Frontend build is missing. Run "npm run build" in the "frontend" directory and restart Flask.',
        503,
        {'Content-Type': 'text/plain; charset=utf-8'}
    )


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    if path.startswith('api/'):
        abort(404)

    build_dir = app.config.get('FRONTEND_BUILD_DIR')
    index_path = app.config.get('FRONTEND_INDEX_PATH')

    if not index_path or not os.path.exists(index_path):
        return _frontend_build_missing_response()

    if path:
        asset_path = os.path.join(build_dir, path)
        if os.path.isfile(asset_path):
            return send_from_directory(build_dir, path)

    return send_from_directory(build_dir, 'index.html')


# ═══════════════════════════════════════════════════════════════════════════════
#   FOLDER ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/folders", methods=['GET', 'POST', 'OPTIONS'])
@login_required
def folders():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200

    if request.method == 'GET':
        user_folders = Folder.query.filter_by(owner=current_user).order_by(Folder.date_created.desc()).all()
        result = [{
            'id': f.id,
            'name': f.name,
            'date_created': f.date_created,
            'note_count': len(f.notes)
        } for f in user_folders]
        return jsonify(result), 200

    # POST — Create a folder
    data = request.get_json()
    if not data or not data.get('name'):
        return jsonify({'error': 'Folder name is required'}), 400
    folder = Folder(name=data['name'], owner=current_user)
    db.session.add(folder)
    db.session.commit()
    return jsonify({'id': folder.id, 'name': folder.name}), 201


@app.route("/api/folders/<int:folder_id>", methods=['DELETE', 'OPTIONS'])
@login_required
def delete_folder(folder_id):
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    folder = Folder.query.get_or_404(folder_id)
    if folder.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    db.session.delete(folder)
    db.session.commit()
    return jsonify({'message': 'Folder deleted'}), 200


@app.route("/api/folders/<int:folder_id>/notes", methods=['GET', 'OPTIONS'])
@login_required
def folder_notes(folder_id):
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    folder = Folder.query.get_or_404(folder_id)
    if folder.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    notes = StudyNote.query.filter_by(folder_id=folder_id).order_by(StudyNote.date_posted.desc()).all()
    result = [{
        'id': n.id,
        'filename': n.filename,
        'date_posted': n.date_posted,
        'has_flashcards': len(n.flashcard_sets) > 0,
        'has_quiz': len(n.quiz_sets) > 0
    } for n in notes]
    return jsonify({'folder': {'id': folder.id, 'name': folder.name}, 'notes': result}), 200


# ═══════════════════════════════════════════════════════════════════════════════
#   NOTE ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/notes", methods=['GET'])
@login_required
def get_notes():
    minimal = request.args.get('minimal', '0') == '1'
    notes = StudyNote.query.filter_by(author=current_user).order_by(StudyNote.date_posted.desc()).all()
    if minimal:
        return jsonify([{'id': n.id, 'filename': n.filename} for n in notes]), 200

    result = [{
        'id': n.id,
        'filename': n.filename,
        'date_posted': n.date_posted,
        'original_content': n.original_content,
        'folder_id': n.folder_id
    } for n in notes]
    return jsonify(result), 200


@app.route("/api/notes/<int:note_id>", methods=['GET', 'OPTIONS'])
@login_required
def get_note_detail(note_id):
    """Get a single note with all its study sets."""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    note = StudyNote.query.get_or_404(note_id)
    if note.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403

    flashcard_sets = sorted(note.flashcard_sets, key=lambda fs: fs.date_posted, reverse=True)
    quiz_sets = sorted(note.quiz_sets, key=lambda qs: qs.date_posted, reverse=True)

    flashcards = [{
        'id': fs.id, 'title': fs.title,
        'content': _safe_load_json(fs.content, []), 'date_posted': fs.date_posted
    } for fs in flashcard_sets]

    quizzes = [{
        'id': qs.id, 'title': qs.title,
        'content': _safe_load_json(qs.content, []), 'date_posted': qs.date_posted
    } for qs in quiz_sets]

    return jsonify({
        'id': note.id,
        'filename': note.filename,
        'original_content': note.original_content,
        'date_posted': note.date_posted,
        'folder_id': note.folder_id,
        'flashcard_sets': flashcards,
        'quiz_sets': quizzes
    }), 200


@app.route('/api/notes/<int:note_id>', methods=['DELETE'])
@login_required
def delete_note(note_id):
    note = StudyNote.query.get_or_404(note_id)
    if note.user_id != current_user.id:
        return jsonify({"error": "Unauthorized"}), 403
    db.session.delete(note)
    db.session.commit()
    return jsonify({"message": "Note deleted successfully"})


@app.route('/api/notes/<int:note_id>', methods=['PATCH'])
@login_required
def update_note(note_id):
    """Rename a note's title."""
    note = StudyNote.query.get_or_404(note_id)
    if note.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    data = request.get_json()
    if data and data.get('filename'):
        note.filename = data['filename'][:100]
        db.session.commit()
    return jsonify({'id': note.id, 'filename': note.filename})


# ═══════════════════════════════════════════════════════════════════════════════
#   UPLOAD ENDPOINT
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/upload", methods=['POST'])
@login_required
def upload_file():
    if 'note_file' not in request.files:
        return jsonify({'error': 'No file part in the request'}), 400
    file = request.files['note_file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    folder_id = request.form.get('folder_id', type=int)
    if folder_id is not None:
        folder = Folder.query.get(folder_id)
        if not folder or folder.user_id != current_user.id:
            return jsonify({'error': 'Invalid folder'}), 400

    if file:
        original_filename = secure_filename(file.filename)
        ext = os.path.splitext(original_filename)[1].lower().lstrip('.')
        if ext not in ALLOWED_EXTENSIONS:
            return jsonify({'error': 'Unsupported file type'}), 400

        mimetype = (file.mimetype or '').lower()
        if mimetype not in ALLOWED_MIMETYPES:
            return jsonify({'error': 'Unsupported file MIME type'}), 400

        # Read length from stream safely; reset pointer after check.
        file.stream.seek(0, os.SEEK_END)
        file_size = file.stream.tell()
        file.stream.seek(0)
        if file_size > MAX_UPLOAD_SIZE_BYTES:
            return jsonify({'error': 'File too large (max 15 MB)'}), 413

        unique_filename = f"{uuid.uuid4().hex}_{original_filename}"
        upload_path = os.path.join(app.root_path, 'uploads')
        os.makedirs(upload_path, exist_ok=True)
        file_path = os.path.join(upload_path, unique_filename)

        try:
            file.save(file_path)

            extracted_text = extract_text_from_image(file_path)
            if not extracted_text or not extracted_text.strip():
                return jsonify({'error': 'Could not extract text from the file'}), 422

            summary = summarize_text(extracted_text)
            if not summary or not summary.strip():
                return jsonify({'error': 'Could not summarize extracted text'}), 422

            # Generate AI title, fallback to uploaded filename (without path prefix).
            ai_title = generate_title(summary)
            note_title = ai_title if ai_title else os.path.splitext(original_filename)[0]

            new_note = StudyNote(
                filename=note_title[:100],
                original_content=summary,
                author=current_user,
                folder_id=folder_id
            )
            db.session.add(new_note)
            db.session.add(StudyActivity(action_type='upload', user=current_user))
            db.session.commit()

            return jsonify({'extracted_text': summary, 'note_id': new_note.id, 'title': note_title})
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500
        finally:
            if os.path.exists(file_path):
                os.remove(file_path)

    return jsonify({'error': 'An unknown error occurred'}), 500


# ═══════════════════════════════════════════════════════════════════════════════
#   GENERATION ENDPOINTS (Flashcards & Quizzes)
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/notes/<int:note_id>/flashcards", methods=['POST', 'OPTIONS'])
@login_required
def generate_note_flashcards(note_id):
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    note = StudyNote.query.get_or_404(note_id)
    if note.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    try:
        cards = generate_flashcards(note.original_content)
        new_set = FlashcardSet(title=note.filename, content=json.dumps(cards), note=note)
        db.session.add(new_set)
        db.session.add(StudyActivity(action_type='flashcard', user=current_user))
        db.session.commit()
        return jsonify({'id': new_set.id, 'content': cards}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route("/api/notes/<int:note_id>/quiz", methods=['POST', 'OPTIONS'])
@login_required
def generate_note_quiz(note_id):
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    note = StudyNote.query.get_or_404(note_id)
    if note.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    try:
        quiz = generate_quiz(note.original_content)
        new_set = QuizSet(title=note.filename, content=json.dumps(quiz), note=note)
        db.session.add(new_set)
        db.session.add(StudyActivity(action_type='quiz', user=current_user))
        db.session.commit()
        return jsonify({'id': new_set.id, 'content': quiz}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route("/api/quiz_sets/<int:quiz_set_id>/attempts", methods=['GET', 'POST', 'OPTIONS'])
@login_required
def quiz_attempts(quiz_set_id):
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200

    quiz_set = QuizSet.query.get_or_404(quiz_set_id)
    if quiz_set.note.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403

    if request.method == 'GET':
        page = max(request.args.get('page', 1, type=int), 1)
        limit = request.args.get('limit', 10, type=int)
        limit = min(max(limit, 1), 50)

        base_query = QuizAttempt.query.filter_by(
            quiz_set_id=quiz_set.id,
            user_id=current_user.id
        ).order_by(QuizAttempt.date_attempted.desc())

        pagination = base_query.paginate(page=page, per_page=limit, error_out=False)
        return jsonify({
            'items': [_serialize_quiz_attempt(a) for a in pagination.items],
            'page': page,
            'limit': limit,
            'total': pagination.total,
            'pages': pagination.pages,
            'has_next': pagination.has_next,
            'has_prev': pagination.has_prev
        }), 200

    data = request.get_json() or {}
    answers = data.get('answers', {})
    if not isinstance(answers, dict):
        return jsonify({'error': 'answers must be an object keyed by question index'}), 400

    questions = _safe_load_json(quiz_set.content, [])
    if not isinstance(questions, list) or len(questions) == 0:
        return jsonify({'error': 'Quiz content is invalid or empty'}), 422

    score = 0
    for idx, question in enumerate(questions):
        selected = answers.get(str(idx))
        correct_answer = question.get('answer') if isinstance(question, dict) else None
        if selected is not None and selected == correct_answer:
            score += 1

    attempt = QuizAttempt(
        score=score,
        total_questions=len(questions),
        answers_json=json.dumps(answers),
        user_id=current_user.id,
        quiz_set_id=quiz_set.id
    )
    db.session.add(attempt)
    db.session.commit()

    return jsonify(_serialize_quiz_attempt(attempt)), 201


# ═══════════════════════════════════════════════════════════════════════════════
#   ANALYTICS ENDPOINT
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/analytics", methods=['GET'])
@login_required
def analytics():
    today = date.today()
    start_date = today - timedelta(days=364)
    activities = StudyActivity.query.filter(
        StudyActivity.user_id == current_user.id,
        StudyActivity.date >= start_date
    ).all()

    # Heatmap data
    heatmap = {}
    for act in activities:
        key = act.date.isoformat()
        heatmap[key] = heatmap.get(key, 0) + 1

    # Current streak
    streak = 0
    check = today
    while True:
        if check.isoformat() in heatmap:
            streak += 1
            check -= timedelta(days=1)
        else:
            break

    # This week's activity (Mon-Sun)
    week_start = today - timedelta(days=today.weekday())
    this_week = sum(1 for a in activities if a.date >= week_start)

    # This month's activity
    month_start = today.replace(day=1)
    this_month = sum(1 for a in activities if a.date >= month_start)

    # Activity breakdown by type
    breakdown = {'upload': 0, 'flashcard': 0, 'quiz': 0, 'todo': 0}
    for act in activities:
        if act.action_type in breakdown:
            breakdown[act.action_type] += 1

    # Most active day
    most_active_day = max(heatmap, key=heatmap.get) if heatmap else None
    most_active_count = heatmap.get(most_active_day, 0) if most_active_day else 0

    # Weekly trend (last 12 weeks)
    weekly_trend = []
    for w in range(11, -1, -1):
        w_start = today - timedelta(days=today.weekday() + 7 * w)
        w_end = w_start + timedelta(days=6)
        count = sum(1 for a in activities if w_start <= a.date <= w_end)
        weekly_trend.append({'week': w_start.isoformat(), 'count': count})

    # Last 7 days for daily graph
    last_7_days = []
    for d in range(6, -1, -1):
        target_date = today - timedelta(days=d)
        cnt = heatmap.get(target_date.isoformat(), 0)
        last_7_days.append({"day": target_date.strftime("%a"), "count": cnt})

    # Totals
    total_notes = StudyNote.query.filter_by(user_id=current_user.id).count()
    total_flashcards = FlashcardSet.query.join(StudyNote).filter(StudyNote.user_id == current_user.id).count()
    total_quizzes = QuizSet.query.join(StudyNote).filter(StudyNote.user_id == current_user.id).count()
    total_folders = Folder.query.filter_by(user_id=current_user.id).count()
    total_activities = len(activities)

    return jsonify({
        'heatmap': heatmap,
        'stats': {
            'total_notes': total_notes,
            'total_flashcards': total_flashcards,
            'total_quizzes': total_quizzes,
            'total_folders': total_folders,
            'total_activities': total_activities,
            'streak': streak,
            'this_week': this_week,
            'this_month': this_month,
        },
        'breakdown': breakdown,
        'most_active': {'date': most_active_day, 'count': most_active_count},
        'weekly_trend': weekly_trend,
        'last_7_days': last_7_days,
    }), 200

@app.route("/api/daily_summary", methods=['GET'])
@login_required
def daily_summary():
    from webapp.ml_models.summariser import generate_daily_summary
    today = date.today()
    activities = StudyActivity.query.filter_by(user_id=current_user.id, date=today).all()
    stats = {'upload': 0, 'flashcard': 0, 'quiz': 0, 'todo': 0}
    for act in activities:
        if act.action_type in stats:
            stats[act.action_type] += 1
    
    summary_text = generate_daily_summary(stats)
    return jsonify({"summary": summary_text}), 200

# ═══════════════════════════════════════════════════════════════════════════════
#   AUTH ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/register", methods=['POST', 'OPTIONS'])
def register():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    if current_user.is_authenticated:
        return jsonify({'message': 'User already logged in'}), 200
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password') or not data.get('username'):
        return jsonify({'error': 'Missing data'}), 400
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 409
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already exists'}), 409
    hashed = bcrypt_.generate_password_hash(data['password']).decode('utf-8')
    user = User(username=data['username'], email=data['email'], password=hashed)
    db.session.add(user)
    db.session.commit()
    return jsonify({'message': 'User registered successfully'}), 201


@app.route("/api/login", methods=['GET', 'POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    if request.method == 'GET':
        return jsonify({'error': 'Authentication required'}), 401
    if current_user.is_authenticated:
        return jsonify({
            'message': 'User already logged in',
            'user': {'username': current_user.username, 'email': current_user.email}
        }), 200
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Missing data'}), 400
    user = User.query.filter_by(email=data['email']).first()
    if user and bcrypt_.check_password_hash(user.password, data['password']):
        login_user(user, remember=True)
        return jsonify({
            'message': 'Login successful',
            'user': {'username': user.username, 'email': user.email}
        })
    return jsonify({'error': 'Invalid credentials'}), 401


@app.route("/api/logout", methods=['POST', 'OPTIONS'])
def logout():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    logout_user()
    return jsonify({'message': 'Logout successful'})


@app.route("/api/account", methods=['GET'])
def account():
    if not current_user.is_authenticated:
        return jsonify({'authenticated': False, 'user': None}), 200
    return jsonify({
        'authenticated': True,
        'user': {'username': current_user.username, 'email': current_user.email}
    }), 200

# ═══════════════════════════════════════════════════════════════════════════════
#   TODO ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/todos", methods=['GET', 'POST', 'OPTIONS'])
@login_required
def handle_todos():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    if request.method == 'GET':
        todos = Todo.query.filter_by(user_id=current_user.id).order_by(Todo.date_created.asc()).all()
        return jsonify([{'id': t.id, 'text': t.text, 'completed': t.completed, 'note_id': t.note_id, 'target_date': str(t.target_date) if t.target_date else None} for t in todos]), 200
    if request.method == 'POST':
        data = request.get_json()
        if not data or not data.get('text'):
             return jsonify({'error': 'Missing text'}), 400
        new_todo = Todo(
            text=data['text'], 
            user_id=current_user.id,
            note_id=data.get('note_id')
        )
        db.session.add(new_todo)
        db.session.commit()
        return jsonify({'id': new_todo.id, 'text': new_todo.text, 'completed': new_todo.completed, 'note_id': new_todo.note_id}), 201

@app.route("/api/todos/<int:todo_id>", methods=['PATCH', 'DELETE', 'OPTIONS'])
@login_required
def modify_todo(todo_id):
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    todo = Todo.query.get_or_404(todo_id)
    if todo.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    if request.method == 'DELETE':
        db.session.delete(todo)
        db.session.commit()
        return jsonify({'message': 'Todo deleted'})
    if request.method == 'PATCH':
        data = request.get_json()
        if 'completed' in data:
            # If transitioning to completed, log it in the heatmap
            if data['completed'] and not todo.completed:
                db.session.add(StudyActivity(action_type='todo', user=current_user))
            todo.completed = data['completed']
        if 'text' in data:
            todo.text = data['text']
        db.session.commit()

        # Goal Completion Check
        if todo.goal_id and todo.completed:
            goal = WeeklyGoal.query.get(todo.goal_id)
            if goal and not goal.completed:
                incomplete_todos = Todo.query.filter_by(goal_id=goal.id, completed=False).count()
                if incomplete_todos == 0:
                    goal.completed = True
                    db.session.commit()

        return jsonify({'id': todo.id, 'text': todo.text, 'completed': todo.completed, 'note_id': todo.note_id})

# ═══════════════════════════════════════════════════════════════════════════════
#   WEEKLY GOAL ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/goals", methods=['GET', 'OPTIONS'])
@login_required
def get_goal():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    goal = WeeklyGoal.query.filter_by(user_id=current_user.id, completed=False).order_by(WeeklyGoal.date_created.desc()).first()
    if not goal:
        return jsonify(None), 200
    
    total = Todo.query.filter_by(goal_id=goal.id).count()
    done = Todo.query.filter_by(goal_id=goal.id, completed=True).count()
    return jsonify({
        'id': goal.id,
        'description': goal.description,
        'progress': round((done / total * 100) if total > 0 else 0)
    }), 200

@app.route("/api/goals", methods=['POST'])
@login_required
def create_goal():
    data = request.get_json()
    if not data or not data.get('paragraph'):
        return jsonify({'error': 'Missing paragraph'}), 400
    
    # 1. Ask AI to break paragraph down into tasks
    from webapp.ml_models.summariser import generate_goal_tasks
    tasks = generate_goal_tasks(data['paragraph'])
    if not tasks:
        return jsonify({'error': 'Failed to parse AI output'}), 500
        
    # 2. Create the WeeklyGoal
    goal = WeeklyGoal(description=data['paragraph'], user_id=current_user.id)
    db.session.add(goal)
    db.session.flush() # get goal.id
    
    # 3. Create mapping to daily tasks
    today = date.today()
    for t in tasks:
        offset = t.get('day_offset', 0)
        task_date = today + timedelta(days=offset)
        new_todo = Todo(
            text=t.get('text', 'Study Task'),
            user_id=current_user.id,
            goal_id=goal.id,
            target_date=task_date
        )
        db.session.add(new_todo)
        
    db.session.commit()
    return jsonify({'message': 'Goal created mapped to daily tasks successfully.'}), 201
