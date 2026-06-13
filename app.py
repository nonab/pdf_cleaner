import os
import sys
import uuid
import socket
import threading
import webbrowser
import locale
from flask import Flask, render_template, request, jsonify, send_file, abort

# Initialize Flask app using sys._MEIPASS for PyInstaller assets if frozen
if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
    BASE_DIR = sys._MEIPASS
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(
    __name__,
    template_folder=os.path.join(BASE_DIR, 'templates'),
    static_folder=os.path.join(BASE_DIR, 'static')
)

import fitz  # PyMuPDF
import webview

# Global in-memory storage for active PDF files
active_pdfs = {}
TEMP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'temp_pdfs')
os.makedirs(TEMP_DIR, exist_ok=True)

# Lock for thread-safe operations on PyMuPDF documents
doc_lock = threading.Lock()

# --- i18n Backend Translations ---
# To add a new language, simply add its translations here (e.g. "de": { ... })
TRANSLATIONS = {
    "en": {
        "no_file_req": "No file in request",
        "no_file_sel": "No file selected",
        "must_be_pdf": "File must be a PDF",
        "pdf_proc_err": "PDF processing error: {error}",
        "file_not_exist": "File does not exist at specified path",
        "pdf_load_err": "PDF loading error: {error}",
        "pdf_expired": "PDF file expired or does not exist. Please try loading it again.",
        "pdf_expired_short": "PDF file expired or does not exist",
        "cannot_delete_all": "You cannot delete all pages!",
        "proc_error": "Error processing file: {error}",
        "no_save_path": "No destination path specified for saving",
        "save_error": "Error saving file: {error}",
        "dialog_pdf_files": "PDF Files (*.pdf)",
        "gui_start_fail": "Could not start GUI window: {error}. Launching in default web browser...",
        "server_started": "Server started at: {url}"
    },
    "pl": {
        "no_file_req": "Brak pliku w żądaniu",
        "no_file_sel": "Nie wybrano pliku",
        "must_be_pdf": "Plik musi być formatu PDF",
        "pdf_proc_err": "Błąd przetwarzania PDF: {error}",
        "file_not_exist": "Plik nie istnieje pod podaną ścieżką",
        "pdf_load_err": "Błąd wczytywania PDF: {error}",
        "pdf_expired": "Plik PDF wygasł lub nie istnieje. Spróbuj załadować go ponownie.",
        "pdf_expired_short": "Plik PDF wygasł lub nie istnieje",
        "cannot_delete_all": "Nie możesz usunąć wszystkich stron!",
        "proc_error": "Błąd podczas procesowania pliku: {error}",
        "no_save_path": "Brak ścieżki docelowej do zapisu",
        "save_error": "Błąd zapisu pliku: {error}",
        "dialog_pdf_files": "Pliki PDF (*.pdf)",
        "gui_start_fail": "Nie udało się uruchomić okna GUI: {error}. Uruchamianie w przeglądarce...",
        "server_started": "Serwer uruchomiony pod adresem: {url}"
    }
}

def get_lang():
    """Detects request language in Web mode or system language in Desktop mode."""
    try:
        # If inside a Flask request context, check headers
        if request:
            accept_lang = request.headers.get('Accept-Language', '')
            if accept_lang:
                # E.g. "pl-PL,pl;q=0.9,en-US;q=0.8"
                parts = [p.split(';')[0].strip().lower() for p in accept_lang.split(',')]
                for p in parts:
                    if p.startswith('pl'):
                        return 'pl'
    except RuntimeError:
        pass

    # Check system environment & default locale
    try:
        for key in ('LANG', 'LC_ALL', 'LC_CTYPE', 'LANGUAGE'):
            val = os.environ.get(key)
            if val and val.lower().startswith('pl'):
                return 'pl'
        
        default_loc = locale.getdefaultlocale()
        if default_loc and default_loc[0] and default_loc[0].lower().startswith('pl'):
            return 'pl'
            
        if sys.platform == 'win32':
            import ctypes
            if ctypes.windll.kernel32.GetUserDefaultUILanguage() == 1045: # Polish
                return 'pl'
    except Exception:
        pass

    return 'en'


