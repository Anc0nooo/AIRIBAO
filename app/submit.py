"""
日报自动提交模块
支持打开日报系统、填写表单、提交日报
"""
import json
import os
import sys
import webbrowser
from datetime import datetime

def get_app_path():
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    else:
        return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def get_submit_config_path():
    return os.path.join(get_app_path(), "submit_config.json")

DEFAULT_SUBMIT_CONFIG = {
    "enabled": True,
    "url": "",  # 日报系统URL
    "fields": {
        "project": "",        # 项目
        "manager": "",        # 项目经理
        "project_level": "",  # 项目评级
        "work_activity": "",  # 工作活动
        "office_location": "",  # 办公地点
        "is_business_trip": False,  # 是否出差
        "normal_hours": 8.0,  # 正常工作量
        "overtime_hours": 0.0  # 加班工作量
    },
    "mapping": {
        "work_content": "today_report",  # 工作内容 = 今日日报
        "deliverable": "plan_and_support"  # 成果物 = 明日计划+所需支持
    },
    "auto_open": True,  # 生成后自动打开日报页面
    "auto_copy": True   # 自动复制内容到剪贴板
}

def load_submit_config():
    """加载提交配置"""
    config_path = get_submit_config_path()
    if os.path.exists(config_path):
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
                # 合并默认配置确保所有键存在
                for key in DEFAULT_SUBMIT_CONFIG:
                    if key not in config:
                        config[key] = DEFAULT_SUBMIT_CONFIG[key]
                if 'fields' in config:
                    for key in DEFAULT_SUBMIT_CONFIG['fields']:
                        if key not in config['fields']:
                            config['fields'][key] = DEFAULT_SUBMIT_CONFIG['fields'][key]
                if 'mapping' in config:
                    for key in DEFAULT_SUBMIT_CONFIG['mapping']:
                        if key not in config['mapping']:
                            config['mapping'][key] = DEFAULT_SUBMIT_CONFIG['mapping'][key]
                return config
        except Exception as e:
            print(f"Warning: Failed to load submit config: {e}")
    return DEFAULT_SUBMIT_CONFIG.copy()

def save_submit_config(config):
    """保存提交配置"""
    config_path = get_submit_config_path()
    with open(config_path, 'w', encoding='utf-8') as f:
        json.dump(config, f, ensure_ascii=False, indent=2)
    return True

def extract_report_sections(report_content):
    """从日报内容中提取各个部分"""
    sections = {
        'today_report': '',      # 今日工作内容
        'plan_tasks': '',        # 明日计划
        'support': '',           # 所需支持
        'deliverable': ''        # 成果物(明日计划+所需支持)
    }
    
    content = report_content.strip()
    
    # 尝试按常见格式分割
    patterns = [
        ('今日完成|今日工作|工作内容|完成任务', '明日计划|工作计划|明天计划'),
        ('完成任务|开发类|交付类', '明日计划|工作计划'),
    ]
    
    # 提取明日计划和所需支持作为成果物
    plan_match = None
    support_match = None
    
    # 查找明日计划
    import re
    plan_patterns = [
        r'(?:明日计划|工作计划|明天计划)[：:]\s*([\s\S]*?)(?=所需支持|备注|$)',
        r'(?:计划)[：:]\s*([\s\S]*?)(?=所需支持|备注|$)',
    ]
    
    for pattern in plan_patterns:
        match = re.search(pattern, content)
        if match:
            plan_match = match.group(1).strip()
            break
    
    # 查找所需支持
    support_patterns = [
        r'(?:所需支持|需要支持|备注)[：:]\s*([\s\S]*?)$',
        r'(?:支持)[：:]\s*([\s\S]*?)$',
    ]
    
    for pattern in support_patterns:
        match = re.search(pattern, content)
        if match:
            support_match = match.group(1).strip()
            break
    
    sections['today_report'] = content
    sections['plan_tasks'] = plan_match or ''
    sections['support'] = support_match or ''
    
    # 成果物 = 明日计划 + 所需支持
    deliverable_parts = []
    if plan_match:
        deliverable_parts.append(f"明日计划：\n{plan_match}")
    if support_match:
        deliverable_parts.append(f"所需支持：\n{support_match}")
    sections['deliverable'] = '\n\n'.join(deliverable_parts) if deliverable_parts else content
    
    return sections

