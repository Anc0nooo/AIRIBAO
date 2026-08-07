import sys
import os

class WindowController:
    """窗口控制器"""
    def __init__(self):
        self._window = None
        self._is_maximized = False
    
    def set_window(self, window):
        self._window = window
    
    def minimize(self):
        if self._window:
            self._window.minimize()
        return 'ok'
    
    def toggle_maximize(self):
        if self._window:
            if self._is_maximized:
                self._window.restore()
                self._is_maximized = False
            else:
                self._window.maximize()
                self._is_maximized = True
        return self._is_maximized
    
    def close(self):
        if self._window:
            self._window.destroy()
        return 'ok'
    
    def is_maximized(self):
        return self._is_maximized
    
    def drag_window(self):
        """启动窗口拖拽"""
        if self._window:
            try:
                # 在 Windows 上，需要使用 ctypes 调用系统 API 来实现拖拽
                # pywebview 的 drag() 方法在某些版本可能不稳定
                self._window.drag()
            except Exception as e:
                # 如果 drag() 失败，尝试使用 Windows API
                try:
                    import ctypes
                    import ctypes.wintypes
                    
                    # 获取窗口句柄
                    hwnd = self._window.hwnd
                    if hwnd:
                        # 发送 WM_NCLBUTTONDOWN 消息来启动拖拽
                        WM_NCLBUTTONDOWN = 0x00A1
                        HTCAPTION = 2
                        ctypes.windll.user32.SendMessageW(
                            hwnd, WM_NCLBUTTONDOWN, HTCAPTION, 0
                        )
                except Exception:
                    pass
        return 'ok'

# 全局窗口控制器
window_controller = WindowController()

# 暴露给JS的包装函数
def minimize_window():
    return window_controller.minimize()

def toggle_maximize_window():
    return window_controller.toggle_maximize()

def close_window():
    return window_controller.close()

def is_maximized_window():
    return window_controller.is_maximized()

def drag_window():
    """暴露拖拽方法给JS"""
    return window_controller.drag_window()

def start_web_app():
    try:
        import threading
        import time
        import webview
        from app.app import flask_app
        
        def start_flask():
            flask_app.run(host='127.0.0.1', port=5000, debug=False, use_reloader=False)
        
        flask_thread = threading.Thread(target=start_flask, daemon=True)
        flask_thread.start()
        
        time.sleep(1)
        
        window = webview.create_window(
            '日报生成器',
            'http://127.0.0.1:5000',
            width=1200,
            height=800,
            min_size=(800, 600),
            frameless=True,
            easy_drag=True  # 启用拖拽，通过CSS no-drag限制交互区域
        )
        
        # 设置窗口控制器
        window_controller.set_window(window)
        
        # 暴露函数给JS调用
        window.expose(minimize_window)
        window.expose(toggle_maximize_window)
        window.expose(close_window)
        window.expose(is_maximized_window)
        window.expose(drag_window)
        
        webview.start()
    except ImportError:
        print("首次运行，正在安装依赖...")
        os.system(f'"{sys.executable}" -m pip install flask flask-cors pywebview')
        start_web_app()

if __name__ == "__main__":
    start_web_app()
