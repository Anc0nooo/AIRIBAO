import os
import json
import re
import base64
import time
from datetime import datetime
from flask import Flask, jsonify, request, send_from_directory, Response, stream_with_context
from flask_cors import CORS

from app.config import (
    get_app_path, REPORT_FOLDER, load_template_config, save_template_config,
    get_next_day_number, get_today_file, DEFAULT_REPORT_TEMPLATE,
    DEFAULT_AI_PROMPT, update_email_config, get_email_config,
    get_default_templates
)
from app.api import generate_with_ai, generate_with_ai_stream, send_email
from app.i18n import LANGS
from app.submit import (
    load_submit_config, save_submit_config, prepare_submit_data,
    open_report_page, copy_to_clipboard, generate_quickfill_script,
    get_default_config, extract_report_sections
)

# Get parent directory for static and templates
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
flask_app = Flask(__name__, static_folder=os.path.join(BASE_DIR, 'static'), template_folder=os.path.join(BASE_DIR, 'templates'))
CORS(flask_app)

CURRENT_LANG = 'zh'
SETTINGS_FILE = os.path.join(BASE_DIR, 'settings.json')
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)


def get_text(key):
    return LANGS.get(CURRENT_LANG, LANGS['zh']).get(key, key)


def load_settings():
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
                settings = json.load(f)
                if 'language' not in settings:
                    settings['language'] = 'zh'
                if 'email' not in settings:
                    settings['email'] = ''
                if 'opacity' not in settings:
                    settings['opacity'] = 1.0
                if 'theme' not in settings:
                    settings['theme'] = 'light'
                if 'bgImage' not in settings:
                    settings['bgImage'] = None
                if 'bgVideo' not in settings:
                    settings['bgVideo'] = None
                if 'bgType' not in settings:
                    settings['bgType'] = 'image'
                return settings
        except:
            pass
    return {
        'language': 'zh',
        'email': '',
        'opacity': 1.0,
        'theme': 'light',
        'bgImage': None,
        'bgVideo': None,
        'bgType': 'image'
    }


def save_settings(settings):
    with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
        json.dump(settings, f, ensure_ascii=False, indent=2)


@flask_app.route('/')
def index():
    return send_from_directory(os.path.join(BASE_DIR, 'templates'), 'index.html')


@flask_app.route('/api/i18n/<lang>')
def get_i18n(lang):
    if lang in LANGS:
        return jsonify({'success': True, 'data': LANGS[lang]})
    return jsonify({'success': False, 'message': 'Language not found'})


@flask_app.route('/api/settings', methods=['GET'])
def get_settings():
    settings = load_settings()
    email_config = get_email_config()
    return jsonify({
        'success': True,
        'data': {
            'language': settings.get('language', 'zh'),
            'email': settings.get('email', ''),
            'opacity': settings.get('opacity', 1.0),
            'theme': settings.get('theme', 'light'),
            'bgImage': settings.get('bgImage'),
            'bgVideo': settings.get('bgVideo'),
            'bgType': settings.get('bgType', 'image'),
            'sender_email': email_config.get('sender_email', ''),
            'default_receiver': email_config.get('default_receiver', ''),
            'smtp_server': email_config.get('smtp_server', 'smtp.qq.com'),
            'smtp_port': email_config.get('smtp_port', 465)
        }
    })


@flask_app.route('/api/settings', methods=['POST'])
def update_settings():
    global CURRENT_LANG
    data = request.get_json()
    settings = load_settings()
    
    if 'language' in data:
        if data['language'] in LANGS:
            settings['language'] = data['language']
            CURRENT_LANG = data['language']
    
    if 'email' in data:
        settings['email'] = data['email']
    
    if 'opacity' in data:
        settings['opacity'] = float(data['opacity'])
    
    if 'theme' in data:
        settings['theme'] = data['theme']
    
    if 'bg_image' in data:
        settings['bgImage'] = data['bg_image']
        settings['bgType'] = 'image'
    
    if 'bg_video' in data:
        settings['bgVideo'] = data['bg_video']
        settings['bgType'] = 'video'
    
    if 'bg_type' in data:
        settings['bgType'] = data['bg_type']
    
    # Update email config in config.json
    if 'default_receiver' in data:
        update_email_config('default_receiver', data['default_receiver'])
        settings['email'] = data['default_receiver']
    
    if 'sender_email' in data:
        update_email_config('sender_email', data['sender_email'])
    
    if 'smtp_server' in data:
        update_email_config('smtp_server', data['smtp_server'])
    
    if 'smtp_port' in data:
        update_email_config('smtp_port', int(data['smtp_port']))
    
    save_settings(settings)
    email_config = get_email_config()
    return jsonify({
        'success': True,
        'data': {
            'language': settings.get('language', 'zh'),
            'email': settings.get('email', ''),
            'opacity': settings.get('opacity', 1.0),
            'theme': settings.get('theme', 'light'),
            'bgImage': settings.get('bgImage'),
            'bgVideo': settings.get('bgVideo'),
            'bgType': settings.get('bgType', 'image'),
            'sender_email': email_config.get('sender_email', ''),
            'default_receiver': email_config.get('default_receiver', ''),
            'smtp_server': email_config.get('smtp_server', 'smtp.qq.com'),
            'smtp_port': email_config.get('smtp_port', 465)
        }
    })