def prepare_submit_data(report_content, config):
    """准备提交数据"""
    sections = extract_report_sections(report_content)
    
    mapping = config.get('mapping', DEFAULT_SUBMIT_CONFIG['mapping'])
    fields = config.get('fields', {})
    
    submit_data = {
        'url': config.get('url', ''),
        'fields': {},
        'content_type': 'report'
    }
    
    # 工作内容字段
    work_content_key = mapping.get('work_content', 'today_report')
    submit_data['fields']['work_content'] = sections.get(work_content_key, sections['today_report'])
    
    # 成果物字段
    deliverable_key = mapping.get('deliverable', 'deliverable')
    submit_data['fields']['deliverable'] = sections.get(deliverable_key, sections['deliverable'])
    
    # 固定字段
    submit_data['fields'].update({
        'project': fields.get('project', ''),
        'manager': fields.get('manager', ''),
        'project_level': fields.get('project_level', ''),
        'work_activity': fields.get('work_activity', ''),
        'office_location': fields.get('office_location', ''),
        'is_business_trip': fields.get('is_business_trip', False),
        'normal_hours': fields.get('normal_hours', 8.0),
        'overtime_hours': fields.get('overtime_hours', 0.0)
    })
    
    submit_data['sections'] = sections
    return submit_data

def open_report_page(url):
    """在浏览器中打开日报页面"""
    if url:
        webbrowser.open(url)
        return True
    return False

def copy_to_clipboard(text):
    """复制文本到剪贴板"""
    try:
        import subprocess
        if sys.platform == 'win32':
            process = subprocess.Popen(['clip'], stdin=subprocess.PIPE)
            process.communicate(text.encode('utf-16'))
        elif sys.platform == 'darwin':
            process = subprocess.Popen(['pbcopy'], stdin=subprocess.PIPE)
            process.communicate(text.encode('utf-8'))
        else:
            process = subprocess.Popen(['xclip', '-selection', 'clipboard'], stdin=subprocess.PIPE)
            process.communicate(text.encode('utf-8'))
        return True
    except Exception as e:
        print(f"Failed to copy to clipboard: {e}")
        return False

def generate_quickfill_script(submit_data):
    """生成一个快速填写的 JavaScript 脚本"""
    work_content = submit_data['fields']['work_content'].replace('"', '\\"').replace('\n', '\\n')
    deliverable = submit_data['fields']['deliverable'].replace('"', '\\"').replace('\n', '\\n')
    
    script = f"""
// 日报自动填写脚本
// 在日报填写页面按 F12 打开控制台，粘贴此脚本运行

(function() {{
    const workContent = "{work_content}";
    const deliverable = "{deliverable}";
    
    // 查找工作内容输入框
    const workContentSelectors = [
        'textarea[placeholder*="工作内容"]',
        'textarea[name*="work"]',
        'input[placeholder*="工作内容"]',
        '#workContent',
        '.work-content'
    ];
    
    // 查找成果物输入框
    const deliverableSelectors = [
        'textarea[placeholder*="成果物"]',
        'textarea[name*="deliverable"]',
        'input[placeholder*="成果物"]',
        '#deliverable',
        '.deliverable'
    ];
    
    function setValue(selectors, value) {{
        for (const sel of selectors) {{
            const el = document.querySelector(sel);
            if (el) {{
                el.value = value;
                el.dispatchEvent(new Event('input', {{ bubbles: true }}));
                el.dispatchEvent(new Event('change', {{ bubbles: true }}));
                console.log('✓ 已填入:', sel);
                return true;
            }}
        }}
        return false;
    }}
    
    const workDone = setValue(workContentSelectors, workContent);
    const deliverDone = setValue(deliverableSelectors, deliverable);
    
    if (workDone) console.log('✅ 工作内容已填写');
    else console.log('未找到工作内容输入框');
    
    if (deliverDone) console.log('✅ 成果物已填写');
    else console.log('未找到成果物输入框');
    
    console.log('\\n工作内容已复制到剪贴板，可直接粘贴');
    console.log('成果物已复制到剪贴板，可直接粘贴');
}})();
"""
    return script

def get_default_config():
    """获取默认配置"""
    return DEFAULT_SUBMIT_CONFIG.copy()
