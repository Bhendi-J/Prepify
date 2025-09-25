# webapp/__init__.py
import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_login import LoginManager
from flask_cors import CORS
from dotenv import load_dotenv
from flask import jsonify
load_dotenv()

# Create the Flask application instance
app = Flask(__name__)

# --- UPDATED CORS CONFIGURATION ---
# More comprehensive CORS setup to handle all preflight requests properly

CORS(
    app,
    supports_credentials=True,
    origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"]
)

# --- Configuration ---
# Secret key protects against modifying cookies, cross-site request forgery, etc.
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
# Set the location for our SQLite database
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI')



# Initialize the database extension
db = SQLAlchemy(app)
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