# --- Helper Functions ---

def find_free_port():
    """Finds an available TCP port dynamically."""
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(('127.0.0.1', 0))
    port = s.getsockname()[1]
    s.close()
    return port

def is_page_blank(page):
    """Detects if a PDF page is blank by checking for lack of text and vector drawings.
    
    Ignores raster images since scanned pages always contain a background scan image.
    """
    text = page.get_text().strip()
    if len(text) > 3:  # page has text content (more than a stray character)
        return False
        
    drawings = page.get_drawings()
    if len(drawings) > 0:  # page contains lines, shapes, or vector artwork
        return False
        
    return True

def clean_page_images(doc, page_idx):
    """Removes all raster images from a page and restores text rendering mode.
    
    When images (which serve as scan backgrounds) are deleted, the OCR text layer is kept.
    If the OCR text is hidden (Render Mode 3), it converts it to visible text (Render Mode 0)
    so the user sees the text instead of a blank white page.
    """
    page = doc[page_idx]
    
    # 1. Remove all raster images
    img_list = page.get_images(full=True)
    for img in img_list:
        xref = img[0]
        try:
            # Replace image with a tiny transparent pixel to avoid structure breakage
            rect = page.get_image_bbox(img)
        except Exception:
            pass
        page.clean_contents()
        page.delete_image(xref)
        
    # 2. Fix text rendering mode from 3 Tr (hidden) to 0 Tr (visible)
    # Get the raw contents stream
    contents_xref_list = page.get_contents()
    for cxref in contents_xref_list:
        stream = doc.xref_stream(cxref)
        if b'3 Tr' in stream:
            # Replace '3 Tr' (Neither fill nor stroke - invisible) with '0 Tr' (Fill text)
            new_stream = stream.replace(b'3 Tr', b'0 Tr')
            # If the PDF sets gray fill or color, we can force black/colored text by replacing color statements if needed,
            # but usually 0 Tr is enough to show the text.
            doc.update_stream(cxref, new_stream)


def align_page_text(doc, page_idx):
    """Straightens and left-aligns text on a page.
    
    Extracts text spans, calculates the main left margin, aligns text lines
    horizontally (removing rotation and wobbliness), and redraws them on a clean page.
    """
    page = doc[page_idx]
    print(f"[ALIGN] Aligning text on page {page_idx + 1}...")
    text_dict = page.get_text("dict")
    blocks = text_dict.get("blocks", [])
    
    # Extract all text spans grouped by line
    text_lines = []
    left_coords = []
    
    for b in blocks:
        if b.get("type") == 0:  # Text block
            for line in b.get("lines", []):
                spans_data = []
                line_bbox = line["bbox"]
                orig_x = line_bbox[0]
                orig_y = (line_bbox[1] + line_bbox[3]) / 2.0
                
                for span in line.get("spans", []):
                    spans_data.append({
                        "text": span["text"],
                        "font": span["font"],
                        "size": span["size"],
                        "color": span["color"],
                        "width": span["bbox"][2] - span["bbox"][0]
                    })
                
                if spans_data:
                    text_lines.append({
                        "orig_x": orig_x,
                        "orig_y": orig_y,
                        "spans": spans_data
                    })
                    left_coords.append(orig_x)
                    
    if not text_lines:
        return  # Nothing to align
        
    # Calculate main left margin (common left coordinate, e.g., 15th percentile)
    left_coords.sort()
    main_margin = left_coords[int(len(left_coords) * 0.15)] if left_coords else 54.0
    
    # Create new blank page to replace the wobbly one
    rect = page.rect
    new_page = doc.new_page(page_idx + 1, width=rect.width, height=rect.height)
    
    # Draw aligned text
    for line in text_lines:
        orig_x = line["orig_x"]
        orig_y = line["orig_y"]
        
        # Check if line is indented (e.g. paragraph start)
        is_indented = (orig_x - main_margin) > 15.0
        target_x = main_margin + (orig_x - main_margin if is_indented else 0)
        
        current_x = target_x
        for span in line["spans"]:
            font = span["font"]
            size = span["size"]
            color = span["color"]
            text = span["text"]
            
            # Map original font to a clean standard PDF font (Helvetica / Helvetica-Bold)
            std_font = "helv"
            if "bold" in font.lower():
                std_font = "hebo"
            elif "italic" in font.lower() or "oblique" in font.lower():
                std_font = "hebi"
                
            new_page.insert_text(
                fitz.Point(current_x, orig_y),
                text,
                fontsize=size,
                fontname=std_font,
                color=(0, 0, 0)  # Force clean black text on white bg
            )
            
            current_x += span["width"]
            
    # Delete the old crooked page; new page shifts into its index
    doc.delete_page(page_idx)