# ==================== Submit APIs ====================

@flask_app.route('/api/submit/config', methods=['GET'])
def get_submit_config():
    """获取提交配置"""
    config = load_submit_config()
    return jsonify({
        'success': True,
        'data': config
    })


@flask_app.route('/api/submit/config', methods=['POST'])
def update_submit_config():
    """更新提交配置"""
    data = request.get_json()
    config = load_submit_config()
    
    if 'enabled' in data:
        config['enabled'] = data['enabled']
    if 'url' in data:
        config['url'] = data['url']
    if 'fields' in data:
        config['fields'].update(data['fields'])
    if 'mapping' in data:
        config['mapping'].update(data['mapping'])
    if 'auto_open' in data:
        config['auto_open'] = data['auto_open']
    if 'auto_copy' in data:
        config['auto_copy'] = data['auto_copy']
    
    save_submit_config(config)
    return jsonify({'success': True, 'message': '配置已保存'})


@flask_app.route('/api/submit/prepare', methods=['POST'])
def prepare_submit():
    """准备提交数据"""
    data = request.get_json()
    report_content = data.get('content', '')
    config = load_submit_config()
    
    submit_data = prepare_submit_data(report_content, config)
    
    # 生成快捷填写脚本
    script = generate_quickfill_script(submit_data)
    submit_data['quickfill_script'] = script
    
    return jsonify({
        'success': True,
        'data': submit_data
    })


@flask_app.route('/api/submit/open-page', methods=['POST'])
def open_submit_page():
    """打开日报提交页面"""
    data = request.get_json()
    url = data.get('url', '') or load_submit_config().get('url', '')
    
    if not url:
        return jsonify({'success': False, 'message': '未配置日报系统URL'}), 400
    
    success = open_report_page(url)
    return jsonify({'success': success})


@flask_app.route('/api/submit/copy', methods=['POST'])
def copy_submit_content():
    """复制内容到剪贴板"""
    data = request.get_json()
    text = data.get('text', '')
    
    if not text:
        return jsonify({'success': False, 'message': '无内容可复制'}), 400
    
    success = copy_to_clipboard(text)
    return jsonify({'success': success})


@flask_app.route('/api/submit/sections', methods=['POST'])
def get_report_sections():
    """获取日报各部分内容"""
    data = request.get_json()
    report_content = data.get('content', '')
    sections = extract_report_sections(report_content)
    return jsonify({
        'success': True,
        'data': sections
    })


@flask_app.route('/api/submit/default-fields', methods=['GET'])
def get_default_submit_fields():
    """获取默认提交字段配置"""
    config = load_submit_config()
    return jsonify({
        'success': True,
        'data': config.get('fields', {})
    })


