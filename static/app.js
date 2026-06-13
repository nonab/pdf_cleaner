// i18n Translation Dictionary
// To add a new language, simply append its translations here (e.g. 'de: { ... }')
const i18n = {
    en: {
        desktop_mode: "Desktop Mode (Fast)",
        drag_drop_title: "Drag & drop PDF file here",
        drag_drop_subtitle: "or browse files on your computer",
        choose_pdf_btn: "Choose PDF File",
        size_limit_info: "No size limit. Processing is 100% local.",
        choose_another_title: "Choose another file",
        mark_blank_title: "Automatically mark blank pages for deletion",
        mark_blank_btn: "Mark blank pages",
        clear_images_all_title: "Clear images from all pages",
        clear_images_all_btn: "Clear images (all)",
        reset_changes_btn: "Reset changes",
        optimize_save_btn: "Optimize & Save PDF",
        to_delete_label: "To delete:",
        to_clean_label: "To clear images:",
        will_keep_label: "Will keep:",
        optimizing_title: "Optimizing PDF file...",
        optimizing_subtitle: "Processing pages and removing unnecessary images...",
        success_title: "PDF Optimized Successfully!",
        success_subtitle: "Unnecessary pages and background images have been removed.",
        orig_size_label: "Original size",
        new_size_label: "New size",
        saved_alert: "Saved <strong>{percent}%</strong> of the file (<strong>{size}</strong>)",
        save_pdf_btn: "Save PDF File",
        download_pdf_btn: "Download PDF File",
        process_another_btn: "Process another file",
        
        // Settings Checkboxes
        align_text_title: "Straighten wobbly pages and align text lines",
        align_text_label: "Align & straighten text",
        compress_images_title: "Compress remaining background images to reduce file size",
        compress_images_label: "Compress images",
        
        // Alerts & Prompts
        only_pdf_allowed: "Only PDF files are allowed!",
        loading_analyzing: "Loading and analyzing PDF file...",
        upload_error: "An error occurred during file upload.",
        connection_error: "An error occurred connecting to the server.",
        loading_file: "Loading PDF file...",
        load_error: "Could not load the file.",
        leave_editor_confirm: "Are you sure you want to leave the editor? All unsaved changes will be lost.",
        optimization_error: "An error occurred during PDF optimization.",
        saving_error: "Error while saving the file.",
        file_saved_at: "File has been saved directly to: {path}",
        
        // Dynamic Card / Modal text
        loading_page_num: "Loading page {num}...",
        page_num: "Page {num}",
        mark_for_deletion_title: "Mark for deletion",
        remove_all_images_title: "Remove all images from this page",
        zoom_preview_title: "Zoom preview",
        images_count_title: "Images: {count}",
        chars_count_title: "Characters of text: {count}"
    },
    pl: {
        desktop_mode: "Tryb Desktop (Szybki)",
        drag_drop_title: "Przeciągnij i upuść plik PDF",
        drag_drop_subtitle: "lub wybierz go z dysku swojego komputera",
        choose_pdf_btn: "Wybierz plik PDF",
        size_limit_info: "Maksymalny rozmiar: brak limitu. Przetwarzanie odbywa się w 100% lokalnie.",
        choose_another_title: "Wybierz inny plik",
        mark_blank_title: "Automatycznie zaznacz puste strony do usunięcia",
        mark_blank_btn: "Oznacz puste strony",
        clear_images_all_title: "Wyczyść obrazy ze wszystkich stron",
        clear_images_all_btn: "Oczyszczenie obrazów (wszystkie)",
        reset_changes_btn: "Resetuj zmiany",
        optimize_save_btn: "Optymalizuj i zapisz PDF",
        to_delete_label: "Do usunięcia:",
        to_clean_label: "Do oczyszczenia z obrazów:",
        will_keep_label: "Pozostanie:",
        optimizing_title: "Trwa optymalizacja pliku PDF",
        optimizing_subtitle: "Przetwarzanie stron i usuwanie zbędnych obrazów...",
        success_title: "Plik zoptymalizowany pomyślnie!",
        success_subtitle: "Pomyślnie usunięto zbędne strony i obrazy tła.",
        orig_size_label: "Rozmiar początkowy",
        new_size_label: "Nowy rozmiar",
        saved_alert: "Zaoszczędzono <strong>{percent}%</strong> pliku (<strong>{size}</strong>)",
        save_pdf_btn: "Zapisz plik PDF",
        download_pdf_btn: "Pobierz plik PDF",
        process_another_btn: "Przetwórz kolejny plik",
        
        // Settings Checkboxes
        align_text_title: "Wyprostuj krzywe strony i wyrównaj linie tekstu",
        align_text_label: "Wyrównaj i wyprostuj tekst",
        compress_images_title: "Kompresuj pozostałe obrazy tła, aby zmniejszyć wagę pliku",
        compress_images_label: "Kompresuj obrazy",
        
        // Alerts & Prompts
        only_pdf_allowed: "Dozwolone są tylko pliki PDF!",
        loading_analyzing: "Wczytywanie i analiza pliku PDF...",
        upload_error: "Wystąpił błąd podczas przesyłania pliku.",
        connection_error: "Wystąpił błąd połączenia z serwerem.",
        loading_file: "Wczytywanie pliku PDF...",
        load_error: "Nie udało się wczytać pliku.",
        leave_editor_confirm: "Czy na pewno chcesz opuścić edytor? Wszystkie niezapisane zmiany zostaną utracone.",
        optimization_error: "Wystąpił błąd optymalizacji PDF.",
        saving_error: "Błąd podczas zapisywania pliku.",
        file_saved_at: "Plik został zapisany bezpośrednio w: {path}",
        
        // Dynamic Card / Modal text
        loading_page_num: "Wczytywanie strony {num}...",
        page_num: "Strona {num}",
        mark_for_deletion_title: "Oznacz do usunięcia",
        remove_all_images_title: "Usuń wszystkie obrazy z tej strony",
        zoom_preview_title: "Powiększ podgląd",
        images_count_title: "Obrazy: {count}",
        chars_count_title: "Znaków tekstu: {count}"
    }
};

