// Chrome 插件后台脚本
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        // 插件首次安装
        console.log('TODOStack 插件已安装');
        
        // 设置默认数据
        chrome.storage.local.set({
            todostack_data: {
                stack: [],
                completedTasks: [],
                todayTaskCount: 0,
                lastUpdated: new Date().toISOString()
            },
            todostack_last_date: new Date().toDateString()
        });
        
        // 打开欢迎页面
        chrome.tabs.create({
            url: chrome.runtime.getURL('index.html')
        });
    } else if (details.reason === 'update') {
        // 插件更新
        console.log('TODOStack 插件已更新到版本', chrome.runtime.getManifest().version);
    }
});

// 处理插件图标点击
chrome.action.onClicked.addListener((tab) => {
    // 这个事件在 manifest.json 中定义了 default_popup 时不会触发
    // 但保留作为备用
    console.log('TODOStack 图标被点击');
});

// 监听存储变化，可以用于同步数据
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.todostack_data) {
        console.log('TODOStack 数据已更新');
    }
});

// 设置插件徽章（显示待完成任务数量）
function updateBadge() {
    chrome.storage.local.get(['todostack_data'], (result) => {
        if (result.todostack_data && result.todostack_data.stack) {
            const taskCount = result.todostack_data.stack.length;
            const badgeText = taskCount > 0 ? taskCount.toString() : '';
            
            chrome.action.setBadgeText({
                text: badgeText
            });
            
            chrome.action.setBadgeBackgroundColor({
                color: taskCount > 0 ? '#667eea' : '#ccc'
            });
        }
    });
}

// 定期更新徽章
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.todostack_data) {
        updateBadge();
    }
});

// 初始化徽章
updateBadge(); 