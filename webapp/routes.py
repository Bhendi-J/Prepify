import os
from flask import request, jsonify # We now import 'request' and 'jsonify'
from werkzeug.utils import secure_filename
from webapp import app, db, bcrypt_ # Renamed bcrypt_ to bcrypt for consistency
from webapp.models import User
from flask_login import login_user, current_user, logout_user, login_required
from webapp.ml_models.ocr import extract_text_from_image # Renamed to extract_text

# --- API Endpoint for File Upload ---
@app.route("/api/upload", methods=['POST'])
@login_required # Protect this endpoint so only logged-in users can upload
def upload_file():
    if 'note_file' not in request.files:
        return jsonify({'error': 'No file part in the request'}), 400

    file = request.files['note_file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if file:
        filename = secure_filename(file.filename)
        upload_path = os.path.join(app.root_path, 'uploads')
        if not os.path.exists(upload_path):
            os.makedirs(upload_path)
        
        file_path = os.path.join(upload_path, filename)
        file.save(file_path)

        extracted_text = extract_text_from_image(file_path)

        if extracted_text:
            # On success, return the extracted text as a JSON object
            return jsonify({'extracted_text': extracted_text})
        else:
            return jsonify({'error': 'Could not extract text from the file'}), 500

    return jsonify({'error': 'An unknown error occurred'}), 500

# --- API Endpoint for User Registration ---
@app.route("/api/register", methods=['POST'])
def register():
    if current_user.is_authenticated:
        return jsonify({'message': 'User already logged in'}), 200

    data = request.get_json()
    if not data or not data.get('email') or not data.get('password') or not data.get('username'):
        return jsonify({'error': 'Missing data'}), 400

    # --- ADDED A SEPARATE CHECK FOR USERNAME ---
    if User.query.filter_by(username=data.get('username')).first():
        return jsonify({'error': 'Username already exists'}), 409 # 409 Conflict

    if User.query.filter_by(email=data.get('email')).first():
        return jsonify({'error': 'Email already exists'}), 409

    hashed_password = bcrypt_.generate_password_hash(data.get('password')).decode('utf-8')
    user = User(username=data.get('username'), email=data.get('email'), password=hashed_password)
    db.session.add(user)
    db.session.commit()
    
    return jsonify({'message': 'User registered successfully'}), 201  # Fixed: was 21, should be 201

# --- API Endpoint for User Login ---
@app.route("/api/login",methods=['GET', 'POST'])
def login():
    if request.method == 'GET':
        # Handle Flask-Login redirect
        return jsonify({'error': 'Authentication required'}), 401
    if current_user.is_authenticated:
        return jsonify({'message': 'User already logged in'}), 200

    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Missing data'}), 400

    user = User.query.filter_by(email=data.get('email')).first()
    if user and bcrypt_.check_password_hash(user.password, data.get('password')):
        login_user(user, remember=True) # Use Flask-Login to manage the session
        return jsonify({
            'message': 'Login successful',
            'user': {'username': user.username, 'email': user.email}
        })
    else:
        return jsonify({'error': 'Invalid credentials'}), 401 # 401 Unauthorized

# --- API Endpoint for User Logout ---
@app.route("/api/logout", methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({'message': 'Logout successful'})

# --- API Endpoint for Getting Account Info ---
@app.route("/api/account", methods=['GET'])
@login_required
def account():
    # Return the current user's data as JSON
    return jsonify({
        'username': current_user.username,
        'email': current_user.email
    })

