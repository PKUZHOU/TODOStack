class TODOStack {
    constructor() {
        this.stack = [];
        this.completedTasks = [];
        this.todayTaskCount = 0;
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
        this.clearHistoryBtn = document.getElementById('clearHistory');
        this.historyContainer = document.getElementById('historyContainer');
        this.historyList = document.getElementById('historyList');

        // 拖拽相关属性
        this.draggedElement = null;
        this.draggedIndex = null;
        this.historyVisible = false;

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
        this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());

        // 模态框事件
        this.helpBtn.addEventListener('click', () => this.showHelp());
        this.closeModal.addEventListener('click', () => this.hideHelp());
        this.helpModal.addEventListener('click', (e) => {
            if (e.target === this.helpModal) {
                this.hideHelp();
            }
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
        this.showNotification(`任务 "${taskText}" 已入栈`, 'success');
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
        this.showNotification(`任务 "${task.content}" 已完成并出栈`, 'success');

        // 添加完成动画
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

        if (confirm(`确定要清空所有 ${this.stack.length} 个任务吗？此操作不可撤销。`)) {
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
                    <p class="hint">添加你的第一个任务开始使用！</p>
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
        const isTop = stackIndex === this.stack.length - 1;

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

    // 更新按钮状态
    updateButtons() {
        const hasItems = this.stack.length > 0;
        this.popBtn.disabled = !hasItems;
        this.peekBtn.disabled = !hasItems;
        this.clearBtn.disabled = !hasItems;
        
        // 更新历史记录按钮状态
        this.clearHistoryBtn.disabled = this.completedTasks.length === 0;
    }

    // 更新统计信息
    updateStats() {
        this.stackSize.textContent = this.stack.length;
        this.totalTasks.textContent = this.stack.length;
        this.completedTasksEl.textContent = this.completedTasks.length;
        this.todayTasksEl.textContent = this.todayTaskCount;
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
        // 移除已存在的通知
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

        // 添加样式
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1001;
            display: flex;
            align-items: center;
            gap: 10px;
            animation: slideInRight 0.3s ease;
            max-width: 300px;
            font-weight: 500;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
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
        document.body.style.overflow = 'hidden';
    }

    // 隐藏帮助
    hideHelp() {
        this.helpModal.style.display = 'none';
        document.body.style.overflow = 'auto';
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
        const lastDate = localStorage.getItem('todostack_last_date');
        
        if (lastDate !== today) {
            this.todayTaskCount = 0;
            localStorage.setItem('todostack_last_date', today);
        }
    }

    // 保存到本地存储
    saveToStorage() {
        const data = {
            stack: this.stack,
            completedTasks: this.completedTasks,
            todayTaskCount: this.todayTaskCount,
            lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('todostack_data', JSON.stringify(data));
    }

    // 从本地存储加载
    loadFromStorage() {
        try {
            const data = localStorage.getItem('todostack_data');
            if (data) {
                const parsed = JSON.parse(data);
                this.stack = parsed.stack || [];
                this.completedTasks = parsed.completedTasks || [];
                this.todayTaskCount = parsed.todayTaskCount || 0;

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
            }
        } catch (error) {
            console.error('加载数据失败:', error);
            this.showNotification('数据加载失败，使用默认设置', 'error');
        }
    }

    // 导出数据
    exportData() {
        const data = {
            stack: this.stack,
            completedTasks: this.completedTasks,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `todostack_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showNotification('数据已导出', 'success');
    }

    // 导入数据
    importData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.stack && Array.isArray(data.stack)) {
                    this.stack = data.stack;
                    this.completedTasks = data.completedTasks || [];
                    
                    // 转换时间戳
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
                    this.saveToStorage();
                    this.showNotification('数据导入成功', 'success');
                } else {
                    throw new Error('数据格式错误');
                }
            } catch (error) {
                console.error('导入失败:', error);
                this.showNotification('数据导入失败，请检查文件格式', 'error');
            }
        };
        reader.readAsText(file);
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
            // 移除所有拖拽高亮
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

        // 从栈顶开始计算实际索引
        const actualFromIndex = this.stack.length - 1 - fromIndex;
        const actualToIndex = this.stack.length - 1 - toIndex;

        // 移动任务
        const movedTask = this.stack.splice(actualFromIndex, 1)[0];
        this.stack.splice(actualToIndex, 0, movedTask);

        this.updateUI();
        this.saveToStorage();
        this.showNotification('任务顺序已调整', 'success');
    }

    // 切换历史记录显示
    toggleHistory() {
        this.historyVisible = !this.historyVisible;
        
        if (this.historyVisible) {
            this.historyContainer.style.display = 'block';
            this.historyContainer.style.animation = 'historySlideDown 0.3s ease forwards';
            this.toggleHistoryBtn.innerHTML = '<i class="fas fa-eye-slash"></i> 隐藏历史';
        } else {
            this.historyContainer.style.animation = 'historySlideUp 0.3s ease forwards';
            setTimeout(() => {
                this.historyContainer.style.display = 'none';
            }, 300);
            this.toggleHistoryBtn.innerHTML = '<i class="fas fa-eye"></i> 显示历史';
        }
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
                    <p class="hint">完成的任务会出现在这里</p>
                </div>
            `;
            return;
        }

        // 按完成时间倒序显示
        const sortedTasks = [...this.completedTasks].sort((a, b) => 
            new Date(b.completedAt) - new Date(a.completedAt)
        );

        sortedTasks.forEach(task => {
            const historyItem = this.createHistoryElement(task);
            this.historyList.appendChild(historyItem);
        });
    }

    // 创建历史记录元素
    createHistoryElement(task) {
        const historyDiv = document.createElement('div');
        historyDiv.className = 'history-item';

        const completedTime = this.formatTime(task.completedAt);
        const originalTime = this.formatTime(task.timestamp);

        historyDiv.innerHTML = `
            <div class="history-content">
                <i class="fas fa-check-circle check-icon"></i>
                <span class="history-text">${this.escapeHtml(task.content)}</span>
            </div>
            <div class="history-meta">
                <span class="history-completed-time">完成于 ${completedTime}</span>
                <span class="history-original-time">创建于 ${originalTime}</span>
            </div>
        `;

        return historyDiv;
    }

    // 清空历史记录
    clearHistory() {
        if (this.completedTasks.length === 0) {
            this.showNotification('历史记录已经为空', 'warning');
            return;
        }

        if (confirm(`确定要清空所有 ${this.completedTasks.length} 条历史记录吗？此操作不可撤销。`)) {
            this.completedTasks = [];
            this.updateUI();
            this.saveToStorage();
            this.showNotification('历史记录已清空', 'success');
        }
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
`;
document.head.appendChild(notificationStyles);

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.todoStack = new TODOStack();
    
    // 添加全局键盘提示
    console.log('TODOStack 快捷键:');
    console.log('Ctrl/Cmd + Enter: 快速添加任务');
    console.log('Ctrl/Cmd + Backspace: 完成栈顶任务');
}); 