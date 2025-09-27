import mysql.connector

conn = mysql.connector.connect(
    host="localhost",
    user="root",
    password="Kitty101!"
)
print("Connected:", conn.is_connected())
conn.close()
