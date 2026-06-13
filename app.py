import os
import sys
import uuid
import tempfile
import threading
import socket
import webbrowser
from flask import Flask, request, jsonify, send_file, render_template, abort
import fitz  # PyMuPDF
import webview

# Global Configuration and State
if getattr(sys, 'frozen', False):
    # Running in a PyInstaller bundle
    BASE_DIR = sys._MEIPASS
else:
    # Running in normal Python environment
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(
    __name__,
    template_folder=os.path.join(BASE_DIR, 'templates'),
    static_folder=os.path.join(BASE_DIR, 'static')
)

# Lock for thread-safe PyMuPDF operations
doc_lock = threading.Lock()

# Dictionary to hold active PDF documents in memory
# Key: pdf_id, Value: dict containing:
#   - 'path': original path (or temp file path)
#   - 'temp_file': path to temp file if uploaded, else None
#   - 'metadata': list of page info dicts
active_pdfs = {}

# Temporary directory for uploaded and processed files
TEMP_DIR = os.path.join(tempfile.gettempdir(), 'pdf_cleaner_temp')
os.makedirs(TEMP_DIR, exist_ok=True)

def find_free_port():
    """Finds a free port on localhost."""
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(('localhost', 0))
    port = s.getsockname()[1]
    s.close()
    return port

def is_page_blank(page):
    """Detects if a page is likely blank. In scanned books, empty pages still contain
    a background image, but have no OCR text layer.
    """
    text = page.get_text().strip()
    if len(text) > 3:
        return False
    drawings = page.get_drawings()
    if drawings:
        return False
    return True

def clean_page_images(doc, idx):
    """Deletes all images on page and makes invisible OCR text visible."""
    if idx < 0 or idx >= len(doc):
        return
    page = doc[idx]
    
    # 1. Delete all images
    for img in page.get_images(full=True):
        xref = img[0]
        page.delete_image(xref)
        
    # 2. Make invisible OCR text visible
    # We look for "3 Tr" (invisible text) in page content streams and change it to "0 Tr" (visible)
    for c_xref in page.get_contents():
        try:
            stream = doc.xref_stream(c_xref)
            new_stream = stream.replace(b'3 Tr', b'0 Tr')
            new_stream = new_stream.replace(b'3\r\nTr', b'0\r\nTr')
            new_stream = new_stream.replace(b'3\nTr', b'0\nTr')
            doc.update_stream(c_xref, new_stream)
        except Exception as e:
            print(f"Blad modyfikacji strumienia na stronie {idx}: {e}")

def analyze_pdf(pdf_path):
    """Analyzes a PDF file and returns list of page metadata."""
    metadata = []
    with doc_lock:
        doc = fitz.open(pdf_path)
        for idx in range(len(doc)):
            page = doc[idx]
            text = page.get_text().strip()
            images = page.get_images()
            drawings = page.get_drawings()
            
            is_blank = is_page_blank(page)
            
            metadata.append({
                "index": idx,
                "page_num": idx + 1,
                "width": round(page.rect.width, 1),
                "height": round(page.rect.height, 1),
                "text_len": len(text),
                "images_count": len(images),
                "is_blank": is_blank
            })
        doc.close()
    return metadata

# --- Flask Web Routes & API ---

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/upload', methods=['POST'])
def api_upload():
    """Handles PDF upload in web mode."""
    if 'file' not in request.files:
        return jsonify({"error": "Brak pliku w żądaniu"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "Nie wybrano pliku"}), 400
        
    if not file.filename.lower().endswith('.pdf'):
        return jsonify({"error": "Plik musi być formatu PDF"}), 400

    pdf_id = str(uuid.uuid4())
    temp_path = os.path.join(TEMP_DIR, f"{pdf_id}_uploaded.pdf")
    file.save(temp_path)

    try:
        pages_metadata = analyze_pdf(temp_path)
        active_pdfs[pdf_id] = {
            "path": temp_path,
            "temp_file": temp_path,
            "filename": file.filename,
            "size": os.path.getsize(temp_path),
            "metadata": pages_metadata
        }
        return jsonify({
            "pdf_id": pdf_id,
            "filename": file.filename,
            "size": os.path.getsize(temp_path),
            "pages": pages_metadata
        })
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return jsonify({"error": f"Błąd przetwarzania PDF: {str(e)}"}), 500

