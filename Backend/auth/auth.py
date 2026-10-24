from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
from typing import Tuple, Dict, Optional
import os
import bcrypt
import jwt
import re

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = "warehouse_counter"
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
db = client[DB_NAME]
users_col = db["users"]

# Password validation regex
PASSWORD_MIN_LENGTH = 8
PASSWORD_REGEX = re.compile(
    r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$'
)

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
    if users_col.find_one({"email": email}):
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
    
    # Hash password
    hashed_password = hash_password(password)
    
    # Create user document
    user_doc = {
        "email": email,
        "password": hashed_password,
        "warehouse_name": warehouse_name.strip(),
        "warehouse_location": warehouse_location.strip(),
        "contact_name": contact_name.strip(),
        "contact_phone": contact_phone.strip() if contact_phone else None,
        "ms_name": ms_name.strip(),
        "transporter_id": transporter_id.strip().upper(),
        "courier_partner": courier_partner.strip(),
        "created_at": datetime.now(timezone.utc),
        "last_login": None,
        "is_active": True
    }
    
    result = users_col.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    # Generate token
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
    
    # Find user
    user = users_col.find_one({"email": email})
    if not user:
        return False, "Invalid email or password", None
    
    # Check if account is active
    if not user.get("is_active", True):
        return False, "Account is deactivated", None
    
    # Verify password
    if not verify_password(password, user["password"]):
        return False, "Invalid email or password", None
    
    # Update last login
    users_col.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": datetime.now(timezone.utc)}}
    )
    
    # Generate token
    user_id = str(user["_id"])
    token = generate_token(user_id, email)
    
    user_data = {
        "user_id": user_id,
        "email": user["email"],
        "warehouse_name": user["warehouse_name"],
        "warehouse_location": user["warehouse_location"],
        "contact_name": user["contact_name"],
        "ms_name": user.get("ms_name", ""),
        "transporter_id": user.get("transporter_id", ""),
        "courier_partner": user.get("courier_partner", ""),
        "token": token
    }
    
    return True, "Login successful", user_data


def get_user_by_id(user_id: str) -> Optional[Dict]:
    """Get user by ID (without password)"""
    user = users_col.find_one({"_id": ObjectId(user_id)})
    if user:
        user["_id"] = str(user["_id"])
        user.pop("password", None)  # Remove password from response
    return user


def get_user_by_email(email: str) -> Optional[Dict]:
    """Get user by email (without password)"""
    user = users_col.find_one({"email": email.lower().strip()})
    if user:
        user["_id"] = str(user["_id"])
        user.pop("password", None)
    return user


def update_user(user_id: str, update_fields: Dict) -> Tuple[bool, str]:
    """
    Update user profile information.
    Returns (success, message)
    """
    try:
        from bson import ObjectId
        
        # Validate required fields if they're being updated
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
        
        # Update user
        result = users_col.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_fields}
        )
        
        if result.matched_count == 0:
            return False, "User not found"
        
        return True, "Profile updated successfully"
    except Exception as e:
        return False, f"Update failed: {str(e)}"
