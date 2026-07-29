from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
import os

_DB_URL = None

def _get_url():
    global _DB_URL
    if _DB_URL is None:
        url = os.getenv("DATABASE_URL", "postgresql+psycopg2://postgres@127.0.0.1/movieflix")
        _DB_URL = url.replace("+asyncpg", "+psycopg2")
    return _DB_URL

engine = create_engine(_get_url(), echo=False, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)
