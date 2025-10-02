from webapp import app # Import the app from our 'webapp' package

if __name__ == '__main__':
    app.run(debug=True, port=5001) # debug=True allows you to see errors in the browser