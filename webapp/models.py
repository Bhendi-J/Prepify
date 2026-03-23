from datetime import datetime, date
from webapp import db, login_manager
from flask_login import UserMixin

# ─── User ────────────────────────────────────────────────────────────────────
class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(20), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(60), nullable=False)

    folders = db.relationship('Folder', backref='owner', lazy=True)
    notes = db.relationship('StudyNote', backref='author', lazy=True)
    activities = db.relationship('StudyActivity', backref='user', lazy=True)
    todos = db.relationship('Todo', backref='user', lazy=True)
    quiz_attempts = db.relationship('QuizAttempt', backref='user', lazy=True, cascade='all, delete-orphan')

    def __repr__(self):
        return f"User('{self.username}', '{self.email}')"

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# ─── Folder ──────────────────────────────────────────────────────────────────
class Folder(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    date_created = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    notes = db.relationship('StudyNote', backref='folder', lazy=True, cascade='all, delete-orphan')

    def __repr__(self):
        return f"Folder('{self.name}')"

# ─── StudyNote ───────────────────────────────────────────────────────────────
class StudyNote(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(100), nullable=False)
    original_content = db.Column(db.Text, nullable=False)
    date_posted = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    folder_id = db.Column(db.Integer, db.ForeignKey('folder.id'), nullable=True)

    flashcard_sets = db.relationship('FlashcardSet', backref='note', lazy=True, cascade='all, delete-orphan')
    quiz_sets = db.relationship('QuizSet', backref='note', lazy=True, cascade='all, delete-orphan')

    def __repr__(self):
        return f"StudyNote('{self.filename}', '{self.date_posted}')"

# ─── FlashcardSet ────────────────────────────────────────────────────────────
class FlashcardSet(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    content = db.Column(db.Text, nullable=False)
    date_posted = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    note_id = db.Column(db.Integer, db.ForeignKey('study_note.id'), nullable=False)

    def __repr__(self):
        return f"FlashcardSet('{self.title}')"

# ─── QuizSet ─────────────────────────────────────────────────────────────────
class QuizSet(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    content = db.Column(db.Text, nullable=False)
    date_posted = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    note_id = db.Column(db.Integer, db.ForeignKey('study_note.id'), nullable=False)
    attempts = db.relationship('QuizAttempt', backref='quiz_set', lazy=True, cascade='all, delete-orphan')

    def __repr__(self):
        return f"QuizSet('{self.title}')"


class QuizAttempt(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    score = db.Column(db.Integer, nullable=False)
    total_questions = db.Column(db.Integer, nullable=False)
    answers_json = db.Column(db.Text, nullable=False)
    date_attempted = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    quiz_set_id = db.Column(db.Integer, db.ForeignKey('quiz_set.id'), nullable=False)

    def __repr__(self):
        return f"QuizAttempt(user_id={self.user_id}, quiz_set_id={self.quiz_set_id}, score={self.score})"

# ─── StudyActivity ───────────────────────────────────────────────────────────
class StudyActivity(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    action_type = db.Column(db.String(20), nullable=False)  # 'upload', 'flashcard', 'quiz'
    date = db.Column(db.Date, nullable=False, default=date.today)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    def __repr__(self):
        return f"StudyActivity('{self.action_type}', '{self.date}')"

# ─── WeeklyGoal ──────────────────────────────────────────────────────────────
class WeeklyGoal(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    description = db.Column(db.Text, nullable=False)
    completed = db.Column(db.Boolean, default=False)
    date_created = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    todos = db.relationship('Todo', backref='goal', lazy=True)

    def __repr__(self):
        return f"WeeklyGoal('{self.description}', '{self.completed}')"

# ─── Todo ────────────────────────────────────────────────────────────────────
class Todo(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.String(200), nullable=False)
    completed = db.Column(db.Boolean, default=False)
    date_created = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    target_date = db.Column(db.Date, nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    note_id = db.Column(db.Integer, db.ForeignKey('study_note.id'), nullable=True)
    goal_id = db.Column(db.Integer, db.ForeignKey('weekly_goal.id'), nullable=True)

    def __repr__(self):
        return f"Todo('{self.text}', '{self.completed}')"