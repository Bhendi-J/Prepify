import pytesseract
from PIL import Image
import os
import pypdf

tesseract_cmd = os.getenv('TESSERACT_CMD')
if tesseract_cmd:
    pytesseract.pytesseract.tesseract_cmd = tesseract_cmd

def extract_text_from_image(file_path):
    """
    Takes the path to an image or PDF file and returns the extracted text.
    Includes debugging print statements.
    """
    print(f"--- Starting extraction for file: {file_path} ---")
    try:
        ext = os.path.splitext(file_path)[1].lower()
        if ext == '.pdf':
            print("--- Detected PDF file, using pypdf ---")
            text = ""
            with open(file_path, 'rb') as f:
                reader = pypdf.PdfReader(f)
                for page in reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
            print("--- pypdf finished processing ---")
            print(f"--- Raw extracted text: '{text[:100]}...' ---")
            return text
        else:
            image = Image.open(file_path)
            print("--- Image opened successfully by Pillow ---")

            # Use pytesseract to extract text from the image
            text = pytesseract.image_to_string(image)

            print("--- Pytesseract finished processing ---")
            print(f"--- Raw extracted text: '{text[:100]}...' ---") # Print first 100 chars

            return text
    except Exception as e:
        print(f"--- AN ERROR OCCURRED in extraction function: {e} ---")
        return None