// Detect Language
const currentLang = (navigator.language || navigator.userLanguage || 'en').startsWith('pl') ? 'pl' : 'en';

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
    });
}

// Apply Frontend Translations on load
function applyTranslations() {
    const langData = i18n[currentLang];
    
    // Translate text contents
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (langData[key]) {
            el.textContent = langData[key];
        }
    });

    // Translate attributes
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.dataset.i18nTitle;
        if (langData[key]) {
            el.title = langData[key];
        }
    });
}
document.addEventListener('DOMContentLoaded', applyTranslations);

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
        alert(i18n[currentLang].only_pdf_allowed);
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
    progressStatus.textContent = i18n[currentLang].loading_analyzing;
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
            alert(data.error || i18n[currentLang].upload_error);
        }
    } catch (err) {
        console.error(err);
        alert(i18n[currentLang].connection_error);
    } finally {
        processingOverlay.classList.remove('active');
    }
}

// Load file using local path (native mode)
async function loadLocalFile(path) {
    progressStatus.textContent = i18n[currentLang].loading_file;
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
            alert(data.error || i18n[currentLang].load_error);
        }
    } catch (err) {
        console.error(err);
        alert(i18n[currentLang].connection_error);
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
    pdfTotalPages.textContent = `${appState.pages.length} ${getPagesLabel(appState.pages.length, currentLang)}`;

    // Restore saved state from localStorage if it exists for this file
    const savedStateStr = localStorage.getItem(`pdf_state_${appState.filename}`);
    if (savedStateStr) {
        try {
            const savedState = JSON.parse(savedStateStr);
            if (savedState.deletePages) {
                savedState.deletePages.forEach(idx => appState.deletePages.add(idx));
            }
            if (savedState.clearImagePages) {
                savedState.clearImagePages.forEach(idx => appState.clearImagePages.add(idx));
            }
            if (savedState.alignText !== undefined) {
                document.getElementById('chk-align-text').checked = savedState.alignText;
            }
            if (savedState.compressImages !== undefined) {
                document.getElementById('chk-compress-images').checked = savedState.compressImages;
            }
        } catch (e) {
            console.error("Failed to restore editor state:", e);
        }
    }

    renderGrid();
    updateStats();
    showView(editorView);
}

function saveEditorState() {
    if (!appState.filename) return;
    const state = {
        deletePages: Array.from(appState.deletePages),
        clearImagePages: Array.from(appState.clearImagePages),
        alignText: document.getElementById('chk-align-text').checked,
        compressImages: document.getElementById('chk-compress-images').checked
    };
    localStorage.setItem(`pdf_state_${appState.filename}`, JSON.stringify(state));
}

