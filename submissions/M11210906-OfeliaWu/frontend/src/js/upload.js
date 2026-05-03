export default class UploadManager {
    constructor(onFilesChanged) {
        this.files = [];
        this.onFilesChanged = onFilesChanged; // Callback when files list changes
        
        this.dropzone = document.getElementById('dropzone');
        this.fileInput = document.getElementById('file-input');
        this.fileListEl = document.getElementById('file-list');
        
        this.initEventListeners();
    }

    initEventListeners() {
        // Click to upload
        this.dropzone.addEventListener('click', () => {
            this.fileInput.click();
        });

        this.fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
            this.fileInput.value = ''; // Reset
        });

        // Drag and drop
        this.dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.dropzone.classList.add('drag-active');
        });

        this.dropzone.addEventListener('dragleave', () => {
            this.dropzone.classList.remove('drag-active');
        });

        this.dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.dropzone.classList.remove('drag-active');
            this.handleFiles(e.dataTransfer.files);
        });
    }

    handleFiles(newFiles) {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'text/plain', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'];
        
        Array.from(newFiles).forEach(file => {
            // Check if file is already added (by name and size)
            const exists = this.files.some(f => f.name === file.name && f.size === file.size);
            if (!exists) {
                // For MVP, we'll accept all types for demonstration, but typically we'd validate here
                this.files.push(file);
            }
        });

        this.renderFileList();
        this.onFilesChanged(this.files);
    }

    removeFile(index) {
        this.files.splice(index, 1);
        this.renderFileList();
        this.onFilesChanged(this.files);
    }

    renderFileList() {
        this.fileListEl.innerHTML = '';
        
        this.files.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'file-item';
            
            // Determine icon/preview
            let previewHTML = '';
            if (file.type.startsWith('image/')) {
                const url = URL.createObjectURL(file);
                previewHTML = `<img src="${url}" class="file-preview" alt="preview">`;
                // Clean up object URL later if needed
            } else if (file.type.startsWith('video/')) {
                previewHTML = `<div class="file-preview"><i data-lucide="video"></i></div>`;
            } else if (file.type === 'application/pdf') {
                previewHTML = `<div class="file-preview"><i data-lucide="file-text"></i></div>`;
            } else {
                previewHTML = `<div class="file-preview"><i data-lucide="file"></i></div>`;
            }

            const sizeStr = (file.size / 1024 / 1024).toFixed(2) + ' MB';

            item.innerHTML = `
                ${previewHTML}
                <div class="file-info">
                    <div class="file-name" title="${file.name}">${file.name}</div>
                    <div class="file-size">${sizeStr}</div>
                </div>
                <button class="btn-icon file-remove" title="移除" data-index="${index}">
                    <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                </button>
            `;
            
            this.fileListEl.appendChild(item);
        });

        // Re-init lucide icons for newly added elements
        lucide.createIcons();

        // Attach remove events
        const removeBtns = this.fileListEl.querySelectorAll('.file-remove');
        removeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering dropzone click if inside
                const idx = parseInt(btn.getAttribute('data-index'));
                this.removeFile(idx);
            });
        });
    }

    getFiles() {
        return this.files;
    }
}
