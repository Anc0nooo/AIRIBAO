import json
import smtplib
import urllib.request
import urllib.error
import time
from email.mime.text import MIMEText
from email.header import Header

from app.config import API_KEY, API_BASE, MODEL_ENDPOINT_ID, DEFAULT_RECEIVER, \
                   DEFAULT_AI_PROMPT, load_template_config, \
                   SENDER_EMAIL, SENDER_AUTH_CODE, SMTP_SERVER, SMTP_PORT

# LangChain imports (可选)
LANGCHAIN_AVAILABLE = False
try:
    from langchain_community.chat_models import ChatOpenAI
    from langchain_core.messages import HumanMessage, SystemMessage
    LANGCHAIN_AVAILABLE = True
except ImportError:
    pass


def _clean_report(content):
    """清理 AI 返回内容中的 markdown 代码块标记"""
    if content.startswith("'''"):
        content = content[3:]
    if content.endswith("'''"):
        content = content[:-3]
    return content.strip()


def _generate_with_urllib(prompt):
    """使用原始 urllib 方式调用 API（作为回退方案）"""
    url = f"{API_BASE}/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}"
    }
    data = {
        "model": MODEL_ENDPOINT_ID,
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7
    }

    req = urllib.request.Request(
        url, 
        data=json.dumps(data).encode('utf-8'), 
        headers=headers, 
        method='POST'
    )
    with urllib.request.urlopen(req, timeout=60) as response:
        result = json.loads(response.read().decode('utf-8'))
        report = result['choices'][0]['message']['content'].strip()

    return report


def _generate_with_langchain(prompt):
    """使用 LangChain 方式调用 API"""
    if not LANGCHAIN_AVAILABLE:
        raise ImportError("LangChain not available")
    
    llm = ChatOpenAI(
        model=MODEL_ENDPOINT_ID,
        api_key=API_KEY,
        base_url=API_BASE.rstrip('/'),
        temperature=0.7,
        max_tokens=2000,
        timeout=60
    )
    
    messages = [HumanMessage(content=prompt)]
    response = llm.invoke(messages)
    
    # 获取内容
    if hasattr(response, 'content'):
        report = response.content
    else:
        report = str(response)
    
    if not isinstance(report, str):
        report = str(report)
    
    return report.strip()


def send_email(content, file_name, receiver=None):
    """发送邮件功能"""
    if receiver is None:
        receiver = DEFAULT_RECEIVER

    msg = MIMEText(content, "plain", "utf-8")
    msg["From"] = SENDER_EMAIL
    msg["To"] = receiver
    msg["Subject"] = Header(f"实习日报：{file_name}", "utf-8")

    try:
        smtp = smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT)
        smtp.login(SENDER_EMAIL, SENDER_AUTH_CODE)
        smtp.sendmail(SENDER_EMAIL, receiver, msg.as_string())
        smtp.quit()
        return True
    except Exception as e:
        return False


def generate_with_ai(work_description, ai_prompt=None):
    """
    生成日报内容（优先使用 LangChain，失败时回退到 urllib）
    
    Args:
        work_description: 用户工作描述
        ai_prompt: AI 提示词模板（可选）
    
    Returns:
        str: 生成的日报内容
    """
    if ai_prompt is None:
        _, ai_prompt = load_template_config()
    prompt = ai_prompt.format(work_description=work_description)

    last_error = None
    
    # 尝试使用 LangChain
    if LANGCHAIN_AVAILABLE:
        try:
            print("[AI] 尝试使用 LangChain...")
            report = _generate_with_langchain(prompt)
            if report:
                print(f"[AI] LangChain 成功，内容长度: {len(report)}")
                return _clean_report(report)
            else:
                print("[AI] LangChain 返回空内容，尝试回退到 urllib...")
                last_error = Exception("LangChain 返回空内容")
        except Exception as e:
            print(f"[AI] LangChain 失败: {e}")
            last_error = e
    
    # 回退到 urllib 方式
    try:
        print("[AI] 使用 urllib 方式...")
        report = _generate_with_urllib(prompt)
        if report:
            print(f"[AI] urllib 成功，内容长度: {len(report)}")
            return _clean_report(report)
        else:
            raise Exception("AI返回内容为空，请检查模型配置或重试")
    except Exception as e:
        error_msg = str(e)
        if "401" in error_msg:
            raise Exception("API密钥无效，请检查配置")
        elif "404" in error_msg:
            raise Exception("模型端点不存在，请检查配置")
        elif "429" in error_msg:
            raise Exception("请求过于频繁，请稍后重试")
        elif "为空" in error_msg:
            raise Exception(error_msg)
        else:
            raise Exception(f"AI生成失败：{error_msg}")


