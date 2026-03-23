import os
import json
from datetime import date, timedelta
from flask import request, jsonify
from werkzeug.utils import secure_filename
from webapp import app, db, bcrypt_
from webapp.models import User, Folder, StudyNote, FlashcardSet, QuizSet, StudyActivity
from flask_login import login_user, current_user, logout_user, login_required
from webapp.ml_models.ocr import extract_text_from_image
from webapp.ml_models.summariser import summarize_text, generate_flashcards, generate_quiz, generate_title


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
    notes = StudyNote.query.filter_by(author=current_user).order_by(StudyNote.date_posted.desc()).all()
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

    flashcards = [{
        'id': fs.id, 'title': fs.title,
        'content': json.loads(fs.content), 'date_posted': fs.date_posted
    } for fs in note.flashcard_sets]

    quizzes = [{
        'id': qs.id, 'title': qs.title,
        'content': json.loads(qs.content), 'date_posted': qs.date_posted
    } for qs in note.quiz_sets]

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

    if file:
        filename = secure_filename(file.filename)
        upload_path = os.path.join(app.root_path, 'uploads')
        os.makedirs(upload_path, exist_ok=True)
        file_path = os.path.join(upload_path, filename)
        file.save(file_path)

        extracted_text = extract_text_from_image(file_path)
        if not extracted_text:
            return jsonify({'error': 'Could not extract text from the file'}), 500

        summary = summarize_text(extracted_text)
        
        # Generate AI title, fallback to filename
        ai_title = generate_title(summary)
        note_title = ai_title if ai_title else filename
        
        new_note = StudyNote(
            filename=note_title,
            original_content=summary,
            author=current_user,
            folder_id=folder_id
        )
        db.session.add(new_note)
        # Track activity
        db.session.add(StudyActivity(action_type='upload', user=current_user))
        db.session.commit()

        return jsonify({'extracted_text': summary, 'note_id': new_note.id, 'title': note_title})

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
    breakdown = {'upload': 0, 'flashcard': 0, 'quiz': 0}
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
    }), 200


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
@login_required
def account():
    return jsonify({'username': current_user.username, 'email': current_user.email})