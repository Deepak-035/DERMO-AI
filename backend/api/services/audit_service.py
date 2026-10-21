from typing import Optional, Any
from api.logger import logger
from api.supabase_client import supabase


def log_audit_event(
    actor_id: Optional[str],
    action: str,
    target_id: Optional[str] = None,
    details: Optional[dict[str, Any]] = None,
    ip_address: Optional[str] = None,
) -> None:
    """
    Log security and administrative events to the audit_logs table.
    Ensures safe error handling so that audit logging issues do not interrupt core workflows.
    """
    payload = {
        "actor_id": actor_id,
        "action": action,
        "target_id": target_id,
        "details": details or {},
        "ip_address": ip_address,
    }

    try:
        supabase.table("audit_logs").insert(payload).execute()
        logger.info(f"Audit log recorded: action={action} actor={actor_id} target={target_id}")
    except Exception as e:
        logger.warning(f"Could not record audit log to database (table may be pending migration): {e}")
