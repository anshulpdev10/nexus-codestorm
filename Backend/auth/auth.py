from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
from typing import Tuple, Dict, Optional
import os
import bcrypt
import jwt
import re

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

# Shared Supabase client (defined in core.database). Imported lazily so this
# module can still be imported for offline checks (password/JWT helpers).
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24
USERS = "users"

# Password validation regex
PASSWORD_MIN_LENGTH = 8
PASSWORD_REGEX = re.compile(
    r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$'
)


def _db():
    from core.database import supabase
    return supabase


def _out(row):
    """Rename `id` -> `_id` (same contract as before)."""
    if row is None:
        return None
    row = dict(row)
    if "id" in row:
        row["_id"] = str(row.pop("id"))
    return row


def validate_password(password: str) -> Tuple[bool, str]:
    """Validate password strength. Returns (is_valid, error_message)"""
    if len(password) < PASSWORD_MIN_LENGTH:
        return False, f"Password must be at least {PASSWORD_MIN_LENGTH} characters long"
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r'\d', password):
        return False, "Password must contain at least one number"
    if not re.search(r'[@$!%*?&]', password):
        return False, "Password must contain at least one special character (@$!%*?&)"
    return True, ""


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))


def generate_token(user_id: str, email: str) -> str:
    """Generate JWT token for authenticated user"""
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_token(token: str) -> Dict:
    """Verify JWT token and return payload"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise ValueError("Token has expired")
    except jwt.InvalidTokenError:
        raise ValueError("Invalid token")


def _find_user_by_email(email: str) -> Optional[Dict]:
    rows = _db().table(USERS).select("*").eq("email", email).limit(1).execute().data
    return rows[0] if rows else None


def create_user(email: str, password: str, warehouse_name: str,
                warehouse_location: str, contact_name: str,
                contact_phone: Optional[str] = None,
                ms_name: Optional[str] = None,
                transporter_id: Optional[str] = None,
                courier_partner: Optional[str] = None) -> Tuple[bool, str, Optional[Dict]]:
    """
    Create a new user account.
    Returns (success, message, user_data)
    """
    # Validate email
    email = email.lower().strip()
    if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
        return False, "Invalid email format", None

    # Check if user already exists
    if _find_user_by_email(email):
        return False, "Email already registered", None

    # Validate password
    is_valid, error_msg = validate_password(password)
    if not is_valid:
        return False, error_msg, None

    # Validate required fields
    if not warehouse_name or not warehouse_name.strip():
        return False, "Warehouse name is required", None
    if not warehouse_location or not warehouse_location.strip():
        return False, "Warehouse location is required", None
    if not contact_name or not contact_name.strip():
        return False, "Contact name is required", None
    if not ms_name or not ms_name.strip():
        return False, "M/S name is required", None
    if not transporter_id or not transporter_id.strip():
        return False, "Transporter ID is required", None
    if not courier_partner or not courier_partner.strip():
        return False, "Courier partner is required", None

    user_row = {
        "email": email,
        "password": hash_password(password),
        "warehouse_name": warehouse_name.strip(),
        "warehouse_location": warehouse_location.strip(),
        "contact_name": contact_name.strip(),
        "contact_phone": contact_phone.strip() if contact_phone else None,
        "ms_name": ms_name.strip(),
        "transporter_id": transporter_id.strip().upper(),
        "courier_partner": courier_partner.strip(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_login": None,
        "is_active": True,
    }

    result = _db().table(USERS).insert(user_row).execute()
    user_id = str(result.data[0]["id"])

    token = generate_token(user_id, email)

    user_data = {
        "user_id": user_id,
        "email": email,
        "warehouse_name": warehouse_name.strip(),
        "warehouse_location": warehouse_location.strip(),
        "contact_name": contact_name.strip(),
        "ms_name": ms_name.strip(),
        "transporter_id": transporter_id.strip().upper(),
        "courier_partner": courier_partner.strip(),
        "token": token
    }

    return True, "User created successfully", user_data


def login_user(email: str, password: str) -> Tuple[bool, str, Optional[Dict]]:
    """
    Authenticate user and return token.
    Returns (success, message, user_data)
    """
    email = email.lower().strip()

    user = _find_user_by_email(email)
    if not user:
        return False, "Invalid email or password", None

    if not user.get("is_active", True):
        return False, "Account is deactivated", None

    if not verify_password(password, user["password"]):
        return False, "Invalid email or password", None

    _db().table(USERS).update(
        {"last_login": datetime.now(timezone.utc).isoformat()}
    ).eq("id", user["id"]).execute()

    user_id = str(user["id"])
    token = generate_token(user_id, email)

    user_data = {
        "user_id": user_id,
        "email": user["email"],
        "warehouse_name": user["warehouse_name"],
        "warehouse_location": user["warehouse_location"],
        "contact_name": user["contact_name"],
        "ms_name": user.get("ms_name") or "",
        "transporter_id": user.get("transporter_id") or "",
        "courier_partner": user.get("courier_partner") or "",
        "token": token
    }

    return True, "Login successful", user_data


def get_user_by_id(user_id: str) -> Optional[Dict]:
    """Get user by ID (without password)"""
    try:
        rows = _db().table(USERS).select("*").eq("id", user_id).limit(1).execute().data
    except Exception as e:
        print(f"[get_user_by_id] lookup failed: {e}")
        return None
    if not rows:
        return None
    user = _out(rows[0])
    user.pop("password", None)
    return user


def get_user_by_email(email: str) -> Optional[Dict]:
    """Get user by email (without password)"""
    user = _find_user_by_email(email.lower().strip())
    if not user:
        return None
    user = _out(user)
    user.pop("password", None)
    return user


def update_user(user_id: str, update_fields: Dict) -> Tuple[bool, str]:
    """
    Update user profile information.
    Returns (success, message)
    """
    try:
        if "warehouse_name" in update_fields and not update_fields["warehouse_name"].strip():
            return False, "Warehouse name cannot be empty"
        if "warehouse_location" in update_fields and not update_fields["warehouse_location"].strip():
            return False, "Warehouse location cannot be empty"
        if "contact_name" in update_fields and not update_fields["contact_name"].strip():
            return False, "Contact name cannot be empty"
        if "ms_name" in update_fields and not update_fields["ms_name"].strip():
            return False, "M/S name cannot be empty"
        if "transporter_id" in update_fields and not update_fields["transporter_id"].strip():
            return False, "Transporter ID cannot be empty"
        if "courier_partner" in update_fields and not update_fields["courier_partner"].strip():
            return False, "Courier partner cannot be empty"

        rows = _db().table(USERS).update(update_fields).eq("id", user_id).execute().data
        if not rows:
            return False, "User not found"

        return True, "Profile updated successfully"
    except Exception as e:
        return False, f"Update failed: {str(e)}"
