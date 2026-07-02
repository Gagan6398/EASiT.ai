import os
import json
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy.orm import Session
try:
    from .database import SessionLocal, engine
    from .models import Base, User, Conversation, Message
except ImportError:
    from database import SessionLocal, engine
    from models import Base, User, Conversation, Message
from flask_sock import Sock
try:
    import razorpay
    HAS_RAZORPAY = True
except ImportError:
    HAS_RAZORPAY = False

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env.local"))

# Initialize Razorpay Client (optional)
razorpay_client = None
if HAS_RAZORPAY and os.getenv("RAZORPAY_API_KEY"):
    razorpay_client = razorpay.Client(
        auth=(os.getenv("RAZORPAY_API_KEY"), os.getenv("RAZORPAY_SECRET_KEY"))
    )

app = Flask(__name__)
CORS(app, supports_credentials=True)
sock = Sock(app)

Base.metadata.create_all(bind=engine)

def get_db() -> Session:
    return SessionLocal()

@app.route("/api/auth/signup", methods=["POST"])
def signup():
    data = request.get_json() or {}
    name = data.get("name", "")
    email = data.get("email", "")
    password = data.get("password", "")
    if not name or not email or not password:
        return jsonify({"detail": "Missing fields"}), 400
    db = get_db()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            return jsonify({"detail": "Email already registered"}), 400
        user = User(name=name, email=email, password_hash=generate_password_hash(password))
        db.add(user)
        db.commit()
        token = f"token-{user.id}"
        return jsonify({"token": token, "user": {"name": user.name, "email": user.email, "picture": None}})
    finally:
        db.close()

@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email", "")
    password = data.get("password", "")
    if not email or not password:
        return jsonify({"detail": "Missing fields"}), 400
    db = get_db()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user or not check_password_hash(user.password_hash, password):
            return jsonify({"detail": "Invalid credentials"}), 401
        token = f"token-{user.id}"
        return jsonify({"token": token, "user": {"name": user.name, "email": user.email, "picture": None}})
    finally:
        db.close()

@app.route("/api/auth/google", methods=["POST"])
def auth_google():
    return jsonify({"token": "guest-demo-token", "user": {"name": "Google User", "email": "user@example.com", "picture": None}})

@app.route("/api/conversations", methods=["GET"])
def conversations():
    auth = request.headers.get("Authorization", "")
    db = get_db()
    try:
        items = []
        users = db.query(User).all()
        for u in users:
            convs = db.query(Conversation).filter(Conversation.user_id == u.id).all()
            for c in convs:
                msgs = db.query(Message).filter(Message.conversation_id == c.id).order_by(Message.timestamp.asc()).all()
                items.append({
                    "id": str(c.id),
                    "title": c.title,
                    "messages": [{"id": str(m.id), "role": m.role, "text": m.text, "timestamp": m.timestamp.isoformat()} for m in msgs],
                    "createdAt": c.created_at.isoformat()
                })
        if not items:
            items = [{
                "id": "conv-1",
                "title": "Welcome",
                "messages": [{
                    "id": "msg-1",
                    "role": "model",
                    "text": "Connected to backend.",
                    "timestamp": datetime.utcnow().isoformat()
                }],
                "createdAt": datetime.utcnow().isoformat()
            }]
        return jsonify(items)
    finally:
        db.close()

# Razorpay Payment Endpoints
@app.route("/api/payment/create-order", methods=["POST"])
def create_order():
    """Create a Razorpay order for payment"""
    if not razorpay_client:
        return jsonify({"error": "Payment service not configured"}), 503
    try:
        data = request.get_json() or {}
        amount = data.get("amount")  # Amount in paisa (1 INR = 100 paisa)
        description = data.get("description", "Payment for Easit.AI")
        customer_email = data.get("email", "")
        
        if not amount:
            return jsonify({"error": "Amount is required"}), 400
        
        # Create Razorpay order
        order = razorpay_client.order.create({
            "amount": int(amount),
            "currency": "INR",
            "description": description,
            "receipt": f"receipt_{datetime.utcnow().timestamp()}",
            "notes": {
                "email": customer_email,
                "app": "easit.ai"
            }
        })
        
        return jsonify({
            "order_id": order["id"],
            "amount": order["amount"],
            "currency": order["currency"]
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/payment/verify", methods=["POST"])
def verify_payment():
    """Verify Razorpay payment"""
    try:
        data = request.get_json() or {}
        payment_id = data.get("payment_id")
        order_id = data.get("order_id")
        signature = data.get("signature")
        
        if not all([payment_id, order_id, signature]):
            return jsonify({"error": "Missing payment details"}), 400
        
        # Verify payment signature
        try:
            razorpay_client.payment.fetch(payment_id).capture(data.get("amount", 0))
            
            # Verify signature
            params_dict = {
                "order_id": order_id,
                "payment_id": payment_id
            }
            
            # Signature verification
            is_valid = razorpay_client.utility.verify_payment_signature({**params_dict, "razorpay_signature": signature})
            
            if is_valid:
                return jsonify({
                    "status": "success",
                    "message": "Payment verified successfully",
                    "payment_id": payment_id,
                    "order_id": order_id
                }), 200
            else:
                return jsonify({"error": "Invalid signature"}), 400
        except Exception as e:
            return jsonify({"error": f"Payment verification failed: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/payment/status/<payment_id>", methods=["GET"])
def payment_status(payment_id):
    """Get payment status"""
    try:
        payment = razorpay_client.payment.fetch(payment_id)
        return jsonify({
            "payment_id": payment["id"],
            "status": payment["status"],
            "amount": payment["amount"],
            "currency": payment["currency"]
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@sock.route("/ws")
def websocket(ws):
    authed = False
    while True:
        try:
            data = ws.receive()
            if data is None:
                break
            parsed = {}
            try:
                parsed = json.loads(data)
            except Exception:
                parsed = {}
            t = parsed.get("type")
            payload = parsed.get("payload", {})
            if t == "auth":
                token = payload.get("token")
                authed = True
                ws.send(json.dumps({"type": "status", "payload": {"status": "authenticated"}}))
                continue
            if not authed:
                ws.send(json.dumps({"type": "error", "payload": {"message": "unauthorized"}}))
                continue
            ws.send(json.dumps({"type": "echo", "payload": payload}))
        except Exception:
            break

def create_app():
    return app
