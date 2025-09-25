import pytesseract
from PIL import Image

# Uncomment the line below if you're on Windows and update the path
# pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
pytesseract.pytesseract.tesseract_cmd = r'/opt/homebrew/bin/tesseract' 

def extract_text_from_image(image_path):
    """
    Takes the path to an image file and returns the extracted text.
    Includes debugging print statements.
    """
    print(f"--- Starting OCR for image: {image_path} ---")
    try:
        image = Image.open(image_path)
        print("--- Image opened successfully by Pillow ---")

        # Use pytesseract to extract text from the image
        text = pytesseract.image_to_string(image)

        print("--- Pytesseract finished processing ---")
        print(f"--- Raw extracted text: '{text[:100]}...' ---") # Print first 100 chars

        return text
    except Exception as e:
        print(f"--- AN ERROR OCCURRED in OCR function: {e} ---")
        return None