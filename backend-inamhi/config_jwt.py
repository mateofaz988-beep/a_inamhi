"""
Configuración JWT para autenticación segura.
"""
import os
from datetime import datetime, timedelta
import jwt
from functools import wraps
from flask import request, jsonify, g

SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'supersecretkey-inamhi-rrhh-2026-change-in-production')
ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRE_MINUTES', '360'))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv('JWT_REFRESH_TOKEN_EXPIRE_DAYS', '7'))

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "iat": datetime.utcnow(), "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')
        
        if auth_header:
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({"error": "Token mal formado"}), 401
        
        if not token:
            return jsonify({"error": "Token requerido"}), 401
        
        payload = verify_token(token)
        if not payload:
            return jsonify({"error": "Token inválido o expirado"}), 401
        
        g.user = payload
        return f(*args, **kwargs)
    
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')
        
        if auth_header:
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({"error": "Token mal formado"}), 401
        
        if not token:
            return jsonify({"error": "Token requerido"}), 401
        
        payload = verify_token(token)
        if not payload:
            return jsonify({"error": "Token inválido o expirado"}), 401
        
        if payload.get('role') != 'admin':
            return jsonify({"error": "Acceso no autorizado, se requiere rol admin"}), 403
        
        g.user = payload
        return f(*args, **kwargs)
    
    return decorated
