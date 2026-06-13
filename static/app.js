// Application State
let appState = {
    pdfId: null,
    filename: "",
    size: 0,
    pages: [],
    deletePages: new Set(),      // Set of 0-based page indices
    clearImagePages: new Set(),  // Set of 0-based page indices
    isNative: false
};

// Check if running in PyWebView Native Mode
if (typeof window.pywebview !== 'undefined') {
    appState.isNative = true;
    document.getElementById('connection-status').style.display = 'flex';
} else {
    // Wait for the ready event in case pywebview loads late
    window.addEventListener('pywebviewready', () => {
        appState.isNative = true;
        document.getElementById('connection-status').style.display = 'flex';
        // Adjust file button style or details if needed
    });
}

// DOM Elements
const uploadView = document.getElementById('upload-view');
const editorView = document.getElementById('editor-view');
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const btnSelectFile = document.getElementById('btn-select-file');
const btnBackUpload = document.getElementById('btn-back-upload');
const pagesGrid = document.getElementById('pages-grid');

// Toolbar Elements
const pdfFilename = document.getElementById('pdf-filename');
const pdfFilesize = document.getElementById('pdf-filesize');
const pdfTotalPages = document.getElementById('pdf-total-pages');
const btnAutoBlank = document.getElementById('btn-auto-blank');
const btnClearAllImages = document.getElementById('btn-clear-all-images');
const btnResetSelection = document.getElementById('btn-reset-selection');
const btnProcessPdf = document.getElementById('btn-process-pdf');

// Stats Elements
const statDeleteCount = document.getElementById('stat-delete-count');
const statCleanCount = document.getElementById('stat-clean-count');
const statKeepCount = document.getElementById('stat-keep-count');

// Overlays
const processingOverlay = document.getElementById('processing-overlay');
const progressStatus = document.getElementById('progress-status');
const progressBarFill = document.getElementById('progress-bar-fill');
const progressPercent = document.getElementById('progress-percent');

const successOverlay = document.getElementById('success-overlay');
const sizeBefore = document.getElementById('size-before');
const sizeAfter = document.getElementById('size-after');
const savingsPercent = document.getElementById('savings-percent');
const savingsBytes = document.getElementById('savings-bytes');
const btnSaveAs = document.getElementById('btn-save-as');
const btnDownloadLink = document.getElementById('btn-download-link');
const btnProcessAnother = document.getElementById('btn-process-another');

// Modal Elements
const previewModal = document.getElementById('preview-modal');
const modalImg = document.getElementById('modal-img');
const modalCaption = document.getElementById('modal-caption');
const btnCloseModal = document.getElementById('btn-close-modal');

// Utility: Format file size
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Show/Hide Views
function showView(view) {
    uploadView.classList.replace('active-view', 'inactive-view');
    editorView.classList.replace('active-view', 'inactive-view');
    view.classList.replace('inactive-view', 'active-view');
}

// Drag and drop handlers
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].name.toLowerCase().endsWith('.pdf')) {
        handleUpload(files[0]);
    } else {
        alert("Dozwolone są tylko pliki PDF!");
    }
});

// File picker handler
btnSelectFile.addEventListener('click', async () => {
    if (appState.isNative && window.pywebview && window.pywebview.api) {
        // Native Open File Dialog
        try {
            const filePath = await window.pywebview.api.open_file_dialog();
            if (filePath) {
                loadLocalFile(filePath);
            }
        } catch (err) {
            console.error("Native file dialog error, falling back", err);
            fileInput.click();
        }
    } else {
        fileInput.click();
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleUpload(e.target.files[0]);
    }
});

// Load file using standard upload (web mode)
async function handleUpload(file) {
    const formData = new FormData();
    formData.append('file', file);

    // Show processing modal as loading state
    progressStatus.textContent = "Wczytywanie i analiza pliku PDF...";
    progressBarFill.style.width = '50%';
    progressPercent.textContent = '50%';
    processingOverlay.classList.add('active');

    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        
        if (response.ok) {
            setupEditor(data);
        } else {
            alert(data.error || "Wystąpił błąd podczas przesyłania pliku.");
        }
    } catch (err) {
        console.error(err);
        alert("Wystąpił błąd połączenia z serwerem.");
    } finally {
        processingOverlay.classList.remove('active');
    }
}

