import os
from webapp import app # Import the app from our 'webapp' package

if __name__ == '__main__':
    debug_mode = os.getenv('FLASK_DEBUG', '0') == '1'
    app.run(debug=debug_mode, port=5001)