from pathlib import Path
from decouple import config
from celery.schedules import crontab
import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config('SECRET_KEY', default='django-insecure-nexus-dome-smart-platform-key-993821')
DEBUG = config('DEBUG', default=True, cast=bool)

allowed_hosts_cfg = config('ALLOWED_HOSTS', default='*')
ALLOWED_HOSTS = [h.strip() for h in allowed_hosts_cfg.split(',') if h.strip()]

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'rest_framework',
    'corsheaders',
    'channels',

    'devices',
    'sensors',
    'alerts',
    'ml',
    'tasks',
    'rest_framework.authtoken',
    'accounts',
    'commands',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',   # <-- add this line
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

CORS_ALLOW_ALL_ORIGINS = True
# CORS_ALLOWED_ORIGINS = [
#     "https://smart-nest-tau.vercel.app",  
#     "http://localhost:5173",  
# ]

ROOT_URLCONF = 'smartnest.urls'

FIREBASE_CREDENTIALS_JSON = config('FIREBASE_CREDENTIALS_JSON', default='{}')

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

csrf_trusted_cfg = config(
    'CSRF_TRUSTED_ORIGINS',
    default='https://*.up.railway.app,https://*.onrender.com,https://*.vercel.app,http://localhost:5173,http://127.0.0.1:5173'
)
CSRF_TRUSTED_ORIGINS = [h.strip() for h in csrf_trusted_cfg.split(',') if h.strip()]

WSGI_APPLICATION = 'smartnest.wsgi.application'
ASGI_APPLICATION = 'smartnest.asgi.application'

_db_url = config('DATABASE_URL', default='sqlite:///db.sqlite3')
if _db_url.startswith('sqlite'):
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
else:
    DATABASES = {
        'default': dj_database_url.parse(_db_url)
    }

REDIS_URL = config('REDIS_URL', default='redis://127.0.0.1:6379/0')
USE_REDIS = config('USE_REDIS', default=False, cast=bool)

if USE_REDIS:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {
                "hosts": [{
                    "address": REDIS_URL,
                    "protocol": 2,   # <-- force RESP2, avoids the RESP3 bug
                }],
            },
        },
    }
else:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer"
        }
    }

CELERY_RESULT_BACKEND = 'redis://127.0.0.1:6379/0'
CELERY_TIMEZONE = 'Asia/Kolkata'


CELERY_BEAT_SCHEDULE = {
    'mark-stale-devices-offline': {
        'task': 'devices.tasks.mark_stale_devices_offline',
        'schedule': 60.0,  # every 60 seconds
    },
    # Phase 6 will add: 'retrain-ml-models-nightly' here, running at 2am via crontab(hour=2, minute=0)
}

CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL

CELERY_TASK_SERIALIZER = 'json'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'