// Load file using local path (native mode)
async function loadLocalFile(path) {
    progressStatus.textContent = "Wczytywanie pliku PDF...";
    progressBarFill.style.width = '50%';
    progressPercent.textContent = '50%';
    processingOverlay.classList.add('active');

    try {
        const response = await fetch('/api/load-local', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: path })
        });
        const data = await response.json();
        
        if (response.ok) {
            setupEditor(data);
        } else {
            alert(data.error || "Nie udało się wczytać pliku.");
        }
    } catch (err) {
        console.error(err);
        alert("Błąd połączenia.");
    } finally {
        processingOverlay.classList.remove('active');
    }
}

// Initialize Editor View with PDF data
function setupEditor(data) {
    appState.pdfId = data.pdf_id;
    appState.filename = data.filename;
    appState.size = data.size;
    appState.pages = data.pages;
    appState.deletePages.clear();
    appState.clearImagePages.clear();

    // Set header meta
    pdfFilename.textContent = appState.filename;
    pdfFilesize.textContent = formatBytes(appState.size);
    pdfTotalPages.textContent = `${appState.pages.length} ${getPagesDeclension(appState.pages.length)}`;

    renderGrid();
    updateStats();
    showView(editorView);
}

// Polish grammar declension for 'pages'
function getPagesDeclension(count) {
    if (count === 1) return 'strona';
    const lastDigit = count % 10;
    const lastTwo = count % 100;
    if (lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 10 || lastTwo >= 20)) {
        return 'strony';
    }
    return 'stron';
}

// Render Page Cards into Grid
function renderGrid() {
    pagesGrid.innerHTML = '';

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.onload = () => {
                    img.classList.add('loaded');
                    img.previousElementSibling.style.display = 'none'; // hide shimmer
                };
                observer.unobserve(img);
            }
        });
    }, { rootMargin: '200px 0px' });

    appState.pages.forEach((page) => {
        const card = document.createElement('div');
        card.className = 'page-card';
        card.dataset.index = page.index;

        if (page.is_blank) {
            card.classList.add('is-blank-page');
        }

        // Card layout HTML
        card.innerHTML = `
            <div class="thumbnail-wrapper">
                <div class="shimmer"></div>
                <img class="page-thumb" data-src="/api/thumbnail/${appState.pdfId}/${page.index}" alt="Strona ${page.page_num}">
                
                <div class="card-actions">
                    <button class="action-btn btn-delete" title="Oznacz do usunięcia" data-index="${page.index}">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                    </button>
                    <button class="action-btn btn-clean" title="Usuń wszystkie obrazy" data-index="${page.index}">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
                            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                            <path d="m9 12 2 2 4-4" />
                        </svg>
                    </button>
                    <button class="action-btn btn-zoom" title="Powiększ podgląd" data-index="${page.index}">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                    </button>
                </div>
            </div>
            <div class="card-info">
                <span class="page-number">${page.page_num}</span>
                <div class="page-stats">
                    <span class="stat-icon-indicator ${page.images_count > 0 ? 'has-items' : ''}" title="Obrazy: ${page.images_count}">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon" style="width:12px;height:12px;">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                        </svg>
                        <span>${page.images_count}</span>
                    </span>
                    <span class="stat-icon-indicator ${page.text_len > 0 ? 'has-items' : ''}" title="Znaków tekstu: ${page.text_len}">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon" style="width:12px;height:12px;">
                            <path d="M4 7V4h16v3M9 20h6M12 4v16" />
                        </svg>
                        <span>${page.text_len}</span>
                    </span>
                </div>
            </div>
        `;

        // Event listeners for actions
        const deleteBtn = card.querySelector('.btn-delete');
        const cleanBtn = card.querySelector('.btn-clean');
        const zoomBtn = card.querySelector('.btn-zoom');

        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDelete(page.index, card);
        });

        cleanBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleClean(page.index, card);
        });

        zoomBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openZoomModal(page.index, page.page_num);
        });

        pagesGrid.appendChild(card);
        observer.observe(card.querySelector('.page-thumb'));
    });
}