def generate_with_ai_stream(work_description, ai_prompt=None):
    """
    流式生成日报（使用 urllib 方式，更稳定）
    
    Args:
        work_description: 用户工作描述
        ai_prompt: AI 提示词模板（可选）
    
    Yields:
        str: 生成的内容片段
    """
    if ai_prompt is None:
        _, ai_prompt = load_template_config()
    prompt = ai_prompt.format(work_description=work_description)

    # 使用 urllib 流式方式（更稳定）
    try:
        url = f"{API_BASE}/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {API_KEY}"
        }
        data = {
            "model": MODEL_ENDPOINT_ID,
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.7,
            "stream": True
        }

        req = urllib.request.Request(
            url, 
            data=json.dumps(data).encode('utf-8'), 
            headers=headers, 
            method='POST'
        )
        
        full_content = ""
        chunk_count = 0
        
        with urllib.request.urlopen(req, timeout=120) as response:
            for line in response:
                line = line.decode('utf-8').strip()
                if not line or line == 'data: [DONE]':
                    if line == 'data: [DONE]':
                        break
                    continue
                
                if line.startswith('data: '):
                    data_str = line[6:]
                    try:
                        chunk = json.loads(data_str)
                        delta = chunk.get('choices', [{}])[0].get('delta', {}).get('content', '')
                        if delta:
                            full_content += delta
                            chunk_count += 1
                            yield delta
                    except json.JSONDecodeError:
                        continue
        
        print(f"[AI] Stream completed. Total chunks: {chunk_count}, content length: {len(full_content)}")
        
        if not full_content:
            raise Exception("AI返回内容为空，请检查模型配置或重试")
        
        yield "\n[DONE]"  # 结束标记
        
    except urllib.error.HTTPError as e:
        error_msg = f"API请求失败 (HTTP {e.code})"
        try:
            error_msg += f"：{e.read().decode('utf-8')}"
        except:
            pass
        raise Exception(error_msg)
    except Exception as e:
        error_msg = str(e)
        if "401" in error_msg:
            raise Exception("API密钥无效，请检查配置")
        elif "404" in error_msg:
            raise Exception("模型端点不存在，请检查配置")
        elif "429" in error_msg:
            raise Exception("请求过于频繁，请稍后重试")
        elif "为空" in error_msg:
            raise Exception(error_msg)
        else:
            raise Exception(f"AI生成失败：{error_msg}")


def generate_with_ai_advanced(work_description, ai_prompt=None, system_prompt=None, max_tokens=2000):
    """
    高级 AI 生成功能（使用 urllib，支持系统提示词）
    
    Args:
        work_description: 用户工作描述
        ai_prompt: AI 提示词模板
        system_prompt: 系统提示词（可选）
        max_tokens: 最大 token 数
    
    Returns:
        str: 生成的日报内容
    """
    if ai_prompt is None:
        _, ai_prompt = load_template_config()
    prompt = ai_prompt.format(work_description=work_description)

    try:
        url = f"{API_BASE}/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {API_KEY}"
        }
        
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        data = {
            "model": MODEL_ENDPOINT_ID,
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": max_tokens
        }

        req = urllib.request.Request(
            url, 
            data=json.dumps(data).encode('utf-8'), 
            headers=headers, 
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=60) as response:
            result = json.loads(response.read().decode('utf-8'))
            report = result['choices'][0]['message']['content'].strip()
        
        if not report:
            raise Exception("AI返回内容为空，请检查模型配置或重试")
        
        return _clean_report(report)
        
    except Exception as e:
        raise Exception(f"AI生成失败：{str(e)}")


def check_langchain_available():
    """检查 LangChain 是否可用"""
    return LANGCHAIN_AVAILABLE


def get_ai_info():
    """获取 AI 配置信息"""
    return {
        'available': True,  # 始终可用（有回退方案）
        'langchain_available': LANGCHAIN_AVAILABLE,
        'provider': 'urllib + LangChain(可选)',
        'model': MODEL_ENDPOINT_ID,
        'base_url': API_BASE,
        'features': {
            'sync': True,
            'stream': True,
            'advanced': True,
            'system_prompt': True,
            'fallback': True  # 有回退方案
        }
    }