@flask_app.route('/api/upload-bg', methods=['POST'])
def upload_background():
    data = request.get_json()
    file_data = data.get('file_data', '')
    file_type = data.get('file_type', 'image')
    
    if not file_data:
        return jsonify({'success': False, 'message': 'No file data'}), 400
    
    # Generate unique filename
    ext = '.mp4' if file_type == 'video' else '.png'
    filename = f"bg_{datetime.now().strftime('%Y%m%d_%H%M%S')}{ext}"
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    
    try:
        # Remove data URL prefix
        if ',' in file_data:
            file_data = file_data.split(',')[1]
        
        with open(filepath, 'wb') as f:
            f.write(base64.b64decode(file_data))
        
        # Return URL path
        url_path = f'/uploads/{filename}'
        return jsonify({
            'success': True,
            'data': {
                'url': url_path,
                'file_type': file_type
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@flask_app.route('/uploads/<filename>')
def serve_upload(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)


@flask_app.route('/api/list-backgrounds')
def list_backgrounds():
    """列出所有历史壁纸"""
    backgrounds = []
    
    if os.path.exists(UPLOAD_FOLDER):
        for filename in sorted(os.listdir(UPLOAD_FOLDER), reverse=True):
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            if os.path.isfile(filepath):
                # 判断文件类型
                if filename.endswith('.mp4'):
                    file_type = 'video'
                elif filename.endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp')):
                    file_type = 'image'
                else:
                    continue
                
                # 获取文件修改时间
                mod_time = os.path.getmtime(filepath)
                mod_time_str = datetime.fromtimestamp(mod_time).strftime('%Y-%m-%d %H:%M')
                
                backgrounds.append({
                    'filename': filename,
                    'url': f'/uploads/{filename}',
                    'type': file_type,
                    'modified': mod_time_str,
                    'size': os.path.getsize(filepath)
                })
    
    return jsonify({
        'success': True,
        'data': backgrounds
    })


@flask_app.route('/api/delete-background/<filename>', methods=['DELETE'])
def delete_background(filename):
    """删除壁纸"""
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    
    # 安全检查，确保文件在UPLOAD_FOLDER内
    if not os.path.abspath(filepath).startswith(os.path.abspath(UPLOAD_FOLDER)):
        return jsonify({'success': False, 'message': '无效的文件路径'}), 400
    
    if os.path.exists(filepath):
        os.remove(filepath)
        return jsonify({'success': True, 'message': '已删除'})
    else:
        return jsonify({'success': False, 'message': '文件不存在'}), 404


@flask_app.route('/api/template', methods=['GET'])
def get_template():
    report_template, ai_prompt = load_template_config()
    default_report_template, default_ai_prompt = get_default_templates()
    return jsonify({
        'success': True,
        'data': {
            'report_template': report_template,
            'ai_prompt': ai_prompt,
            'default_report_template': default_report_template,
            'default_ai_prompt': default_ai_prompt
        }
    })


@flask_app.route('/api/template', methods=['POST'])
def update_template():
    data = request.get_json()
    report_template = data.get('report_template', '')
    ai_prompt = data.get('ai_prompt', '')
    
    if not report_template.strip():
        return jsonify({'success': False, 'message': get_text('template_empty')})
    
    save_template_config(report_template, ai_prompt)
    return jsonify({'success': True, 'message': get_text('template_saved')})


@flask_app.route('/api/generate', methods=['POST'])
def generate_report():
    data = request.get_json()
    mode = data.get('mode', 'ai')
    
    if mode == 'ai':
        work_text = data.get('work_text', '').strip()
        if not work_text:
            return jsonify({'success': False, 'message': get_text('please_input')})
        
        _, ai_prompt = load_template_config()
        try:
            report = generate_with_ai(work_text, ai_prompt)
            return jsonify({'success': True, 'data': {'report': report}})
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)})
    else:
        dev_tasks = [t.strip() for t in data.get('dev_tasks', '').split('\n') if t.strip()]
        deliver_tasks = [t.strip() for t in data.get('deliver_tasks', '').split('\n') if t.strip()]
        plan_tasks = [t.strip() for t in data.get('plan_tasks', '').split('\n') if t.strip()]
        support = data.get('support', '').strip()
        
        report_template, _ = load_template_config()
        
        dev_str = '\n'.join([f"{i}. {t}" for i, t in enumerate(dev_tasks, 1)]) if dev_tasks else '无'
        deliver_str = '\n'.join([f"{i}. {t}" for i, t in enumerate(deliver_tasks, 1)]) if deliver_tasks else '无'
        plan_str = '\n'.join([f"{i}. {t}" for i, t in enumerate(plan_tasks, 1)]) if plan_tasks else '无'
        support_str = support if support else '无'
        
        report = report_template.format(
            dev_tasks=dev_str,
            deliver_tasks=deliver_str,
            plan_tasks=plan_str,
            support=support_str
        )
        
        return jsonify({'success': True, 'data': {'report': report}})


@flask_app.route('/api/generate-stream', methods=['POST'])
def generate_report_stream():
    """流式生成日报"""
    data = request.get_json()
    mode = data.get('mode', 'ai')
    
    if mode != 'ai':
        return jsonify({'success': False, 'message': '仅支持AI模式流式生成'})
    
    work_text = data.get('work_text', '').strip()
    if not work_text:
        return jsonify({'success': False, 'message': get_text('please_input')})
    
    _, ai_prompt = load_template_config()
    
    def generate():
        try:
            for chunk in generate_with_ai_stream(work_text, ai_prompt):
                if chunk == '\n[DONE]':
                    yield 'data: [DONE]\n\n'
                else:
                    yield f'data: {json.dumps({"content": chunk})}\n\n'
        except Exception as e:
            yield f'data: {json.dumps({"error": str(e)})}\n\n'
    
    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
            'Connection': 'keep-alive'
        }
    )


