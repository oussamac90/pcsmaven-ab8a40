import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import uvicorn
from motor.motor_asyncio import AsyncIOMotorClient
from prometheus_fastapi_instrumentator import Instrumentator

from .config.settings import Settings
from .routes.document_routes import router
from .services.document_service import DocumentService

# Initialize FastAPI application with OpenAPI documentation
app = FastAPI(
    title='PCS Document Service',
    version='1.0.0',
    docs_url='/api/docs',
    redoc_url='/api/redoc'
)

# Initialize global variables
logger = logging.getLogger(__name__)
settings = Settings()
mongodb_client = None  # Initialized in init_mongodb()

async def init_logging() -> None:
    """
    Initializes application logging with structured format and proper handlers.
    """
    log_config = {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {
            'json': {
                'class': 'pythonjsonlogger.jsonlogger.JsonFormatter',
                'format': '%(asctime)s %(name)s %(levelname)s %(message)s'
            }
        },
        'handlers': {
            'console': {
                'class': 'logging.StreamHandler',
                'formatter': 'json',
                'stream': 'ext://sys.stdout'
            },
            'file': {
                'class': 'logging.handlers.RotatingFileHandler',
                'formatter': 'json',
                'filename': '/var/log/pcs/document-service.log',
                'maxBytes': 10485760,  # 10MB
                'backupCount': 5
            }
        },
        'root': {
            'level': settings.LOG_LEVEL,
            'handlers': ['console', 'file']
        }
    }
    logging.config.dictConfig(log_config)
    logger.info("Logging initialized successfully")

async def init_mongodb() -> AsyncIOMotorClient:
    """
    Initializes MongoDB connection with proper pooling and health checks.
    """
    global mongodb_client
    try:
        mongodb_settings = settings.get_mongodb_settings()
        mongodb_client = AsyncIOMotorClient(**mongodb_settings)
        
        # Verify connection
        await mongodb_client.admin.command('ping')
        logger.info("MongoDB connection established successfully")
        return mongodb_client
    except Exception as e:
        logger.error(f"Failed to initialize MongoDB connection: {str(e)}")
        raise

async def init_middleware() -> None:
    """
    Configures application middleware stack for security and performance.
    """
    # CORS middleware with secure defaults
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Configure based on environment
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"]
    )

    # Trusted host validation
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["*"]  # Configure based on environment
    )

    # Response compression
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    # Security headers middleware
    @app.middleware("http")
    async def add_security_headers(request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

    logger.info("Middleware stack initialized successfully")

async def init_app() -> None:
    """
    Initializes FastAPI application with all required components.
    """
    # Initialize logging
    await init_logging()
    
    # Initialize MongoDB
    await init_mongodb()
    
    # Initialize middleware
    await init_middleware()
    
    # Register routes
    app.include_router(router)
    
    # Initialize metrics
    Instrumentator().instrument(app).expose(app)
    
    # Health check endpoint
    @app.get("/health")
    async def health_check():
        return {"status": "healthy", "version": app.version}
    
    # Startup event handler
    @app.on_event("startup")
    async def startup_event():
        logger.info("Document service starting up")
    
    # Shutdown event handler
    @app.on_event("shutdown")
    async def shutdown_event():
        logger.info("Document service shutting down")
        if mongodb_client:
            mongodb_client.close()

@logger.catch
def main() -> None:
    """
    Application entry point with proper server configuration.
    """
    try:
        # Initialize application
        import asyncio
        asyncio.run(init_app())
        
        # Configure uvicorn server
        uvicorn_config = {
            "host": "0.0.0.0",
            "port": 8000,
            "workers": 4,
            "loop": "uvloop",
            "log_level": "info",
            "reload": settings.ENV == "development",
            "ssl_keyfile": settings.SSL_CERT_PATH if settings.ENABLE_SSL else None,
            "ssl_certfile": settings.SSL_CERT_PATH if settings.ENABLE_SSL else None,
            "proxy_headers": True,
            "forwarded_allow_ips": "*"
        }
        
        # Start server
        uvicorn.run("app:app", **uvicorn_config)
        
    except Exception as e:
        logger.error(f"Failed to start document service: {str(e)}")
        raise

if __name__ == "__main__":
    main()