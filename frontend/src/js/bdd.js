export default class BddGenerator {
    constructor() {
        this.currentBddText = '';
        this.currentLang = 'zh';
    }

    setLanguage(lang) {
        this.currentLang = lang;
    }

    async generateBdd(files) {
        const formData = new FormData();
        formData.append('language', this.currentLang);
        files.forEach(file => formData.append('files', file));

        try {
            const response = await fetch('/api/generate-bdd', { method: 'POST', body: formData });
            if (!response.ok) throw new Error(`API 請求錯誤: ${response.status}`);
            const data = await response.json();
            if (data.status === 'rate_limited') {
                const seconds = data.retry_after || 30;
                this.currentBddText = `⏳ 模型忙碌中，請 ${seconds} 秒後再試`;
                return { bdd: this.currentBddText, status: 'rate_limited' };
            }
            this.currentBddText = data.bdd;
            return data;
        } catch (error) {
            console.error("生成 BDD 失敗:", error);
            this.currentBddText = "連線失敗或伺服器未回應，請檢查網路連線或稍後再試。";
            return { bdd: this.currentBddText, status: 'error' };
        }
    }

    async auditQuality(identifier) {
        try {
            let response;
            if (typeof identifier === 'number') {
                // Record ID audit (original)
                response = await fetch(`/api/admin/records/${identifier}/audit`, { method: 'POST' });
            } else {
                // Stateless text audit (new)
                response = await fetch(`/api/audit-stateless`, { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ bdd_text: identifier })
                });
            }
            
            if (!response.ok) throw new Error(`診斷 API 錯誤`);
            const data = await response.json();
            return data.status === 'success' ? data.report : null;
        } catch (error) {
            console.error("品質診斷失敗:", error);
            return null;
        }
    }

    getScoreColor(score) {
        if (score >= 5) return 'var(--score-5)';
        if (score >= 4) return 'var(--score-4)';
        if (score >= 3) return 'var(--score-3)';
        if (score >= 2) return 'var(--score-2)';
        return 'var(--score-1)';
    }

    calculateQualityScore(report) {
        if (!report || !report.checklist || report.checklist.length === 0) return report.total_score || 0;
        const len = report.checklist.length;
        const sum = report.checklist.reduce((acc, item) => acc + item.score, 0);
        // Strict formula: (sum - min) / (max - min) * 100
        return Math.max(0, Math.min(100, Math.round(((sum - len) / (len * 4)) * 100)));
    }

    getTotalScoreColor(score) {
        if (score >= 80) return '#349B53'; // Green
        if (score >= 50) return '#0ea5e9'; // Blue
        return 'var(--score-2)'; // Orange
    }

    renderAuditReport(report, prefix = 'audit') {
        const container = document.getElementById(`${prefix}-report`);
        if (!report) { 
            if (container) container.style.display = 'none'; 
            return; 
        }
        
        const finalScore = this.calculateQualityScore(report);
        const scoreEl = document.getElementById(`${prefix}-score`);
        if (scoreEl) {
            scoreEl.innerText = finalScore;
            scoreEl.style.color = this.getTotalScoreColor(finalScore);
        }
        
        const summaryEl = document.getElementById(`${prefix}-summary`);
        if (summaryEl) summaryEl.innerText = report.summary || '';
        
        const grid = document.getElementById(`${prefix}-checklist`);
        if (grid) {
            grid.innerHTML = (report.checklist || []).map(item => {
                const color = this.getScoreColor(item.score);
                const dots = Array.from({length: 5}, (_, i) => 
                    `<div class="dot ${i < item.score ? 'active' : ''}" style="${i < item.score ? 'color:' + color : ''}"></div>`
                ).join('');
                
                return `
                    <div class="check-item">
                        <div class="check-header">
                            <div class="check-q">${item.id}. ${item.question}</div>
                            <div class="dots">${dots}</div>
                        </div>
                        <div class="check-fb">${item.feedback}</div>
                    </div>
                `;
            }).join('');
        }
        
        if (container) container.style.display = 'block';
        if (window.lucide) window.lucide.createIcons();
    }

    highlightGherkin(text) {
        // Simple regex-based syntax highlighter for Gherkin
        let highlighted = text
            // Escape HTML first
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            
            // Highlight Strings (Do this BEFORE adding span tags with quotes)
            .replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, '<span class="string">"$1"</span>')
            
            // Highlight Keywords
            .replace(/^(Feature:|功能:|Rule:|規則:)/gm, '<span class="keyword-feature">$1</span>')
            .replace(/^(Scenario:|Scenario Outline:|場景:|場景大綱:|Example:|Examples:|範例:|例子:)/gm, '<span class="keyword-scenario">$1</span>')
            .replace(/^(\s*)(Given|When|Then|And|But|假設|當|那麼|而且|但是)\b/gm, '$1<span class="keyword-step">$2</span>')
            
            // Highlight Comments
            .replace(/(#.*)$/gm, '<span class="comment">$1</span>');

        return highlighted;
    }

    downloadBdd() {
        if (!this.currentBddText) return false;
        
        try {
            const blob = new Blob([this.currentBddText], { type: 'text/plain;charset=utf-8' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `bdd_spec_${new Date().toISOString().slice(0,10)}.txt`;
            document.body.appendChild(a);
            a.click();
            
            // Cleanup after a short delay
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 100);
            return true;
        } catch (err) {
            console.error('Download failed:', err);
            return false;
        }
    }

    async copyBdd() {
        if (!this.currentBddText) return false;
        
        try {
            await navigator.clipboard.writeText(this.currentBddText);
            return true;
        } catch (err) {
            console.error('Failed to copy text: ', err);
            return false;
        }
    }
}
