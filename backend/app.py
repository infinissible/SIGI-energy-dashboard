import eventlet
eventlet.monkey_patch()

from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO
from routes.solar_routes import solar_bp
from routes.solar_ws import setup_ws_events
from config import SECRET_KEY

print("✅ Step 1: Starting app...")

app = Flask(__name__)
app.config['SECRET_KEY'] = SECRET_KEY
CORS(app)

print("✅ Step 2: Initializing SocketIO...")
socketio = SocketIO(app, async_mode="eventlet", cors_allowed_origins="*")


print("✅ Step 3: Registering routes...")
app.register_blueprint(solar_bp, url_prefix="/backend/")

print("✅ Step 4: Registering WebSocket events...")
setup_ws_events(socketio)

print("✅ Step 5: Starting server...")
if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=8100)
