let currentLang = 'zh';
let i18nData = {};
let reportContent = '';
let currentFilename = '';
let currentTheme = 'light';
let contextMenuTarget = null;
let currentOpacity = 1.0;
let bgVideoElement = null;
let currentBgImage = null;
let currentBgVideo = null;

async function init() {
  await loadLanguage();
  await loadSettings();
  await loadDayInfo();
  applyTheme();
  applyOpacity();
  bindEvents();
}

async function loadLanguage() {
  try {
    const response = await fetch(`/api/i18n/${currentLang}`);
    const result = await response.json();
    if (result.success) {
      i18nData = result.data;
      applyTranslations();
    }
  } catch (e) {
    console.error('Failed to load language:', e);
  }
}

async function loadSettings() {
  try {
    const response = await fetch('/api/settings');
    const result = await response.json();
    if (result.success) {
      if (result.data.language) {
        currentLang = result.data.language;
      }
      if (result.data.theme) {
        currentTheme = result.data.theme;
      }
      if (result.data.opacity !== undefined) {
        currentOpacity = result.data.opacity;
      }
      if (result.data.bgType === 'video' && result.data.bgVideo) {
        applyVideoBackground(result.data.bgVideo);
        currentBgVideo = result.data.bgVideo;
        currentBgImage = null;
      } else if (result.data.bgImage) {
        applyCustomBackground(result.data.bgImage);
        currentBgImage = result.data.bgImage;
        currentBgVideo = null;
      }
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
}

async function loadDayInfo() {
  try {
    const response = await fetch('/api/day-info');
    const result = await response.json();
    if (result.success) {
      const dayText = i18nData['day'] || 'Day {day}';
      document.getElementById('dayBadge').textContent = dayText.replace('{day}', result.data.day_number);
    }
  } catch (e) {
    console.error('Failed to load day info:', e);
  }
}

function applyTranslations() {
  document.getElementById('appTitle').textContent = i18nData['title'] || '日报生成器';
  document.getElementById('appSubtitle').textContent = i18nData['subtitle'] || '';
  document.getElementById('inputAreaLabel').textContent = i18nData['input_area'] || '输入区域';
  document.getElementById('aiModeLabel').textContent = i18nData['ai_mode'] || 'AI生成';
  document.getElementById('manualModeLabel').textContent = i18nData['manual_mode'] || '手动';
  document.getElementById('aiPromptLabel').textContent = i18nData['ai_prompt'] || '';
  document.getElementById('aiText').placeholder = i18nData['ai_example'] || '';
  document.getElementById('devTasksLabel').textContent = i18nData['dev_tasks'] || '';
  document.getElementById('deliverTasksLabel').textContent = i18nData['deliver_tasks'] || '';
  document.getElementById('planTasksLabel').textContent = i18nData['plan_tasks'] || '';
  document.getElementById('supportLabel').textContent = i18nData['support'] || '';
  document.getElementById('supportText').placeholder = i18nData['support'] || '';
  document.getElementById('generateLabel').textContent = i18nData['generate'] || '生成内容';
  document.getElementById('clearLabel').textContent = i18nData['clear'] || '清空';
  document.getElementById('previewLabel').textContent = i18nData['preview'] || '日报预览';
  document.getElementById('saveLabel').textContent = i18nData['save'] || '保存';
  document.getElementById('sendLabel').textContent = i18nData['send'] || '发送';
  document.getElementById('previewHintText').textContent = i18nData['preview_hint'] || '';
  document.getElementById('loaderText').textContent = i18nData['ai_generating'] || 'AI正在生成日报...';
  document.title = i18nData['title'] || '日报生成器';
}

function applyTheme() {
  document.body.classList.remove('theme-light', 'theme-dark', 'theme-custom');
  document.body.classList.add(`theme-${currentTheme}`);
  
  // Remove video if switching away from custom
  if (currentTheme !== 'custom') {
    removeVideoBackground();
    document.body.style.backgroundImage = '';
    document.body.style.background = '';
  }
}

function applyOpacity() {
  const root = document.documentElement;
  
  // Direct mapping: opacity 0-1.0
  // At 0: fully transparent (no card bg, no input bg, no blur)
  // At 1: fully opaque with normal blur
  const cardOpacity = currentOpacity;
  const inputOpacity = currentOpacity * 0.7;
  const blurAmount = (currentOpacity * 20).toFixed(0) + 'px';
  
  root.style.setProperty('--card-opacity', cardOpacity.toFixed(2));
  root.style.setProperty('--input-opacity', inputOpacity.toFixed(2));
  root.style.setProperty('--blur-amount', blurAmount);
}

function applyCustomBackground(bgImage) {
  removeVideoBackground();
  if (bgImage) {
    document.body.style.backgroundImage = `url(${bgImage})`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundRepeat = 'no-repeat';
    document.body.classList.add('theme-custom');
    document.body.classList.remove('theme-light', 'theme-dark');
  }
}

function applyVideoBackground(bgVideo) {
  removeVideoBackground();
  
  // Create video element as background
  bgVideoElement = document.createElement('video');
  bgVideoElement.id = 'bgVideo';
  bgVideoElement.autoplay = true;
  bgVideoElement.loop = true;
  bgVideoElement.muted = true;
  bgVideoElement.playsInline = true;
  bgVideoElement.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    object-fit: cover;
    z-index: -1;
    pointer-events: none;
  `;
  bgVideoElement.src = bgVideo;
  bgVideoElement.type = 'video/mp4';
  
  document.body.prepend(bgVideoElement);
  document.body.classList.add('theme-custom');
  document.body.classList.remove('theme-light', 'theme-dark');
  document.body.style.backgroundImage = 'none';
}

function removeVideoBackground() {
  if (bgVideoElement) {
    bgVideoElement.remove();
    bgVideoElement = null;
  }
}

function bindEvents() {
  // ============ 窗口拖拽控制 - 防止文本操作时窗体移动 ============
  
  // 阻止所有元素的默认拖拽行为（防止拖动选择文字时触发窗口移动）
  document.addEventListener('dragstart', (e) => {
    // 允许在输入框中的选择操作，但阻止默认的拖拽行为
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
      // 在这些元素中，我们仍然阻止dragstart，但让mouse事件正常工作
      e.preventDefault();
    }
  });

  // 关键：在mousedown时，阻止输入元素上的事件传播
  // 这样可以防止PyWebView将文本选择操作误解释为窗口拖拽
  document.addEventListener('mousedown', (e) => {
    const target = e.target;
    
    // 如果点击的是输入元素，阻止事件传播到文档级别
    if (isInputElement(target)) {
      e.stopPropagation();
    }
  }, true); // 使用捕获阶段以便优先处理

  // 在mouseup时恢复正常行为
  document.addEventListener('mouseup', (e) => {
    if (isInputElement(e.target)) {
      e.stopPropagation();
    }
  }, true);

  // 阻止mousemove在输入元素上传播（防止拖拽移动）
  document.addEventListener('mousemove', (e) => {
    if (isInputElement(e.target)) {
      e.stopPropagation();
    }
  }, true);

  // 为header-left添加手动拖拽触发
  const headerLeft = document.querySelector('.header-left');
  if (headerLeft) {
    headerLeft.addEventListener('mousedown', (e) => {
      // 只有左键点击时才触发拖拽
      if (e.button === 0) {
        // 阻止默认行为和事件传播
        e.preventDefault();
        e.stopPropagation();
        
        // 使用setTimeout确保在事件处理后调用drag
        setTimeout(() => {
          try {
            if (window.pywebview && window.pywebview.api) {
              window.pywebview.api.drag_window();
            }
          } catch (err) {
            console.log('Drag not available:', err);
          }
        }, 10);
      }
    });
  }

  // 辅助函数：判断是否为输入元素
  function isInputElement(el) {
    if (!el) return false;
    const tag = el.tagName;
    if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (tag === 'INPUT') {
      // 排除按钮类型的input
      const type = el.type;
      return type !== 'button' && type !== 'submit' && type !== 'reset' && type !== 'checkbox' && type !== 'radio';
    }
    return false;
  }

  // 阻止wheel事件在输入元素上的默认行为（避免滚动冲突）
  document.addEventListener('wheel', (e) => {
    if (isInputElement(e.target)) {
      // 允许滚轮在textarea中滚动
      e.stopPropagation();
    }
  }, true);

  // ============ 以下为原有的事件绑定 ============

  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.dataset.mode;
      document.getElementById('aiMode').classList.toggle('hidden', mode !== 'ai');
      document.getElementById('manualMode').classList.toggle('hidden', mode !== 'manual');
    });
  });

  document.getElementById('generateBtn').addEventListener('click', generateReport);
  document.getElementById('clearBtn').addEventListener('click', clearAll);
  document.getElementById('saveBtn').addEventListener('click', saveReport);
  document.getElementById('sendBtn').addEventListener('click', sendReport);
  document.getElementById('submitReportBtn').addEventListener('click', submitReportToSystem);
  document.getElementById('historyBtn').addEventListener('click', openHistory);
  document.getElementById('templateBtn').addEventListener('click', openTemplate);
  document.getElementById('settingsBtn').addEventListener('click', openSettings);
  document.getElementById('themeBtn').addEventListener('click', openThemeSettings);
  document.getElementById('closeModal').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'modalOverlay') closeModal();
  });

  // Window controls
  const winMinimize = document.getElementById('winMinimize');
  const winMaximize = document.getElementById('winMaximize');
  const winClose = document.getElementById('winClose');
  
  if (winMinimize) {
    winMinimize.addEventListener('click', () => {
      try {
        if (window.pywebview && window.pywebview.api) {
          window.pywebview.api.minimize_window();
        }
      } catch (e) {
        console.log('Minimize not available');
      }
    });
  }
  
  if (winMaximize) {
    winMaximize.addEventListener('click', () => {
      try {
        if (window.pywebview && window.pywebview.api) {
          window.pywebview.api.toggle_maximize_window();
          updateMaximizeIcon();
        }
      } catch (e) {
        console.log('Toggle maximize not available');
      }
    });
  }
  
  if (winClose) {
    winClose.addEventListener('click', () => {
      try {
        if (window.pywebview && window.pywebview.api) {
          window.pywebview.api.close_window();
        }
      } catch (e) {
        console.log('Close not available');
      }
    });
  }
  
  // Update maximize icon based on state
  function updateMaximizeIcon() {
    if (window.pywebview && window.pywebview.api) {
      window.pywebview.api.is_maximized_window().then(maximized => {
        const icon = winMaximize.querySelector('svg');
        if (maximized) {
          icon.innerHTML = '<rect x="3.5" y="2.5" width="6" height="6" fill="none" stroke="currentColor" stroke-width="1.2"/><rect x="2.5" y="3.5" width="6" height="6" fill="none" stroke="currentColor" stroke-width="1.2"/>';
        } else {
          icon.innerHTML = '<rect x="2" y="2" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1.2"/>';
        }
      }).catch(() => {
        // Fallback - just change icon
      });
    }
  }

  // Context menu for textareas and inputs
  document.addEventListener('contextmenu', (e) => {
    if (e.target.tagName === 'TEXTAREA' || (e.target.tagName === 'INPUT' && e.target.type === 'text')) {
      e.preventDefault();
      showContextMenu(e);
    }
  });

  // Context menu items
  document.getElementById('ctxCut').addEventListener('click', () => {
    if (contextMenuTarget) {
      document.execCommand('cut');
      hideContextMenu();
    }
  });
  document.getElementById('ctxCopy').addEventListener('click', () => {
    if (contextMenuTarget) {
      document.execCommand('copy');
      hideContextMenu();
    }
  });
  document.getElementById('ctxPaste').addEventListener('click', () => {
    if (contextMenuTarget) {
      document.execCommand('paste');
      hideContextMenu();
    }
  });
  document.getElementById('ctxSelectAll').addEventListener('click', () => {
    if (contextMenuTarget) {
      contextMenuTarget.select();
      hideContextMenu();
    }
  });

  // Hide context menu on click outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.context-menu')) {
      hideContextMenu();
    }
  });
}

function showContextMenu(e) {
  contextMenuTarget = e.target;
  
  const menu = document.getElementById('contextMenu');
  const text = contextMenuTarget.value || '';
  const start = contextMenuTarget.selectionStart || 0;
  const end = contextMenuTarget.selectionEnd || 0;
  const hasSelection = start !== end;
  
  menu.style.display = 'block';
  menu.style.left = e.pageX + 'px';
  menu.style.top = e.pageY + 'px';
  
  document.getElementById('ctxCut').style.opacity = hasSelection ? '1' : '0.5';
  document.getElementById('ctxCopy').style.opacity = hasSelection ? '1' : '0.5';
  document.getElementById('ctxPaste').style.opacity = '1';
}

function hideContextMenu() {
  document.getElementById('contextMenu').style.display = 'none';
  contextMenuTarget = null;
}

async function generateReport() {
  const activeMode = document.querySelector('.mode-btn.active').dataset.mode;
  const loader = document.getElementById('loaderOverlay');
  
  // For AI mode, use streaming
  if (activeMode === 'ai') {
    const workText = document.getElementById('aiText').value.trim();
    if (!workText) {
      showToast(i18nData['please_input'] || '请输入工作内容', 'error');
      return;
    }
    
    // Show preview area and prepare for streaming
    const hint = document.getElementById('previewHint');
    const textarea = document.getElementById('reportText');
    hint.classList.add('hidden');
    textarea.classList.remove('hidden');
    textarea.value = '';
    textarea.placeholder = i18nData['generating'] || 'AI正在生成...';
    loader.classList.remove('hidden');
    
    try {
      const response = await fetch('/api/generate-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: activeMode,
          work_text: workText
        })
      });
      
      if (!response.ok) {
        throw new Error('生成失败');
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        // Parse SSE format: "data: ...\n\n"
        const parts = buffer.split('\n\n');
        buffer = parts.pop();
        
        for (const part of parts) {
          const trimmed = part.trim();
          if (!trimmed.startsWith('data: ')) continue;
          
          const dataStr = trimmed.slice(6);
          
          if (dataStr === '[DONE]') {
            // Generation complete
            break;
          }
          
          try {
            const data = JSON.parse(dataStr);
            if (data.error) {
              throw new Error(data.error);
            }
            if (data.content) {
              fullContent += data.content;
              textarea.value = fullContent;
              textarea.scrollTop = textarea.scrollHeight;
            }
          } catch (e) {
            console.warn('Failed to parse chunk:', dataStr);
          }
        }
      }
      
      if (fullContent) {
        reportContent = fullContent;
        textarea.value = fullContent;
        document.getElementById('saveBtn').disabled = false;
        document.getElementById('sendBtn').disabled = false;
        document.getElementById('submitReportBtn').disabled = false;
        showToast(i18nData['success_msg'] || '生成成功', 'success');
      } else {
        showToast('生成内容为空', 'error');
      }
      
    } catch (e) {
      console.error('Stream error:', e);
      showToast(i18nData['generate_error'] || '生成失败', 'error');
    } finally {
      loader.classList.add('hidden');
      textarea.placeholder = '';
    }
  } else {
    // Manual mode - keep original behavior
    loader.classList.remove('hidden');
    
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: activeMode,
          work_text: document.getElementById('aiText').value,
          dev_tasks: document.getElementById('devTasks').value,
          deliver_tasks: document.getElementById('deliverTasks').value,
          plan_tasks: document.getElementById('planTasks').value,
          support: document.getElementById('supportText').value
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        reportContent = result.data.report;
        showReport(reportContent);
        showToast(i18nData['success_msg'] || '生成成功', 'success');
      } else {
        showToast(result.message || i18nData['error'] || '错误', 'error');
      }
    } catch (e) {
      showToast(i18nData['generate_error'] || '生成失败', 'error');
    } finally {
      loader.classList.add('hidden');
    }
  }
}

function showReport(report) {
  const hint = document.getElementById('previewHint');
  const textarea = document.getElementById('reportText');
  hint.classList.add('hidden');
  textarea.classList.remove('hidden');
  textarea.value = report;
  document.getElementById('saveBtn').disabled = false;
  document.getElementById('sendBtn').disabled = false;
  // 提交按钮始终可见，有内容时启用
  document.getElementById('submitReportBtn').disabled = false;
}

async function submitReportToSystem() {
  const textarea = document.getElementById('reportText');
  const content = textarea.value;
  
  if (!content.trim()) {
    showToast(i18nData['no_content'] || '没有内容可提交', 'error');
    return;
  }
  
  try {
    // Show loading
    showToast(i18nData['preparing_submit'] || '正在准备提交...', 'success');
    
    // Prepare submit data
    const prepareRes = await fetch('/api/submit/prepare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    const prepareData = await prepareRes.json();
    
    if (!prepareData.success) {
      showToast(prepareData.message || '准备失败', 'error');
      return;
    }
    
    const submitData = prepareData.data;
    
    // Show submit confirmation modal
    showSubmitModal(submitData);
    
  } catch (e) {
    showToast('提交失败: ' + e.message, 'error');
  }
}

function showSubmitModal(submitData) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  
  const modal = document.createElement('div');
  modal.className = 'glass-modal';
  
  const header = document.createElement('div');
  header.className = 'modal-header';
  
  const titleEl = document.createElement('h3');
  titleEl.textContent = i18nData['submit_title'] || '提交日报到系统';
  header.appendChild(titleEl);
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'close-btn';
  closeBtn.innerHTML = '×';
  closeBtn.onclick = () => overlay.remove();
  header.appendChild(closeBtn);
  
  const body = document.createElement('div');
  body.className = 'modal-body';
  
  // Show extracted sections
  const sections = submitData.sections;
  const hasUrl = submitData.url && submitData.url.trim() !== '';
  
  body.innerHTML = `
    <div style="margin-bottom:16px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span style="width:8px;height:8px;border-radius:50%;background:var(--primary);"></span>
        <strong style="color:var(--text-primary);">${i18nData['work_content'] || '工作内容'}</strong>
      </div>
      <div style="padding:10px 12px;background:var(--input-bg);border-radius:10px;font-size:13px;line-height:1.6;max-height:120px;overflow-y:auto;color:var(--text-primary);white-space:pre-wrap;">
        ${escapeHtml(sections.today_report || '无')}
      </div>
    </div>
    <div style="margin-bottom:16px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span style="width:8px;height:8px;border-radius:50%;background:#10b981;"></span>
        <strong style="color:var(--text-primary);">${i18nData['deliverable'] || '成果物（明日计划+所需支持）'}</strong>
      </div>
      <div style="padding:10px 12px;background:var(--input-bg);border-radius:10px;font-size:13px;line-height:1.6;max-height:120px;overflow-y:auto;color:var(--text-primary);white-space:pre-wrap;">
        ${escapeHtml(sections.deliverable || '无')}
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:12px;">
      <button class="btn-secondary small" id="copyAllBtn" style="flex:1;"> ${i18nData['copy_all'] || '复制全部内容'}</button>
      <button class="btn-secondary small" id="copyWorkBtn">${i18nData['copy_work'] || '复制工作'}</button>
      <button class="btn-secondary small" id="copyDeliverBtn">${i18nData['copy_deliverable'] || '复制成果'}</button>
    </div>
    ${hasUrl ? `
    <div style="margin-bottom:12px;">
      <button class="btn-primary" id="openPageBtn" style="width:100%;"> ${i18nData['open_submit_page'] || '打开日报页面并提交'}</button>
    </div>
    ` : `
    <div style="margin-bottom:12px;padding:10px 12px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:10px;font-size:12px;color:#f59e0b;">
      ⚠️ ${i18nData['no_url_config'] || '未配置日报系统地址，请先在设置中配置'}
    </div>
    `}
    <div style="margin-top:8px;padding:10px 12px;background:rgba(58,107,255,0.08);border-radius:10px;font-size:12px;color:var(--text-secondary);line-height:1.5;">
      <strong style="color:var(--primary);">💡 ${i18nData['tip'] || '提示'}：</strong>
      ${i18nData['submit_tip'] || '点击"复制全部内容"后，打开日报页面在对应位置粘贴即可完成提交。'}
    </div>
  `;
  
  modal.appendChild(header);
  modal.appendChild(body);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  // Event handlers
  body.querySelector('#copyAllBtn').onclick = async () => {
    const allContent = `【工作内容】\n${submitData.fields.work_content}\n\n【成果物】\n${submitData.fields.deliverable}`;
    await copyText(allContent);
    showToast(i18nData['copied_all'] || '已复制全部内容', 'success');
  };
  
  body.querySelector('#copyWorkBtn').onclick = async () => {
    await copyText(submitData.fields.work_content);
    showToast(i18nData['copied'] || '已复制工作内容', 'success');
  };
  
  body.querySelector('#copyDeliverBtn').onclick = async () => {
    await copyText(submitData.fields.deliverable);
    showToast(i18nData['copied'] || '已复制成果物', 'success');
  };
  
  const openPageBtn = body.querySelector('#openPageBtn');
  if (openPageBtn) {
    openPageBtn.onclick = async () => {
      try {
        // 先复制内容
        await copyText(submitData.fields.work_content);
        showToast(i18nData['content_copied'] || '内容已复制，正在打开页面...', 'success');
        
        // 延迟一点再打开页面
        setTimeout(async () => {
          try {
            const res = await fetch('/api/submit/open-page', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: submitData.url })
            });
            const data = await res.json();
            if (data.success) {
              showToast(i18nData['page_opened'] || '页面已打开，请粘贴内容', 'success');
              overlay.remove();
            } else {
              showToast(data.message || '打开失败', 'error');
            }
          } catch (e) {
            showToast('打开失败', 'error');
          }
        }, 300);
      } catch (e) {
        showToast('操作失败', 'error');
      }
    };
  }
  
  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    // Fallback
    try {
      const res = await fetch('/api/submit/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      return data.success;
    } catch (err) {
      return false;
    }
  }
}

function clearAll() {
  showConfirmModal(
    i18nData['confirm_clear'] || '确定要清空所有内容吗？',
    () => {
      document.getElementById('aiText').value = '';
      document.getElementById('devTasks').value = '';
      document.getElementById('deliverTasks').value = '';
      document.getElementById('planTasks').value = '';
      document.getElementById('supportText').value = '';
      document.getElementById('reportText').value = '';
      document.getElementById('previewHint').classList.remove('hidden');
      document.getElementById('reportText').classList.add('hidden');
      document.getElementById('saveBtn').disabled = true;
      document.getElementById('sendBtn').disabled = true;
      document.getElementById('submitReportBtn').disabled = true;
      reportContent = '';
      currentFilename = '';
      showToast(i18nData['cleared'] || '已清空', 'success');
    },
    i18nData['confirm_title'] || '确认操作'
  );
}

async function saveReport() {
  const report = document.getElementById('reportText').value;
  if (!report.trim()) {
    showToast(i18nData['no_content'] || '没有内容可保存', 'error');
    return;
  }
  
  try {
    const response = await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report })
    });
    
    const result = await response.json();
    if (result.success) {
      currentFilename = result.data.filename;
      showToast((i18nData['save_msg'] || '保存成功').replace('{path}', result.data.path), 'success');
    } else {
      showToast(result.message || '保存失败', 'error');
    }
  } catch (e) {
    showToast('保存失败', 'error');
  }
}

async function sendReport() {
  const report = document.getElementById('reportText').value;
  if (!report.trim()) {
    showToast(i18nData['no_content'] || '没有内容可保存', 'error');
    return;
  }
  
  try {
    const response = await fetch('/api/settings');
    const settingsResult = await response.json();
    const receiver = settingsResult.success ? settingsResult.data.default_receiver : '';
    
    const sendResponse = await fetch('/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        report,
        filename: currentFilename || '日报',
        receiver
      })
    });
    
    const result = await sendResponse.json();
    if (result.success) {
      showToast(i18nData['send_success_msg'] || '发送成功', 'success');
    } else {
      showToast(result.message || i18nData['send_error'] || '发送失败', 'error');
    }
  } catch (e) {
    showToast(i18nData['send_error'] || '发送失败', 'error');
  }
}

async function openHistory() {
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  modalTitle.textContent = i18nData['history_title'] || '历史日报';
  
  modalBody.innerHTML = `<div style="text-align:center;padding:20px;color:#8a9bb8;">加载中...</div>`;
  openModal();
  
  try {
    const response = await fetch('/api/history');
    const result = await response.json();
    
    if (result.success && result.data.length > 0) {
      modalBody.innerHTML = `
        <div style="display:grid;grid-template-columns:200px 1fr;gap:16px;height:450px;">
          <div>
            <h4 style="margin-bottom:8px;font-size:13px;color:#4a5b7a;">${i18nData['history_list']}</h4>
            <div class="history-list" id="historyList"></div>
          </div>
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <h4 style="font-size:13px;color:#4a5b7a;">${i18nData['history_content']}</h4>
              <div>
                <button class="btn-secondary" id="editBtn" style="display:none;padding:4px 12px;font-size:12px;">编辑</button>
                <button class="btn-secondary" id="saveEditBtn" style="display:none;padding:4px 12px;font-size:12px;">保存</button>
                <button class="btn-secondary" id="cancelEditBtn" style="display:none;padding:4px 12px;font-size:12px;margin-left:6px;">取消</button>
              </div>
            </div>
            <div class="history-content hint" id="historyContent">
              <p>${i18nData['history_select_hint']}</p>
            </div>
          </div>
        </div>
      `;
      
      const historyList = document.getElementById('historyList');
      const historyContent = document.getElementById('historyContent');
      let currentFile = null;
      let isEditing = false;
      let originalContent = '';
      
      document.getElementById('editBtn').addEventListener('click', () => {
        if (!currentFile) return;
        isEditing = true;
        originalContent = historyContent.textContent;
        historyContent.innerHTML = `<textarea id="editContent" style="width:100%;height:100%;min-height:300px;padding:12px;border:1px solid var(--input-border);border-radius:8px;background:var(--input-bg);color:var(--text-primary);font-size:14px;line-height:1.6;resize:none;outline:none;backdrop-filter:blur(10px);">${escapeHtml(originalContent)}</textarea>`;
        document.getElementById('editBtn').style.display = 'none';
        document.getElementById('saveEditBtn').style.display = 'inline-block';
        document.getElementById('cancelEditBtn').style.display = 'inline-block';
      });
      
      document.getElementById('cancelEditBtn').addEventListener('click', () => {
        if (!currentFile) return;
        isEditing = false;
        historyContent.textContent = originalContent;
        document.getElementById('editBtn').style.display = 'inline-block';
        document.getElementById('saveEditBtn').style.display = 'none';
        document.getElementById('cancelEditBtn').style.display = 'none';
      });
      
      document.getElementById('saveEditBtn').addEventListener('click', async () => {
        if (!currentFile || !isEditing) return;
        const editContent = document.getElementById('editContent').value;
        try {
          const saveResponse = await fetch(`/api/history/${encodeURIComponent(currentFile)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: editContent })
          });
          const saveResult = await saveResponse.json();
          if (saveResult.success) {
            showToast('保存成功');
            originalContent = editContent;
            isEditing = false;
            historyContent.textContent = editContent;
            document.getElementById('editBtn').style.display = 'inline-block';
            document.getElementById('saveEditBtn').style.display = 'none';
            document.getElementById('cancelEditBtn').style.display = 'none';
          } else {
            showToast(saveResult.message || '保存失败');
          }
        } catch (e) {
          showToast('保存失败');
        }
      });
      
      result.data.forEach(file => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.textContent = file.display_name;
        item.addEventListener('click', async () => {
          const loadFile = async () => {
            currentFile = file.filename;
            historyContent.className = 'history-content';
            historyContent.textContent = '加载中...';
            document.getElementById('editBtn').style.display = 'none';
            document.getElementById('saveEditBtn').style.display = 'none';
            document.getElementById('cancelEditBtn').style.display = 'none';
            try {
              const fileResponse = await fetch(`/api/history/${encodeURIComponent(file.filename)}`);
              const fileResult = await fileResponse.json();
              if (fileResult.success) {
                originalContent = fileResult.data.content;
                historyContent.textContent = fileResult.data.content;
                document.getElementById('editBtn').style.display = 'inline-block';
              }
            } catch (e) {
              historyContent.textContent = '加载失败';
            }
          };
          
          if (isEditing) {
            showConfirmModal(
              i18nData['confirm_leave_edit'] || '正在编辑中，切换将丢失修改，确定继续吗？',
              () => {
                isEditing = false;
                loadFile();
              }
            );
          } else {
            loadFile();
          }
        });
        historyList.appendChild(item);
      });
    } else {
      modalBody.innerHTML = `<div class="history-item empty">${i18nData['no_history']}</div>`;
    }
  } catch (e) {
    modalBody.innerHTML = `<div class="history-item empty">加载失败</div>`;
  }
}

