import logging
from pathlib import Path

#Create logs directory if it doesn't exist
LOG_DIR=Path("logs")
LOG_DIR.mkdir(exist_ok=True)

LOG_FILE=LOG_DIR / "app.log"

#Create logger
logger=logging.getLogger("skin-api")
logger.setLevel(logging.INFO)

#Prevent duplicate handlers
if not logger.handlers:
    formatter=logging.Formatter("%(asctime)s | %(levelname)s | %(message)s")
    #Console handler
    console_handler=logging.StreamHandler()
    console_handler.setFormatter(formatter)
    #File handler
    file_handler=logging.FileHandler(LOG_FILE)
    file_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    logger.addHandler(file_handler)