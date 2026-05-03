export default class HistoryManager {
    constructor(onViewHistory) {
        this.history = [];
        this.onViewHistory = onViewHistory; // Callback when viewing a history item
        
        this.historyListEl = document.getElementById('history-list');
        this.emptyStateEl = document.getElementById('history-empty');
        
        this.loadHistory();
    }

    async loadHistory() {
        try {
            const res = await fetch('/api/admin/records?sort_by_pin=false');
            const data = await res.json();
            this.history = data.records;
            this.renderHistory();
        } catch (e) {
            console.error('Failed to load history:', e);
        }
    }

    async clearHistory() {
        if (!await window.showConfirm('確定要刪除所有歷史紀錄嗎？', '注意：刪除後將無法在歷史清單中找回。')) return;
        
        try {
            const res = await fetch('/api/admin/records', { method: 'DELETE' });
            if (res.ok) {
                this.history = [];
                this.renderHistory();
                if (window.showToast) window.showToast('已成功刪除所有紀錄', 'check-circle');
            }
        } catch (e) {
            console.error('Failed to clear history:', e);
            if (window.showToast) window.showToast('刪除失敗', 'alert-circle');
        }
    }

    async deleteVersions(ids) {
        // IDs here are numerical from the DB
        const elements = Array.from(this.historyListEl.querySelectorAll('.history-item'))
            .filter(el => {
                const cb = el.querySelector('.history-item-checkbox');
                return cb && ids.includes(parseInt(cb.getAttribute('data-id')));
            });
            
        elements.forEach(el => el.classList.add('fade-out'));

        setTimeout(async () => {
            try {
                let successCount = 0;
                for (const id of ids) {
                    const res = await fetch(`/api/admin/records/${id}`, { method: 'DELETE' });
                    if (res.ok) successCount++;
                }
                
                await this.loadHistory();
                
                if (successCount > 0 && window.showToast) {
                    window.showToast(`已成功刪除 ${successCount} 個版本`, 'check-circle');
                }
                
                // Dispatch event for app.js to update delete button state
                const event = new Event('historySelectionChanged');
                document.dispatchEvent(event);
            } catch (e) {
                console.error('Failed to delete records:', e);
                if (window.showToast) window.showToast('刪除失敗', 'alert-circle');
            }
        }, 300);
    }

    formatDate(isoString) {
        const date = new Date(isoString);
        return date.toLocaleString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    calculateQualityScore(report) {
        if (!report || !report.checklist || report.checklist.length === 0) return report.total_score || 0;
        const len = report.checklist.length;
        const sum = report.checklist.reduce((acc, item) => acc + item.score, 0);
        return Math.max(0, Math.min(100, Math.round(((sum - len) / (len * 4)) * 100)));
    }

    getTotalScoreColor(score) {
        if (score >= 80) return '#349B53'; // Green
        if (score >= 50) return '#0ea5e9'; // Blue
        return '#f59e0b'; // Amber/Orange
    }

    renderScoreBadge(item) {
        if (!item.audit_report) return '';
        try {
            const report = typeof item.audit_report === 'string' ? JSON.parse(item.audit_report) : item.audit_report;
            const score = this.calculateQualityScore(report);
            const color = this.getTotalScoreColor(score);
            return `<div style="display: flex; align-items: center; gap: 3px; font-size: 0.7rem; font-weight: 700; color: ${color}; background: ${color}20; padding: 1px 6px; border-radius: 4px;">
                <i data-lucide="shield-check" style="width: 10px; height: 10px;"></i>
                ${score}
            </div>`;
        } catch(e) { return ''; }
    }

    renderHistory() {
        this.historyListEl.innerHTML = '';
        
        if (!this.history || this.history.length === 0) {
            this.historyListEl.style.display = 'none';
            this.emptyStateEl.style.display = 'flex';
            return;
        }

        this.historyListEl.style.display = 'block';
        this.emptyStateEl.style.display = 'none';

        this.history.forEach((item, index) => {
            const el = document.createElement('div');
            el.className = 'history-item';
            
            // Files in the record are stored as an array of objects
            const tagsHtml = item.files.map(file => `<span class="tag">${file.original_name}</span>`).join('');
            
            // Using DB ID for data-id
            el.innerHTML = `
                <input type="checkbox" class="history-item-checkbox" data-id="${item.id}" title="選取版本">
                <div class="history-item-content">
                    <div class="history-header">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="history-version">ID:${String(item.id).padStart(2, '0')}</span>
                            <span class="tag" style="background: rgba(0,0,0,0.05); color: var(--text-secondary); font-size: 0.65rem; padding: 1px 6px;">${item.language.toUpperCase()}</span>
                            ${this.renderScoreBadge(item)}
                        </div>
                        <span class="history-time">${this.formatDate(item.created_at)}</span>
                    </div>
                    <div class="history-tags">
                        ${tagsHtml}
                    </div>
                    <div class="history-preview">${item.bdd_snippet || ''}</div>
                </div>
            `;
            
            const checkbox = el.querySelector('.history-item-checkbox');
            checkbox.addEventListener('click', (e) => {
                e.stopPropagation();
                const event = new Event('historySelectionChanged');
                document.dispatchEvent(event);
            });

            el.addEventListener('click', () => {
                // Pass the full record to the app for better modal display
                this.onViewHistory(item);
            });
            
            this.historyListEl.appendChild(el);
        });
        
        if (window.lucide) window.lucide.createIcons();
    }
}