async function openTemplate() {
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  modalTitle.textContent = i18nData['template_settings'] || '模板设置';
  
  openModal();
  
  try {
    const response = await fetch('/api/template');
    const result = await response.json();
    
    if (result.success) {
      const { report_template, ai_prompt, default_report_template, default_ai_prompt } = result.data;
      
      modalBody.innerHTML = `
        <div class="template-tabs">
          <button class="template-tab active" data-tab="report">${i18nData['report_template']}</button>
          <button class="template-tab" data-tab="prompt">${i18nData['ai_prompt']}</button>
        </div>
        <div class="template-editor active" id="report-editor">
          <textarea id="reportTemplate">${escapeHtml(report_template)}</textarea>
          <button class="btn-secondary" id="resetTemplate">${i18nData['reset_template']}</button>
        </div>
        <div class="template-editor" id="prompt-editor">
          <textarea id="aiPrompt">${escapeHtml(ai_prompt)}</textarea>
          <button class="btn-secondary" id="resetPrompt">${i18nData['reset_prompt']}</button>
        </div>
        <div style="margin-top:14px;">
          <button class="btn-primary" id="saveTemplate">${i18nData['save']}</button>
        </div>
      `;
      
      document.querySelectorAll('.template-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          document.querySelectorAll('.template-tab').forEach(t => t.classList.remove('active'));
          document.querySelectorAll('.template-editor').forEach(e => e.classList.remove('active'));
          tab.classList.add('active');
          document.getElementById(`${tab.dataset.tab}-editor`).classList.add('active');
        });
      });
      
      document.getElementById('resetTemplate').addEventListener('click', () => {
        document.getElementById('reportTemplate').value = default_report_template;
      });
      
      document.getElementById('resetPrompt').addEventListener('click', () => {
        document.getElementById('aiPrompt').value = default_ai_prompt;
      });
      
      document.getElementById('saveTemplate').addEventListener('click', async () => {
        const reportTemplate = document.getElementById('reportTemplate').value;
        const aiPrompt = document.getElementById('aiPrompt').value;
        
        try {
          const saveResponse = await fetch('/api/template', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ report_template: reportTemplate, ai_prompt: aiPrompt })
          });
          const saveResult = await saveResponse.json();
          if (saveResult.success) {
            showToast(i18nData['template_saved'] || '保存成功', 'success');
          } else {
            showToast(saveResult.message || '保存失败', 'error');
          }
        } catch (e) {
          showToast('保存失败', 'error');
        }
      });
    }
  } catch (e) {
    modalBody.innerHTML = '<p style="color:#ef4444;">加载失败</p>';
  }
}

