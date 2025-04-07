import pytesseract
import cv2
import numpy as np
from PIL import Image
import pdfplumber
from pdf2image import convert_from_bytes
import re
from .models import ProcessedBill, BillItem
from typing import List, Tuple, IO
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def preprocess_image(image: np.ndarray) -> np.ndarray:
    """
    Enhanced preprocessing for better OCR accuracy
    """
    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Apply adaptive thresholding
    gray = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 21, 10
    )
    
    # Denoise
    gray = cv2.fastNlMeansDenoising(gray)
    
    # Apply dilation to connect text components
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3,3))
    gray = cv2.dilate(gray, kernel, iterations=1)
    
    return gray

def extract_items_and_prices(text: str) -> List[Tuple[str, float]]:
    """
    Enhanced item and price extraction with support for various formats
    """
    items = []
    
    # Split text into lines and clean them
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    
    # Common price patterns
    price_patterns = [
        r'\$?(\d+\.\d{2})\b',  # Standard price format ($XX.XX or XX.XX)
        r'(\d+\.\d{2})\s*(?:USD|EUR)?',  # Price with optional currency
        r'(\d+(?:[.,]\d{2}))\b'  # Price with comma or dot
    ]
    
    # Keywords to skip
    skip_keywords = ['total', 'subtotal', 'tax', 'balance', 'change', 'due', 'payment']
    
    # Process each line
    for i, line in enumerate(lines):
        # Skip lines with common keywords
        if any(keyword in line.lower() for keyword in skip_keywords):
            continue
            
        # Find all price matches in the line
        prices = []
        for pattern in price_patterns:
            matches = re.finditer(pattern, line)
            for match in matches:
                try:
                    price = float(match.group(1).replace(',', '.'))
                    if price > 0:
                        prices.append((price, match.start()))
                except ValueError:
                    continue
        
        if prices:
            # Use the rightmost price as the item price
            price, price_pos = max(prices, key=lambda x: x[1])
            
            # Extract item name (everything before the price)
            name = line[:price_pos].strip()
            
            # Clean up the name
            name = re.sub(r'^\d+\s*x\s*', '', name)  # Remove quantity markers
            name = re.sub(r'\s+', ' ', name)  # Normalize spaces
            name = name.strip('.- ')  # Remove common separators
            
            # Additional cleaning for common patterns
            name = re.sub(r'\(\d+\s*(?:oz|lb|g|ml)\)', '', name)  # Remove size info
            name = re.sub(r'\d+\s*(?:oz|lb|g|ml)', '', name)  # Remove size info
            name = name.strip()
            
            if name and len(name) > 1:  # Ensure we have a valid name
                items.append((name, price))
                
    return items

def extract_total_and_tax(text: str) -> Tuple[float, float]:
    """
    Enhanced total and tax extraction
    """
    total = 0.0
    tax = 0.0
    
    # Look for total amount with various patterns
    total_patterns = [
        r'total[\s.:]*\$?(\d+\.\d{2})',
        r'amount[\s.:]*\$?(\d+\.\d{2})',
        r'due[\s.:]*\$?(\d+\.\d{2})',
        r'balance[\s.:]*\$?(\d+\.\d{2})'
    ]
    
    # Look for tax amount
    tax_patterns = [
        r'tax[\s.:]*\$?(\d+\.\d{2})',
        r'vat[\s.:]*\$?(\d+\.\d{2})',
        r'gst[\s.:]*\$?(\d+\.\d{2})'
    ]
    
    text_lower = text.lower()
    
    # Find total
    for pattern in total_patterns:
        match = re.search(pattern, text_lower)
        if match:
            try:
                total = float(match.group(1))
                break
            except ValueError:
                continue
    
    # Find tax
    for pattern in tax_patterns:
        match = re.search(pattern, text_lower)
        if match:
            try:
                tax = float(match.group(1))
                break
            except ValueError:
                continue
    
    return total, tax

def process_image(image_file: IO) -> ProcessedBill:
    """
    Enhanced image processing with better error handling
    """
    try:
        # Read image file
        image = Image.open(image_file)
        # Convert PIL Image to OpenCV format
        image_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        # Preprocess the image
        processed_image = preprocess_image(image_cv)
        
        # Configure Tesseract parameters for better accuracy
        custom_config = r'--oem 3 --psm 6'
        text = pytesseract.image_to_string(processed_image, config=custom_config)
        logger.info("Extracted text: %s", text[:200])
        
        # Extract items and prices
        items_and_prices = extract_items_and_prices(text)
        items = [BillItem(name=name, price=price) for name, price in items_and_prices]
        
        # Extract total and tax
        total, tax = extract_total_and_tax(text)
        
        # Calculate subtotal
        subtotal = sum(item.price for item in items)
        
        # If no total was found, use subtotal + tax
        if total == 0:
            total = subtotal + tax
        
        # Calculate confidence score based on various factors
        confidence_score = min(1.0, (
            (0.4 if len(items) > 0 else 0) +  # Items found
            (0.3 if total > 0 else 0) +       # Total found
            (0.3 if tax > 0 else 0)           # Tax found
        ))
        
        return ProcessedBill(
            items=items,
            subtotal=subtotal,
            tax=tax,
            total=total,
            confidence_score=confidence_score
        )
    
    except Exception as e:
        logger.error("Error processing image: %s", str(e))
        raise

def process_pdf(pdf_file: IO) -> ProcessedBill:
    """
    Enhanced PDF processing with multiple extraction methods
    """
    try:
        text = ""
        # First try direct PDF text extraction
        with pdfplumber.open(pdf_file) as pdf:
            for page in pdf.pages:
                text += page.extract_text() or ""
        
        if not text.strip():
            # If no text was extracted, convert PDF to image and use OCR
            pdf_file.seek(0)
            images = convert_from_bytes(pdf_file.read())
            text = ""
            for image in images:
                # Convert PIL Image to OpenCV format
                image_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
                processed_image = preprocess_image(image_cv)
                text += pytesseract.image_to_string(processed_image)
        
        logger.info("Extracted text from PDF: %s", text[:200])
        
        # Process the extracted text
        items_and_prices = extract_items_and_prices(text)
        items = [BillItem(name=name, price=price) for name, price in items_and_prices]
        
        total, tax = extract_total_and_tax(text)
        subtotal = sum(item.price for item in items)
        
        if total == 0:
            total = subtotal + tax
        
        confidence_score = min(1.0, (
            (0.4 if len(items) > 0 else 0) +
            (0.3 if total > 0 else 0) +
            (0.3 if tax > 0 else 0)
        ))
        
        return ProcessedBill(
            items=items,
            subtotal=subtotal,
            tax=tax,
            total=total,
            confidence_score=confidence_score
        )
    
    except Exception as e:
        logger.error("Error processing PDF: %s", str(e))
        raise
