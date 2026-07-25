# FUGUSAU Portal — Setup Guide

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Python | 3.11+ | Backend runtime |
| Node.js | 18+ | Frontend runtime |
| PostgreSQL | 15+ | Main database |
| Redis | 7+ | Cache + WebSocket channels |
| Docker | 24+ | Containerization (optional) |
| Tesseract | 5+ | OCR for credential detection |

---

## 🐳 Option 1: Docker Setup (Recommended)

```bash
# 1. Clone repository
git clone https://github.com/your-org/fugusau-portal
cd fugusau-portal

# 2. Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your values (DB, Paystack, WAEC API keys etc.)

# 3. Start all services
docker-compose up --build

# 4. Create superuser
docker exec -it fugusau_backend python manage.py createsuperuser

# 5. Load sample data (optional)
docker exec -it fugusau_backend python manage.py loaddata fixtures/sample_data.json
```

**Services will be available at:**
- Portal: http://localhost (via Nginx)
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/v1/
- API Docs: http://localhost:8000/api/docs/
- Django Admin: http://localhost:8000/admin/

---

## 🔧 Option 2: Manual Setup

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate      # Linux/Mac
# venv\Scripts\activate        # Windows

# Install dependencies
pip install -r requirements.txt

# Install Tesseract OCR (for credential detection)
# Ubuntu/Debian:
sudo apt install tesseract-ocr tesseract-ocr-eng

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Create log directory
mkdir -p logs

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Collect static files
python manage.py collectstatic

# Start Django (HTTP + WebSocket via Daphne)
daphne -b 0.0.0.0 -p 8000 fugusau.asgi:application

# OR for development with auto-reload:
python manage.py runserver
```

### Start Celery (Background Tasks)

```bash
# In a separate terminal (with venv activated):
cd backend
celery -A fugusau worker -l info

# Celery beat (scheduled tasks):
celery -A fugusau beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Set VITE_API_URL=http://localhost:8000/api/v1
# Set VITE_WS_URL=ws://localhost:8000/ws

# Start development server
npm run dev

# Build for production
npm run build
```

---

## 🗄️ Database Setup

```sql
-- Create PostgreSQL database
CREATE DATABASE fugusau_db;
CREATE USER fugusau_user WITH PASSWORD 'fugusau_pass';
GRANT ALL PRIVILEGES ON DATABASE fugusau_db TO fugusau_user;
ALTER USER fugusau_user CREATEDB;  -- For running tests
```

---

## 🔑 API Keys You Need

| Service | Purpose | Get it from |
|---------|---------|-------------|
| Paystack | Fee payments | dashboard.paystack.com |
| Africa's Talking | SMS notifications | africastalking.com |
| SendGrid | Email delivery | sendgrid.com |
| Anthropic Claude | AI chatbot | console.anthropic.com |
| WAEC API | Result verification | Contact WAEC directly |
| NECO API | Result verification | Contact NECO directly |
| JAMB API | Score verification | Contact JAMB directly |
| AWS S3 | File storage (production) | aws.amazon.com |

---

## 🏗️ Initial Data Setup

After migrations, set up the university structure:

```python
# In Django admin (http://localhost:8000/admin/) or shell:
python manage.py shell

from fugusau.apps.students.models import Faculty, Department, Specialization
from fugusau.apps.courses.models import AcademicSession

# Create current session
session = AcademicSession.objects.create(
    name='2025/2026',
    is_current=True,
    start_date='2025-09-01',
    end_date='2026-07-31'
)

# Create faculty
faculty = Faculty.objects.create(name='Faculty of Computing', code='FCS')

# Create department
dept = Department.objects.create(
    faculty=faculty,
    name='Computer Science',
    code='CSC'
)
```

---

## 🧪 Running Tests

```bash
cd backend
pytest --cov=fugusau --cov-report=html
open htmlcov/index.html   # View coverage report
```

---

## 🚀 Production Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for full production deployment guide on AWS/DigitalOcean.

Key steps:
1. Set `DEBUG=False` in .env
2. Set up SSL certificate (Let's Encrypt via Certbot)  
3. Use production Docker Compose: `docker-compose -f docker-compose.prod.yml up`
4. Set up backups for PostgreSQL (pg_dump daily)
5. Configure CloudWatch or Sentry for monitoring