def compress_image_xref(doc, xref, quality=50):
    """Re-encodes the image at the given xref as a compressed JPEG if it saves space."""
    try:
        base_image = doc.extract_image(xref)
        if not base_image:
            return
        orig_bytes = base_image["image"]
        
        # Load the image into a Pixmap
        pix = fitz.Pixmap(doc, xref)
        
        # Determine target colorspace and re-encode
        if not pix.colorspace or pix.colorspace.n > 3 or pix.alpha:
            pix_rgb = fitz.Pixmap(fitz.csRGB, pix)
            compressed_bytes = pix_rgb.tobytes("jpg", jpg_quality=quality)
            colorspace_name = "/DeviceRGB"
        else:
            compressed_bytes = pix.tobytes("jpg", jpg_quality=quality)
            if pix.colorspace.n == 1:
                colorspace_name = "/DeviceGray"
            else:
                colorspace_name = "/DeviceRGB"
                
        # Only replace if the compressed version is smaller
        if len(compressed_bytes) < len(orig_bytes):
            doc.update_stream(xref, compressed_bytes)
            doc.xref_set_key(xref, "Filter", "/DCTDecode")
            doc.xref_set_key(xref, "ColorSpace", colorspace_name)
    except Exception as e:
        print(f"Failed to compress image at xref {xref}: {e}")


def compress_page_images(doc, page_idx, quality=50):
    """Compresses all raster images on a page to JPEG format with reduced quality."""
    page = doc[page_idx]
    image_list = page.get_images(full=True)
    if image_list:
        print(f"[COMPRESS] Compressing {len(image_list)} images on page {page_idx + 1}...")
    for img in image_list:
        xref = img[0]
        compress_image_xref(doc, xref, quality=quality)



# --- Flask Web Server Routes ---

@app.route('/')
def index():
    """Serves the main application page."""
    return render_template('index.html')

