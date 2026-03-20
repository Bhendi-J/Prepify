import warnings
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

warnings.filterwarnings('ignore')

_model = None
_tokenizer = None

def get_summarizer():
    global _model, _tokenizer
    if _model is None:
        model_name = "sshleifer/distilbart-cnn-12-6"
        _tokenizer = AutoTokenizer.from_pretrained(model_name)
        _model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
    return _model, _tokenizer

def summarize_text(text: str) -> str:
    """
    Summarize the input text using a Hugging Face model.
    """
    if not text or len(text.strip()) == 0:
        return ""
    
    # We dynamically calculate max_length to avoid errors on very short text
    input_length = len(text.split())
    
    if input_length < 20: 
        return text # If it's too short, just return the text
        
    max_len = min(130, int(input_length * 0.6))
    min_len = min(30, int(input_length * 0.2))
    
    try:
        model, tokenizer = get_summarizer()
        
        # Tokenize the input text
        inputs = tokenizer(text, return_tensors="pt", max_length=1024, truncation=True)
        
        # Generate summary
        summary_ids = model.generate(
            inputs["input_ids"], 
            max_length=max_len, 
            min_length=min_len, 
            num_beams=4, 
            early_stopping=True,
            no_repeat_ngram_size=2,          # Prevents "Kits Kits Kits" loops
            repetition_penalty=1.5           # Penalizes repeating the same words
        )
        
        raw_summary = tokenizer.decode(summary_ids[0], skip_special_tokens=True)
        
        # Format the summary into readable bullet points
        sentences = [s.strip() for s in raw_summary.replace(' .', '.').split('.') if s.strip()]
        formatted_summary = "\n".join(f"• {s}." for s in sentences)
        
        return formatted_summary
    except Exception as e:
        print(f"Error summarising text: {e}")
        return "An error occurred during summarization."
