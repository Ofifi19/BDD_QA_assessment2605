import BddGenerator from './bdd.js';
import UploadManager from './upload.js';
import HistoryManager from './history.js';

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const generateBtn = document.getElementById('generate-btn');
    const resultPlaceholder = document.getElementById('result-placeholder');
    const loadingState = document.getElementById('loading-state');
    const bddOutput = document.getElementById('bdd-output');
    const newBddBtn = document.getElementById('new-bdd-btn');
    const downloadBtn = document.getElementById('download-btn');
    const langSelector = document.getElementById('lang-selector');
    
    // History Selection Elements
    const selectAllCheckbox = document.getElementById('select-all-history');
    const deleteSelectedBtn = document.getElementById('delete-selected-history-btn');
    
    // History Modal Elements
    const modal = document.getElementById('history-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content-body');

    // ========== Resizable Layout ==========
    const initResizer = (resizerId, sectionId, direction = 'left') => {
        const resizer = document.getElementById(resizerId);
        const section = document.getElementById(sectionId);
        if (!resizer || !section) return;

        let startX, startWidth;

        const onMouseDown = (e) => {
            startX = e.clientX;
            startWidth = section.offsetWidth;
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            resizer.classList.add('dragging');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        };

        const onMouseMove = (e) => {
            let newWidth;
            if (direction === 'left') {
                newWidth = startWidth + (e.clientX - startX);
            } else {
                newWidth = startWidth - (e.clientX - startX);
            }
            newWidth = Math.max(200, Math.min(800, newWidth));
            section.style.width = `${newWidth}px`;
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            resizer.classList.remove('dragging');
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
        };

        resizer.addEventListener('mousedown', onMouseDown);
    };

    initResizer('resizer-left', 'upload-zone', 'left');
    initResizer('resizer-right', 'history-zone', 'right');

    // Custom Confirm Modal Elements
    const confirmModal = document.getElementById('confirm-modal');
    const confirmTitle = document.getElementById('confirm-title');
    const confirmMessage = document.getElementById('confirm-message');
    const confirmOkBtn = document.getElementById('confirm-ok-btn');
    const confirmCancelBtn = document.getElementById('confirm-cancel-btn');

    // Initialize Managers
    const bddGen = new BddGenerator();

    // ========== Custom Confirm Dialog ==========
    function showConfirm(title, message) {
        return new Promise((resolve) => {
            confirmTitle.textContent = title;
            confirmMessage.textContent = message;
            confirmModal.classList.add('active');

            function cleanup() {
                confirmModal.classList.remove('active');
                confirmOkBtn.removeEventListener('click', onOk);
                confirmCancelBtn.removeEventListener('click', onCancel);
            }

            function onOk() { cleanup(); resolve(true); }
            function onCancel() { cleanup(); resolve(false); }

            confirmOkBtn.addEventListener('click', onOk);
            confirmCancelBtn.addEventListener('click', onCancel);
        });
    }

    // Make it globally accessible for upload.js and history.js
    window.showConfirm = showConfirm;

    // ========== Toast Utility ==========
    const toastContainer = document.getElementById('toast-container');
    function showToast(message, icon = 'info') {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<i data-lucide="${icon}" style="width: 18px; height: 18px; color: var(--primary-color);"></i> <span>${message}</span>`;
        toastContainer.appendChild(toast);
        lucide.createIcons();

        setTimeout(() => {
            toast.classList.add('fade-out');
            toast.addEventListener('animationend', () => {
                toast.remove();
            });
        }, 1000);
    }
    
    // Make it globally accessible
    window.showToast = showToast;
    
    // ========== History Manager ==========
    let currentlyViewingItem = null;
    const historyMgr = new HistoryManager((item) => {
        currentlyViewingItem = item;
        modalTitle.textContent = `版本預覽 (#${item.id}) · ${item.created_at ? new Date(item.created_at).toLocaleString('zh-TW') : ''}`;
        modalContent.innerHTML = bddGen.highlightGherkin(item.bdd_full || '');
        
        // Quality Report Logic for Modal
        const auditSection = document.getElementById('modal-audit-section');
        const auditTrigger = document.getElementById('modal-audit-trigger');
        const auditReport = document.getElementById('modal-audit-report');
        
        auditSection.style.display = 'block';
        if (item.audit_report) {
            auditTrigger.style.display = 'none';
            try {
                const report = typeof item.audit_report === 'string' ? JSON.parse(item.audit_report) : item.audit_report;
                bddGen.renderAuditReport(report, 'modal-audit');
            } catch(e) {
                auditReport.style.display = 'none';
            }
        } else {
            auditTrigger.style.display = 'flex';
            auditReport.style.display = 'none';
        }

        modal.classList.add('active');
        lucide.createIcons();
    });

    // History Modal Audit Action
    const modalAuditBtn = document.getElementById('modal-audit-btn');
    if (modalAuditBtn) {
        modalAuditBtn.addEventListener('click', async () => {
            if (!currentlyViewingItem) return;
            
            modalAuditBtn.disabled = true;
            modalAuditBtn.innerHTML = '<i class="spin" data-lucide="loader-2"></i> 診斷中...';
            lucide.createIcons();

            const report = await bddGen.auditQuality(currentlyViewingItem.id);
            
            if (report) {
                document.getElementById('modal-audit-trigger').style.display = 'none';
                bddGen.renderAuditReport(report, 'modal-audit');
                // Update local data and sync history list
                currentlyViewingItem.audit_report = report;
                historyMgr.renderHistory(); 
                showToast("品質診斷完成", "shield-check");
            } else {
                showToast("診斷失敗，請稍後再試", "alert-circle");
            }
            
            modalAuditBtn.disabled = false;
            modalAuditBtn.innerHTML = '<i data-lucide="microscope"></i> 啟動品質診斷';
            lucide.createIcons();
        });
    }

    // History Modal Toggles
    const modalToggleAudit = document.getElementById('modal-toggle-audit-details');
    if (modalToggleAudit) {
        modalToggleAudit.addEventListener('click', () => {
            const list = document.getElementById('modal-audit-checklist');
            const isVisible = list.style.display !== 'none';
            list.style.display = isVisible ? 'none' : 'grid';
            modalToggleAudit.innerHTML = isVisible 
                ? '<i data-lucide="chevron-down"></i> 各項指標說明'
                : '<i data-lucide="chevron-up"></i> 收合指標說明';
            lucide.createIcons();
        });
    }

    const modalInfoTrigger = document.getElementById('modal-info-trigger');
    const modalScoreTooltip = document.getElementById('modal-score-tooltip');
    if (modalInfoTrigger) {
        modalInfoTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            modalScoreTooltip.classList.toggle('active');
        });
        document.addEventListener('click', () => modalScoreTooltip.classList.remove('active'));
    }

    // ========== Upload Manager ==========
    const uploadMgr = new UploadManager((files) => {
        const hasFiles = files.length > 0;
        generateBtn.disabled = !hasFiles;
    });

    // Initial Render
    historyMgr.renderHistory();

    // ========== Event Listeners ==========
    
    langSelector.addEventListener('change', (e) => {
        bddGen.setLanguage(e.target.value);
    });

    let currentRecordId = null;

    // Generate BDD
    generateBtn.addEventListener('click', async () => {
        const files = uploadMgr.getFiles();
        if (files.length === 0) return;

        // UI Transition to Loading
        const statusBadge = document.getElementById('gen-status');
        const statusText = document.getElementById('gen-status-text');
        const resultWrapper = document.getElementById('bdd-result-wrapper');
        const auditReport = document.getElementById('audit-report');
        const auditTrigger = document.getElementById('audit-trigger-area');

        resultPlaceholder.style.display = 'none';
        resultWrapper.style.display = 'none';
        auditReport.style.display = 'none';
        downloadBtn.disabled = true;
        loadingState.style.display = 'block';
        generateBtn.disabled = true;

        // Step 1: BDD Generation
        statusBadge.style.display = 'inline-flex';
        statusText.innerText = '🚀 正在產出 BDD 規格...';
        lucide.createIcons();

        const data = await bddGen.generateBdd(files);
        
        loadingState.style.display = 'none';
        statusBadge.style.display = 'none';
        
        if (data.status === 'success' && data.record_id) {
            currentRecordId = data.record_id;
            bddOutput.innerHTML = bddGen.highlightGherkin(data.bdd);
            resultWrapper.style.display = 'flex';
            auditTrigger.style.display = 'flex'; // Show the audit trigger
        } else {
            bddOutput.innerHTML = bddGen.highlightGherkin(data.bdd || "產出失敗");
            resultWrapper.style.display = 'flex';
            auditTrigger.style.display = 'none';
        }
        
        bddOutput.classList.add('typewriter-cursor');
        newBddBtn.disabled = false;
        downloadBtn.disabled = false;
        generateBtn.disabled = false;

        setTimeout(() => {
            bddOutput.classList.remove('typewriter-cursor');
        }, 1500);

        historyMgr.loadHistory();
    });

    // Manual Quality Audit
    const frontAuditBtn = document.getElementById('front-audit-btn');
    if (frontAuditBtn) {
        frontAuditBtn.addEventListener('click', async () => {
            if (!bddGen.currentBddText) return;
            
            const auditTrigger = document.getElementById('audit-trigger-area');
            const originalBtnContent = frontAuditBtn.innerHTML;
            
            frontAuditBtn.disabled = true;
            frontAuditBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> 診斷中...';
            lucide.createIcons();
            
            try {
                // Use stateless text audit for freshly generated content
                const report = await bddGen.auditQuality(bddGen.currentBddText);
                
                if (report) {
                    bddGen.renderAuditReport(report);
                    auditTrigger.style.display = 'none'; // Only hide after rendering
                    historyMgr.loadHistory(); // Sync sidebar
                    showToast('品質診斷已完成', 'shield-check');
                } else {
                    throw new Error("Empty report");
                }
            } catch (err) {
                console.error("Audit error:", err);
                frontAuditBtn.disabled = false;
                frontAuditBtn.innerHTML = originalBtnContent;
                lucide.createIcons();
                showToast('診斷失敗，請稍後再試', 'alert-circle');
            }
        });
    }

    // Toggle Audit Details
    const toggleAuditBtn = document.getElementById('toggle-audit-details');
    if (toggleAuditBtn) {
        toggleAuditBtn.addEventListener('click', () => {
            const grid = document.getElementById('audit-checklist');
            const isHidden = grid.style.display === 'none';
            grid.style.display = isHidden ? 'grid' : 'none';
            toggleAuditBtn.innerHTML = isHidden ? 
                '<i data-lucide="chevron-up" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"></i>收合指標說明' : 
                '<i data-lucide="chevron-down" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"></i>各項指標說明';
            lucide.createIcons();
        });
    }

    // Score Tooltip Toggle
    const frontInfoTrigger = document.getElementById('front-info-trigger');
    const frontScoreTooltip = document.getElementById('front-score-tooltip');
    if (frontInfoTrigger && frontScoreTooltip) {
        frontInfoTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            frontScoreTooltip.classList.toggle('active');
            lucide.createIcons();
        });
        document.addEventListener('click', () => {
            frontScoreTooltip.classList.remove('active');
        });
    }

    // New BDD (clear all)
    newBddBtn.addEventListener('click', async () => {
        const confirmed = await showConfirm(
            '建立新的 BDD',
            '確定要清除目前的素材與產出結果，重新開始嗎？'
        );
        if (!confirmed) return;

        // Reset upload zone
        uploadMgr.files = [];
        uploadMgr.renderFileList();
        if (uploadMgr.fileInput) uploadMgr.fileInput.value = '';
        generateBtn.disabled = true;

        // Reset result zone
        bddOutput.style.display = 'none';
        bddOutput.innerHTML = '';
        downloadBtn.disabled = true;
        resultPlaceholder.style.display = 'flex';
        loadingState.style.display = 'none';
        bddGen.currentBddText = '';
        currentRecordId = null;

        // Reset Audit UI
        const auditReport = document.getElementById('audit-report');
        const auditChecklist = document.getElementById('audit-checklist');
        const toggleAuditBtn = document.getElementById('toggle-audit-details');
        if (auditReport) auditReport.style.display = 'none';
        if (auditChecklist) auditChecklist.style.display = 'none';
        if (toggleAuditBtn) {
            toggleAuditBtn.innerHTML = '<i data-lucide="chevron-down" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"></i>各項指標說明';
            lucide.createIcons();
        }
        
        // Keep newBddBtn enabled so user can always reset
        newBddBtn.disabled = false;
        
        showToast('已重置介面', 'refresh-cw');
    });

    // Download
    downloadBtn.addEventListener('click', () => {
        bddGen.downloadBdd();
        showToast('檔案已開始下載', 'download');
    });

    // ========== History Selection Logic ==========
    function updateHistorySelectionState() {
        const checkboxes = Array.from(document.querySelectorAll('.history-item-checkbox'));
        if (checkboxes.length === 0) {
            if (selectAllCheckbox) {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.disabled = true;
            }
            if (deleteSelectedBtn) deleteSelectedBtn.disabled = true;
            return;
        }
        
        if (selectAllCheckbox) selectAllCheckbox.disabled = false;
        const allChecked = checkboxes.every(cb => cb.checked);
        const someChecked = checkboxes.some(cb => cb.checked);
        
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = allChecked;
            selectAllCheckbox.indeterminate = someChecked && !allChecked;
        }
        if (deleteSelectedBtn) deleteSelectedBtn.disabled = !someChecked;
    }

    document.addEventListener('historySelectionChanged', updateHistorySelectionState);

    const originalRenderHistory = historyMgr.renderHistory.bind(historyMgr);
    historyMgr.renderHistory = () => {
        originalRenderHistory();
        updateHistorySelectionState();
    };
    updateHistorySelectionState();

    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('.history-item-checkbox');
            checkboxes.forEach(cb => cb.checked = e.target.checked);
            updateHistorySelectionState();
        });
    }

    if (deleteSelectedBtn) {
        deleteSelectedBtn.addEventListener('click', async () => {
            const checkboxes = Array.from(document.querySelectorAll('.history-item-checkbox:checked'));
            const ids = checkboxes.map(cb => parseInt(cb.getAttribute('data-id')));
            if (ids.length === 0) return;
            
            const confirmed = await showConfirm(
                '刪除歷史版本',
                `確定要刪除選取的 ${ids.length} 個版本嗎？此操作無法復原。`
            );
            if (confirmed) {
                historyMgr.deleteVersions(ids);
            }
        });
    }

    // ========== Modal Close Events ==========
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    }

    // ========== Version Compare Logic ==========
    const compareBar        = document.getElementById('compare-bar');
    const compareCountEl    = document.getElementById('compare-selected-count');
    const openCompareBtn    = document.getElementById('open-compare-btn');
    const clearCompareBtn   = document.getElementById('clear-compare-selection-btn');
    const compareModal      = document.getElementById('compare-modal');
    const closeCompareBtn   = document.getElementById('close-compare-btn');

    function updateCompareBar() {
        const checked = document.querySelectorAll('.history-item-checkbox:checked');
        const count = checked.length;
        compareCountEl.textContent = count;
        if (count > 0) {
            compareBar.classList.add('visible');
        } else {
            compareBar.classList.remove('visible');
        }
        openCompareBtn.disabled = count < 2;
    }

    // Hook into existing historySelectionChanged event
    document.addEventListener('historySelectionChanged', updateCompareBar);

    if (clearCompareBtn) {
        clearCompareBtn.addEventListener('click', () => {
            document.querySelectorAll('.history-item-checkbox').forEach(cb => cb.checked = false);
            updateHistorySelectionState();
            updateCompareBar();
        });
    }

    function renderCompareAudit(record, containerId) {
        const el = document.getElementById(containerId);

        // File tags (always shown)
        const files = record.files || [];
        const fileTagsHtml = files.length > 0
            ? `<div class="compare-file-tags">${files.map(f =>
                `<span class="compare-file-tag" title="${f.original_name}">${f.original_name}</span>`
              ).join('')}</div>`
            : '';

        if (!record.audit_report) {
            el.innerHTML = `
                ${fileTagsHtml}
                <div class="compare-no-audit"><i data-lucide="alert-circle" style="width:12px;height:12px;"></i> 尚未進行品質診斷</div>
            `;
            lucide.createIcons();
            return;
        }
        let report;
        try { report = typeof record.audit_report === 'string' ? JSON.parse(record.audit_report) : record.audit_report; }
        catch(e) { el.innerHTML = `${fileTagsHtml}<div class="compare-no-audit">診斷資料解析失敗</div>`; return; }

        const getItemColor = (s) => {
            if (s >= 5) return 'var(--score-5)';
            if (s >= 4) return 'var(--score-4)';
            if (s >= 3) return 'var(--score-3)';
            if (s >= 2) return 'var(--score-2)';
            return 'var(--score-1)';
        };
        const calculateQualityScore = (rep) => {
            if (!rep || !rep.checklist || rep.checklist.length === 0) return rep.total_score || 0;
            const len = rep.checklist.length;
            const sum = rep.checklist.reduce((acc, item) => acc + item.score, 0);
            return Math.max(0, Math.min(100, Math.round(((sum - len) / (len * 4)) * 100)));
        };

        const score = calculateQualityScore(report);
        const scoreColor = score >= 80 ? 'var(--score-5)'
                         : score >= 50 ? 'var(--score-3)'
                         : 'var(--score-2)';

        const likertHtml = (report.checklist || []).map(item => {
            const color = getItemColor(item.score);
            const dots = Array.from({length: 5}, (_, i) =>
                `<div class="dot ${i < item.score ? 'active' : ''}" style="width:6px;height:6px;${i < item.score ? 'color:'+color : ''}"></div>`
            ).join('');
            return `<div class="compare-likert-item"><div class="compare-likert-q">${item.id}. ${item.question}</div><div class="dots">${dots}</div></div>`;
        }).join('');

        el.innerHTML = `
            <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:6px;">
                <div style="display:flex;align-items:baseline;gap:5px;">
                    <span class="compare-score-val" style="color:${scoreColor}">${score}</span>
                    <span class="compare-score-unit">/ 100</span>
                </div>
                ${fileTagsHtml}
            </div>
            <div class="compare-summary-text">${report.summary || ''}</div>
            <div class="compare-likert-grid">${likertHtml}</div>
        `;
        lucide.createIcons();
    }

    if (openCompareBtn) {
        openCompareBtn.addEventListener('click', () => {
            const checked = Array.from(document.querySelectorAll('.history-item-checkbox:checked'));
            if (checked.length < 2) return;

            // Take first two selected
            const idA = parseInt(checked[0].getAttribute('data-id'));
            const idB = parseInt(checked[1].getAttribute('data-id'));
            const recA = historyMgr.history.find(r => r.id === idA);
            const recB = historyMgr.history.find(r => r.id === idB);
            if (!recA || !recB) return;

            // Headers
            const fmtDate = (s) => new Date(s).toLocaleString('zh-TW');
            document.getElementById('compare-header-a').textContent = `#${recA.id} - ${fmtDate(recA.created_at)}`;
            document.getElementById('compare-header-b').textContent = `#${recB.id} - ${fmtDate(recB.created_at)}`;

            // Audit
            renderCompareAudit(recA, 'compare-audit-a');
            renderCompareAudit(recB, 'compare-audit-b');

            // BDD content
            document.getElementById('compare-content-a').innerHTML = bddGen.highlightGherkin(recA.bdd_full || '（無內容）');
            document.getElementById('compare-content-b').innerHTML = bddGen.highlightGherkin(recB.bdd_full || '（無內容）');

            compareModal.classList.add('active');
            lucide.createIcons();
        });
    }

    if (closeCompareBtn) {
        closeCompareBtn.addEventListener('click', () => compareModal.classList.remove('active'));
    }
    if (compareModal) {
        compareModal.addEventListener('click', (e) => {
            if (e.target === compareModal) compareModal.classList.remove('active');
        });
    }

});
