from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

def sanitize_database_url_for_sqlalchemy(url: str) -> str:
    """
    Strips non-standard / Prisma-specific query parameters (like pool_timeout,
    connection_limit, pgbouncer) that psycopg2 and PostgreSQL libpq reject.
    """
    if not url:
        return url

    parsed = urlparse(url)
    if not parsed.query:
        return url

    disallowed_params = {"pool_timeout", "connection_limit", "pgbouncer"}
    query_params = parse_qs(parsed.query, keep_blank_values=True)
    filtered = [(k, v) for k, vs in query_params.items() if k not in disallowed_params for v in vs]

    return urlunparse(parsed._replace(query=urlencode(filtered)))

# Clean connection URL for psycopg2/SQLAlchemy
DATABASE_URL = sanitize_database_url_for_sqlalchemy(settings.database_url)

# Standard engine and session maker setup
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=1800,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """
    FastAPI dependency that provides a transactional database session.
    Ensures the session is closed after the request is finished.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
