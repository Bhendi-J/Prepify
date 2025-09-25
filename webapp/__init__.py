# webapp/__init__.py

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_login import LoginManager
from flask_cors import CORS

# Create the Flask application instance
app = Flask(__name__)

# --- UPDATED CORS CONFIGURATION ---
# More comprehensive CORS setup to handle all preflight requests properly
CORS(app, origins=["http://localhost:3000"], supports_credentials=True)

# --- Configuration ---
# Secret key protects against modifying cookies, cross-site request forgery, etc.
app.config['SECRET_KEY'] = 'a_very_secret_key_for_prepify'
# Set the location for our SQLite database
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db'

# Initialize the database extension
db = SQLAlchemy(app)
bcrypt_ = Bcrypt(app) # Initialize Bcrypt
login_manager = LoginManager(app) # Initialize LoginManager

# Tell LoginManager where to redirect if a user tries to access a protected page
login_manager.login_view = 'login' 
# Optional: Prettify the "Please log in to access this page" message
login_manager.login_message_category = 'info' 

# Import the routes after the app is created to avoid circular imports
from webapp import routes