@flask_app.route('/api/save', methods=['POST'])
def save_report():
    data = request.get_json()
    report = data.get('report', '').strip()
    
    if not report:
        return jsonify({'success': False, 'message': get_text('no_content')})
    
    today = datetime.now()
    today_str = today.strftime("%m月%d日")
    day_num = get_next_day_number()
    filename = f"{today_str} 第{day_num}天.md"
    
    if not os.path.exists(REPORT_FOLDER):
        os.makedirs(REPORT_FOLDER)
    
    file_path = os.path.join(REPORT_FOLDER, filename)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(report)
    
    return jsonify({
        'success': True,
        'data': {
            'filename': filename,
            'path': file_path
        }
    })


@flask_app.route('/api/send', methods=['POST'])
def send_report():
    data = request.get_json()
    report = data.get('report', '').strip()
    filename = data.get('filename', '日报')
    receiver = data.get('receiver', '')
    
    if not report:
        return jsonify({'success': False, 'message': get_text('no_content')})
    
    success = send_email(report, filename, receiver if receiver else None)
    
    if success:
        return jsonify({'success': True, 'message': get_text('send_success_msg')})
    else:
        return jsonify({'success': False, 'message': get_text('send_error')})


@flask_app.route('/api/history', methods=['GET'])
def get_history():
    history_dirs = ['历史日报', '日报', 'reports', 'history']
    all_files = []
    
    if os.path.exists(REPORT_FOLDER):
        for f in os.listdir(REPORT_FOLDER):
            if f.endswith('.txt') or f.endswith('.md'):
                all_files.append({
                    'filename': f,
                    'path': os.path.join(REPORT_FOLDER, f),
                    'dir': REPORT_FOLDER
                })
    
    for dir_name in history_dirs:
        dir_path = os.path.join(get_app_path(), dir_name)
        if os.path.exists(dir_path) and dir_path != REPORT_FOLDER:
            for f in os.listdir(dir_path):
                if f.endswith('.txt') or f.endswith('.md'):
                    all_files.append({
                        'filename': f,
                        'path': os.path.join(dir_path, f),
                        'dir': dir_path
                    })
    
    all_files.sort(key=lambda x: os.path.getmtime(x['path']), reverse=True)
    
    files = []
    for item in all_files:
        display_name = item['filename'][:-4] if item['filename'].endswith('.txt') else item['filename'][:-3]
        files.append({
            'filename': item['filename'],
            'display_name': display_name,
            'path': item['path']
        })
    
    return jsonify({'success': True, 'data': files})


@flask_app.route('/api/history/<filename>', methods=['GET', 'PUT'])
def history_file(filename):
    if request.method == 'GET':
        history_dirs = ['历史日报', '日报', 'reports', 'history']
        search_dirs = [REPORT_FOLDER]
        
        for dir_name in history_dirs:
            dir_path = os.path.join(get_app_path(), dir_name)
            if os.path.exists(dir_path) and dir_path not in search_dirs:
                search_dirs.append(dir_path)
        
        for dir_path in search_dirs:
            file_path = os.path.join(dir_path, filename)
            if os.path.exists(file_path):
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    content = content.replace('\r\n', '\n').replace('\r', '\n')
                    content = re.sub(r'(\d+)\.\n', r'\1. ', content)
                    return jsonify({'success': True, 'data': {'filename': filename, 'content': content}})
                except Exception as e:
                    return jsonify({'success': False, 'message': str(e)})
        
        return jsonify({'success': False, 'message': 'File not found'})
    
    elif request.method == 'PUT':
        data = request.get_json()
        if not data or 'content' not in data:
            return jsonify({'success': False, 'message': 'Content is required'}), 400
        
        content = data['content']
        history_dirs = ['历史日报', '日报', 'reports', 'history']
        search_dirs = [REPORT_FOLDER]
        
        for dir_name in history_dirs:
            dir_path = os.path.join(get_app_path(), dir_name)
            if os.path.exists(dir_path) and dir_path not in search_dirs:
                search_dirs.append(dir_path)
        
        for dir_path in search_dirs:
            file_path = os.path.join(dir_path, filename)
            if os.path.exists(file_path):
                try:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(content)
                    return jsonify({'success': True})
                except Exception as e:
                    return jsonify({'success': False, 'message': str(e)})
        
        return jsonify({'success': False, 'message': 'File not found'})


@flask_app.route('/api/day-info')
def get_day_info():
    day_num = get_next_day_number()
    today = datetime.now()
    today_str = today.strftime("%m月%d日")
    today_file = get_today_file()
    
    return jsonify({
        'success': True,
        'data': {
            'day_number': day_num,
            'today_str': today_str,
            'today_file': today_file
        }
    })


if __name__ == '__main__':
    settings = load_settings()
    CURRENT_LANG = settings.get('language', 'zh')
    flask_app.run(host='127.0.0.1', port=5000, debug=False)
