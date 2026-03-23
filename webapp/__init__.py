# webapp/__init__.py
import os
from datetime import timedelta
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_login import LoginManager
from flask_cors import CORS
from flask_migrate import Migrate
from dotenv import load_dotenv
from flask import jsonify
load_dotenv()

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
FRONTEND_BUILD_DIR = os.path.join(BASE_DIR, 'frontend', 'build')
FRONTEND_STATIC_DIR = os.path.join(FRONTEND_BUILD_DIR, 'static')

# Create the Flask application instance
app = Flask(__name__, static_folder=FRONTEND_STATIC_DIR, static_url_path='/static')

# --- UPDATED CORS CONFIGURATION ---
# More comprehensive CORS setup to handle all preflight requests properly

CORS(
    app,
    supports_credentials=True,
    origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"]
)

# --- Configuration ---
# Secret key protects against modifying cookies, cross-site request forgery, etc.
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-change-this-secret')
# Set the location for our SQLite database
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI', 'sqlite:///site.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['FRONTEND_BUILD_DIR'] = FRONTEND_BUILD_DIR
app.config['FRONTEND_INDEX_PATH'] = os.path.join(FRONTEND_BUILD_DIR, 'index.html')

is_production = os.getenv('FLASK_ENV', '').lower() == 'production'
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = is_production
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)



# Initialize the database extension
db = SQLAlchemy(app)
migrate = Migrate(app, db)
bcrypt_ = Bcrypt(app) # Initialize Bcrypt
login_manager = LoginManager(app) # Initialize LoginManager



# Tell LoginManager where to redirect if a user tries to access a protected page
@login_manager.unauthorized_handler
def unauthorized():
    return jsonify({'error': 'Authentication required'}), 401
# Optional: Prettify the "Please log in to access this page" message
login_manager.login_message_category = 'info' 

# Import the routes after the app is created to avoid circular imports
from webapp import routes
