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
    Enhanced preprocessing optimized for restaurant receipts with better contrast and noise reduction
    """
    # Convert to grayscale if not already
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image.copy()
    
    # Resize if too small while maintaining aspect ratio
    min_height = 2500  # Increased for better detail
    if gray.shape[0] < min_height:
        scale = min_height / gray.shape[0]
        gray = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    
    # Apply contrast enhancement
    gray = cv2.convertScaleAbs(gray, alpha=1.5, beta=0)
    
    # Denoise
    gray = cv2.fastNlMeansDenoising(gray, h=10)
    
    # Apply adaptive thresholding
    gray = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 21, 11
    )
    
    # Remove small noise
    kernel = np.ones((2,2), np.uint8)
    gray = cv2.morphologyEx(gray, cv2.MORPH_OPEN, kernel)
    
    # Sharpen the image
    kernel = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
    gray = cv2.filter2D(gray, -1, kernel)
    
    return gray

def extract_items_and_prices(text: str) -> List[Tuple[str, float]]:
    """
    Enhanced item and price extraction for restaurant receipts
    """
    items = []
    
    # Split text into lines and clean them
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    
    # Price patterns for restaurant receipts
    price_patterns = [
        r'\$\s*(\d+\.\d{2})\b',  # Standard price with $ sign
        r'(\d+\.\d{2})\s*(?:$|T|X|\s)',   # Price at end of line or followed by T/X
        r'[\$]?(\d+\.\d{2})'   # Price with optional $ sign
    ]
    
    # Keywords to skip
    skip_keywords = ['total', 'subtotal', 'balance', 'change', 'due', 'payment', 
                    'card', 'cash', 'credit', 'debit', 'tip', 'gratuity', 'order', 'table',
                    'server', 'guest', 'check', 'receipt', 'duplicate', 'copy', 'date', 'time']
    
    # Quantity pattern
    qty_pattern = r'^\s*(\d+)\s+'
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        # Skip lines with common keywords
        if any(keyword in line.lower() for keyword in skip_keywords):
            i += 1
            continue
        
        # Skip short lines
        if len(line) < 3:
            i += 1
            continue
        
        # Look for price in current line
        price_found = False
        quantity = 1
        
        # Extract quantity if present
        qty_match = re.match(qty_pattern, line)
        if qty_match:
            try:
                quantity = int(qty_match.group(1))
                line = line[qty_match.end():].strip()
            except ValueError:
                pass
        
        # Try to find price
        for pattern in price_patterns:
            match = re.search(pattern, line)
            if match:
                try:
                    price = float(match.group(1))
                    if 0.01 <= price <= 1000.00:  # Reasonable price range
                        # Get the item name
                        name = line[:match.start()].strip()
                        
                        # If the previous line doesn't have a price and isn't too long,
                        # it might be part of this item's name
                        if i > 0 and len(lines[i-1]) < 50:
                            prev_line = lines[i-1].strip()
                            if not any(re.search(p, prev_line) for p in price_patterns):
                                name = prev_line + ' ' + name
                        
                        # Clean up the name
                        name = re.sub(r'^\d+\s*x\s*', '', name)  # Remove quantity markers
                        name = re.sub(r'\s+', ' ', name)  # Normalize spaces
                        name = name.strip('.- *#$')  # Remove common separators
                        
                        # Remove common receipt codes and IDs
                        name = re.sub(r'\b\d{6,}\b', '', name)
                        name = re.sub(r'\([^)]*\)', '', name)
                        
                        name = name.strip()
                        
                        if name and len(name) > 1:
                            # Add the item with its quantity
                            for _ in range(quantity):
                                items.append((name, price))
                            price_found = True
                            break
                except ValueError:
                    continue
        
        if not price_found and i < len(lines) - 1:
            # If no price found and there's a next line, check if it's a multi-line item
            next_line = lines[i + 1].strip()
            if any(re.search(pattern, next_line) for pattern in price_patterns):
                # Next line has a price, this might be part of the item name
                i += 1
            else:
                i += 1
        else:
            i += 1
    
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
    Enhanced image processing with better error handling and orientation detection
    """
    try:
        # Read image file
        image = Image.open(image_file)
        
        # Convert to numpy array
        image_np = np.array(image)
        
        # Handle RGBA images
        if len(image_np.shape) == 3 and image_np.shape[2] == 4:
            image_np = cv2.cvtColor(image_np, cv2.COLOR_RGBA2RGB)
        
        # Try different orientations if needed
        orientations = [270, 0, 90, 180]  # Prioritize 270 degrees based on observed results
        best_text = ""
        best_items = []
        best_total = 0.0
        best_tax = 0.0
        best_score = 0
        
        for angle in orientations:
            # Rotate image if needed
            if angle != 0:
                rotated = Image.fromarray(image_np).rotate(angle, expand=True)
                current_image = np.array(rotated)
            else:
                current_image = image_np
            
            # Preprocess the image
            processed_image = preprocess_image(current_image)
            
            # Configure Tesseract for receipt OCR with improved settings
            custom_config = r'--oem 3 --psm 6 -l eng --dpi 300 -c tessedit_char_whitelist="0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz,.-$/% ()" -c tessedit_do_invert=0'
            
            # Extract text
            text = pytesseract.image_to_string(processed_image, config=custom_config)
            logger.info(f"Trying rotation {angle} degrees. Extracted text sample: {text[:500]}")
            
            # Extract items and prices
            items_and_prices = extract_items_and_prices(text)
            total, tax = extract_total_and_tax(text)
            
            # Enhanced scoring system
            word_count = len(text.split())
            price_count = len([p for p in re.finditer(r'\$?\d+\.\d{2}', text)])
            score = (
                len(items_and_prices) * 3 +  # Weight items heavily
                (1 if total > 0 else 0) * 2 +  # Weight total
                (1 if tax > 0 else 0) * 2 +  # Weight tax
                min(word_count / 10, 5) +  # Consider word count up to a point
                min(price_count, 10)  # Consider price count up to a point
            )
            
            logger.info(f"Rotation {angle} score: {score} (items: {len(items_and_prices)}, total: {total}, tax: {tax})")
            
            if score > best_score:
                best_score = score
                best_text = text
                best_items = items_and_prices
                best_total = total
                best_tax = tax
                
                # If we found a good number of items and the total, we can stop
                if len(items_and_prices) >= 5 and total > 0 and tax > 0:
                    break
        
        if not best_items:
            logger.warning("No items found in any orientation")
            return ProcessedBill(
                items=[],
                subtotal=0,
                tax=0,
                total=0,
                confidence_score=0
            )
        
        items = [BillItem(name=name, price=price) for name, price in best_items]
        subtotal = sum(item.price for item in items)
        
        # If no total was found, use subtotal + tax
        if best_total == 0:
            best_total = subtotal + best_tax
            logger.warning(f"No total found, using calculated total: {best_total}")
        
        # Calculate confidence based on various factors
        confidence_score = min(1.0, (
            (0.4 if len(items) >= 3 else 0.2 if len(items) > 0 else 0) +
            (0.3 if best_total > 0 else 0) +
            (0.3 if best_tax > 0 else 0)
        ))
        
        return ProcessedBill(
            items=items,
            subtotal=subtotal,
            tax=best_tax,
            total=best_total,
            confidence_score=confidence_score
        )
    
    except Exception as e:
        logger.error(f"Error processing image: {str(e)}", exc_info=True)
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
