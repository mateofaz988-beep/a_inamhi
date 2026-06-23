import mysql.connector

def run():
    conn = mysql.connector.connect(host='localhost', user='root', password='root', database='inamhi_rrhh')
    cursor = conn.cursor()
    with open('sql/crear_tablas_firmas.sql', 'r', encoding='utf-8') as f:
        sql_script = f.read()
        
    for statement in sql_script.split(';'):
        if statement.strip():
            cursor.execute(statement)
            
    conn.commit()
    print('Tablas creadas.')
    
if __name__ == '__main__':
    run()