@app.route('/api/load-local', methods=['POST'])
def api_load_local():
    """Loads a PDF from a local path (Native mode)."""
    data = request.json
    path = data.get('path')
    if not path or not os.path.exists(path):
        return jsonify({"error": "Plik nie istnieje pod podaną ścieżką"}), 400

    pdf_id = str(uuid.uuid4())
    try:
        pages_metadata = analyze_pdf(path)
        active_pdfs[pdf_id] = {
            "path": path,
            "temp_file": None,
            "filename": os.path.basename(path),
            "size": os.path.getsize(path),
            "metadata": pages_metadata
        }
        return jsonify({
            "pdf_id": pdf_id,
            "filename": os.path.basename(path),
            "size": os.path.getsize(path),
            "pages": pages_metadata
        })
    except Exception as e:
        return jsonify({"error": f"Błąd wczytywania PDF: {str(e)}"}), 500

@app.route('/api/thumbnail/<pdf_id>/<int:page_num>')
def api_thumbnail(pdf_id, page_num):
    """Generates and returns a thumbnail of the page (PNG format)."""
    pdf_info = active_pdfs.get(pdf_id)
    if not pdf_info:
        return abort(404, description="PDF not found")
    
    try:
        with doc_lock:
            doc = fitz.open(pdf_info["path"])
            if page_num < 0 or page_num >= len(doc):
                doc.close()
                return abort(400, description="Invalid page number")
            
            page = doc[page_num]
            # Render at standard size (width max 320px for grid)
            rect = page.rect
            zoom = 320 / max(rect.width, rect.height)
            mat = fitz.Matrix(zoom, zoom)
            pix = page.get_pixmap(matrix=mat)
            png_bytes = pix.tobytes("png")
            doc.close()
            
        return send_file(
            fitz.io.BytesIO(png_bytes),
            mimetype='image/png',
            as_attachment=False
        )
    except Exception as e:
        return abort(500, description=str(e))

@app.route('/api/preview-large/<pdf_id>/<int:page_num>')
def api_preview_large(pdf_id, page_num):
    """Generates and returns a large preview of the page (PNG format)."""
    pdf_info = active_pdfs.get(pdf_id)
    if not pdf_info:
        return abort(404, description="PDF not found")
    
    try:
        with doc_lock:
            doc = fitz.open(pdf_info["path"])
            if page_num < 0 or page_num >= len(doc):
                doc.close()
                return abort(400, description="Invalid page number")
            
            page = doc[page_num]
            # Render at high resolution (width max 1000px)
            rect = page.rect
            zoom = 1000 / max(rect.width, rect.height)
            mat = fitz.Matrix(zoom, zoom)
            pix = page.get_pixmap(matrix=mat)
            png_bytes = pix.tobytes("png")
            doc.close()
            
        return send_file(
            fitz.io.BytesIO(png_bytes),
            mimetype='image/png',
            as_attachment=False
        )
    except Exception as e:
        return abort(500, description=str(e))

@app.route('/api/process', methods=['POST'])
def api_process():
    """Processes the PDF: removes pages, clears images from specified pages.

    Returns the new file size and download link.
    """
    data = request.json
    pdf_id = data.get('pdf_id')
    delete_pages = data.get('delete_pages', [])  # list of indices
    clear_image_pages = data.get('clear_image_pages', [])  # list of indices
    
    # Cast to int to make sure
    delete_pages = [int(i) for i in delete_pages]
    clear_image_pages = [int(i) for i in clear_image_pages]

    pdf_info = active_pdfs.get(pdf_id)
    if not pdf_info:
        return jsonify({"error": "Plik PDF wygasł lub nie istnieje. Spróbuj załadować go ponownie."}), 404

    try:
        out_id = str(uuid.uuid4())
        out_filename = f"cleaned_{pdf_info['filename']}"
        out_path = os.path.join(TEMP_DIR, f"{out_id}_{out_filename}")

        with doc_lock:
            doc = fitz.open(pdf_info["path"])
            
            # 1. Clean images and restore text visibility
            for idx in clear_image_pages:
                clean_page_images(doc, idx)

            # 2. Re-create PDF containing only the pages we want to keep
            total_pages = len(doc)
            keep_indices = [i for i in range(total_pages) if i not in delete_pages]
            
            if not keep_indices:
                doc.close()
                return jsonify({"error": "Nie możesz usunąć wszystkich stron!"}), 400

            doc.select(keep_indices)
            
            # Save optimized version
            doc.save(out_path, garbage=4, deflate=True)
            doc.close()

        orig_size = pdf_info["size"]
        new_size = os.path.getsize(out_path)
        saved_bytes = orig_size - new_size
        saved_percent = round((saved_bytes / orig_size) * 100, 1) if orig_size > 0 else 0

        # Save processed info to active_pdfs for download
        active_pdfs[out_id] = {
            "path": out_path,
            "temp_file": out_path,
            "filename": out_filename,
            "size": new_size
        }

        return jsonify({
            "success": True,
            "download_id": out_id,
            "filename": out_filename,
            "orig_size": orig_size,
            "new_size": new_size,
            "saved_size": saved_bytes,
            "saved_percent": saved_percent
        })
    except Exception as e:
        return jsonify({"error": f"Błąd podczas procesowania pliku: {str(e)}"}), 500

