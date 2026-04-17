from flask import Flask, jsonify, request
from flask_cors import CORS
import mysql.connector

app = Flask(__name__)
CORS(app)

db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': 'root',
    'database': 'inamhi_rrhh'
}

# =========================
# 🔐 OBTENER USUARIO DEL TOKEN
# =========================
def obtener_usuario():
    token = request.headers.get('Authorization')
    if token and token.startswith('tk_'):
        return token.replace('tk_', '')
    return 'desconocido'

# =========================
# 🔐 VALIDAR ADMIN
# =========================
def es_admin():
    token = request.headers.get('Authorization')
    if not token:
        return False

    usuario = token.replace('tk_', '')

    conexion = mysql.connector.connect(**db_config)
    cursor = conexion.cursor(dictionary=True)

    cursor.execute("SELECT rol FROM usuarios WHERE usuario = %s", (usuario,))
    result = cursor.fetchone()

    cursor.close()
    conexion.close()

    return result and result['rol'] == 'admin'

# =========================
# 🧾 AUDITORÍA
# =========================
def registrar_auditoria(usuario, accion, tabla, registro_id, antes, despues):
    conexion = mysql.connector.connect(**db_config)
    cursor = conexion.cursor()

    query = """
        INSERT INTO auditoria 
        (usuario, accion, tabla_afectada, registro_id, datos_anteriores, datos_nuevos)
        VALUES (%s, %s, %s, %s, %s, %s)
    """

    cursor.execute(query, (
        usuario,
        accion,
        tabla,
        registro_id,
        str(antes),
        str(despues)
    ))

    conexion.commit()
    cursor.close()
    conexion.close()

# =========================
# 🔐 LOGIN
# =========================
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    try:
        conexion = mysql.connector.connect(**db_config)
        cursor = conexion.cursor(dictionary=True)

        query = "SELECT usuario, rol FROM usuarios WHERE usuario = %s AND password = %s"
        cursor.execute(query, (data.get('user'), data.get('pass')))
        usuario = cursor.fetchone()

        cursor.close()
        conexion.close()

        if usuario:
            return jsonify({
                "token": "tk_" + usuario['usuario'],
                "role": usuario['rol']
            }), 200

        return jsonify({"error": "No autorizado"}), 401

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# =========================
# 📥 GET PERSONAL
# =========================
@app.route('/api/personal', methods=['GET'])
def obtener_personal():
    try:
        conexion = mysql.connector.connect(**db_config)
        cursor = conexion.cursor(dictionary=True)

        cursor.execute("SELECT * FROM personal")
        resultados = cursor.fetchall()

        cursor.close()
        conexion.close()

        return jsonify(resultados)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# =========================
# ➕ CREATE PERSONAL (NUEVO)
# =========================

@app.route('/api/personal', methods=['POST'])
def crear_personal():

    if not es_admin():
        return jsonify({"error": "No autorizado"}), 403

    data = request.get_json()
    usuario = obtener_usuario()

    try:
        conexion = mysql.connector.connect(**db_config)
        cursor = conexion.cursor()

        query = """
            INSERT INTO personal (
                nro, cedula, nombres, modalidad, cargo, rmu, unidad,
                fecha_ingreso, fecha_nacimiento, direccion, email_inst,
                telefono, genero, instruccion, profesion, vulnerable,
                tipo_discapacidad, porcentaje_disc, etnia, observaciones
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """

        valores = (
            data.get('nro'),
            data.get('cedula'),
            data.get('nombres'),
            data.get('modalidad'),
            data.get('cargo'),
            data.get('rmu'),
            data.get('unidad'),
            data.get('fecha_ingreso'),
            data.get('fecha_nacimiento'),
            data.get('direccion'),
            data.get('email_inst'),
            data.get('telefono'),
            data.get('genero'),
            data.get('instruccion'),
            data.get('profesion'),
            data.get('vulnerable'),
            data.get('tipo_discapacidad'),
            data.get('porcentaje_disc'),
            data.get('etnia'),
            data.get('observaciones')
        )

        cursor.execute(query, valores)
        conexion.commit()

        nuevo_id = cursor.lastrowid

        registrar_auditoria(usuario, "CREATE", "personal", nuevo_id, None, data)

        cursor.close()
        conexion.close()

        return jsonify({"message": "Creado correctamente"}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500
# =========================
# ✏️ UPDATE (CON AUDITORÍA)
# =========================
@app.route('/api/personal/<int:id>', methods=['PUT'])
def actualizar_personal(id):

    if not es_admin():
        return jsonify({"error": "No autorizado"}), 403

    data = request.get_json()
    usuario = obtener_usuario()

    try:
        conexion = mysql.connector.connect(**db_config)
        cursor = conexion.cursor(dictionary=True)

        # Datos antes
        cursor.execute("SELECT * FROM personal WHERE id = %s", (id,))
        antes = cursor.fetchone()

        query = """
            UPDATE personal 
            SET nro=%s, cedula=%s, nombres=%s, modalidad=%s, cargo=%s, genero=%s
            WHERE id=%s
        """

        cursor.execute(query, (
            data.get('nro'),
            data.get('cedula'),
            data.get('nombres'),
            data.get('modalidad'),
            data.get('cargo'),
            data.get('genero'),
            id
        ))

        conexion.commit()

        # Auditoría
        registrar_auditoria(usuario, "UPDATE", "personal", id, antes, data)

        cursor.close()
        conexion.close()

        return jsonify({"message": "Actualizado"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# =========================
# ❌ DELETE (CON AUDITORÍA)
# =========================
@app.route('/api/personal/<int:id>', methods=['DELETE'])
def eliminar_personal(id):

    if not es_admin():
        return jsonify({"error": "No autorizado"}), 403

    usuario = obtener_usuario()

    try:
        conexion = mysql.connector.connect(**db_config)
        cursor = conexion.cursor(dictionary=True)

        # Datos antes
        cursor.execute("SELECT * FROM personal WHERE id = %s", (id,))
        antes = cursor.fetchone()

        cursor.execute("DELETE FROM personal WHERE id = %s", (id,))
        conexion.commit()

        # Auditoría
        registrar_auditoria(usuario, "DELETE", "personal", id, antes, None)

        cursor.close()
        conexion.close()

        return jsonify({"message": "Eliminado"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# =========================
# 🚀 RUN
# =========================
if __name__ == '__main__':
    app.run(port=5000, debug=True)