async function openSettings() {
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  modalTitle.textContent = i18nData['settings_title'] || '设置';
  
  openModal();
  
  try {
    const response = await fetch('/api/settings');
    const result = await response.json();
    const s = result.data;
    
    const langOptions = [
      { value: 'zh', label: i18nData['chinese'] || '中文' },
      { value: 'en', label: i18nData['english'] || 'English' },
      { value: 'ja', label: i18nData['japanese'] || '日本語' }
    ];
    
    modalBody.innerHTML = `
      <div class="settings-form">
        <div class="setting-group">
          <label>${i18nData['language']}</label>
          <select id="languageSelect">
            ${langOptions.map(opt => `<option value="${opt.value}" ${opt.value === s.language ? 'selected' : ''}>${opt.label}</option>`).join('')}
          </select>
        </div>
        <div class="setting-group">
          <label>${i18nData['transparency'] || '透明度'}</label>
          <div style="display:flex;align-items:center;gap:12px;">
            <input type="range" id="opacitySlider" min="0" max="1.0" step="0.05" value="${s.opacity}">
            <span id="opacityValue" style="min-width:40px;font-size:13px;color:var(--text-secondary);">${Math.round(s.opacity * 100)}%</span>
          </div>
        </div>
        <div class="setting-group" style="border-top:1px solid var(--input-border);padding-top:12px;margin-top:8px;">
          <label style="font-weight:600;">${i18nData['email_settings'] || '邮箱设置'}</label>
        </div>
        <div class="setting-group">
          <label>${i18nData['receiver_email'] || '接收邮箱'}</label>
          <input type="email" id="receiverEmail" placeholder="${i18nData['email_hint']}" value="${escapeHtml(s.default_receiver || '')}">
        </div>
        
        <!-- 日报提交配置 -->
        <div class="setting-group" style="border-top:1px solid var(--input-border);padding-top:12px;margin-top:8px;">
          <label style="font-weight:600;">${i18nData['submit_settings'] || '日报提交设置'}</label>
        </div>
        <div class="setting-group">
          <label>${i18nData['submit_url'] || '日报系统地址'}</label>
          <input type="url" id="submitUrl" placeholder="https://your-company.com/report" value="">
        </div>
        <div class="setting-group">
          <label style="font-size:13px;color:var(--text-secondary);">${i18nData['submit_auto'] || '自动化选项'}</label>
          <div style="display:flex;gap:16px;margin-top:8px;">
            <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--text-secondary);">
              <input type="checkbox" id="autoOpen" checked>
              ${i18nData['auto_open'] || '生成后打开页面'}
            </label>
            <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--text-secondary);">
              <input type="checkbox" id="autoCopy" checked>
              ${i18nData['auto_copy'] || '自动复制内容'}
            </label>
          </div>
        </div>
        <button class="btn-primary" id="saveSettings" style="margin-top:12px;">${i18nData['apply'] || '应用'}</button>
      </div>
    `;
    
    // Load submit config and populate form
    try {
      const submitRes = await fetch('/api/submit/config');
      const submitData = await submitRes.json();
      if (submitData.success) {
        const sc = submitData.data;
        setTimeout(() => {
          const urlEl = document.getElementById('submitUrl');
          if (urlEl) urlEl.value = sc.url || '';
          
          document.getElementById('autoOpen').checked = sc.auto_open !== false;
          document.getElementById('autoCopy').checked = sc.auto_copy !== false;
        }, 50);
      }
    } catch (e) {
      console.log('Submit config not available');
    }
    
    // Opacity slider live preview
    const opacitySlider = document.getElementById('opacitySlider');
    const opacityValue = document.getElementById('opacityValue');
    opacitySlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      opacityValue.textContent = Math.round(val * 100) + '%';
      currentOpacity = val;
      applyOpacity();
    });
    
    document.getElementById('saveSettings').addEventListener('click', async () => {
      const newLang = document.getElementById('languageSelect').value;
      const newOpacity = parseFloat(document.getElementById('opacitySlider').value);
      const newReceiverEmail = document.getElementById('receiverEmail').value;
      
      try {
        const saveResponse = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            language: newLang,
            opacity: newOpacity,
            default_receiver: newReceiverEmail
          })
        });
        const saveResult = await saveResponse.json();
        
        // Save submit config
        const submitConfig = {
          enabled: true,  // 始终启用
          url: document.getElementById('submitUrl').value,
          auto_open: document.getElementById('autoOpen').checked,
          auto_copy: document.getElementById('autoCopy').checked
        };
        
        await fetch('/api/submit/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitConfig)
        });
        
        if (saveResult.success) {
          currentLang = newLang;
          currentOpacity = newOpacity;
          await loadLanguage();
          await loadDayInfo();
          showToast(i18nData['settings_saved'] || '设置已保存', 'success');
        }
      } catch (e) {
        showToast('保存失败', 'error');
      }
    });
  } catch (e) {
    modalBody.innerHTML = '<p style="color:#ef4444;">加载失败</p>';
  }
}