// Toggle states
function toggleDelete(idx, card) {
    if (appState.deletePages.has(idx)) {
        appState.deletePages.delete(idx);
        card.classList.remove('to-delete');
    } else {
        appState.deletePages.add(idx);
        card.classList.add('to-delete');
        // If it's deleted, we can remove the clean option to avoid confusion
        appState.clearImagePages.delete(idx);
        card.classList.remove('to-clean');
    }
    updateStats();
}

function toggleClean(idx, card) {
    if (appState.deletePages.has(idx)) {
        // Can't clean images if marked for deletion
        return;
    }
    if (appState.clearImagePages.has(idx)) {
        appState.clearImagePages.delete(idx);
        card.classList.remove('to-clean');
    } else {
        appState.clearImagePages.add(idx);
        card.classList.add('to-clean');
    }
    updateStats();
}

// Update stats count bar
function updateStats() {
    const deleteCount = appState.deletePages.size;
    const cleanCount = appState.clearImagePages.size;
    const keepCount = appState.pages.length - deleteCount;

    statDeleteCount.textContent = `${deleteCount} ${getPagesDeclension(deleteCount)}`;
    statCleanCount.textContent = `${cleanCount} ${getPagesDeclension(cleanCount)}`;
    statKeepCount.textContent = `${keepCount} ${getPagesDeclension(keepCount)}`;

    // Disable process button if keeping 0 pages
    btnProcessPdf.disabled = (keepCount === 0);
}

// Batch Actions
btnAutoBlank.addEventListener('click', () => {
    appState.pages.forEach(page => {
        if (page.is_blank) {
            appState.deletePages.add(page.index);
            appState.clearImagePages.delete(page.index); // remove clean if deleted
            const card = document.querySelector(`.page-card[data-index="${page.index}"]`);
            if (card) {
                card.classList.add('to-delete');
                card.classList.remove('to-clean');
            }
        }
    });
    updateStats();
});

btnClearAllImages.addEventListener('click', () => {
    appState.pages.forEach(page => {
        // Only mark if has images and is NOT marked for deletion
        if (page.images_count > 0 && !appState.deletePages.has(page.index)) {
            appState.clearImagePages.add(page.index);
            const card = document.querySelector(`.page-card[data-index="${page.index}"]`);
            if (card) {
                card.classList.add('to-clean');
            }
        }
    });
    updateStats();
});

btnResetSelection.addEventListener('click', () => {
    appState.deletePages.clear();
    appState.clearImagePages.clear();
    document.querySelectorAll('.page-card').forEach(card => {
        card.classList.remove('to-delete');
        card.classList.remove('to-clean');
    });
    updateStats();
});

btnBackUpload.addEventListener('click', () => {
    if (confirm("Czy na pewno chcesz opuścić edytor? Wszystkie niezapisane zmiany zostaną utracone.")) {
        showView(uploadView);
        appState.pdfId = null;
        appState.pages = [];
        appState.deletePages.clear();
        appState.clearImagePages.clear();
    }
});

// Progress Bar Simulation
let progressInterval;
function startProgressSimulation() {
    progressBarFill.style.width = '0%';
    progressPercent.textContent = '0%';
    let val = 0;
    progressInterval = setInterval(() => {
        if (val < 90) {
            val += Math.random() * 5 + 1;
            if (val > 90) val = 90;
            progressBarFill.style.width = `${Math.round(val)}%`;
            progressPercent.textContent = `${Math.round(val)}%`;
        }
    }, 150);
}

function finishProgressSimulation() {
    clearInterval(progressInterval);
    progressBarFill.style.width = '100%';
    progressPercent.textContent = '100%';
}

