from flask import Flask, jsonify, request
from flask_cors import CORS
import mysql.connector
import json
from datetime import date, datetime, timezone, timedelta
from decimal import Decimal

app = Flask(__name__)
CORS(app)

db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': 'root',
    'database': 'inamhi_rrhh'
}

# =========================
# 🔌 CONEXIÓN A MYSQL
# =========================
def get_connection():
    conexion = mysql.connector.connect(**db_config)
    cursor = conexion.cursor()
    cursor.execute("SET time_zone = '-05:00'")
    cursor.close()
    return conexion

# =========================
# 🔄 SERIALIZADOR JSON
# =========================
def json_serializer(obj):
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, Decimal):
        return float(obj)
    return str(obj)

# =========================
# 🕒 FECHA/HORA ECUADOR
# =========================
def fecha_ecuador():
    tz_ec = timezone(timedelta(hours=-5))
    return datetime.now(tz_ec).strftime('%Y-%m-%d %H:%M:%S')

# =========================
# 🔐 OBTENER USUARIO DEL TOKEN
# =========================
def obtener_usuario():
    token = request.headers.get('Authorization')
    if token and token.startswith('tk_'):
        return token.replace('tk_', '')
    return 'desconocido'

# =========================
# 🌐 OBTENER IP
# =========================
def obtener_ip():
    forwarded = request.headers.get('X-Forwarded-For')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.remote_addr

# =========================
# 🔐 VALIDAR ADMIN
# =========================
def es_admin():
    token = request.headers.get('Authorization')

    if not token or not token.startswith('tk_'):
        return False

    usuario = token.replace('tk_', '')

    conexion = None
    cursor = None

    try:
        conexion = get_connection()
        cursor = conexion.cursor(dictionary=True)

        cursor.execute(
            "SELECT rol FROM usuarios WHERE usuario = %s",
            (usuario,)
        )
        result = cursor.fetchone()

        return result is not None and result['rol'] == 'admin'

    except Exception as e:
        print("ERROR VALIDANDO ADMIN:", str(e))
        return False

    finally:
        if cursor:
            cursor.close()
        if conexion:
            conexion.close()

# =========================
# 🧾 NORMALIZAR GÉNERO
# =========================
def normalizar_genero(genero):
    if genero is None:
        return None

    genero = str(genero).strip().lower()

    if genero in ['m', 'masculino']:
        return 'Masculino'

    if genero in ['f', 'femenino']:
        return 'Femenino'

    return genero.capitalize()

# =========================
# 🧾 REGISTRAR AUDITORÍA
# =========================
def registrar_auditoria(usuario, accion, tabla, registro_id=None, antes=None, despues=None, detalle=None):
    conexion = None
    cursor = None

    try:
        conexion = get_connection()
        cursor = conexion.cursor()

        query = """
            INSERT INTO auditoria
            (usuario, accion, tabla_afectada, registro_id, datos_anteriores, datos_nuevos, detalle, ip_usuario, fecha)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """

        datos_anteriores = json.dumps(antes, ensure_ascii=False, default=json_serializer) if antes is not None else None
        datos_nuevos = json.dumps(despues, ensure_ascii=False, default=json_serializer) if despues is not None else None

        cursor.execute(query, (
            usuario,
            accion,
            tabla,
            registro_id,
            datos_anteriores,
            datos_nuevos,
            detalle,
            obtener_ip(),
            fecha_ecuador()
        ))

        conexion.commit()

    except Exception as e:
        print("ERROR REGISTRANDO AUDITORIA:", str(e))

    finally:
        if cursor:
            cursor.close()
        if conexion:
            conexion.close()

# =========================
# 🔐 LOGIN
# =========================
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()

    conexion = None
    cursor = None

    try:
        conexion = get_connection()
        cursor = conexion.cursor(dictionary=True)

        query = """
            SELECT usuario, rol
            FROM usuarios
            WHERE usuario = %s AND password = %s
        """
        cursor.execute(query, (data.get('user'), data.get('pass')))
        usuario = cursor.fetchone()

        if usuario:
            registrar_auditoria(
                usuario=usuario['usuario'],
                accion='LOGIN',
                tabla='usuarios',
                registro_id=None,
                antes=None,
                despues={"usuario": usuario['usuario'], "rol": usuario['rol']},
                detalle='Inicio de sesión exitoso'
            )

            return jsonify({
                "token": "tk_" + usuario['usuario'],
                "role": usuario['rol']
            }), 200

        return jsonify({"error": "No autorizado"}), 401

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if cursor:
            cursor.close()
        if conexion:
            conexion.close()

# =========================
# 📥 GET PERSONAL
# =========================
@app.route('/api/personal', methods=['GET'])
def obtener_personal():
    conexion = None
    cursor = None

    try:
        conexion = get_connection()
        cursor = conexion.cursor(dictionary=True)

        cursor.execute("SELECT * FROM personal")
        resultados = cursor.fetchall()

        return jsonify(resultados), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if cursor:
            cursor.close()
        if conexion:
            conexion.close()