function openThemeSettings() {
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  modalTitle.textContent = i18nData['theme_settings'] || '主题设置';
  
  openModal();
  
  modalBody.innerHTML = `
    <div class="theme-options">
      <div class="theme-option ${currentTheme === 'light' ? 'active' : ''}" data-theme="light">
        <div class="theme-preview"></div>
        <span>${i18nData['theme_light'] || '白天'}</span>
      </div>
      <div class="theme-option ${currentTheme === 'dark' ? 'active' : ''}" data-theme="dark">
        <div class="theme-preview"></div>
        <span>${i18nData['theme_dark'] || '夜间'}</span>
      </div>
      <div class="theme-option ${currentTheme === 'custom' ? 'active' : ''}" data-theme="custom">
        <div class="theme-preview"></div>
        <span>${i18nData['theme_custom'] || '自定义'}</span>
      </div>
    </div>
    <div id="customSettings" class="hidden">
      <div class="custom-bg-upload">
        <div style="display:flex;gap:10px;margin-bottom:10px;">
          <button class="btn-secondary" id="uploadImageBtn" style="flex:1;">${i18nData['upload_image'] || '上传图片'}</button>
          <button class="btn-secondary" id="uploadVideoBtn" style="flex:1;">${i18nData['upload_video'] || '上传视频(MP4)'}</button>
        </div>
        <input type="file" id="bgImageUpload" accept="image/*" style="display:none;">
        <input type="file" id="bgVideoUpload" accept="video/mp4" style="display:none;">
        <div id="uploadStatus" style="text-align:center;font-size:13px;color:var(--text-muted);margin-top:8px;"></div>
      </div>
      
      <!-- 历史壁纸列表 -->
      <div class="history-wallpapers">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:20px;margin-bottom:10px;">
          <h4 style="color:var(--text-primary);font-size:14px;font-weight:600;margin:0;">${i18nData['history_wallpapers'] || '历史壁纸'}</h4>
          <button class="btn-secondary small" id="refreshWallpapers" style="font-size:12px;padding:4px 10px;">${i18nData['refresh'] || '刷新'}</button>
        </div>
        <div id="wallpaperList" class="wallpaper-list">
          <div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px;">加载中...</div>
        </div>
      </div>
      
      <button class="btn-secondary" id="resetBg" style="width:100%;margin-top:10px;">${i18nData['reset_bg'] || '重置背景'}</button>
    </div>
  `;
  
  const customSettings = document.getElementById('customSettings');
  if (currentTheme === 'custom') {
    customSettings.classList.remove('hidden');
  }
  
  // Load history wallpapers
  loadHistoryWallpapers();
  
  const refreshWallpapers = document.getElementById('refreshWallpapers');
  if (refreshWallpapers) {
    refreshWallpapers.addEventListener('click', loadHistoryWallpapers);
  }
  
  document.querySelectorAll('.theme-option').forEach(option => {
    option.addEventListener('click', async () => {
      document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('active'));
      option.classList.add('active');
      
      const theme = option.dataset.theme;
      currentTheme = theme;
      
      if (theme === 'custom') {
        customSettings.classList.remove('hidden');
        loadHistoryWallpapers();
      } else {
        customSettings.classList.add('hidden');
        removeVideoBackground();
        applyTheme();
        await saveTheme();
      }
    });
  });
  
  const uploadImageBtn = document.getElementById('uploadImageBtn');
  const uploadVideoBtn = document.getElementById('uploadVideoBtn');
  const bgImageUpload = document.getElementById('bgImageUpload');
  const bgVideoUpload = document.getElementById('bgVideoUpload');
  const uploadStatus = document.getElementById('uploadStatus');
  
  uploadImageBtn.addEventListener('click', () => bgImageUpload.click());
  uploadVideoBtn.addEventListener('click', () => bgVideoUpload.click());
  
  bgImageUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      uploadStatus.textContent = '上传中...';
      try {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const fileData = event.target.result;
          
          // Upload to server
          const uploadResponse = await fetch('/api/upload-bg', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              file_data: fileData,
              file_type: 'image'
            })
          });
          const uploadResult = await uploadResponse.json();
          
          if (uploadResult.success) {
            applyCustomBackground(uploadResult.data.url);
            await saveTheme();
            uploadStatus.textContent = i18nData['bg_updated'] || '背景已更新';
            showToast(i18nData['bg_updated'] || '背景已更新', 'success');
            // Refresh history list
            loadHistoryWallpapers();
          } else {
            uploadStatus.textContent = '上传失败';
            showToast('上传失败', 'error');
          }
        };
        reader.readAsDataURL(file);
      } catch (err) {
        uploadStatus.textContent = '上传失败';
        showToast('上传失败', 'error');
      }
    }
  });
  
  bgVideoUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      uploadStatus.textContent = '上传中...';
      try {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const fileData = event.target.result;
          
          // Upload to server
          const uploadResponse = await fetch('/api/upload-bg', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              file_data: fileData,
              file_type: 'video'
            })
          });
          const uploadResult = await uploadResponse.json();
          
          if (uploadResult.success) {
            applyVideoBackground(uploadResult.data.url);
            await saveTheme(null, uploadResult.data.url, 'video');
            uploadStatus.textContent = '视频背景已更新';
            showToast('视频背景已更新', 'success');
            // Refresh history list
            loadHistoryWallpapers();
          } else {
            uploadStatus.textContent = '上传失败';
            showToast('上传失败', 'error');
          }
        };
        reader.readAsDataURL(file);
      } catch (err) {
        uploadStatus.textContent = '上传失败';
        showToast('上传失败', 'error');
      }
    }
  });
  
  document.getElementById('resetBg').addEventListener('click', async () => {
    removeVideoBackground();
    document.body.style.backgroundImage = '';
    document.body.classList.remove('theme-custom');
    document.body.classList.add('theme-light');
    currentTheme = 'light';
    customSettings.classList.add('hidden');
    await saveTheme(null, null, 'image');
    showToast(i18nData['bg_reset'] || '背景已重置', 'success');
  });
}