// Processing Execution
btnProcessPdf.addEventListener('click', async () => {
    const deleteList = Array.from(appState.deletePages);
    const cleanList = Array.from(appState.clearImagePages);

    progressStatus.textContent = "Trwa optymalizacja stron i usuwanie zbędnych obrazów...";
    startProgressSimulation();
    processingOverlay.classList.add('active');

    if (appState.isNative && window.pywebview && window.pywebview.api) {
        // Native Save Path Dialog Flow
        try {
            const defaultSaveName = `cleaned_${appState.filename}`;
            const savePath = await window.pywebview.api.save_file_dialog(defaultSaveName);
            
            if (!savePath) {
                // Cancelled
                processingOverlay.classList.remove('active');
                clearInterval(progressInterval);
                return;
            }

            const response = await fetch('/api/process-local', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pdf_id: appState.pdfId,
                    save_path: savePath,
                    delete_pages: deleteList,
                    clear_image_pages: cleanList
                })
            });
            const result = await response.json();

            if (response.ok && result.success) {
                finishProgressSimulation();
                setTimeout(() => {
                    showSuccessScreen(result, true);
                }, 400);
            } else {
                alert(result.error || "Wystąpił błąd optymalizacji PDF.");
                processingOverlay.classList.remove('active');
                clearInterval(progressInterval);
            }
        } catch (err) {
            console.error(err);
            alert("Błąd podczas zapisywania pliku.");
            processingOverlay.classList.remove('active');
            clearInterval(progressInterval);
        }
    } else {
        // Standard Web Mode Flow
        try {
            const response = await fetch('/api/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pdf_id: appState.pdfId,
                    delete_pages: deleteList,
                    clear_image_pages: cleanList
                })
            });
            const result = await response.json();

            if (response.ok && result.success) {
                finishProgressSimulation();
                setTimeout(() => {
                    showSuccessScreen(result, false);
                }, 400);
            } else {
                alert(result.error || "Wystąpił błąd optymalizacji PDF.");
                processingOverlay.classList.remove('active');
                clearInterval(progressInterval);
            }
        } catch (err) {
            console.error(err);
            alert("Błąd połączenia podczas optymalizacji.");
            processingOverlay.classList.remove('active');
            clearInterval(progressInterval);
        }
    }
});

// Success screen layout
function showSuccessScreen(result, isLocal) {
    processingOverlay.classList.remove('active');

    sizeBefore.textContent = formatBytes(result.orig_size);
    sizeAfter.textContent = formatBytes(result.new_size);
    savingsPercent.textContent = `${result.saved_percent}%`;
    savingsBytes.textContent = formatBytes(result.saved_size);

    if (isLocal) {
        btnSaveAs.style.display = 'inline-flex';
        btnDownloadLink.style.display = 'none';
        
        // In local mode, save is already completed
        btnSaveAs.onclick = () => {
            alert(`Plik został zapisany bezpośrednio w: ${result.save_path}`);
        };
    } else {
        btnSaveAs.style.display = 'none';
        btnDownloadLink.style.display = 'inline-flex';
        btnDownloadLink.href = `/api/download/${result.download_id}`;
    }

    successOverlay.classList.add('active');
}

btnProcessAnother.addEventListener('click', () => {
    successOverlay.classList.remove('active');
    showView(uploadView);
    appState.pdfId = null;
    appState.pages = [];
    appState.deletePages.clear();
    appState.clearImagePages.clear();
});

// Zoom Modal Flow
function openZoomModal(index, pageNum) {
    modalImg.src = '';
    modalCaption.textContent = `Wczytywanie strony ${pageNum}...`;
    previewModal.classList.add('active');
    
    // Set large preview source
    modalImg.src = `/api/preview-large/${appState.pdfId}/${index}`;
    modalImg.onload = () => {
        modalCaption.textContent = `Strona ${pageNum}`;
    };
}

btnCloseModal.addEventListener('click', () => {
    previewModal.classList.remove('active');
});

// Close modal when clicking background
previewModal.addEventListener('click', (e) => {
    if (e.target === previewModal) {
        previewModal.classList.remove('active');
    }
});
