from webapp import app, db # Import the app from our 'webapp' package

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5001) # debug=True allows you to see errors in the browser