async function loadHistoryWallpapers() {
  const wallpaperList = document.getElementById('wallpaperList');
  if (!wallpaperList) return;
  
  wallpaperList.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px;">加载中...</div>';
  
  try {
    const response = await fetch('/api/list-backgrounds');
    const result = await response.json();
    
    if (result.success && result.data.length > 0) {
      wallpaperList.innerHTML = '';
      
      result.data.forEach(bg => {
        const item = document.createElement('div');
        item.className = 'wallpaper-item';
        item.style.cssText = `
          position: relative;
          border-radius: 10px;
          overflow: hidden;
          cursor: pointer;
          border: 2px solid transparent;
          transition: all 0.2s;
          background: var(--input-bg);
        `;
        
        // Create thumbnail/preview
        if (bg.type === 'image') {
          item.innerHTML = `
            <div style="width:100%;aspect-ratio:1;overflow:hidden;background:#1a1a2e;">
              <img src="${bg.url}" style="width:100%;height:100%;object-fit:cover;" loading="lazy">
            </div>
            <div style="padding:6px 8px;font-size:11px;color:var(--text-secondary);text-align:center;">
              ${bg.modified}
            </div>
            <button class="delete-bg" data-filename="${bg.filename}" style="position:absolute;top:4px;right:4px;width:22px;height:22px;border-radius:50%;background:rgba(0,0,0,0.6);color:#fff;border:none;cursor:pointer;font-size:14px;display:none;align-items:center;justify-content:center;line-height:1;">×</button>
          `;
        } else {
          item.innerHTML = `
            <div style="width:100%;aspect-ratio:1;overflow:hidden;background:#1a1a2e;display:flex;align-items:center;justify-content:center;position:relative;">
              <video src="${bg.url}" style="width:100%;height:100%;object-fit:cover;" muted></video>
              <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.6);border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
                <span style="color:white;font-size:18px;">▶</span>
              </div>
            </div>
            <div style="padding:6px 8px;font-size:11px;color:var(--text-secondary);text-align:center;">
              🎬 ${bg.modified}
            </div>
            <button class="delete-bg" data-filename="${bg.filename}" style="position:absolute;top:4px;right:4px;width:22px;height:22px;border-radius:50%;background:rgba(0,0,0,0.6);color:#fff;border:none;cursor:pointer;font-size:14px;display:none;align-items:center;justify-content:center;line-height:1;">×</button>
          `;
        }
        
        // Check if this is current background
        if ((bg.type === 'image' && currentBgImage === bg.url) || 
            (bg.type === 'video' && currentBgVideo === bg.url)) {
          item.style.borderColor = 'var(--primary)';
        }
        
        // Hover effects
        item.addEventListener('mouseenter', () => {
          item.querySelector('.delete-bg').style.display = 'flex';
          item.style.transform = 'scale(1.05)';
          item.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        });
        
        item.addEventListener('mouseleave', () => {
          item.querySelector('.delete-bg').style.display = 'none';
          item.style.transform = 'scale(1)';
          item.style.boxShadow = 'none';
        });
        
        // Click to select
        item.addEventListener('click', async (e) => {
          if (e.target.classList.contains('delete-bg')) return;
          
          if (bg.type === 'image') {
            applyCustomBackground(bg.url);
            await saveTheme(bg.url, null, 'image');
          } else {
            applyVideoBackground(bg.url);
            await saveTheme(null, bg.url, 'video');
          }
          
          showToast(i18nData['bg_updated'] || '背景已更新', 'success');
          // Update selected state
          document.querySelectorAll('.wallpaper-item').forEach(i => i.style.borderColor = '');
          item.style.borderColor = 'var(--primary)';
        });
        
        // Delete button
        const deleteBtn = item.querySelector('.delete-bg');
        deleteBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const filename = deleteBtn.dataset.filename;
          
          showConfirmModal(
            i18nData['confirm_delete_bg'] || '确定要删除这个壁纸吗？',
            async () => {
              try {
                const deleteRes = await fetch(`/api/delete-background/${encodeURIComponent(filename)}`, {
                  method: 'DELETE'
                });
                const deleteResult = await deleteRes.json();
                if (deleteResult.success) {
                  showToast(i18nData['deleted'] || '已删除', 'success');
                  loadHistoryWallpapers();
                } else {
                  showToast(deleteResult.message || '删除失败', 'error');
                }
              } catch (err) {
                showToast('删除失败', 'error');
              }
            }
          );
        });
        
        wallpaperList.appendChild(item);
      });
    } else {
      wallpaperList.innerHTML = `
        <div style="text-align:center;padding:30px 20px;color:var(--text-muted);font-size:13px;">
          <div style="font-size:40px;margin-bottom:10px;">🖼️</div>
          <div>${i18nData['no_wallpapers'] || '暂无历史壁纸'}</div>
          <div style="font-size:12px;margin-top:5px;">${i18nData['upload_first'] || '上传图片或视频作为背景'}</div>
        </div>
      `;
    }
  } catch (err) {
    console.error('Failed to load wallpapers:', err);
    wallpaperList.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px;">加载失败</div>`;
  }
}