@app.route('/api/upload', methods=['POST'])
def api_upload():
    """Handles PDF upload in web mode."""
    lang = get_lang()
    if 'file' not in request.files:
        return jsonify({"error": TRANSLATIONS[lang]["no_file_req"]}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": TRANSLATIONS[lang]["no_file_sel"]}), 400
        
    if not file.filename.lower().endswith('.pdf'):
        return jsonify({"error": TRANSLATIONS[lang]["must_be_pdf"]}), 400

    pdf_id = str(uuid.uuid4())
    temp_path = os.path.join(TEMP_DIR, f"{pdf_id}_uploaded.pdf")
    
    try:
        file.save(temp_path)
        
        with doc_lock:
            doc = fitz.open(temp_path)
            pages_metadata = []
            
            for i, page in enumerate(doc):
                pages_metadata.append({
                    "index": i,
                    "page_num": i + 1,
                    "images_count": len(page.get_images()),
                    "text_len": len(page.get_text().strip()),
                    "is_blank": is_page_blank(page)
                })
            doc.close()

        active_pdfs[pdf_id] = {
            "path": temp_path,
            "temp_file": temp_path,
            "filename": file.filename,
            "size": os.path.getsize(temp_path)
        }

        return jsonify({
            "pdf_id": pdf_id,
            "filename": file.filename,
            "size": active_pdfs[pdf_id]["size"],
            "pages": pages_metadata
        })
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        err_msg = TRANSLATIONS[lang]["pdf_proc_err"].format(error=str(e))
        return jsonify({"error": err_msg}), 500

@app.route('/api/load-local', methods=['POST'])
def api_load_local():
    """Loads a PDF file from a local path (Native mode)."""
    lang = get_lang()
    data = request.json
    path = data.get('path')
    if not path or not os.path.exists(path):
        return jsonify({"error": TRANSLATIONS[lang]["file_not_exist"]}), 400

    pdf_id = str(uuid.uuid4())
    try:
        with doc_lock:
            doc = fitz.open(path)
            pages_metadata = []
            
            for i, page in enumerate(doc):
                pages_metadata.append({
                    "index": i,
                    "page_num": i + 1,
                    "images_count": len(page.get_images()),
                    "text_len": len(page.get_text().strip()),
                    "is_blank": is_page_blank(page)
                })
            doc.close()

        active_pdfs[pdf_id] = {
            "path": path,
            "temp_file": None,  # no temp file to delete for loaded local files
            "filename": os.path.basename(path),
            "size": os.path.getsize(path)
        }

        return jsonify({
            "pdf_id": pdf_id,
            "filename": active_pdfs[pdf_id]["filename"],
            "size": active_pdfs[pdf_id]["size"],
            "pages": pages_metadata
        })
    except Exception as e:
        err_msg = TRANSLATIONS[lang]["pdf_load_err"].format(error=str(e))
        return jsonify({"error": err_msg}), 500

@app.route('/api/thumbnail/<pdf_id>/<int:page_num>')
def api_thumbnail(pdf_id, page_num):
    """Generates and returns a low-resolution thumbnail of a PDF page."""
    pdf_info = active_pdfs.get(pdf_id)
    if not pdf_info:
        return abort(404)
        
    try:
        with doc_lock:
            doc = fitz.open(pdf_info["path"])
            page = doc[page_num]
            # Render page to a pixmap (image)
            pix = page.get_pixmap(matrix=fitz.Matrix(0.25, 0.25))  # low resolution scale for performance
            img_data = pix.tobytes("png")
            doc.close()
            
        return send_file(
            fitz.io.BytesIO(img_data),
            mimetype='image/png'
        )
    except Exception:
        return abort(500)

@app.route('/api/preview-large/<pdf_id>/<int:page_num>')
def api_preview_large(pdf_id, page_num):
    """Generates and returns a high-resolution preview of a PDF page."""
    pdf_info = active_pdfs.get(pdf_id)
    if not pdf_info:
        return abort(404)
        
    try:
        with doc_lock:
            doc = fitz.open(pdf_info["path"])
            page = doc[page_num]
            # Render page at 1.5x zoom
            pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5))
            img_data = pix.tobytes("png")
            doc.close()
            
        return send_file(
            fitz.io.BytesIO(img_data),
            mimetype='image/png'
        )
    except Exception:
        return abort(500)

@app.route('/api/process', methods=['POST'])
def api_process():
    """Processes the PDF: removes pages, clears images from specified pages.

    Returns the new file size and download link.
    """
    lang = get_lang()
    data = request.json
    pdf_id = data.get('pdf_id')
    delete_pages = data.get('delete_pages', [])  # list of indices
    clear_image_pages = data.get('clear_image_pages', [])  # list of indices
    align_text = data.get('align_text', False)
    compress_images = data.get('compress_images', False)
    
    # Cast to int to make sure
    delete_pages = [int(i) for i in delete_pages]
    clear_image_pages = [int(i) for i in clear_image_pages]

    pdf_info = active_pdfs.get(pdf_id)
    if not pdf_info:
        return jsonify({"error": TRANSLATIONS[lang]["pdf_expired"]}), 404

    try:
        out_id = str(uuid.uuid4())
        out_filename = f"cleaned_{pdf_info['filename']}"
        out_path = os.path.join(TEMP_DIR, f"{out_id}_{out_filename}")

        with doc_lock:
            doc = fitz.open(pdf_info["path"])
            
            # 1. Clean images and restore text visibility
            if clear_image_pages:
                print(f"[PROCESS] Clearing images from {len(clear_image_pages)} pages...")
            for idx in clear_image_pages:
                clean_page_images(doc, idx)

            # 2. Re-create PDF containing only the pages we want to keep
            total_pages = len(doc)
            keep_indices = [i for i in range(total_pages) if i not in delete_pages]
            
            if not keep_indices:
                doc.close()
                return jsonify({"error": TRANSLATIONS[lang]["cannot_delete_all"]}), 400

            doc.select(keep_indices)
            
            # 3. Apply post-processing (alignment and compression) on kept pages
            print(f"[PROCESS] Running post-processing (align={align_text}, compress={compress_images}) on {len(keep_indices)} pages...")
            for i in range(len(keep_indices)):
                if (i + 1) % 10 == 0 or i == 0 or i == len(keep_indices) - 1:
                    print(f"[PROCESS] Progress: processing page {i + 1}/{len(keep_indices)}...")
                if align_text:
                    align_page_text(doc, i)
                if compress_images:
                    compress_page_images(doc, i)
            
            # Save optimized version
            print(f"[PROCESS] Saving optimized PDF to {out_path}...")
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
        err_msg = TRANSLATIONS[lang]["proc_error"].format(error=str(e))
        return jsonify({"error": err_msg}), 500

