# backend/gunicorn.conf.py
# Production Gunicorn config — 3+ workers in round-robin behind Nginx
import multiprocessing

bind             = "0.0.0.0:8000"
workers          = multiprocessing.cpu_count() * 2 + 1  # 5-9 depending on CPU
worker_class     = "sync"
threads          = 2
worker_connections = 1000
timeout          = 120
keepalive        = 5
max_requests     = 1000
max_requests_jitter = 50   # stagger worker restarts
graceful_timeout = 30

# Logging
accesslog  = "-"    # stdout (captured by Docker / systemd)
errorlog   = "-"
loglevel   = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s %(T)ss'

# Preload app for faster fork-on-request
preload_app = False

# Security: drop privileges after binding

# Use RAM disk for worker temp dir (improves file-upload performance)
worker_tmp_dir = "/dev/shm"
