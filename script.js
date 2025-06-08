class TODOStack {
    constructor() {
        this.stack = [];
        this.completedTasks = [];
        this.todayTaskCount = 0;
        this.selectedTaskId = null; // 当前选中的任务ID
        this.init();
        this.loadFromStorage();
        this.updateUI();
        this.handleUrlParameters();
    }

    init() {
        // 获取 DOM 元素
        this.taskInput = document.getElementById('taskInput');
        this.pushBtn = document.getElementById('pushBtn');
        this.popBtn = document.getElementById('popBtn');
        this.peekBtn = document.getElementById('peekBtn');
        this.pinSelectedBtn = document.getElementById('pinSelectedBtn');
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

        // 任务详情相关元素
        this.toggleDetailsBtn = document.getElementById('toggleDetailsBtn');
        this.collapseDetailsBtn = document.getElementById('collapseDetailsBtn');
        this.taskDetailsSection = document.getElementById('taskDetailsSection');
        this.taskDeadline = document.getElementById('taskDeadline');
        this.taskPriority = document.getElementById('taskPriority');
        this.taskDescription = document.getElementById('taskDescription');
        this.taskUrl = document.getElementById('taskUrl');
        this.taskFile = document.getElementById('taskFile');
        this.taskTags = document.getElementById('taskTags');
        this.attachmentsList = document.getElementById('attachmentsList');
        this.tagsList = document.getElementById('tagsList');
        this.previewBtn = document.getElementById('previewBtn');
        this.editBtn = document.getElementById('editBtn');
        this.markdownPreview = document.getElementById('markdownPreview');

        // 拖拽相关属性
        this.draggedElement = null;
        this.draggedIndex = null;
        this.historyVisible = false;
        this.detailsVisible = false;
        this.attachments = [];

        // 绑定事件
        this.bindEvents();

        // 检查今日任务计数
        this.checkDailyReset();
    }

    bindEvents() {
        // 入栈事件
        this.pushBtn.addEventListener('click', () => this.push());
        this.taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !this.detailsVisible) {
                this.push();
            }
        });

        // 栈操作事件
        this.popBtn.addEventListener('click', () => this.pop());
        this.peekBtn.addEventListener('click', () => this.peek());
        this.pinSelectedBtn.addEventListener('click', () => this.pinSelectedTask());
        this.clearBtn.addEventListener('click', () => this.clear());

        // 历史记录事件
        this.toggleHistoryBtn.addEventListener('click', () => this.toggleHistory());
        this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());

        // 任务详情事件
        this.toggleDetailsBtn.addEventListener('click', () => this.toggleDetails());
        this.collapseDetailsBtn.addEventListener('click', () => this.toggleDetails());
        
        // Markdown 预览事件
        this.previewBtn.addEventListener('click', () => this.showMarkdownPreview());
        this.editBtn.addEventListener('click', () => this.hideMarkdownPreview());

        // 文件上传事件
        this.taskFile.addEventListener('change', (e) => this.handleFileUpload(e));

        // 标签输入事件
        this.taskTags.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addTag();
            }
        });
        this.taskTags.addEventListener('input', () => this.updateTagsList());

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
                    case 'd':
                        e.preventDefault();
                        this.toggleDetails();
                        break;
                }
            }
        });

        // 事件委托 - 处理动态生成的按钮
        document.addEventListener('click', (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) return;

            const action = target.dataset.action;
            const taskId = target.dataset.taskId;

            switch(action) {
                case 'toggle-details':
                    this.toggleTaskDetails(parseInt(taskId));
                    break;
                case 'undo-complete':
                    this.undoComplete(taskId);
                    break;
                case 'remove-attachment':
                    const attachmentId = target.dataset.attachmentId;
                    this.removeAttachment(parseInt(attachmentId));
                    break;
                case 'remove-tag':
                    const tagToRemove = target.dataset.tag;
                    this.removeTagFromDisplay(tagToRemove);
                    break;
            }
        });

        // 任务选择事件
        document.addEventListener('click', (e) => {
            const taskItem = e.target.closest('.task-item');
            if (taskItem && !e.target.closest('[data-action]') && !e.target.closest('.expand-toggle')) {
                const taskId = parseInt(taskItem.dataset.taskId);
                this.selectTask(taskId);
            }
        });
    }

    // 入栈操作
    push() {
        const taskText = this.taskInput.value.trim();
        if (!taskText) {
            this.taskInput.focus();
            this.showNotification('请输入任务标题', 'warning');
            return;
        }

        if (taskText.length > 100) {
            this.showNotification('任务标题不能超过100个字符', 'error');
            return;
        }

        // 收集任务详情
        const task = {
            id: Date.now(),
            title: taskText,
            description: this.taskDescription.value.trim(),
            deadline: this.taskDeadline.value || null,
            priority: this.taskPriority.value,
            url: this.taskUrl.value.trim() || null,
            tags: this.getTagsFromInput(),
            attachments: [...this.attachments],
            progress: 0,
            progressHistory: [],
            timestamp: new Date(),
            index: this.stack.length
        };

        this.stack.push(task);
        this.todayTaskCount++;
        
        // 清空输入
        this.clearTaskInputs();
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
        this.showNotification(`任务 "${task.title}" 已完成并出栈`, 'success');

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
        
        // 高亮栈顶任务
        this.highlightTopTask();
        
        // 自动展开栈顶任务的详情
        const topTaskElement = this.taskStack.querySelector('.task-item:first-child');
        if (topTaskElement) {
            const taskId = topTask.id;
            const detailsElement = document.getElementById(`details-${taskId}`);
            const toggleButton = topTaskElement.querySelector('.expand-toggle');
            
            if (detailsElement && !detailsElement.classList.contains('show')) {
                // 展开详情
                detailsElement.classList.add('show');
                toggleButton.classList.add('expanded');
                topTaskElement.classList.add('expanded');
                
                // 滚动到栈顶任务
                topTaskElement.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
                
                this.showNotification(`已展开栈顶任务详情: "${topTask.title}"`, 'success');
            } else if (detailsElement && detailsElement.classList.contains('show')) {
                // 如果已经展开，则收起
                detailsElement.classList.remove('show');
                toggleButton.classList.remove('expanded');
                topTaskElement.classList.remove('expanded');
                
                this.showNotification(`已收起栈顶任务详情: "${topTask.title}"`, 'info');
            }
        }
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
            // 传递显示位置索引（从0开始，0是栈顶）
            const displayIndex = this.stack.length - 1 - i;
            const taskElement = this.createTaskElement(task, displayIndex);
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
        
        // 处理旧版本任务数据兼容性
        const title = task.title || task.content || '未命名任务';
        const priority = task.priority || 'medium';
        const tags = task.tags || [];
        const deadline = task.deadline;

        // 计算截止日期状态
        const deadlineStatus = this.getDeadlineStatus(deadline);
        const deadlineClass = deadlineStatus.class;
        const deadlineText = deadlineStatus.text;

        // 生成标签HTML
        const tagsHtml = tags.length > 0 
            ? `<div class="task-tags">
                ${tags.map(tag => `<span class="task-tag">${this.escapeHtml(tag)}</span>`).join('')}
               </div>`
            : '';

        // 生成截止日期HTML
        const deadlineHtml = deadline 
            ? `<div class="task-deadline ${deadlineClass}">
                <i class="fas fa-calendar-alt"></i>
                ${deadlineText}
               </div>`
            : '';

        // 生成图片预览HTML
        const imageAttachments = (task.attachments || []).filter(att => att.isImage && att.data);
        const imagePreviewHtml = imageAttachments.length > 0 
            ? `<div class="task-image-preview-container">
                <div class="task-image-preview-grid">
                    ${imageAttachments.slice(0, 3).map((attachment, index) => `
                        <div class="task-image-thumb" data-task-id="${task.id}" data-attachment-index="${index}" data-attachment-type="thumb">
                            <img src="${attachment.data}" alt="${this.escapeHtml(attachment.name)}" />
                            <div class="thumb-overlay">
                                <i class="fas fa-search-plus"></i>
                            </div>
                        </div>
                    `).join('')}
                    ${imageAttachments.length > 3 ? `
                        <div class="task-image-more" onclick="todoStack.toggleTaskDetails(${task.id})">
                            <span>+${imageAttachments.length - 3}</span>
                            <div class="more-text">更多</div>
                        </div>
                    ` : ''}
                </div>
               </div>`
            : '';

        // 生成进度条HTML
        const progressHtml = task.progress && task.progress > 0 
            ? `<div class="task-progress-mini-container">
                <div class="task-progress-mini">
                    <div class="task-progress-mini-fill" style="width: ${task.progress}%"></div>
                    <div class="task-progress-mini-text">${task.progress}%</div>
                </div>
               </div>`
            : '';

        // 生成状态指示器
        const statusIndicators = this.generateStatusIndicators(task);
        
        taskDiv.innerHTML = `
            <div class="task-header">
                <div class="task-title">
                    ${this.escapeHtml(title)}
                    ${statusIndicators}
                </div>
                <div class="task-priority ${priority}">
                    ${this.getPriorityIcon(priority)} ${this.getPriorityText(priority)}
                </div>
            </div>
            ${deadlineHtml}
            ${tagsHtml}
            ${progressHtml}
            ${imagePreviewHtml}
            <div class="task-meta">
                <div class="task-meta-left">
                    <span class="task-index">#${this.stack.length - stackIndex}</span>
                    <span class="task-time">${timeString}</span>
                </div>
                <div class="task-meta-right">
                    ${this.generateTaskStats(task)}
                </div>
            </div>
            <button class="expand-toggle" data-task-id="${task.id}" data-action="toggle-details">
                <i class="fas fa-chevron-down"></i>
            </button>
            <div class="task-details" id="details-${task.id}">
                ${this.generateTaskDetailsHtml(task)}
            </div>
        `;

        // 添加拖拽事件
        this.addDragEvents(taskDiv, stackIndex);

        // 添加图片点击事件
        this.addImageClickEvents(taskDiv, task);

        return taskDiv;
    }

    // 更新按钮状态
    updateButtons() {
        const hasItems = this.stack.length > 0;
        this.popBtn.disabled = !hasItems;
        this.peekBtn.disabled = !hasItems;
        this.clearBtn.disabled = !hasItems;
        
        // 更新置顶按钮状态
        const hasSelectedTask = this.selectedTaskId !== null;
        const selectedTaskNotOnTop = hasSelectedTask && this.getSelectedTaskIndex() > 0;
        this.pinSelectedBtn.disabled = !selectedTaskNotOnTop;
        
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
        // 确保 date 是一个有效的 Date 对象
        let dateObj;
        if (date instanceof Date) {
            dateObj = date;
        } else if (typeof date === 'string' || typeof date === 'number') {
            dateObj = new Date(date);
        } else {
            // 如果无法转换，返回默认值
            return '未知时间';
        }

        // 检查日期是否有效
        if (isNaN(dateObj.getTime())) {
            return '无效时间';
        }

        const now = new Date();
        const diff = now - dateObj;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return '刚刚';
        if (minutes < 60) return `${minutes}分钟前`;
        if (hours < 24) return `${hours}小时前`;
        if (days < 7) return `${days}天前`;
        
        return dateObj.toLocaleDateString('zh-CN', {
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
                    // 转换进展记录的时间戳
                    if (task.progressHistory && Array.isArray(task.progressHistory)) {
                        task.progressHistory.forEach(entry => {
                            if (entry.timestamp) {
                                entry.timestamp = new Date(entry.timestamp);
                            }
                        });
                    }
                });
                this.completedTasks.forEach(task => {
                    task.timestamp = new Date(task.timestamp);
                    if (task.completedAt) {
                        task.completedAt = new Date(task.completedAt);
                    }
                    // 转换进展记录的时间戳
                    if (task.progressHistory && Array.isArray(task.progressHistory)) {
                        task.progressHistory.forEach(entry => {
                            if (entry.timestamp) {
                                entry.timestamp = new Date(entry.timestamp);
                            }
                        });
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
                        // 转换进展记录的时间戳
                        if (task.progressHistory && Array.isArray(task.progressHistory)) {
                            task.progressHistory.forEach(entry => {
                                if (entry.timestamp) {
                                    entry.timestamp = new Date(entry.timestamp);
                                }
                            });
                        }
                    });
                    this.completedTasks.forEach(task => {
                        task.timestamp = new Date(task.timestamp);
                        if (task.completedAt) {
                            task.completedAt = new Date(task.completedAt);
                        }
                        // 转换进展记录的时间戳
                        if (task.progressHistory && Array.isArray(task.progressHistory)) {
                            task.progressHistory.forEach(entry => {
                                if (entry.timestamp) {
                                    entry.timestamp = new Date(entry.timestamp);
                                }
                            });
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

        console.log('拖拽排序 - 从位置:', fromIndex, '到位置:', toIndex);
        console.log('栈长度:', this.stack.length);
        
        // fromIndex和toIndex是显示位置索引（0是栈顶）
        // 需要转换为数组中的实际索引
        const actualFromIndex = this.stack.length - 1 - fromIndex;
        const actualToIndex = this.stack.length - 1 - toIndex;
        
        console.log('实际数组索引 - 从:', actualFromIndex, '到:', actualToIndex);

        // 移动任务
        const movedTask = this.stack.splice(actualFromIndex, 1)[0];
        this.stack.splice(actualToIndex, 0, movedTask);

        console.log('移动后的栈:', this.stack.map(t => t.title));

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
            // 当显示历史记录时，立即更新显示
            this.updateHistoryDisplay();
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
        // 只有当历史记录容器存在时才更新
        if (!this.historyList) return;

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
        
        // 处理旧版本任务数据兼容性
        const title = task.title || task.content || '未命名任务';
        const priority = task.priority || 'medium';

        historyDiv.innerHTML = `
            <div class="history-content">
                <i class="fas fa-check-circle check-icon"></i>
                <div class="history-task-info">
                    <span class="history-text">${this.escapeHtml(title)}</span>
                    <span class="history-priority ${priority}">
                        ${this.getPriorityIcon(priority)} ${this.getPriorityText(priority)}
                    </span>
                </div>
            </div>
            <div class="history-actions">
                <button class="history-undo-btn" data-task-id="${task.id}" data-action="undo-complete" title="撤销完成">
                    <i class="fas fa-undo"></i>
                </button>
            </div>
            <div class="history-meta">
                <span class="history-completed-time">完成于 ${completedTime}</span>
                <span class="history-original-time">创建于 ${originalTime}</span>
            </div>
        `;

        return historyDiv;
    }

    // 撤销完成任务
    undoComplete(taskId) {
        // 确保taskId是数字类型
        const numericTaskId = parseInt(taskId);
        const taskIndex = this.completedTasks.findIndex(task => task.id === numericTaskId);
        if (taskIndex === -1) {
            this.showNotification('任务未找到', 'error');
            console.error('撤销失败 - 任务ID:', taskId, '已完成任务列表:', this.completedTasks);
            return;
        }

        const task = this.completedTasks[taskIndex];
        
        // 从已完成任务中移除
        this.completedTasks.splice(taskIndex, 1);
        
        // 移除完成时间戳，恢复为未完成状态
        delete task.completedAt;
        
        // 重新添加到栈顶（最后一个位置，因为栈是LIFO）
        this.stack.push(task);
        
        this.updateUI();
        this.saveToStorage();
        this.showNotification(`任务"${task.title || task.content || '未命名任务'}"已恢复到待完成状态`, 'success');
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

    // ===== 进展管理功能方法 =====

    // 添加任务进展记录
    addTaskProgress(taskId) {
        const task = this.stack.find(t => t.id === taskId);
        if (!task) {
            this.showNotification('任务未找到', 'error');
            return;
        }

        const inputElement = document.querySelector(`.task-progress-input[data-task-id="${taskId}"]`);
        const progressText = inputElement ? inputElement.value.trim() : '';
        
        if (!progressText) {
            this.showNotification('请输入进展内容', 'warning');
            if (inputElement) inputElement.focus();
            return;
        }

        // 添加进展记录
        if (!task.progressHistory) {
            task.progressHistory = [];
        }

        const progressEntry = {
            id: Date.now(),
            text: progressText,
            timestamp: new Date()
        };

        task.progressHistory.push(progressEntry);

        // 清空输入
        if (inputElement) {
            inputElement.value = '';
        }

        // 更新显示
        this.refreshTaskDetails(taskId);
        this.saveToStorage();
        
        this.showNotification('进展记录已添加', 'success');
    }

    // 更新任务进度
    updateTaskProgress(taskId, progress) {
        const task = this.stack.find(t => t.id === taskId);
        if (!task) return;

        const progressValue = Math.max(0, Math.min(100, parseInt(progress)));
        task.progress = progressValue;

        // 更新滑块旁边的百分比显示
        const sliderValueElement = document.querySelector(`.task-progress-slider[data-task-id="${taskId}"]`)
            ?.parentElement.querySelector('.progress-slider-value');
        if (sliderValueElement) {
            sliderValueElement.textContent = progressValue + '%';
        }

        // 更新详情页的进度条和百分比
        const progressFillElement = document.querySelector(`#details-${taskId} .task-progress-fill`);
        const progressPercentageElement = document.querySelector(`#details-${taskId} .task-progress-percentage`);
        
        if (progressFillElement) {
            progressFillElement.style.width = progressValue + '%';
        }
        if (progressPercentageElement) {
            progressPercentageElement.textContent = progressValue + '%';
        }

        // 更新缩略图中的迷你进度条
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        if (taskElement) {
            const miniProgressFill = taskElement.querySelector('.task-progress-mini-fill');
            const miniProgressText = taskElement.querySelector('.task-progress-mini-text');
            const miniProgressContainer = taskElement.querySelector('.task-progress-mini-container');
            
            if (progressValue > 0) {
                // 如果进度大于0，显示或更新进度条
                if (!miniProgressContainer) {
                    // 如果没有进度条容器，重新生成整个任务元素
                    this.updateStackDisplay();
                } else {
                    // 更新现有进度条
                    if (miniProgressFill) {
                        miniProgressFill.style.width = progressValue + '%';
                    }
                    if (miniProgressText) {
                        miniProgressText.textContent = progressValue + '%';
                    }
                }
            } else {
                // 如果进度为0，隐藏进度条
                if (miniProgressContainer) {
                    miniProgressContainer.style.display = 'none';
                }
            }
        }

        this.saveToStorage();
    }

    // 刷新任务详情显示
    refreshTaskDetails(taskId) {
        const detailsElement = document.getElementById(`details-${taskId}`);
        if (!detailsElement) return;

        const task = this.stack.find(t => t.id === taskId);
        if (!task) return;

        // 重新生成详情HTML
        detailsElement.innerHTML = this.generateTaskDetailsHtml(task);
        
        // 重新绑定事件
        this.bindTaskProgressEvents(taskId);
        this.addImageClickEvents(detailsElement.parentElement, task);
    }

    // 绑定任务进展相关事件
    bindTaskProgressEvents(taskId) {
        // 绑定进展输入框的回车事件
        const progressInput = document.querySelector(`.task-progress-input[data-task-id="${taskId}"]`);
        if (progressInput) {
            progressInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addTaskProgress(taskId);
                }
            });
        }
    }

    // ===== 新增的任务详情功能方法 =====

    // 切换任务详情输入区域
    toggleDetails() {
        this.detailsVisible = !this.detailsVisible;
        
        if (this.detailsVisible) {
            this.taskDetailsSection.style.display = 'block';
            this.toggleDetailsBtn.classList.add('active');
            this.toggleDetailsBtn.innerHTML = '<i class="fas fa-edit"></i> 收起';
        } else {
            this.taskDetailsSection.style.display = 'none';
            this.toggleDetailsBtn.classList.remove('active');
            this.toggleDetailsBtn.innerHTML = '<i class="fas fa-edit"></i> 详情';
        }
    }

    // 切换任务详情显示
    toggleTaskDetails(taskId) {
        const detailsElement = document.getElementById(`details-${taskId}`);
        const toggleButton = detailsElement.parentElement.querySelector('.expand-toggle');
        
        if (detailsElement.classList.contains('show')) {
            detailsElement.classList.remove('show');
            toggleButton.classList.remove('expanded');
            detailsElement.parentElement.classList.remove('expanded');
        } else {
            detailsElement.classList.add('show');
            toggleButton.classList.add('expanded');
            detailsElement.parentElement.classList.add('expanded');
            
            // 展开后重新绑定图片点击事件和进展管理事件
            const task = this.stack.find(t => t.id === taskId);
            if (task) {
                this.addImageClickEvents(detailsElement.parentElement, task);
                this.bindTaskProgressEvents(taskId);
            }
        }
    }

    // 生成任务详情HTML
    generateTaskDetailsHtml(task) {
        const description = task.description || '';
        const url = task.url || '';
        const attachments = task.attachments || [];

        let html = '';

        // 描述
        if (description) {
            html += `
                <div class="task-description">
                    ${this.parseMarkdown(description)}
                </div>
            `;
        }

        // 相关链接
        if (url) {
            html += `
                <a href="${url}" target="_blank" class="task-url">
                    <i class="fas fa-external-link-alt"></i>
                    ${this.escapeHtml(url)}
                </a>
            `;
        }

        // 附件
        if (attachments.length > 0) {
            const imageAttachments = attachments.filter(att => att.isImage && att.data);
            const otherAttachments = attachments.filter(att => !att.isImage || !att.data);

            // 图片附件
            if (imageAttachments.length > 0) {
                html += `
                    <div class="task-images">
                        <div class="task-images-header">
                            <i class="fas fa-images"></i>
                            <span>图片附件 (${imageAttachments.length})</span>
                        </div>
                        <div class="task-images-grid">
                            ${imageAttachments.map((attachment, index) => `
                                <div class="task-image-item" data-task-id="${task.id}" data-attachment-index="${index}" data-attachment-type="detail">
                                    <div class="task-image-preview">
                                        <img src="${attachment.data}" alt="${this.escapeHtml(attachment.name)}" />
                                        <div class="image-overlay">
                                            <i class="fas fa-search-plus"></i>
                                        </div>
                                    </div>
                                    <div class="task-image-name">${this.escapeHtml(attachment.name)}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }

            // 其他附件
            if (otherAttachments.length > 0) {
                html += `
                    <div class="task-other-attachments">
                        <div class="task-attachments-header">
                            <i class="fas fa-paperclip"></i>
                            <span>其他附件 (${otherAttachments.length})</span>
                        </div>
                        <div class="task-attachments">
                            ${otherAttachments.map(attachment => {
                                const icon = this.getFileIcon(attachment.type || '');
                                return `
                                    <div class="task-attachment">
                                        <i class="fas fa-${icon}"></i>
                                        <span class="attachment-name">${this.escapeHtml(attachment.name)}</span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }
        }

        // 进展管理功能
        const progress = task.progress || 0;
        const progressHistory = task.progressHistory || [];
        
        html += `
            <div class="task-progress-section">
                <div class="task-progress-header">
                    <h4>
                        <i class="fas fa-chart-line"></i>
                        任务进展
                    </h4>
                    <span class="task-progress-percentage">${progress}%</span>
                </div>
                
                <div class="task-progress-bar-container">
                    <div class="task-progress-bar">
                        <div class="task-progress-fill" style="width: ${progress}%"></div>
                    </div>
                </div>
                
                <div class="task-progress-controls">
                    <div class="progress-input-group">
                        <input type="text" 
                               class="task-progress-input" 
                               placeholder="添加进展记录..." 
                               maxlength="200"
                               data-task-id="${task.id}">
                        <button class="task-add-progress-btn" 
                                onclick="todoStack.addTaskProgress(${task.id})">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    
                    <div class="progress-slider-group">
                        <label>进度:</label>
                        <input type="range" 
                               class="task-progress-slider" 
                               min="0" max="100" 
                               value="${progress}"
                               data-task-id="${task.id}"
                               onchange="todoStack.updateTaskProgress(${task.id}, this.value)">
                        <span class="progress-slider-value">${progress}%</span>
                    </div>
                </div>
                
                <div class="task-progress-history">
                    <h5>
                        <i class="fas fa-history"></i>
                        进展记录 (${progressHistory.length})
                    </h5>
                    <div class="task-progress-list">
                        ${progressHistory.length === 0 ? 
                            '<div class="no-task-progress">暂无进展记录</div>' :
                            progressHistory
                                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                                .map(entry => `
                                    <div class="task-progress-item">
                                        <div class="task-progress-item-header">
                                            <span class="task-progress-item-time">${this.formatTime(entry.timestamp || new Date())}</span>
                                        </div>
                                        <div class="task-progress-item-text">${this.escapeHtml(entry.text || '')}</div>
                                    </div>
                                `).join('')
                        }
                    </div>
                </div>
            </div>
        `;

        return html || '<p style="color: #6c757d; font-style: italic;">暂无详细信息</p>';
    }

    // 解析Markdown
    parseMarkdown(text) {
        if (!text) return '';
        
        // 简单的Markdown解析实现
        let html = text
            // 转义HTML特殊字符
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            // 标题
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            // 粗体和斜体
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // 代码
            .replace(/`(.*?)`/g, '<code>$1</code>')
            // 链接
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
            // 无序列表
            .replace(/^\s*[-*+]\s+(.*)$/gim, '<li>$1</li>')
            // 有序列表
            .replace(/^\s*\d+\.\s+(.*)$/gim, '<li>$1</li>')
            // 换行
            .replace(/\n/g, '<br>');
        
        // 包装列表项
        html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        
        return html;
    }

    // 显示Markdown预览
    showMarkdownPreview() {
        const text = this.taskDescription.value;
        this.markdownPreview.innerHTML = this.parseMarkdown(text);
        this.taskDescription.style.display = 'none';
        this.markdownPreview.style.display = 'block';
        this.previewBtn.style.display = 'none';
        this.editBtn.style.display = 'inline-flex';
    }

    // 隐藏Markdown预览
    hideMarkdownPreview() {
        this.taskDescription.style.display = 'block';
        this.markdownPreview.style.display = 'none';
        this.previewBtn.style.display = 'inline-flex';
        this.editBtn.style.display = 'none';
    }

    // 处理文件上传
    handleFileUpload(event) {
        const files = Array.from(event.target.files);
        files.forEach(file => {
            if (file.size > 10 * 1024 * 1024) { // 10MB限制
                this.showNotification(`文件 ${file.name} 超过10MB限制`, 'error');
                return;
            }

            const attachment = {
                id: Date.now() + Math.random(),
                name: file.name,
                size: file.size,
                type: file.type,
                data: null,
                isImage: file.type.startsWith('image/'),
                preview: null
            };

            // 如果是图片，生成预览
            if (attachment.isImage) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    attachment.preview = e.target.result;
                    attachment.data = e.target.result; // 保存base64数据
                    this.updateAttachmentsList();
                };
                reader.readAsDataURL(file);
            } else {
                this.attachments.push(attachment);
                this.updateAttachmentsList();
            }

            if (attachment.isImage) {
                this.attachments.push(attachment);
            }
        });
    }

    // 更新附件列表
    updateAttachmentsList() {
        this.attachmentsList.innerHTML = '';
        this.attachments.forEach(attachment => {
            const attachmentDiv = document.createElement('div');
            attachmentDiv.className = `attachment-item ${attachment.isImage ? 'image-attachment' : ''}`;
            
            if (attachment.isImage && attachment.preview) {
                attachmentDiv.innerHTML = `
                    <div class="attachment-preview" data-attachment-id="${attachment.id}">
                        <img src="${attachment.preview}" alt="${this.escapeHtml(attachment.name)}" />
                        <div class="preview-overlay">
                            <i class="fas fa-search-plus"></i>
                        </div>
                    </div>
                    <div class="attachment-info">
                        <span class="attachment-name">${this.escapeHtml(attachment.name)}</span>
                        <span class="attachment-size">${this.formatFileSize(attachment.size)}</span>
                    </div>
                    <button class="remove-btn" data-action="remove-attachment" data-attachment-id="${attachment.id}">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                
                // 添加图片点击事件
                const previewElement = attachmentDiv.querySelector('.attachment-preview');
                previewElement.addEventListener('click', () => {
                    this.showImageModal(attachment.preview, attachment.name);
                });
            } else {
                const icon = this.getFileIcon(attachment.type);
                attachmentDiv.innerHTML = `
                    <i class="fas fa-${icon}"></i>
                    <div class="attachment-info">
                        <span class="attachment-name">${this.escapeHtml(attachment.name)}</span>
                        <span class="attachment-size">${this.formatFileSize(attachment.size)}</span>
                    </div>
                    <button class="remove-btn" data-action="remove-attachment" data-attachment-id="${attachment.id}">
                        <i class="fas fa-times"></i>
                    </button>
                `;
            }
            this.attachmentsList.appendChild(attachmentDiv);
        });
    }

    // 移除附件
    removeAttachment(attachmentId) {
        this.attachments = this.attachments.filter(a => a.id !== attachmentId);
        this.updateAttachmentsList();
    }

    // 添加标签
    addTag() {
        const tagText = this.taskTags.value.trim();
        if (!tagText) return;

        const tags = tagText.split(',').map(tag => tag.trim()).filter(tag => tag);
        this.updateTagsDisplay(tags);
        this.taskTags.value = '';
    }

    // 更新标签列表
    updateTagsList() {
        const tagText = this.taskTags.value.trim();
        if (!tagText) {
            this.tagsList.innerHTML = '';
            return;
        }

        const tags = tagText.split(',').map(tag => tag.trim()).filter(tag => tag);
        this.updateTagsDisplay(tags);
    }

    // 更新标签显示
    updateTagsDisplay(tags) {
        this.tagsList.innerHTML = '';
        tags.forEach(tag => {
            const tagDiv = document.createElement('div');
            tagDiv.className = 'tag-item';
            tagDiv.innerHTML = `
                <span>${this.escapeHtml(tag)}</span>
                <button class="remove-tag" data-action="remove-tag" data-tag="${this.escapeHtml(tag)}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            this.tagsList.appendChild(tagDiv);
        });
    }

    // 从显示中移除标签
    removeTagFromDisplay(tagToRemove) {
        const currentTags = this.taskTags.value.split(',').map(tag => tag.trim()).filter(tag => tag && tag !== tagToRemove);
        this.taskTags.value = currentTags.join(', ');
        this.updateTagsList();
    }

    // 从输入获取标签
    getTagsFromInput() {
        const tagText = this.taskTags.value.trim();
        if (!tagText) return [];
        return tagText.split(',').map(tag => tag.trim()).filter(tag => tag);
    }

    // 清空任务输入
    clearTaskInputs() {
        this.taskInput.value = '';
        this.taskDescription.value = '';
        this.taskDeadline.value = '';
        this.taskPriority.value = 'medium';
        this.taskUrl.value = '';
        this.taskTags.value = '';
        this.taskFile.value = '';
        this.attachments = [];
        this.updateAttachmentsList();
        this.updateTagsList();
        this.hideMarkdownPreview();
    }

    // 获取截止日期状态
    getDeadlineStatus(deadline) {
        if (!deadline) return { class: '', text: '' };

        const now = new Date();
        const deadlineDate = new Date(deadline);
        const diffTime = deadlineDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffTime < 0) {
            return {
                class: 'overdue',
                text: `已逾期 ${Math.abs(diffDays)} 天`
            };
        } else if (diffDays <= 1) {
            return {
                class: 'due-soon',
                text: diffDays === 0 ? '今天到期' : '明天到期'
            };
        } else if (diffDays <= 7) {
            return {
                class: 'due-soon',
                text: `${diffDays} 天后到期`
            };
        } else {
            return {
                class: '',
                text: deadlineDate.toLocaleDateString('zh-CN', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })
            };
        }
    }

    // 获取优先级图标
    getPriorityIcon(priority) {
        const icons = {
            low: '🟢',
            medium: '🟡',
            high: '🔴',
            urgent: '🚨'
        };
        return icons[priority] || '🟡';
    }

    // 获取优先级文本
    getPriorityText(priority) {
        const texts = {
            low: '低',
            medium: '中',
            high: '高',
            urgent: '紧急'
        };
        return texts[priority] || '中';
    }

    // 格式化文件大小
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // 获取文件图标
    getFileIcon(fileType) {
        if (fileType.startsWith('image/')) return 'image';
        if (fileType.includes('pdf')) return 'file-pdf';
        if (fileType.includes('word') || fileType.includes('document')) return 'file-word';
        if (fileType.includes('excel') || fileType.includes('spreadsheet')) return 'file-excel';
        if (fileType.includes('powerpoint') || fileType.includes('presentation')) return 'file-powerpoint';
        if (fileType.includes('text')) return 'file-alt';
        if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('7z')) return 'file-archive';
        return 'file';
    }

    // 显示图片模态框
    showImageModal(imageSrc, imageName) {
        // 移除已存在的图片模态框
        const existingModal = document.querySelector('.image-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.className = 'image-modal';
        modal.innerHTML = `
            <div class="image-modal-content">
                <div class="image-modal-header">
                    <h3>${this.escapeHtml(imageName)}</h3>
                    <button class="image-modal-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="image-modal-body">
                    <img src="${imageSrc}" alt="${this.escapeHtml(imageName)}" />
                </div>
                <div class="image-modal-footer">
                    <button class="download-btn" onclick="todoStack.downloadImage('${imageSrc}', '${this.escapeHtml(imageName)}')">
                        <i class="fas fa-download"></i>
                        下载图片
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 绑定关闭事件
        const closeBtn = modal.querySelector('.image-modal-close');
        closeBtn.addEventListener('click', () => {
            modal.remove();
            document.body.style.overflow = 'auto';
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                document.body.style.overflow = 'auto';
            }
        });

        document.body.style.overflow = 'hidden';
    }

    // 下载图片
    downloadImage(imageSrc, imageName) {
        const link = document.createElement('a');
        link.href = imageSrc;
        link.download = imageName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // 添加图片点击事件
    addImageClickEvents(taskElement, task) {
        // 为任务栈中的缩略图添加点击事件
        const thumbElements = taskElement.querySelectorAll('[data-attachment-type="thumb"]:not([data-event-bound])');
        thumbElements.forEach(element => {
            element.addEventListener('click', (e) => {
                e.stopPropagation();
                const attachmentIndex = parseInt(element.dataset.attachmentIndex);
                const imageAttachments = (task.attachments || []).filter(att => att.isImage && att.data);
                
                if (imageAttachments[attachmentIndex]) {
                    const attachment = imageAttachments[attachmentIndex];
                    this.showImageModal(attachment.data, attachment.name);
                }
            });
            element.setAttribute('data-event-bound', 'true');
        });

        // 为任务详情中的图片添加点击事件
        const detailElements = taskElement.querySelectorAll('[data-attachment-type="detail"]:not([data-event-bound])');
        detailElements.forEach(element => {
            element.addEventListener('click', (e) => {
                e.stopPropagation();
                const attachmentIndex = parseInt(element.dataset.attachmentIndex);
                const imageAttachments = (task.attachments || []).filter(att => att.isImage && att.data);
                
                if (imageAttachments[attachmentIndex]) {
                    const attachment = imageAttachments[attachmentIndex];
                    this.showImageModal(attachment.data, attachment.name);
                }
            });
            element.setAttribute('data-event-bound', 'true');
        });
    }

    // 生成状态指示器
    generateStatusIndicators(task) {
        const indicators = [];
        
        // 附件指示器
        if (task.attachments && task.attachments.length > 0) {
            const imageCount = task.attachments.filter(att => att.isImage).length;
            const fileCount = task.attachments.length - imageCount;
            
            if (imageCount > 0) {
                indicators.push(`<span class="status-indicator image-indicator" title="${imageCount}张图片">
                    <i class="fas fa-image"></i> ${imageCount}
                </span>`);
            }
            if (fileCount > 0) {
                indicators.push(`<span class="status-indicator file-indicator" title="${fileCount}个文件">
                    <i class="fas fa-paperclip"></i> ${fileCount}
                </span>`);
            }
        }
        
        // 描述指示器
        if (task.description && task.description.trim()) {
            indicators.push(`<span class="status-indicator desc-indicator" title="包含详细描述">
                <i class="fas fa-align-left"></i>
            </span>`);
        }
        
        // URL指示器
        if (task.url && task.url.trim()) {
            indicators.push(`<span class="status-indicator url-indicator" title="包含链接">
                <i class="fas fa-link"></i>
            </span>`);
        }
        
        // 进度指示器
        if (task.progress && task.progress > 0) {
            const progressColor = task.progress >= 100 ? '#28a745' : 
                                 task.progress >= 75 ? '#17a2b8' :
                                 task.progress >= 50 ? '#ffc107' : '#fd7e14';
            indicators.push(`<span class="status-indicator progress-indicator" title="进度 ${task.progress}%" style="color: ${progressColor}">
                <i class="fas fa-chart-pie"></i> ${task.progress}%
            </span>`);
        }
        
        return indicators.length > 0 ? `<div class="task-status-indicators">${indicators.join('')}</div>` : '';
    }

    // 生成任务统计信息
    generateTaskStats(task) {
        const stats = [];
        
        // 标签数量
        if (task.tags && task.tags.length > 0) {
            stats.push(`<span class="task-stat" title="标签数量">
                <i class="fas fa-tags"></i> ${task.tags.length}
            </span>`);
        }
        
        // 任务年龄（创建时间）
        const ageInDays = Math.floor((new Date() - new Date(task.timestamp)) / (1000 * 60 * 60 * 24));
        if (ageInDays > 0) {
            stats.push(`<span class="task-stat task-age" title="创建于${ageInDays}天前">
                <i class="fas fa-clock"></i> ${ageInDays}d
            </span>`);
        }
        
        return stats.join('');
    }

    // 选择任务
    selectTask(taskId) {
        // 清除之前的选中状态
        if (this.selectedTaskId !== null) {
            const prevSelected = document.querySelector(`[data-task-id="${this.selectedTaskId}"]`);
            if (prevSelected) {
                prevSelected.classList.remove('selected');
            }
        }

        // 设置新的选中状态
        if (this.selectedTaskId === taskId) {
            // 如果点击的是已选中的任务，取消选中
            this.selectedTaskId = null;
        } else {
            this.selectedTaskId = taskId;
            const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
            if (taskElement) {
                taskElement.classList.add('selected');
            }
        }

        this.updateButtons();
    }

    // 获取选中任务在栈中的索引
    getSelectedTaskIndex() {
        if (this.selectedTaskId === null) return -1;
        return this.stack.findIndex(task => task.id === this.selectedTaskId);
    }

    // 置顶选中的任务
    pinSelectedTask() {
        if (this.selectedTaskId === null) {
            this.showNotification('请先选择要置顶的任务', 'warning');
            return;
        }

        const taskIndex = this.getSelectedTaskIndex();
        if (taskIndex === -1) {
            this.showNotification('选中的任务未找到', 'error');
            this.selectedTaskId = null;
            this.updateButtons();
            return;
        }

        if (taskIndex === this.stack.length - 1) {
            this.showNotification('该任务已在栈顶', 'warning');
            return;
        }

        // 移除任务并置顶
        const [task] = this.stack.splice(taskIndex, 1);
        this.stack.push(task);

        // 清除选中状态
        this.selectedTaskId = null;

        this.updateUI();
        this.saveToStorage();
        this.showNotification(`任务"${task.title || task.content || '未命名任务'}"已置顶`, 'success');
        
        // 置顶动画已移除 - 用户要求取消
    }

    // 置顶任务（保留原方法以兼容）
    pinToTop(taskId) {
        // 找到任务在栈中的位置
        const taskIndex = this.stack.findIndex(task => task.id === taskId);
        if (taskIndex === -1) {
            this.showNotification('任务不存在', 'error');
            return;
        }

        // 如果已经是栈顶，不需要操作
        if (taskIndex === this.stack.length - 1) {
            this.showNotification('任务已经在栈顶', 'info');
            return;
        }

        // 移动任务到栈顶
        const task = this.stack.splice(taskIndex, 1)[0];
        this.stack.push(task);

        // 更新UI和保存数据
        this.updateUI();
        this.saveToStorage();
        
        this.showNotification(`任务 "${task.title}" 已置顶`, 'success');

        // 置顶动画已移除 - 用户要求取消
    }

    // 处理URL参数
    handleUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        const taskId = urlParams.get('taskId');
        const action = urlParams.get('action');

        if (taskId && action === 'viewDetail') {
            // 延迟执行，确保UI已经渲染完成
            setTimeout(() => {
                this.openTaskDetailFromUrl(parseInt(taskId));
            }, 500);
        }
    }

    // 从URL打开任务详情
    openTaskDetailFromUrl(taskId) {
        // 查找任务
        const task = this.stack.find(t => t.id === taskId);
        if (!task) {
            this.showNotification('未找到指定的任务', 'warning');
            return;
        }

        // 滚动到任务位置
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        if (taskElement) {
            taskElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
            
            // 高亮任务
            taskElement.classList.add('highlight-task');
            setTimeout(() => {
                taskElement.classList.remove('highlight-task');
            }, 3000);
        }

        // 展开任务详情
        this.toggleTaskDetails(taskId);
        
        this.showNotification(`已定位到任务: "${task.title}"`, 'success');
        
        // 清除URL参数，避免刷新页面时重复执行
        const url = new URL(window.location);
        url.searchParams.delete('taskId');
        url.searchParams.delete('action');
        window.history.replaceState({}, document.title, url.pathname);
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
    console.log('Ctrl/Cmd + D: 切换任务详情输入');
    console.log('点击"查看栈顶详情"按钮: 展开/收起栈顶任务的详细信息');
}); 