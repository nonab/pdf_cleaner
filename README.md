# PDF Page & Image Cleaner

A local desktop and web utility designed for optimizing scanned books and PDF files. It allows you to select pages to delete and pages to clear of images (e.g., heavy scanning backgrounds or unwanted decorations), significantly reducing the output file size while keeping the text visible. Works completely locally on **Windows** and **Linux**.

---

## 🛠️ Architecture & Features

The application combines a fast backend engine with a modern web interface:

1. **PDF Engine (Python + PyMuPDF)**: Uses PyMuPDF (a high-performance C-based PDF library) to render page thumbnails and strip images. Deleted images are replaced with a tiny 1x1 transparent pixel, removing all image payload data while preserving the layout.
2. **Invisible OCR Text Recovery**: When images are removed from a scanned page, the text is kept. For OCR-processed PDFs where the text layer is hidden under the scan (using invisible rendering mode `3 Tr`), the engine automatically converts it to visible text mode (`0 Tr`), displaying black text on a clean white background.
3. **Running Modes**:
   - **Desktop Mode (Default)**: Uses the `pywebview` library to display a native window. This mode communicates directly with the local filesystem, opening native file open/save dialogs without uploading files.
   - **Web Mode (Fallback)**: If GUI dependencies are missing (e.g., headless Linux), it starts a local Flask server and opens the interface in your default web browser.

### Key Features:
- **Drag & Drop**: Drop PDF files directly into the window.
- **Grid Page Preview**: View page cards with lazy-loaded thumbnails (thumbnails load only when scrolled into view, optimizing memory).
- **Mark for Deletion**: Outlines pages to delete with a red border.
- **Mark for Image Cleaning**: Outlines pages to clear of images with a yellow border.
- **Auto-Detect Blank Pages**: Scans for pages with no text or vector drawings, automatically pre-marking them for deletion.
- **Detail Zoom**: Double-click or click the zoom icon to view a high-resolution render of the page.
- **Optimization Summary**: Shows a comparison of original vs. compressed file size and percentage saved.

---

## 📥 Installation & Requirements

The application requires Python 3.8 or newer.

### Windows
You can simply double-click **`0_install.bat`** to automatically set up the Python dependencies.

Alternatively, run manually:
```bash
pip install -r requirements.txt
```

### Linux (Ubuntu/Debian)
Install python dependencies:
```bash
pip install -r requirements.txt
```

The GUI window library (`pywebview`) requires system WebKit renderer libraries. Install them using:
```bash
sudo apt-get install python3-gi python3-gi-cairo gir1.2-gtk-3.0 gir1.2-webkit2-4.0
```
*Note: If you do not want to install these system packages, you can still run the application in Web Mode (directly in the browser) without them.*

---

## 🏃 Running the Application

### Windows
Double-click **`1_start.bat`** to launch the native desktop application.

### Manual Launch (Windows & Linux)

#### 1. Desktop Mode (Native standalone window)
```bash
python app.py
```

#### 2. Web Mode (Runs local server, opens in default browser)
```bash
python app.py --web
```
