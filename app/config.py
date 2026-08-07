import os
import re
import json
import sys
from datetime import datetime

def get_app_path():
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    else:
        # Return parent directory (project root)
        return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def get_config_path():
    return os.path.join(get_app_path(), "config.json")

# Load config from file
def load_app_config():
    config_path = get_config_path()
    default_config = {
        "api": {
            "key": "",
            "base_url": "https://ark.cn-beijing.volces.com/api/v3",
            "model_endpoint": ""
        },
        "email": {
            "sender_email": "",
            "sender_auth_code": "",
            "smtp_server": "smtp.qq.com",
            "smtp_port": 465,
            "default_receiver": ""
        },
        "template": {
            "report": "",
            "ai_prompt": ""
        }
    }
    
    if os.path.exists(config_path):
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
                # Merge with defaults to ensure all keys exist
                for section in default_config:
                    if section not in config:
                        config[section] = default_config[section]
                    else:
                        for key in default_config[section]:
                            if key not in config[section]:
                                config[section][key] = default_config[section][key]
                return config
        except Exception as e:
            print(f"Warning: Failed to load config.json: {e}")
    
    return default_config

# Save config to file
def save_app_config(config):
    config_path = get_config_path()
    with open(config_path, 'w', encoding='utf-8') as f:
        json.dump(config, f, ensure_ascii=False, indent=2)

# Load config at startup
APP_CONFIG = load_app_config()

# API Configuration
API_KEY = APP_CONFIG['api']['key']
API_BASE = APP_CONFIG['api']['base_url']
MODEL_ENDPOINT_ID = APP_CONFIG['api']['model_endpoint']

# Email Configuration
SENDER_EMAIL = APP_CONFIG['email']['sender_email']
SENDER_AUTH_CODE = APP_CONFIG['email']['sender_auth_code']
SMTP_SERVER = APP_CONFIG['email']['smtp_server']
SMTP_PORT = APP_CONFIG['email']['smtp_port']
DEFAULT_RECEIVER = APP_CONFIG['email']['default_receiver']

REPORT_FOLDER = os.path.join(get_app_path(), "日报")

WINDOW_WIDTH = 1000
WINDOW_HEIGHT = 750

COLORS = {
    'primary': '#0ea5e9',
    'primary_light': '#38bdf8',
    'primary_lighter': '#7dd3fc',
    'primary_dark': '#0284c7',
    'bg_main': '#f0f9ff',
    'bg_input': '#e0f2fe',
    'bg_white': '#ffffff',
    'text_primary': '#0369a1',
    'text_hint': '#64b5f6',
    'text_muted': '#64748b',
    'border_light': '#bae6fd',
}

FONT_FAMILY = 'Comic Sans MS'

# Load templates from config.json
# Actual default templates (never change)
ACTUAL_DEFAULT_REPORT_TEMPLATE = "今日完成任务：\n开发类任务：\n{dev_tasks}\n\n交付类任务：\n{deliver_tasks}\n\n明日计划：\n{plan_tasks}\n\n所需支持：{support}"
ACTUAL_DEFAULT_AI_PROMPT = "你是一个日报助手。请根据用户输入的工作描述生成日报。\n\n用户今日工作描述：\n{work_description}\n\n生成的日报："

DEFAULT_REPORT_TEMPLATE = APP_CONFIG['template']['report']
DEFAULT_AI_PROMPT = APP_CONFIG['template']['ai_prompt']


def load_template_config():
    return APP_CONFIG['template']['report'], APP_CONFIG['template']['ai_prompt']


def save_template_config(report_template, ai_prompt):
    global APP_CONFIG
    APP_CONFIG['template']['report'] = report_template
    APP_CONFIG['template']['ai_prompt'] = ai_prompt
    save_app_config(APP_CONFIG)
    return True


def get_default_templates():
    return ACTUAL_DEFAULT_REPORT_TEMPLATE, ACTUAL_DEFAULT_AI_PROMPT


def update_email_config(key, value):
    global APP_CONFIG
    if key in APP_CONFIG['email']:
        APP_CONFIG['email'][key] = value
        save_app_config(APP_CONFIG)
        return True
    return False


def get_email_config():
    return APP_CONFIG['email']


def get_next_day_number():
    if not os.path.exists(REPORT_FOLDER):
        return 1

    all_files = os.listdir(REPORT_FOLDER)
    files = [f for f in all_files if f.endswith('.md') and '第' in f and '天' in f]

    max_day = 0
    for f in files:
        match = re.search(r'第(\d+)天', f)
        if match:
            day = int(match.group(1))
            if day > max_day:
                max_day = day

    return max_day + 1


def get_today_file():
    today = datetime.now()
    today_str = today.strftime("%m月%d日")

    if not os.path.exists(REPORT_FOLDER):
        return None

    all_files = os.listdir(REPORT_FOLDER)
    for f in all_files:
        if f.startswith(f"{today_str} 第") and f.endswith(".md"):
            return f
    return None