// Simple label helper for singular/plural/Polish declensions
function getPagesLabel(count, lang) {
    if (lang === 'pl') {
        if (count === 1) return 'strona';
        const lastDigit = count % 10;
        const lastTwo = count % 100;
        if (lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 10 || lastTwo >= 20)) {
            return 'strony';
        }
        return 'stron';
    }
    // Default English
    return count === 1 ? 'page' : 'pages';
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
        if (appState.deletePages.has(page.index)) {
            card.classList.add('to-delete');
        }
        if (appState.clearImagePages.has(page.index)) {
            card.classList.add('to-clean');
        }

        const deleteTitle = i18n[currentLang].mark_for_deletion_title;
        const cleanTitle = i18n[currentLang].remove_all_images_title;
        const zoomTitle = i18n[currentLang].zoom_preview_title;
        const imagesTitle = i18n[currentLang].images_count_title.replace('{count}', page.images_count);
        const charsTitle = i18n[currentLang].chars_count_title.replace('{count}', page.text_len);

        // Card layout HTML
        card.innerHTML = `
            <div class="thumbnail-wrapper">
                <div class="shimmer"></div>
                <img class="page-thumb" data-src="/api/thumbnail/${appState.pdfId}/${page.index}" alt="Page ${page.page_num}">
                
                <div class="card-actions">
                    <button class="action-btn btn-delete" title="${deleteTitle}" data-index="${page.index}">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                    </button>
                    <button class="action-btn btn-clean" title="${cleanTitle}" data-index="${page.index}">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
                            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                            <path d="m9 12 2 2 4-4" />
                        </svg>
                    </button>
                    <button class="action-btn btn-zoom" title="${zoomTitle}" data-index="${page.index}">
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
                    <span class="stat-icon-indicator ${page.images_count > 0 ? 'has-items' : ''}" title="${imagesTitle}">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon" style="width:12px;height:12px;">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                        </svg>
                        <span>${page.images_count}</span>
                    </span>
                    <span class="stat-icon-indicator ${page.text_len > 0 ? 'has-items' : ''}" title="${charsTitle}">
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
    saveEditorState();
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
    saveEditorState();
}

// Update stats count bar
function updateStats() {
    const deleteCount = appState.deletePages.size;
    const cleanCount = appState.clearImagePages.size;
    const keepCount = appState.pages.length - deleteCount;

    statDeleteCount.textContent = `${deleteCount} ${getPagesLabel(deleteCount, currentLang)}`;
    statCleanCount.textContent = `${cleanCount} ${getPagesLabel(cleanCount, currentLang)}`;
    statKeepCount.textContent = `${keepCount} ${getPagesLabel(keepCount, currentLang)}`;

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
    saveEditorState();
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
    saveEditorState();
});

btnResetSelection.addEventListener('click', () => {
    appState.deletePages.clear();
    appState.clearImagePages.clear();
    document.querySelectorAll('.page-card').forEach(card => {
        card.classList.remove('to-delete');
        card.classList.remove('to-clean');
    });
    updateStats();
    saveEditorState();
});

btnBackUpload.addEventListener('click', () => {
    if (confirm(i18n[currentLang].leave_editor_confirm)) {
        showView(uploadView);
        appState.pdfId = null;
        appState.pages = [];
        appState.deletePages.clear();
        appState.clearImagePages.clear();
    }
});

// Progress Bar Simulation
let progressInterval;
let logInterval;

function startLogPolling() {
    const logConsole = document.getElementById('log-console');
    logConsole.innerHTML = '<div class="system-log">Initializing process...</div>';
    
    logInterval = setInterval(async () => {
        try {
            const response = await fetch('/api/logs');
            if (response.ok) {
                const data = await response.json();
                const logs = data.logs || [];
                
                logConsole.innerHTML = '';
                let currentProgressPercent = 0;
                
                logs.forEach(line => {
                    const div = document.createElement('div');
                    div.textContent = line;
                    
                    if (line.includes('[ALIGN]')) {
                        div.className = 'align-log';
                    } else if (line.includes('[COMPRESS]')) {
                        div.className = 'compress-log';
                    } else if (line.includes('Saving optimized')) {
                        div.className = 'save-log';
                    } else {
                        div.className = 'system-log';
                    }
                    logConsole.appendChild(div);
                    
                    const progressMatch = line.match(/processing page (\d+)\/(\d+)/);
                    if (progressMatch) {
                        const current = parseInt(progressMatch[1], 10);
                        const total = parseInt(progressMatch[2], 10);
                        if (total > 0) {
                            currentProgressPercent = Math.round((current / total) * 90);
                        }
                    }
                    
                    if (line.includes('Saving optimized')) {
                        currentProgressPercent = 95;
                    }
                });
                
                if (currentProgressPercent > 0) {
                    progressBarFill.style.width = `${currentProgressPercent}%`;
                    progressPercent.textContent = `${currentProgressPercent}%`;
                }
                
                logConsole.scrollTop = logConsole.scrollHeight;
            }
        } catch (err) {
            console.error("Failed to fetch logs:", err);
        }
    }, 350);
}

function stopLogPolling() {
    clearInterval(logInterval);
}

function startProgressSimulation() {
    progressBarFill.style.width = '0%';
    progressPercent.textContent = '0%';
    let val = 0;
    progressInterval = setInterval(() => {
        const percentText = progressPercent.textContent;
        const currentVal = parseInt(percentText, 10) || 0;
        if (currentVal < 90) {
            val = Math.max(val, currentVal);
            val += Math.random() * 4 + 1;
            if (val > 90) val = 90;
            progressBarFill.style.width = `${Math.round(val)}%`;
            progressPercent.textContent = `${Math.round(val)}%`;
        }
    }, 200);
    startLogPolling();
}

function finishProgressSimulation() {
    clearInterval(progressInterval);
    stopLogPolling();
    progressBarFill.style.width = '100%';
    progressPercent.textContent = '100%';
}

// Processing Execution
btnProcessPdf.addEventListener('click', async () => {
    const deleteList = Array.from(appState.deletePages);
    const cleanList = Array.from(appState.clearImagePages);
    const alignText = document.getElementById('chk-align-text').checked;
    const compressImages = document.getElementById('chk-compress-images').checked;

    progressStatus.textContent = i18n[currentLang].optimizing_subtitle;
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
                stopLogPolling();
                return;
            }

            const response = await fetch('/api/process-local', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pdf_id: appState.pdfId,
                    save_path: savePath,
                    delete_pages: deleteList,
                    clear_image_pages: cleanList,
                    align_text: alignText,
                    compress_images: compressImages
                })
            });
            const result = await response.json();

            if (response.ok && result.success) {
                finishProgressSimulation();
                setTimeout(() => {
                    showSuccessScreen(result, true);
                }, 400);
            } else {
                alert(result.error || i18n[currentLang].optimization_error);
                processingOverlay.classList.remove('active');
                clearInterval(progressInterval);
                stopLogPolling();
            }
        } catch (err) {
            console.error(err);
            alert(i18n[currentLang].saving_error);
            processingOverlay.classList.remove('active');
            clearInterval(progressInterval);
            stopLogPolling();
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
                    clear_image_pages: cleanList,
                    align_text: alignText,
                    compress_images: compressImages
                })
            });
            const result = await response.json();

            if (response.ok && result.success) {
                finishProgressSimulation();
                setTimeout(() => {
                    showSuccessScreen(result, false);
                }, 400);
            } else {
                alert(result.error || i18n[currentLang].optimization_error);
                processingOverlay.classList.remove('active');
                clearInterval(progressInterval);
                stopLogPolling();
            }
        } catch (err) {
            console.error(err);
            alert(i18n[currentLang].connection_error);
            processingOverlay.classList.remove('active');
            clearInterval(progressInterval);
            stopLogPolling();
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

    const savingsText = i18n[currentLang].saved_alert
        .replace('{percent}', result.saved_percent)
        .replace('{size}', formatBytes(result.saved_size));
    document.getElementById('savings-badge-text').innerHTML = savingsText;

    if (isLocal) {
        btnSaveAs.style.display = 'inline-flex';
        btnDownloadLink.style.display = 'none';
        
        // In local mode, save is already completed
        btnSaveAs.onclick = () => {
            const savedAtMsg = i18n[currentLang].file_saved_at.replace('{path}', result.save_path);
            alert(savedAtMsg);
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
    modalCaption.textContent = i18n[currentLang].loading_page_num.replace('{num}', pageNum);
    previewModal.classList.add('active');
    
    // Set large preview source
    modalImg.src = `/api/preview-large/${appState.pdfId}/${index}`;
    modalImg.onload = () => {
        modalCaption.textContent = i18n[currentLang].page_num.replace('{num}', pageNum);
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

// Checkbox change persistence
document.getElementById('chk-align-text').addEventListener('change', saveEditorState);
document.getElementById('chk-compress-images').addEventListener('change', saveEditorState);
