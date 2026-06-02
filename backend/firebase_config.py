import firebase_admin
from firebase_admin import credentials, firestore
import os
import json
import base64

def init_firebase():
    if not firebase_admin._apps:
        # ถ้ามี FIREBASE_KEY_BASE64 ใน env ให้ใช้ (สำหรับ Render)
        key_base64 = os.getenv("FIREBASE_KEY_BASE64")
        if key_base64:
            key_dict = json.loads(base64.b64decode(key_base64).decode("utf-8"))
            cred = credentials.Certificate(key_dict)
        else:
            # ถ้าไม่มี ใช้ไฟล์ (สำหรับ local)
            key_path = os.getenv("FIREBASE_KEY_PATH", "serviceAccountKey.json")
            cred = credentials.Certificate(key_path)
        firebase_admin.initialize_app(cred)
    return firestore.client()

db = init_firebase()