async function saveTheme(bgImage = null, bgVideo = null, bgType = null) {
  try {
    const body = { theme: currentTheme };
    if (bgImage) {
      body.bg_image = bgImage;
      body.bg_type = 'image';
      currentBgImage = bgImage;
      currentBgVideo = null;
    } else if (bgVideo) {
      body.bg_video = bgVideo;
      body.bg_type = bgType || 'video';
      currentBgVideo = bgVideo;
      currentBgImage = null;
    } else if (currentTheme !== 'custom') {
      body.bg_image = null;
      body.bg_video = null;
      body.bg_type = 'image';
      currentBgImage = null;
      currentBgVideo = null;
    }
    
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch (e) {
    console.error('Failed to save theme:', e);
  }
}

function openModal() {
  document.getElementById('modalOverlay').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');
  
  toast.className = 'toast ' + type;
  toastMessage.textContent = message;
  toast.classList.remove('hidden');
  
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}

function showConfirmModal(message, onConfirm, title) {
  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  
  const modal = document.createElement('div');
  modal.className = 'glass-modal';
  modal.style.maxWidth = '420px';
  
  const header = document.createElement('div');
  header.className = 'modal-header';
  
  const titleEl = document.createElement('h3');
  titleEl.textContent = title || i18nData['confirm_title'] || '确认操作';
  header.appendChild(titleEl);
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'close-btn';
  closeBtn.innerHTML = '×';
  closeBtn.onclick = () => overlay.remove();
  header.appendChild(closeBtn);
  
  const body = document.createElement('div');
  body.className = 'modal-body';
  body.style.padding = '28px';
  
  const messageEl = document.createElement('p');
  messageEl.textContent = message;
  messageEl.style.color = 'var(--text-primary)';
  messageEl.style.fontSize = '15px';
  messageEl.style.lineHeight = '1.6';
  messageEl.style.marginBottom = '24px';
  body.appendChild(messageEl);
  
  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.gap = '10px';
  actions.style.justifyContent = 'flex-end';
  
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn-secondary';
  cancelBtn.textContent = i18nData['cancel'] || '取消';
  cancelBtn.onclick = () => overlay.remove();
  
  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'btn-primary';
  confirmBtn.style.flex = '0 0 auto';
  confirmBtn.textContent = i18nData['confirm'] || '确定';
  confirmBtn.onclick = () => {
    overlay.remove();
    onConfirm && onConfirm();
  };
  
  actions.appendChild(cancelBtn);
  actions.appendChild(confirmBtn);
  body.appendChild(actions);
  
  modal.appendChild(header);
  modal.appendChild(body);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

init();
