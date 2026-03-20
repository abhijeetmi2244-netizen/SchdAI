from flask import Flask, jsonify, render_template, request
from solver import generate_clash_free_timetable
import sqlite3
import json

app = Flask(__name__)

# Used to temporarily store the last generated timetable in RAM
latest_generated_timetable = None

def init_db():
    conn = sqlite3.connect('database.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS erp_state (id INTEGER PRIMARY KEY, config_data TEXT)''')
    c.execute('SELECT COUNT(*) FROM erp_state')
    if c.fetchone()[0] == 0:
        c.execute('INSERT INTO erp_state (id, config_data) VALUES (1, ?)', ('{}',))
    conn.commit()
    conn.close()

init_db()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/save', methods=['POST'])
def save_data():
    config_data = json.dumps(request.json)
    conn = sqlite3.connect('database.db')
    c = conn.cursor()
    c.execute('UPDATE erp_state SET config_data = ? WHERE id = 1', (config_data,))
    conn.commit()
    conn.close()
    return jsonify({"success": "Data permanently saved to SQLite Database."})

@app.route('/api/load', methods=['GET'])
def load_data():
    conn = sqlite3.connect('database.db')
    c = conn.cursor()
    c.execute('SELECT config_data FROM erp_state WHERE id = 1')
    row = c.fetchone()
    conn.close()
    if row and row[0] != '{}': return jsonify(json.loads(row[0]))
    return jsonify({"error": "No saved data found in database."})

@app.route('/api/generate', methods=['POST'])
def api_generate():
    global latest_generated_timetable
    result = generate_clash_free_timetable(request.json)
    if "error" not in result:
        latest_generated_timetable = result 
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
