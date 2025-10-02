from datetime import datetime
from webapp import db, login_manager
from flask_login import UserMixin

class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(20), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(60), nullable=False)
    
    # This is the crucial part. It links the User model to the StudyNote model.
    # The 'backref' creates a virtual 'author' attribute on each StudyNote instance.
    # The 'lazy=True' means SQLAlchemy will load the notes only when you ask for them.
    notes = db.relationship('StudyNote', backref='author', lazy=True)

    def __repr__(self):
        return f"User('{self.username}', '{self.email}')"

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

class StudyNote(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(100), nullable=False)
    original_content = db.Column(db.Text, nullable=False)
    date_posted = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    def __repr__(self):
        return f"StudyNote('{self.filename}', '{self.date_posted}')"