@app.route('/api/process-local', methods=['POST'])
def api_process_local():
    """Processes PDF and saves it directly to a local target path (Native mode)."""
    lang = get_lang()
    data = request.json
    pdf_id = data.get('pdf_id')
    save_path = data.get('save_path')
    delete_pages = data.get('delete_pages', [])
    clear_image_pages = data.get('clear_image_pages', [])
    align_text = data.get('align_text', False)
    compress_images = data.get('compress_images', False)

    delete_pages = [int(i) for i in delete_pages]
    clear_image_pages = [int(i) for i in clear_image_pages]

    pdf_info = active_pdfs.get(pdf_id)
    if not pdf_info:
        return jsonify({"error": TRANSLATIONS[lang]["pdf_expired_short"]}), 404
        
    if not save_path:
        return jsonify({"error": TRANSLATIONS[lang]["no_save_path"]}), 400

    try:
        with doc_lock:
            doc = fitz.open(pdf_info["path"])
            
            # Clean images and restore text visibility
            if clear_image_pages:
                print(f"[PROCESS-LOCAL] Clearing images from {len(clear_image_pages)} pages...")
            for idx in clear_image_pages:
                clean_page_images(doc, idx)

            # Select kept pages
            total_pages = len(doc)
            keep_indices = [i for i in range(total_pages) if i not in delete_pages]
            
            if not keep_indices:
                doc.close()
                return jsonify({"error": TRANSLATIONS[lang]["cannot_delete_all"]}), 400

            doc.select(keep_indices)
            
            # Apply post-processing (alignment and compression) on kept pages
            print(f"[PROCESS-LOCAL] Running post-processing (align={align_text}, compress={compress_images}) on {len(keep_indices)} pages...")
            for i in range(len(keep_indices)):
                if (i + 1) % 10 == 0 or i == 0 or i == len(keep_indices) - 1:
                    print(f"[PROCESS-LOCAL] Progress: processing page {i + 1}/{len(keep_indices)}...")
                if align_text:
                    align_page_text(doc, i)
                if compress_images:
                    compress_page_images(doc, i)
            
            # Save optimized directly to user's desired path
            print(f"[PROCESS-LOCAL] Saving optimized PDF directly to {save_path}...")
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
        err_msg = TRANSLATIONS[lang]["save_error"].format(error=str(e))
        return jsonify({"error": err_msg}), 500

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
        lang = get_lang()
        file_types = (TRANSLATIONS[lang]["dialog_pdf_files"], '*.pdf')
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
        lang = get_lang()
        file_types = (TRANSLATIONS[lang]["dialog_pdf_files"], '*.pdf')
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
    
    lang = get_lang()
    server_msg = TRANSLATIONS[lang]["server_started"].format(url=url)
    print(server_msg)

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
            fail_msg = TRANSLATIONS[lang]["gui_start_fail"].format(error=str(e))
            print(fail_msg)
            webbrowser.open(url)
            t.join()