# =========================
# 🔎 GET PERSONAL POR CÉDULA
# =========================
@app.route('/api/personal/cedula/<cedula>', methods=['GET'])
def obtener_personal_por_cedula(cedula):
    if not es_admin():
        return jsonify({"error": "No autorizado"}), 403

    conexion = None
    cursor = None

    try:
        conexion = get_connection()
        cursor = conexion.cursor(dictionary=True)

        query = """
            SELECT *
            FROM personal
            WHERE cedula = %s
            LIMIT 1
        """
        cursor.execute(query, (cedula,))
        resultado = cursor.fetchone()

        if not resultado:
            return jsonify({"error": "No se encontró información para esa cédula"}), 404

        return jsonify(resultado), 200

    except Exception as e:
        print("ERROR CONSULTANDO CEDULA:", str(e))
        return jsonify({"error": str(e)}), 500

    finally:
        if cursor:
            cursor.close()
        if conexion:
            conexion.close()

# =========================
# ➕ CREATE PERSONAL
# =========================
@app.route('/api/personal', methods=['POST'])
def crear_personal():
    if not es_admin():
        return jsonify({"error": "No autorizado"}), 403

    data = request.get_json()
    usuario = obtener_usuario()

    conexion = None
    cursor = None

    try:
        conexion = get_connection()
        cursor = conexion.cursor()

        genero = normalizar_genero(data.get('genero'))

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
            genero,
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

        registrar_auditoria(
            usuario=usuario,
            accion='CREATE',
            tabla='personal',
            registro_id=nuevo_id,
            antes=None,
            despues=data,
            detalle='Creación de funcionario'
        )

        return jsonify({"message": "Creado correctamente"}), 201

    except Exception as e:
        print("ERROR CREATE PERSONAL:", str(e))
        return jsonify({"error": str(e)}), 500

    finally:
        if cursor:
            cursor.close()
        if conexion:
            conexion.close()

# =========================
# ✏️ UPDATE PERSONAL
# =========================
@app.route('/api/personal/<int:id>', methods=['PUT'])
def actualizar_personal(id):
    if not es_admin():
        return jsonify({"error": "No autorizado"}), 403

    data = request.get_json()
    usuario = obtener_usuario()

    conexion = None
    cursor = None

    try:
        conexion = get_connection()
        cursor = conexion.cursor(dictionary=True)

        cursor.execute("SELECT * FROM personal WHERE id = %s", (id,))
        antes = cursor.fetchone()

        genero = normalizar_genero(data.get('genero'))

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
            genero,
            id
        ))

        conexion.commit()

        registrar_auditoria(
            usuario=usuario,
            accion='UPDATE',
            tabla='personal',
            registro_id=id,
            antes=antes,
            despues=data,
            detalle='Actualización de funcionario'
        )

        return jsonify({"message": "Actualizado"}), 200

    except Exception as e:
        print("ERROR UPDATE PERSONAL:", str(e))
        return jsonify({"error": str(e)}), 500

    finally:
        if cursor:
            cursor.close()
        if conexion:
            conexion.close()

# =========================
# ❌ DELETE PERSONAL
# =========================
@app.route('/api/personal/<int:id>', methods=['DELETE'])
def eliminar_personal(id):
    if not es_admin():
        return jsonify({"error": "No autorizado"}), 403

    usuario = obtener_usuario()

    conexion = None
    cursor = None

    try:
        conexion = get_connection()
        cursor = conexion.cursor(dictionary=True)

        cursor.execute("SELECT * FROM personal WHERE id = %s", (id,))
        antes = cursor.fetchone()

        cursor.execute("DELETE FROM personal WHERE id = %s", (id,))
        conexion.commit()

        registrar_auditoria(
            usuario=usuario,
            accion='DELETE',
            tabla='personal',
            registro_id=id,
            antes=antes,
            despues=None,
            detalle='Eliminación de funcionario'
        )

        return jsonify({"message": "Eliminado"}), 200

    except Exception as e:
        print("ERROR DELETE PERSONAL:", str(e))
        return jsonify({"error": str(e)}), 500

    finally:
        if cursor:
            cursor.close()
        if conexion:
            conexion.close()

# =========================
# 📊 GET AUDITORIA
# =========================
@app.route('/api/auditoria', methods=['GET'])
def obtener_auditoria():
    if not es_admin():
        return jsonify({"error": "No autorizado"}), 403

    conexion = None
    cursor = None

    try:
        conexion = get_connection()
        cursor = conexion.cursor(dictionary=True)

        query = """
            SELECT
                id,
                usuario,
                accion,
                tabla_afectada,
                registro_id,
                datos_anteriores,
                datos_nuevos,
                detalle,
                ip_usuario,
                DATE_FORMAT(fecha, '%Y-%m-%d %H:%i:%s') AS fecha
            FROM auditoria
            ORDER BY fecha DESC, id DESC
        """

        cursor.execute(query)
        resultados = cursor.fetchall()

        return jsonify(resultados), 200

    except Exception as e:
        print("ERROR AUDITORIA:", str(e))
        return jsonify({"error": str(e)}), 500

    finally:
        if cursor:
            cursor.close()
        if conexion:
            conexion.close()

# =========================
# 🚀 RUN
# =========================
if __name__ == '__main__':
    app.run(port=5000, debug=True)