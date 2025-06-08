class TODOStackExtension {
    constructor() {
        this.stack = [];
        this.completedTasks = [];
        this.todayTaskCount = 0;
        this.historyVisible = false;
        this.draggedElement = null;
        this.draggedIndex = null;
        this.init();
        this.loadFromStorage();
        this.updateUI();
    }

    init() {
        // 获取 DOM 元素
        this.taskInput = document.getElementById('taskInput');
        this.pushBtn = document.getElementById('pushBtn');
        this.popBtn = document.getElementById('popBtn');
        this.peekBtn = document.getElementById('peekBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.taskStack = document.getElementById('taskStack');
        this.stackSize = document.getElementById('stackSize');
        this.totalTasks = document.getElementById('totalTasks');
        this.completedTasksEl = document.getElementById('completedTasks');
        this.todayTasksEl = document.getElementById('todayTasks');
        this.helpBtn = document.getElementById('helpBtn');
        this.helpModal = document.getElementById('helpModal');
        this.closeModal = document.getElementById('closeModal');
        this.toggleHistoryBtn = document.getElementById('toggleHistory');
        this.historyContainer = document.getElementById('historyContainer');
        this.historyList = document.getElementById('historyList');
        this.completedCount = document.getElementById('completedCount');
        this.openFullPageBtn = document.getElementById('openFullPage');
        this.statsBtn = document.getElementById('statsBtn');
        this.statsModal = document.getElementById('statsModal');
        this.closeStatsModal = document.getElementById('closeStatsModal');

        // 绑定事件
        this.bindEvents();

        // 检查今日任务计数
        this.checkDailyReset();
    }

    bindEvents() {
        // 入栈事件
        this.pushBtn.addEventListener('click', () => this.push());
        this.taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.push();
            }
        });

        // 栈操作事件
        this.popBtn.addEventListener('click', () => this.pop());
        this.peekBtn.addEventListener('click', () => this.peek());
        this.clearBtn.addEventListener('click', () => this.clear());

        // 历史记录事件
        this.toggleHistoryBtn.addEventListener('click', () => this.toggleHistory());

        // 模态框事件
        this.helpBtn.addEventListener('click', () => this.showHelp());
        this.closeModal.addEventListener('click', () => this.hideHelp());
        this.helpModal.addEventListener('click', (e) => {
            if (e.target === this.helpModal) {
                this.hideHelp();
            }
        });

        // 统计模态框事件
        this.statsBtn.addEventListener('click', () => this.showStats());
        this.closeStatsModal.addEventListener('click', () => this.hideStats());
        this.statsModal.addEventListener('click', (e) => {
            if (e.target === this.statsModal) {
                this.hideStats();
            }
        });

        // 打开完整页面
        this.openFullPageBtn.addEventListener('click', () => {
            chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
        });

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 'Enter':
                        e.preventDefault();
                        this.push();
                        break;
                    case 'Backspace':
                        e.preventDefault();
                        this.pop();
                        break;
                }
            }
        });
    }

    // 入栈操作
    push() {
        const taskText = this.taskInput.value.trim();
        if (!taskText) {
            this.taskInput.focus();
            this.showNotification('请输入任务内容', 'warning');
            return;
        }

        if (taskText.length > 100) {
            this.showNotification('任务内容不能超过100个字符', 'error');
            return;
        }

        const task = {
            id: Date.now(),
            content: taskText,
            timestamp: new Date(),
            index: this.stack.length
        };

        this.stack.push(task);
        this.todayTaskCount++;
        this.taskInput.value = '';
        this.taskInput.focus();

        this.updateUI();
        this.saveToStorage();
        this.showNotification(`任务已入栈`, 'success');
    }

    // 出栈操作
    pop() {
        if (this.stack.length === 0) {
            this.showNotification('栈为空，无法执行出栈操作', 'warning');
            return;
        }

        const task = this.stack.pop();
        this.completedTasks.push({
            ...task,
            completedAt: new Date()
        });

        this.updateUI();
        this.saveToStorage();
        this.showNotification(`任务已完成`, 'success');
        this.animateCompletion();
    }

    // 查看栈顶
    peek() {
        if (this.stack.length === 0) {
            this.showNotification('栈为空，无栈顶元素', 'warning');
            return;
        }

        const topTask = this.stack[this.stack.length - 1];
        this.highlightTopTask();
        this.showNotification(`栈顶任务: "${topTask.content}"`, 'info');
    }

    // 清空栈
    clear() {
        if (this.stack.length === 0) {
            this.showNotification('栈已经为空', 'warning');
            return;
        }

        if (confirm(`确定要清空所有 ${this.stack.length} 个任务吗？`)) {
            this.stack = [];
            this.updateUI();
            this.saveToStorage();
            this.showNotification('栈已清空', 'success');
        }
    }

    // 更新 UI
    updateUI() {
        this.updateStackDisplay();
        this.updateButtons();
        this.updateStats();
        this.updateHistoryDisplay();
    }

    // 更新栈显示
    updateStackDisplay() {
        this.taskStack.innerHTML = '';

        if (this.stack.length === 0) {
            this.taskStack.innerHTML = `
                <div class="empty-stack">
                    <i class="fas fa-inbox"></i>
                    <p>栈为空</p>
                </div>
            `;
            return;
        }

        // 从栈顶到栈底显示任务
        for (let i = this.stack.length - 1; i >= 0; i--) {
            const task = this.stack[i];
            const taskElement = this.createTaskElement(task, i);
            this.taskStack.appendChild(taskElement);
        }
    }

    // 创建任务元素
    createTaskElement(task, stackIndex) {
        const taskDiv = document.createElement('div');
        taskDiv.className = 'task-item';
        taskDiv.dataset.taskId = task.id;
        taskDiv.dataset.stackIndex = stackIndex;

        const timeString = this.formatTime(task.timestamp);

        taskDiv.innerHTML = `
            <div class="task-content">${this.escapeHtml(task.content)}</div>
            <div class="task-meta">
                <span class="task-index">#${stackIndex + 1}</span>
                <span class="task-time">${timeString}</span>
            </div>
        `;

        // 添加拖拽事件
        this.addDragEvents(taskDiv, stackIndex);

        return taskDiv;
    }

    // 添加拖拽事件
    addDragEvents(element, stackIndex) {
        element.draggable = true;

        element.addEventListener('dragstart', (e) => {
            this.draggedElement = element;
            this.draggedIndex = stackIndex;
            element.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        element.addEventListener('dragend', (e) => {
            element.classList.remove('dragging');
            this.draggedElement = null;
            this.draggedIndex = null;
            document.querySelectorAll('.task-item').forEach(item => {
                item.classList.remove('drag-over');
            });
        });

        element.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            if (this.draggedElement && this.draggedElement !== element) {
                element.classList.add('drag-over');
            }
        });

        element.addEventListener('dragleave', (e) => {
            element.classList.remove('drag-over');
        });

        element.addEventListener('drop', (e) => {
            e.preventDefault();
            element.classList.remove('drag-over');
            
            if (this.draggedElement && this.draggedElement !== element) {
                const targetIndex = parseInt(element.dataset.stackIndex);
                this.reorderStack(this.draggedIndex, targetIndex);
            }
        });
    }

    // 重新排序栈
    reorderStack(fromIndex, toIndex) {
        if (fromIndex === toIndex) return;

        const actualFromIndex = this.stack.length - 1 - fromIndex;
        const actualToIndex = this.stack.length - 1 - toIndex;

        const movedTask = this.stack.splice(actualFromIndex, 1)[0];
        this.stack.splice(actualToIndex, 0, movedTask);

        this.updateUI();
        this.saveToStorage();
        this.showNotification('任务顺序已调整', 'success');
    }

    // 更新按钮状态
    updateButtons() {
        const hasItems = this.stack.length > 0;
        this.popBtn.disabled = !hasItems;
        this.peekBtn.disabled = !hasItems;
        this.clearBtn.disabled = !hasItems;
    }

    // 更新统计信息
    updateStats() {
        this.stackSize.textContent = this.stack.length;
        if (this.totalTasks) this.totalTasks.textContent = this.stack.length;
        if (this.completedTasksEl) this.completedTasksEl.textContent = this.completedTasks.length;
        if (this.todayTasksEl) this.todayTasksEl.textContent = this.todayTaskCount;
        if (this.completedCount) this.completedCount.textContent = this.completedTasks.length;
    }

    // 切换历史记录显示
    toggleHistory() {
        this.historyVisible = !this.historyVisible;
        
        if (this.historyVisible) {
            this.historyContainer.style.display = 'block';
            this.toggleHistoryBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } else {
            this.historyContainer.style.display = 'none';
            this.toggleHistoryBtn.innerHTML = '<i class="fas fa-eye"></i>';
        }
        
        this.updateHistoryDisplay();
    }

    // 更新历史记录显示
    updateHistoryDisplay() {
        if (!this.historyVisible) return;

        this.historyList.innerHTML = '';

        if (this.completedTasks.length === 0) {
            this.historyList.innerHTML = `
                <div class="empty-history">
                    <i class="fas fa-clipboard-check"></i>
                    <p>暂无已完成任务</p>
                </div>
            `;
            return;
        }

        const sortedTasks = [...this.completedTasks].sort((a, b) => 
            new Date(b.completedAt) - new Date(a.completedAt)
        );

        sortedTasks.slice(0, 5).forEach(task => { // 只显示最近5个
            const historyItem = this.createHistoryElement(task);
            this.historyList.appendChild(historyItem);
        });
    }

    // 创建历史记录元素
    createHistoryElement(task) {
        const historyDiv = document.createElement('div');
        historyDiv.className = 'history-item';

        const completedTime = this.formatTime(task.completedAt);

        historyDiv.innerHTML = `
            <div class="history-content">
                <i class="fas fa-check-circle check-icon"></i>
                <span class="history-text">${this.escapeHtml(task.content)}</span>
            </div>
            <div class="history-meta">
                <span class="history-completed-time">${completedTime}</span>
            </div>
        `;

        return historyDiv;
    }

    // 高亮栈顶任务
    highlightTopTask() {
        const topTask = this.taskStack.querySelector('.task-item:first-child');
        if (topTask) {
            topTask.classList.add('peek-highlight');
            setTimeout(() => {
                topTask.classList.remove('peek-highlight');
            }, 1000);
        }
    }

    // 完成动画
    animateCompletion() {
        const topTask = this.taskStack.querySelector('.task-item:first-child');
        if (topTask) {
            topTask.style.animation = 'slideOutUp 0.5s ease';
            setTimeout(() => {
                this.updateStackDisplay();
            }, 500);
        }
    }

    // 显示通知
    showNotification(message, type = 'info') {
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${this.getNotificationIcon(type)}"></i>
            <span>${message}</span>
        `;

        notification.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            z-index: 1001;
            display: flex;
            align-items: center;
            gap: 6px;
            animation: slideInRight 0.3s ease;
            max-width: 250px;
            font-weight: 500;
            font-size: 12px;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 2000);
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    getNotificationColor(type) {
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        };
        return colors[type] || '#17a2b8';
    }

    // 显示帮助
    showHelp() {
        this.helpModal.style.display = 'block';
    }

    // 隐藏帮助
    hideHelp() {
        this.helpModal.style.display = 'none';
    }

    // 显示统计
    showStats() {
        this.statsModal.style.display = 'block';
    }

    // 隐藏统计
    hideStats() {
        this.statsModal.style.display = 'none';
    }

    // 格式化时间
    formatTime(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return '刚刚';
        if (minutes < 60) return `${minutes}分钟前`;
        if (hours < 24) return `${hours}小时前`;
        if (days < 7) return `${days}天前`;
        
        return date.toLocaleDateString('zh-CN', {
            month: 'short',
            day: 'numeric'
        });
    }

    // HTML 转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 检查每日重置
    checkDailyReset() {
        const today = new Date().toDateString();
        chrome.storage.local.get(['todostack_last_date'], (result) => {
            if (result.todostack_last_date !== today) {
                this.todayTaskCount = 0;
                chrome.storage.local.set({ todostack_last_date: today });
            }
        });
    }

    // 保存到 Chrome 存储
    saveToStorage() {
        const data = {
            stack: this.stack,
            completedTasks: this.completedTasks,
            todayTaskCount: this.todayTaskCount,
            lastUpdated: new Date().toISOString()
        };
        chrome.storage.local.set({ todostack_data: data });
    }

    // 从 Chrome 存储加载
    loadFromStorage() {
        chrome.storage.local.get(['todostack_data'], (result) => {
            if (result.todostack_data) {
                const data = result.todostack_data;
                this.stack = data.stack || [];
                this.completedTasks = data.completedTasks || [];
                this.todayTaskCount = data.todayTaskCount || 0;

                // 转换时间戳为 Date 对象
                this.stack.forEach(task => {
                    task.timestamp = new Date(task.timestamp);
                });
                this.completedTasks.forEach(task => {
                    task.timestamp = new Date(task.timestamp);
                    if (task.completedAt) {
                        task.completedAt = new Date(task.completedAt);
                    }
                });

                this.updateUI();
            }
        });
    }
}

// 添加通知动画样式
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }

    @keyframes slideOutUp {
        from {
            opacity: 1;
            transform: translateY(0);
        }
        to {
            opacity: 0;
            transform: translateY(-20px);
        }
    }
`;
document.head.appendChild(notificationStyles);

// 初始化插件
document.addEventListener('DOMContentLoaded', () => {
    window.todoStackExtension = new TODOStackExtension();
}); 