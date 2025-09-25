from webapp import db, login_manager
from flask_login import UserMixin

# This function is required by Flask-Login to load a user from the sessio
class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(20), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(60), nullable=False)
    
    # We'll add the relationship to StudyNote back in later
    # notes = db.relationship('StudyNote', backref='author', lazy=True)

    def __repr__(self):
        return f"User('{self.username}', '{self.email}')"
    

@login_manager.user_loader
def load_user(user_id):
    # Now, this will work because the User class is defined above
    return User.query.get(int(user_id))