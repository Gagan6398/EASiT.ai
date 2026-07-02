import os
from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker
from dotenv import load_dotenv

base_dir = os.path.dirname(__file__)
env_path = os.path.join(base_dir, "..", ".env.local")
load_dotenv(env_path)

mysql_url = os.getenv("MYSQL_URL")
use_sqlite = os.getenv("USE_SQLITE_FALLBACK", "0") == "1"
if mysql_url and not use_sqlite:
    DATABASE_URL = mysql_url
else:
    DATABASE_URL = f"sqlite:///{os.path.join(base_dir, 'app.db')}"

engine = create_engine(DATABASE_URL, pool_pre_ping=True, future=True)
SessionLocal = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))