@app.route('/api/process-local', methods=['POST'])
def api_process_local():
    """Processes PDF and saves it directly to a local target path (Native mode)."""
    data = request.json
    pdf_id = data.get('pdf_id')
    save_path = data.get('save_path')
    delete_pages = data.get('delete_pages', [])
    clear_image_pages = data.get('clear_image_pages', [])

    delete_pages = [int(i) for i in delete_pages]
    clear_image_pages = [int(i) for i in clear_image_pages]

    pdf_info = active_pdfs.get(pdf_id)
    if not pdf_info:
        return jsonify({"error": "Plik PDF wygasł lub nie istnieje"}), 404
        
    if not save_path:
        return jsonify({"error": "Brak ścieżki docelowej do zapisu"}), 400

    try:
        with doc_lock:
            doc = fitz.open(pdf_info["path"])
            
            # Clean images and restore text visibility
            for idx in clear_image_pages:
                clean_page_images(doc, idx)

            # Select kept pages
            total_pages = len(doc)
            keep_indices = [i for i in range(total_pages) if i not in delete_pages]
            
            if not keep_indices:
                doc.close()
                return jsonify({"error": "Nie możesz usunąć wszystkich stron!"}), 400

            doc.select(keep_indices)
            
            # Save optimized directly to user's desired path
            doc.save(save_path, garbage=4, deflate=True)
            doc.close()

        orig_size = pdf_info["size"]
        new_size = os.path.getsize(save_path)
        saved_bytes = orig_size - new_size
        saved_percent = round((saved_bytes / orig_size) * 100, 1) if orig_size > 0 else 0

        return jsonify({
            "success": True,
            "save_path": save_path,
            "orig_size": orig_size,
            "new_size": new_size,
            "saved_size": saved_bytes,
            "saved_percent": saved_percent
        })
    except Exception as e:
        return jsonify({"error": f"Błąd zapisu pliku: {str(e)}"}), 500

@app.route('/api/download/<pdf_id>')
def api_download(pdf_id):
    """Downloads the processed PDF file."""
    pdf_info = active_pdfs.get(pdf_id)
    if not pdf_info:
        return abort(404, description="File not found")
    
    return send_file(
        pdf_info["path"],
        as_attachment=True,
        download_name=pdf_info["filename"]
    )


# --- PyWebView GUI Bridge API ---

class PyWebViewAPI:
    def __init__(self):
        self.window = None

    def open_file_dialog(self):
        """Triggers native file open dialog."""
        if not self.window:
            return None
        file_types = ('Pliki PDF (*.pdf)', '*.pdf')
        res = self.window.create_file_dialog(
            dialog_type=webview.OPEN_DIALOG,
            allow_multiple=False,
            file_types=(file_types,)
        )
        if res and len(res) > 0:
            return res[0]
        return None

    def save_file_dialog(self, default_name=""):
        """Triggers native file save dialog."""
        if not self.window:
            return None
        file_types = ('Pliki PDF (*.pdf)', '*.pdf')
        res = self.window.create_file_dialog(
            dialog_type=webview.SAVE_DIALOG,
            save_filename=default_name,
            file_types=(file_types,)
        )
        if res and len(res) > 0:
            return res[0]
        return None


def run_flask(port):
    """Starts the Flask server."""
    app.run(host='127.0.0.1', port=port, debug=False, threaded=True)

if __name__ == '__main__':
    # Determine mode: check for '--web' flag
    use_only_web = '--web' in sys.argv
    port = find_free_port()
    
    # Start Flask in a background thread
    t = threading.Thread(target=run_flask, args=(port,))
    t.daemon = True
    t.start()
    
    url = f'http://127.0.0.1:{port}'
    print(f"Serwer uruchomiony pod adresem: {url}")

    if use_only_web:
        # Web mode: open default browser
        webbrowser.open(url)
        # Keep main thread alive
        t.join()
    else:
        # GUI mode: start PyWebView
        api = PyWebViewAPI()
        window = webview.create_window(
            title="PDF Page & Image Cleaner",
            url=url,
            js_api=api,
            width=1280,
            height=850,
            min_size=(1024, 700)
        )
        api.window = window
        try:
            webview.start()
        except Exception as e:
            # Fallback to browser if PyWebView fails
            print(f"Nie udało się uruchomić okna GUI: {e}. Uruchamianie w przeglądarce...")
            webbrowser.open(url)
            t.join()
