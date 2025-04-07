from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .utils import process_image, process_pdf
from .models import ProcessedBill
import io
import os

app = FastAPI(title="Bill Splitter API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Local development
        "https://bill-split-xi.vercel.app",  # Production Vercel domain
        "https://bill-split-production.up.railway.app",  # Railway domain
    ],
    allow_credentials=False,  # Changed to False since we're not using credentials
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=86400,  # Cache preflight requests for 24 hours
)

@app.options("/api/process-image")
async def options_process_image():
    """
    Handle OPTIONS preflight request
    """
    return {}

@app.options("/api/process-pdf")
async def options_process_pdf():
    """
    Handle OPTIONS preflight request
    """
    return {}

@app.post("/api/process-image", response_model=ProcessedBill)
async def process_bill_image(file: UploadFile = File(...)):
    """
    Process an uploaded image of a restaurant bill and extract items and prices
    """
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        contents = await file.read()
        image_bytes = io.BytesIO(contents)
        result = process_image(image_bytes)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/process-pdf", response_model=ProcessedBill)
async def process_bill_pdf(file: UploadFile = File(...)):
    """
    Process an uploaded PDF of a restaurant bill and extract items and prices
    """
    if file.content_type != 'application/pdf':
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    try:
        contents = await file.read()
        pdf_bytes = io.BytesIO(contents)
        result = process_pdf(pdf_bytes)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """
    Health check endpoint
    """
    return {"status": "healthy"}
