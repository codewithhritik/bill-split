# Bill Splitter Backend

This is the backend service for the Bill Splitter application, handling image and PDF processing of restaurant bills.

## Prerequisites

-   Python 3.8 or higher
-   Tesseract OCR engine
-   Poppler (for PDF processing)

### Installing Prerequisites

#### macOS

```bash
brew install tesseract
brew install poppler
```

#### Ubuntu/Debian

```bash
sudo apt-get update
sudo apt-get install -y tesseract-ocr
sudo apt-get install -y poppler-utils
```

## Setup

1. Create a virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

## Running the Server

Start the FastAPI server:

```bash
uvicorn app.main:app --reload --port 8000
```

The API will be available at http://localhost:8000

## API Endpoints

-   `POST /api/process-image`: Process an image of a restaurant bill
-   `POST /api/process-pdf`: Process a PDF of a restaurant bill
-   `GET /health`: Health check endpoint

## API Documentation

Once the server is running, you can access the interactive API documentation at:

-   Swagger UI: http://localhost:8000/docs
-   ReDoc: http://localhost:8000/redoc
